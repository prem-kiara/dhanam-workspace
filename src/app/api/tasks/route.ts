import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CreateTaskPayload } from "@/types";

const TASK_SELECT = `
  *,
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, color, avatar_url, email, phone, created_at),
  category:task_categories(id, name, sort_order, created_at),
  subcategory:task_subcategories(id, category_id, name, sort_order, created_at),
  subsubcategory:task_subsubcategories(id, subcategory_id, name, sort_order, created_at),
  comments:task_comments(id, task_id, author_id, content, created_at,
    author:profiles(id, name, initials, color, avatar_url, email, phone, created_at))
`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateTaskPayload = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { notify_channels, ...taskData } = body;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...taskData, created_by: session.user.id })
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire notifications if assignee is set
  if (data.assignee_id && notify_channels) {
    await fetch(`${process.env.NEXTAUTH_URL}/api/send-notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id: data.assignee_id,
        task_id:     data.id,
        task_title:  data.title,
        channels:    notify_channels,
        action:      "assign",
      }),
    });
  }

  return NextResponse.json(data, { status: 201 });
}
