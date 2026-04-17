import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTaskAssignEmail } from "@/lib/notifications/email";
import { SendNotificationPayload, Profile } from "@/types";

export async function POST(req: NextRequest) {
  const body: SendNotificationPayload = await req.json();
  const { assignee_id, task_id, task_title, channels, action } = body;

  const supabase = createAdminClient();

  // Fetch assignee profile
  const { data: assignee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", assignee_id)
    .single();

  if (!assignee) {
    return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
  }

  const profile = assignee as Profile;
  const promises: Promise<void>[] = [];

  // ── In-app notification ────────────────────────────────────────────────────
  if (channels.inapp) {
    const title = action === "reassign"
      ? `Task reassigned to you: "${task_title}"`
      : `New task assigned to you: "${task_title}"`;

    promises.push(
      Promise.resolve(
        supabase.from("notifications").insert({
          user_id: assignee_id,
          type:    action === "reassign" ? "reassign" : "assign",
          title,
          task_id,
        })
      ).then(() => {})
    );
  }

  // ── Email notification ─────────────────────────────────────────────────────
  if (channels.email) {
    promises.push(
      sendTaskAssignEmail({ assignee: profile, taskTitle: task_title, taskId: task_id, action })
    );

    // Log email sent as an in-app notification too
    promises.push(
      Promise.resolve(
        supabase.from("notifications").insert({
          user_id: assignee_id,
          type:    "email",
          title:   `Email sent to ${profile.email}`,
          body:    `Task: "${task_title}"`,
          task_id,
        })
      ).then(() => {})
    );
  }

  await Promise.allSettled(promises);

  return NextResponse.json({ success: true });
}
