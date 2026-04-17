import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: { wsId: string } };

// GET /api/workspace/[wsId]/members — list members
export async function GET(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", params.wsId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/workspace/[wsId]/members — add a member directly (admin only)
// Body: { email, display_name?, role? }
// Used when adding from org directory when user may not have signed in yet.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, display_name, role = "member" } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify requester is admin
  const { data: me } = await supabase
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

  if (!me && ws?.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (me && me.role !== "admin" && ws?.created_by !== session.user.id) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Check if user exists in profiles (i.e., has signed in)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("email", email.trim())
    .single();

  const user_id = profile ? profile.id : `pending_${email.trim()}`;
  const pending = !profile;

  const { data, error } = await supabase
    .from("workspace_members")
    .upsert(
      {
        workspace_id: params.wsId,
        user_id,
        email:        email.trim(),
        display_name: display_name ?? profile?.name ?? null,
        role,
        pending,
      },
      { onConflict: "workspace_id,user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/workspace/[wsId]/members?userId=<id> — remove a member
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();

  // Admin or self-leave
  const { data: me } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", params.wsId)
    .eq("user_id", session.user.id)
    .single();

  const isSelf  = userId === session.user.id;
  const isAdmin = me?.role === "admin";

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", params.wsId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
