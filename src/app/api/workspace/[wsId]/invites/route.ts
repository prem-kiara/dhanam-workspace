import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: { wsId: string } };

// GET /api/workspace/[wsId]/invites — list pending invites for this workspace
export async function GET(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", params.wsId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/workspace/[wsId]/invites — send invite by email
// Body: { invitee_email, invitee_name? }
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invitee_email, invitee_name } = await req.json();
  if (!invitee_email?.trim()) {
    return NextResponse.json({ error: "invitee_email required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get workspace name + inviter name
  const [{ data: ws }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", params.wsId).single(),
    supabase.from("profiles").select("name").eq("id", session.user.id).single(),
  ]);

  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("workspace_invites")
    .upsert(
      {
        workspace_id:   params.wsId,
        workspace_name: ws.name,
        inviter_id:     session.user.id,
        inviter_name:   profile?.name ?? session.user.name ?? "Someone",
        invitee_email:  invitee_email.trim(),
        invitee_name:   invitee_name ?? null,
        status:         "pending",
      },
      { onConflict: "workspace_id,invitee_email" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: Send invite email via Resend
  // await sendWorkspaceInviteEmail({ ... });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/workspace/[wsId]/invites?inviteId=<id>
// Body: { status: 'accepted' | 'rejected' }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inviteId = req.nextUrl.searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  const { status } = await req.json();
  if (!["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be accepted or rejected" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the invite is for the current user
  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.invitee_email !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update invite status
  await supabase
    .from("workspace_invites")
    .update({ status })
    .eq("id", inviteId);

  // If accepted, add to workspace_members
  if (status === "accepted") {
    await supabase.from("workspace_members").upsert(
      {
        workspace_id: params.wsId,
        user_id:      session.user.id,
        email:        session.user.email!,
        display_name: session.user.name ?? invite.invitee_name ?? null,
        role:         "member",
        pending:      false,
      },
      { onConflict: "workspace_id,user_id" }
    );
  }

  return NextResponse.json({ ok: true });
}
