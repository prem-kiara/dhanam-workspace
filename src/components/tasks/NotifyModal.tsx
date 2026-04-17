"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, Profile } from "@/types";

interface Channels {
  email:    boolean;
  inapp:    boolean;
  whatsapp: boolean;
}

interface Props {
  assignee: Profile;
  task:     Task;
  onConfirm: (channels: Channels) => void;
  onClose:   () => void;
}

export function NotifyModal({ assignee, task, onConfirm, onClose }: Props) {
  const [channels, setChannels] = useState<Channels>({
    email:    true,
    inapp:    true,
    whatsapp: false,
  });
  const [phone,   setPhone]   = useState(assignee.phone ?? "");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  // Try to fetch the phone from user_phones table
  useEffect(() => {
    if (!assignee.email) return;
    fetch(`/api/user-phone?email=${encodeURIComponent(assignee.email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.phone) {
          setPhone(d.phone);
          setChannels((c) => ({ ...c, whatsapp: true }));
        }
      });
  }, [assignee.email]);

  const toggle = (ch: keyof Channels) =>
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const handleSend = async () => {
    setSending(true);

    // Save phone if provided and whatsapp selected
    if (channels.whatsapp && phone) {
      await fetch("/api/user-phone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: assignee.email, phone }),
      });
    }

    // WhatsApp deep link
    if (channels.whatsapp && phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const msg = encodeURIComponent(
        `Hi ${assignee.name}, you have a new task assigned: "${task.title}" — Open: ${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/tasks`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    }

    setSent(true);
    setTimeout(() => {
      setSending(false);
      onConfirm(channels);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Notify Assignee</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Assignee */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
          <Avatar profile={assignee} size="md" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{assignee.name}</p>
            <p className="text-xs text-slate-400">{assignee.email}</p>
          </div>
        </div>

        {/* Channels */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notification Channels</p>

          {/* Email */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              channels.email ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={channels.email}
              onChange={() => toggle("email")}
              className="w-4 h-4 accent-violet-600"
            />
            <div>
              <p className="text-xs font-semibold text-slate-700">✉️ Email</p>
              <p className="text-[10px] text-slate-400">{assignee.email}</p>
            </div>
          </label>

          {/* WhatsApp */}
          <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
            channels.whatsapp ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
          }`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={() => toggle("whatsapp")}
                className="w-4 h-4 accent-emerald-600"
              />
              <div>
                <p className="text-xs font-semibold text-slate-700">💬 WhatsApp</p>
                <p className="text-[10px] text-slate-400">Opens WhatsApp in a new tab</p>
              </div>
            </label>
            {channels.whatsapp && (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 99440 00001"
                className="text-xs bg-white rounded-lg px-3 py-1.5 border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full"
              />
            )}
          </div>

          {/* In-app */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              channels.inapp ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={channels.inapp}
              onChange={() => toggle("inapp")}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <p className="text-xs font-semibold text-slate-700">🔔 In-app</p>
              <p className="text-[10px] text-slate-400">Delivered in the notification bell</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-5 py-2 rounded-xl disabled:opacity-50 transition-colors"
          >
            {sent ? "✅ Sent!" : sending ? "Sending…" : "Send Notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
