import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// Minimal select — avoids FK join errors if old category tables are empty
const TASK_SELECT = `
  *,
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, color, avatar_url, email, phone, created_at)
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
    query = query.is("workspace_id", null).or(
      `owner_id.eq.${session.user.id},created_by.eq.${session.user.id},assignee_id.eq.${session.user.id}`
    );
  } else {
    // No filter — return all tasks accessible to this user
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const title = (body.title ?? body.task_text ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: creator } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", session.user.id)
    .single();

  // Allowlist fields to insert — avoids accidentally writing unknown columns
  const insert: Record<string, unknown> = {
    title,
    task_text:       title,
    status:          body.status       ?? "To Do",
    priority:        body.priority     ?? "Medium",
    due_date:        body.due_date     ?? null,
    description:     body.description  ?? null,
    // v2 text grouping
    category:        body.category     ?? null,
    sub:             body.sub          ?? null,
    subsub:          body.subsub       ?? null,
    // workspace / owner
    workspace_id:    body.workspace_id ?? null,
    created_by:      session.user.id,
    created_by_name: creator?.name     ?? session.user.name ?? null,
    owner_id:        body.workspace_id ? null : session.user.id,
    // assignee
    assignee_id:     body.assignee_id  ?? null,
    assignee_email:  body.assignee_email ?? null,
    assignee_name:   body.assignee_name  ?? null,
    // completion
    completed:       false,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(insert)
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Activity log (best-effort)
  supabase.from("task_activity").insert({
    task_id:    data.id,
    actor_id:   session.user.id,
    actor_name: creator?.name ?? "Unknown",
    action:     "created",
    detail:     `Created task "${title}"`,
  }).then(() => {});

  // Notify if assignee set
  const notify_channels = body.notify_channels;
  if (data.assignee_id && notify_channels) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    fetch(`${baseUrl}/api/send-notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        assignee_id: data.assignee_id,
        task_id:     data.id,
        task_title:  data.title,
        channels:    notify_channels,
        action:      "assign",
      }),
    }).catch(() => {});
  }

  return NextResponse.json(data, { status: 201 });
}
