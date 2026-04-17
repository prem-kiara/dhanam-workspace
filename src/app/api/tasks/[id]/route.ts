import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { UpdateTaskPayload } from "@/types";

const TASK_SELECT = `
  *,
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, color, avatar_url, email, phone, created_at),
  category:task_categories(id, name, sort_order, created_at),
  subcategory:task_subcategories(id, category_id, name, sort_order, created_at),
  subsubcategory:task_subsubcategories(id, subcategory_id, name, sort_order, created_at),
  comments:task_comments(id, task_id, author_id, content, created_at,
    author:profiles(id, name, initials, color, avatar_url, email, phone, created_at))
`;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: UpdateTaskPayload = await req.json();
  const { notify_channels, ...updates } = body;
  const supabase = createAdminClient();

  // Get current task to detect reassignment
  const { data: current } = await supabase.from("tasks").select("assignee_id, title").eq("id", params.id).single();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", params.id)
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire notifications on reassignment
  const isReassigned = updates.assignee_id && updates.assignee_id !== current?.assignee_id;
  if (isReassigned && notify_channels) {
    await fetch(`${process.env.NEXTAUTH_URL}/api/send-notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id: updates.assignee_id,
        task_id:     params.id,
        task_title:  current?.title ?? data.title,
        channels:    notify_channels,
        action:      "reassign",
      }),
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
