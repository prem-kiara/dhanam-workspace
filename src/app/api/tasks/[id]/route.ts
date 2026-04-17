import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { UpdateTaskPayload } from "@/types";

const TASK_SELECT = `
  *,
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, color, avatar_url, email, phone, created_at),
  creator:profiles!tasks_created_by_fkey(id, name, initials, color, avatar_url, email, phone, created_at),
  category_obj:task_categories(id, name, sort_order, created_at),
  subcategory:task_subcategories(id, category_id, name, sort_order, created_at),
  subsubcategory:task_subsubcategories(id, subcategory_id, name, sort_order, created_at),
  comments:task_comments(id, task_id, author_id, content, created_at,
    author:profiles(id, name, initials, color, avatar_url, email, phone, created_at))
`;

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: UpdateTaskPayload = await req.json();
  const { notify_channels, ...updates } = body;
  const supabase = createAdminClient();

  // Get current task to detect reassignment / status change
  const { data: current } = await supabase
    .from("tasks")
    .select("assignee_id, assignee_email, status, title")
    .eq("id", params.id)
    .single();

  // Handle completed flag
  if (updates.status === "Done" && !updates.completed) {
    (updates as any).completed    = true;
    (updates as any).completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== "Done") {
    (updates as any).completed    = false;
    (updates as any).completed_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", params.id)
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get actor name for activity log
  const { data: actor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", session.user.id)
    .single();

  const actorName = actor?.name ?? "Unknown";

  // Write activity log entries
  if (updates.status && updates.status !== current?.status) {
    await supabase.from("task_activity").insert({
      task_id:    params.id,
      actor_id:   session.user.id,
      actor_name: actorName,
      action:     updates.status === "Done" ? "completed" : "status_changed",
      detail:     `Status changed from "${current?.status}" to "${updates.status}"`,
    });
  }

  const newAssignee = updates.assignee_id || updates.assignee_email;
  const oldAssignee = current?.assignee_id || current?.assignee_email;
  const isReassigned = newAssignee && newAssignee !== oldAssignee;

  if (isReassigned) {
    await supabase.from("task_activity").insert({
      task_id:    params.id,
      actor_id:   session.user.id,
      actor_name: actorName,
      action:     "reassigned",
      detail:     `Reassigned to ${updates.assignee_name ?? updates.assignee_email ?? updates.assignee_id}`,
    });
  }

  // Fire notifications on reassignment
  if (isReassigned && notify_channels) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/send-notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id:    updates.assignee_id,
        assignee_email: updates.assignee_email,
        task_id:        params.id,
        task_title:     current?.title ?? data.title,
        channels:       notify_channels,
        action:         "reassign",
      }),
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
