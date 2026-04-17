"use client";

import { useState } from "react";
import { Profile, NotifyChannels } from "@/types";

interface Props {
  assignee:  Profile;
  taskTitle: string;
  action:    "assign" | "reassign";
  onClose:   () => void;
  onSend:    (channels: NotifyChannels) => Promise<void>;
}

export function NotifyModal({ assignee, taskTitle, action, onClose, onSend }: Props) {
  const [channels, setChannels] = useState<NotifyChannels>({ email: true, inapp: true });
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const toggle = (ch: keyof NotifyChannels) =>
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const handleSend = async () => {
    setSending(true);
    await onSend(channels);
    setSent(true);
    setTimeout(onClose, 1400);
  };

  const label = action === "reassign" ? "Reassigned to" : "Assigned to";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">✅</div>
            <p className="text-sm font-semibold text-slate-700">Notifications sent!</p>
            <div className="text-xs text-slate-400 text-center space-y-0.5">
              {channels.email && <p>✉️ Email → {assignee.email}</p>}
              {channels.inapp && <p>🔔 In-app notification delivered</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-800">Notify {assignee.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {label}: <span className="font-medium text-slate-600">&ldquo;{taskTitle}&rdquo;</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {/* Email */}
              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${channels.email ? "border-violet-400 bg-violet-50" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Email</p>
                    <p className="text-xs text-slate-400">{assignee.email}</p>
                  </div>
                </div>
                <input type="checkbox" checked={channels.email} onChange={() => toggle("email")} className="w-4 h-4 accent-violet-600" />
              </label>

              {/* In-app */}
              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${channels.inapp ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">In-app notification</p>
                    <p className="text-xs text-slate-400">Delivered in Dhanam Workspace</p>
                  </div>
                </div>
                <input type="checkbox" checked={channels.inapp} onChange={() => toggle("inapp")} className="w-4 h-4 accent-blue-600" />
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50">
                Skip
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send Notifications"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
