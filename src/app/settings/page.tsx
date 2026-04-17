"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Profile, ProfileSettings } from "@/types";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [name,         setName]         = useState("");
  const [phone,        setPhone]        = useState("");
  const [settings,     setSettings]     = useState<ProfileSettings>({
    reminderEmail:         null,
    reminderTime:          "09:00",
    timezone:              "Asia/Kolkata",
    emailRemindersEnabled: true,
  });
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState("");
  const [workspaces,   setWorkspaces]   = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profiles/me")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile(p);
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        if (p.settings) setSettings(p.settings);
      });
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((ws) => setWorkspaces(ws ?? []));
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profiles/me", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, phone, settings }),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Settings saved ✓");
    } else {
      showToast("Failed to save settings");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleExport = () => showToast("Export feature coming soon");

  if (status === "loading" || !profile) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 h-32 mb-4 animate-pulse" />
        ))}
      </main>
    );
  }

  const avatarColor = "bg-violet-600";
  const initials    = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your profile, reminders, and preferences.</p>
      </div>

      {/* ── Account Card ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{session?.user?.email}</p>
            <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">
              {profile.role ?? "member"}
            </span>
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        {/* WhatsApp phone */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            WhatsApp Number <span className="text-slate-400 font-normal">(with country code, e.g. +919840000001)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91..."
            className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </section>

      {/* ── Reminders ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-5">
        <h2 className="text-sm font-bold text-slate-700">Reminders</h2>

        {/* Email reminders toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Email Reminders</p>
            <p className="text-xs text-slate-400">Get daily task reminder emails</p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, emailRemindersEnabled: !s.emailRemindersEnabled }))}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${
              settings.emailRemindersEnabled ? "bg-violet-600" : "bg-slate-200"
            }`}
            style={{ height: "22px", width: "40px" }}
          >
            <span
              className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                settings.emailRemindersEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
              style={{ width: "18px", height: "18px", left: settings.emailRemindersEnabled ? "18px" : "2px", top: "2px", position: "absolute" }}
            />
          </button>
        </div>

        {/* Reminder email (if different) */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Reminder Send-to Email <span className="text-slate-400 font-normal">(leave blank to use login email)</span>
          </label>
          <input
            type="email"
            value={settings.reminderEmail ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, reminderEmail: e.target.value || null }))}
            placeholder={session?.user?.email ?? ""}
            className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Reminder time */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Reminder Time
            </label>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => setSettings((s) => ({ ...s, reminderTime: e.target.value }))}
              className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
              className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Workspace Membership ────────────────────────────────────── */}
      {workspaces.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Your Workspaces</h2>
          <div className="flex flex-col gap-2">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-700 font-medium">{ws.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Cloud sync ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Cloud Sync</p>
          <p className="text-xs text-slate-400">Real-time sync via Supabase</p>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
          ● Connected
        </span>
      </section>

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-slate-700">Data & Account</h2>
        <button
          onClick={handleExport}
          className="text-sm text-slate-600 hover:text-slate-800 text-left px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
        >
          ⬇ Export my data
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-sm text-red-500 hover:text-red-700 text-left px-4 py-2.5 rounded-xl border border-red-100 hover:border-red-200 transition-colors"
        >
          Sign out
        </button>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-xl disabled:opacity-50 transition-colors self-end"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
