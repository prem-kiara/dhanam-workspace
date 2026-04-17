import { Resend } from "resend";
import { Profile } from "@/types";

// Lazy initialisation — avoids crashing at build time when env vars are absent
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}
const FROM = process.env.EMAIL_FROM ?? "notifications@dhanam.finance";

interface TaskAssignEmailProps {
  assignee:   Profile;
  taskTitle:  string;
  taskId:     string;
  action:     "assign" | "reassign";
  assigner?:  string;
}

export async function sendTaskAssignEmail({
  assignee, taskTitle, taskId, action, assigner,
}: TaskAssignEmailProps): Promise<void> {
  const subject = action === "reassign"
    ? `Task reassigned to you: ${taskTitle}`
    : `New task assigned to you: ${taskTitle}`;

  const actionLabel = action === "reassign" ? "reassigned to you" : "assigned to you";
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${subject}</title>
    </head>
    <body style="font-family: Inter, -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <!-- Header -->
        <div style="background: #7c3aed; padding: 24px; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 14px;">D</span>
            </div>
            <span style="color: white; font-weight: bold; font-size: 16px;">Dhanam Workspace</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px;">
          <p style="color: #475569; font-size: 14px; margin: 0 0 8px;">Hi ${assignee.name},</p>
          <p style="color: #1e293b; font-size: 15px; margin: 0 0 20px;">
            A task has been <strong>${actionLabel}</strong>${assigner ? ` by ${assigner}` : ""}:
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0 0 4px;">${taskTitle}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Task ID: ${taskId.slice(0, 8)}…</p>
          </div>

          <a href="${appUrl}/tasks"
             style="display: block; background: #7c3aed; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            View Task →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
            Dhanam Investment and Finance · This is an automated notification
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from:    FROM,
      to:      assignee.email,
      subject,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send task assignment email:", err);
  }
}
