import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// Lazy Resend initialisation (avoids build-time crash if key is absent)
function getResend() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend");
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder") return null;
  return new Resend(key);
}

const FROM    = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? "noreply@dhanam.finance";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();
  const {
    assignee_id, assignee_email, task_id, task_title,
    channels, action,
    assignee_name, old_status, new_status, comment_text,
    workspace_id, workspace_name,
  } = payload;

  const supabase = createAdminClient();
  const resend   = getResend();
  const taskUrl  = `${APP_URL}/tasks?task=${task_id}`;

  // Resolve assignee profile
  let recipientEmail = assignee_email ?? null;
  let recipientName  = assignee_name  ?? "Team Member";

  if (assignee_id && !recipientEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", assignee_id)
      .single();
    if (profile) {
      recipientEmail = profile.email;
      recipientName  = profile.name;
    }
  }

  // Sender name
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", session.user.id)
    .single();
  const senderName = senderProfile?.name ?? session.user.name ?? "Someone";

  // ── In-app notification ─────────────────────────────────────────────────
  if (channels?.inapp !== false) {
    const notifMap: Record<string, { title: string; body: string }> = {
      assign:           { title: `New task assigned: ${task_title}`,      body: `Assigned by ${senderName}` },
      reassign:         { title: `Task reassigned to you: ${task_title}`, body: `Reassigned by ${senderName}` },
      status_changed:   { title: `Status changed: ${task_title}`,         body: `${old_status ?? ""} → ${new_status ?? ""}` },
      completed:        { title: `Task completed: ${task_title}`,         body: `Completed by ${senderName}` },
      comment:          { title: `New comment on: ${task_title}`,         body: (comment_text ?? "").slice(0, 80) },
      workspace_invite: { title: `Invited to ${workspace_name}`,          body: `Invited by ${senderName}` },
    };
    const notif = notifMap[action] ?? { title: task_title ?? "Notification", body: "" };

    await supabase.from("notifications").insert({
      user_id:         assignee_id ?? null,
      recipient_email: recipientEmail,
      sender_email:    session.user.email,
      sender_name:     senderName,
      type:            action === "assign" ? "task_assigned" : action,
      title:           notif.title,
      body:            notif.body || null,
      task_id:         task_id       ?? null,
      workspace_id:    workspace_id  ?? null,
      read:            false,
    });
  }

  // ── Email via Resend ────────────────────────────────────────────────────
  if (channels?.email && recipientEmail && resend) {
    try {
      // Dynamic imports — templates are plain TS functions returning HTML strings
      const { TaskAssigned }    = await import("@/lib/email/templates/TaskAssigned");
      const { TaskReassigned }  = await import("@/lib/email/templates/TaskReassigned");
      const { StatusChanged }   = await import("@/lib/email/templates/StatusChanged");
      const { TaskCompleted }   = await import("@/lib/email/templates/TaskCompleted");
      const { WorkspaceInvite } = await import("@/lib/email/templates/WorkspaceInvite");
      const { NewComment }      = await import("@/lib/email/templates/NewComment");

      let subject = `Dhanam Workspace — ${task_title ?? "Notification"}`;
      let html    = "";

      if (action === "assign") {
        subject = `📋 New task assigned: ${task_title}`;
        html = TaskAssigned({ assigneeName: recipientName, assignerName: senderName, taskTitle: task_title, taskUrl });
      } else if (action === "reassign") {
        subject = `🔄 Task reassigned to you: ${task_title}`;
        html = TaskReassigned({ assigneeName: recipientName, fromName: senderName, taskTitle: task_title, taskUrl });
      } else if (action === "status_changed") {
        subject = `📊 Task status updated: ${task_title}`;
        html = StatusChanged({ ownerName: recipientName, changerName: senderName, taskTitle: task_title, oldStatus: old_status ?? "", newStatus: new_status ?? "", taskUrl });
      } else if (action === "completed") {
        subject = `✅ Task completed: ${task_title}`;
        html = TaskCompleted({ ownerName: recipientName, completedBy: senderName, taskTitle: task_title, taskUrl });
      } else if (action === "comment") {
        subject = `💬 New comment: ${task_title}`;
        html = NewComment({ recipientName, commenterName: senderName, taskTitle: task_title, commentText: comment_text ?? "", taskUrl });
      } else if (action === "workspace_invite") {
        subject = `🗂 Invited to ${workspace_name} — Dhanam Workspace`;
        html = WorkspaceInvite({ inviteeName: recipientName, inviterName: senderName, workspaceName: workspace_name ?? "", joinUrl: `${APP_URL}/tasks?workspace=${workspace_id}` });
      }

      if (html) {
        await resend.emails.send({ from: FROM, to: recipientEmail, subject, html });
      }
    } catch (err) {
      console.error("[send-notification] Email error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
