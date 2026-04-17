import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CreateTaskPayload } from "@/types";

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace_id = req.nextUrl.searchParams.get("workspace_id");
  const personal     = req.nextUrl.searchParams.get("personal") === "true";
  const supabase     = createAdminClient();

  let query = supabase.from("tasks").select(TASK_SELECT);

  if (workspace_id) {
    query = query.eq("workspace_id", workspace_id);
  } else if (personal) {
    // Personal tasks: no workspace, owned by or assigned to current user
    query = query.is("workspace_id", null).or(
      `owner_id.eq.${session.user.id},created_by.eq.${session.user.id},assignee_id.eq.${session.user.id}`
    );
  } else {
    // Default: all tasks user can access
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateTaskPayload = await req.json();

  // Support both v1 (title) and v2 (task_text) field names
  const title = body.title?.trim() || body.task_text?.trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { notify_channels, ...taskData } = body;
  const supabase = createAdminClient();

  // Get creator name for activity log
  const { data: creator } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", session.user.id)
    .single();

  const insert = {
    ...taskData,
    title,
    task_text:        title,
    created_by:       session.user.id,
    created_by_name:  creator?.name ?? session.user.name ?? null,
    owner_id:         taskData.workspace_id ? null : session.user.id,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(insert)
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write activity log
  await supabase.from("task_activity").insert({
    task_id:    data.id,
    actor_id:   session.user.id,
    actor_name: creator?.name ?? "Unknown",
    action:     "created",
    detail:     `Created task "${title}"`,
  }).then(() => {});

  // Fire notifications if assignee is set
  if ((data.assignee_id || data.assignee_email) && notify_channels) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/send-notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id:    data.assignee_id,
        assignee_email: data.assignee_email,
        task_id:        data.id,
        task_title:     data.title,
        channels:       notify_channels,
        action:         "assign",
      }),
    });
  }

  return NextResponse.json(data, { status: 201 });
}
