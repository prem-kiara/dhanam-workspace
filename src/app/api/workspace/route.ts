import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/workspace — list workspaces I belong to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Workspaces where I'm a member OR I created
  const { data, error } = await supabase
    .from("workspaces")
    .select(`
      *,
      members:workspace_members(id, user_id, email, display_name, role, pending)
    `)
    .or(
      `created_by.eq.${session.user.id},id.in.(${
        // subquery via JS: get workspace IDs I'm a member of
        "(select workspace_id from workspace_members where user_id = '" + session.user.id + "')"
      })`
    )
    .order("created_at", { ascending: true });

  if (error) {
    // Fall back to simpler query if the complex one fails
    const { data: ws } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("user_id", session.user.id);

    const workspaces = ws?.map((m: any) => m.workspaces).filter(Boolean) ?? [];
    return NextResponse.json(workspaces);
  }

  return NextResponse.json(data ?? []);
}

// POST /api/workspace — create a new workspace
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Create workspace
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .insert({ name: name.trim(), created_by: session.user.id })
    .select()
    .single();

  if (wsErr) return NextResponse.json({ error: wsErr.message }, { status: 500 });

  // Add creator as admin member
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", session.user.id)
    .single();

  await supabase.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id:      session.user.id,
    email:        session.user.email ?? profile?.email ?? "",
    display_name: session.user.name  ?? profile?.name  ?? "",
    role:         "admin",
    pending:      false,
  });

  return NextResponse.json(ws, { status: 201 });
}
