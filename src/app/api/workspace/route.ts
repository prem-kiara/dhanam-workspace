import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/workspace — list workspaces I belong to.
// Side-effect: if the user has zero workspaces, auto-provision a locked-down
// "Personal" workspace with the user as sole admin (is_personal = true).
// Returns the Personal workspace first, followed by others by created_at.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const listMine = async () => {
    // 1. IDs I'm a member of
    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id);
    const memberIds = (memberRows ?? []).map((r: { workspace_id: string }) => r.workspace_id);

    // 2. Workspaces I created OR am a member of
    const { data, error } = await supabase
      .from("workspaces")
      .select(`
        *,
        members:workspace_members(id, user_id, email, display_name, role, pending)
      `)
      .or(
        `created_by.eq.${session.user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`
      )
      .order("is_personal", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  };

  try {
    let workspaces = await listMine();

    // Auto-provision Personal if user has none
    if (workspaces.length === 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", session.user.id)
        .single();

      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .insert({
          name:        "Personal",
          created_by:  session.user.id,
          is_personal: true,
        })
        .select()
        .single();

      if (!wsErr && ws) {
        await supabase.from("workspace_members").insert({
          workspace_id: ws.id,
          user_id:      session.user.id,
          email:        session.user.email ?? profile?.email ?? "",
          display_name: session.user.name  ?? profile?.name  ?? "",
          role:         "admin",
          pending:      false,
        });
        workspaces = await listMine();
      }
    }

    return NextResponse.json(workspaces);
  } catch {
    // Fallback: simpler join if the combined query fails
    const { data: ws } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("user_id", session.user.id);

    const workspaces = ws?.map((m: { workspaces: unknown }) => m.workspaces).filter(Boolean) ?? [];
    return NextResponse.json(workspaces);
  }
}

// POST /api/workspace — create a new workspace (team workspace, never personal)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Create workspace — is_personal is explicitly false for user-created
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .insert({
      name:        name.trim(),
      created_by:  session.user.id,
      is_personal: false,
    })
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
