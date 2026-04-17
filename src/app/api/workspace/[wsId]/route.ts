import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: { wsId: string } };

// PATCH /api/workspace/[wsId] — rename
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Only admin or creator can rename
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", params.wsId)
    .eq("user_id", session.user.id)
    .single();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("created_by")
    .eq("id", params.wsId)
    .single();

  if (!member && ws?.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (member && member.role !== "admin" && ws?.created_by !== session.user.id) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: name.trim() })
    .eq("id", params.wsId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/workspace/[wsId] — delete (creator only)
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("created_by, is_personal")
    .eq("id", params.wsId)
    .single();

  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.is_personal) {
    return NextResponse.json({ error: "Personal workspace cannot be deleted" }, { status: 403 });
  }
  if (ws.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the creator can delete" }, { status: 403 });
  }

  const { error } = await supabase.from("workspaces").delete().eq("id", params.wsId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
