import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

// GET /api/tasks/[id]/comments
export async function GET(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("*, author:profiles(id, name, initials, color, avatar_url, email)")
    .eq("task_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/tasks/[id]/comments
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, content } = await req.json();
  const commentText = text || content;
  if (!commentText?.trim()) {
    return NextResponse.json({ error: "Comment text required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", session.user.id)
    .single();

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id:      params.id,
      author_id:    session.user.id,
      author_name:  profile?.name ?? "Unknown",
      author_email: profile?.email ?? session.user.email ?? null,
      content:      commentText.trim(),
    })
    .select("*, author:profiles(id, name, initials, color, avatar_url, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write activity log
  await supabase.from("task_activity").insert({
    task_id:    params.id,
    actor_id:   session.user.id,
    actor_name: profile?.name ?? "Unknown",
    action:     "commented",
    detail:     commentText.trim().slice(0, 120),
  });

  return NextResponse.json(data, { status: 201 });
}
