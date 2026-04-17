/**
 * WhatsApp notifications via Twilio WhatsApp Business API.
 *
 * Setup steps (do this once):
 * 1. Create a Twilio account at https://www.twilio.com
 * 2. Activate the Twilio Sandbox for WhatsApp (or apply for a production number)
 * 3. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM to your .env
 * 4. Each team member must send "join <sandbox-keyword>" to the Twilio number once
 *    (for sandbox). Production numbers don't require this step.
 *
 * The functions below are called automatically when a task is assigned/reassigned.
 */

import { Profile } from "@/types";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM        = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

interface WhatsAppTaskNotifProps {
  assignee:  Profile;
  taskTitle: string;
  action:    "assign" | "reassign";
  assigner?: string;
}

export async function sendTaskWhatsApp({
  assignee, taskTitle, action, assigner,
}: WhatsAppTaskNotifProps): Promise<void> {
  // Skip silently if WhatsApp is not configured yet
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.log("[whatsapp] Skipped — TWILIO_ACCOUNT_SID/AUTH_TOKEN not set.");
    return;
  }

  if (!assignee.phone) {
    console.log(`[whatsapp] Skipped — no phone number for ${assignee.name}`);
    return;
  }

  const to = assignee.phone.startsWith("whatsapp:")
    ? assignee.phone
    : `whatsapp:${assignee.phone}`;

  const actionLabel = action === "reassign" ? "reassigned to you" : "assigned to you";
  const body = [
    `*Dhanam Workspace* 🔔`,
    ``,
    `Hi ${assignee.name}, a task has been *${actionLabel}*${assigner ? ` by ${assigner}` : ""}:`,
    ``,
    `📋 *${taskTitle}*`,
    ``,
    `Open Dhanam Workspace to view and update the task.`,
  ].join("\n");

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams({ From: FROM, To: to, Body: body });

    const resp = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      const err = await resp.json();
      console.error("[whatsapp] Twilio error:", err);
    }
  } catch (err) {
    console.error("[whatsapp] Failed to send WhatsApp message:", err);
  }
}
