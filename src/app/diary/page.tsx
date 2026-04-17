"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DiaryEntry, DiaryTag, CreateDiaryEntryPayload } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { DiaryCompose } from "@/components/diary/DiaryCompose";
import { DiaryStats } from "@/components/diary/DiaryStats";
import { DiaryEntryCard } from "@/components/diary/DiaryEntryCard";

const FILTER_TAGS: (DiaryTag | "All")[] = ["All", "Team Sync", "Client Call", "Strategy", "Personal"];

export default function DiaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const supabase = createClient();

  const [entries,   setEntries]   = useState<DiaryEntry[]>([]);
  const [filter,    setFilter]    = useState<DiaryTag | "All">("All");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("diary_entries")
      .select("*, author:profiles(id, name, initials, color, avatar_url, email, phone, created_at)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setEntries(data as DiaryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session, fetchEntries]);

  // Real-time new entries
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("diary_entries")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "diary_entries" }, () => {
        fetchEntries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const handleSave = async (payload: CreateDiaryEntryPayload) => {
    // Use the API route so the admin client handles the insert (bypasses RLS,
    // and the session user ID from NextAuth is resolved server-side)
    const res = await fetch("/api/diary", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (res.ok) fetchEntries();
  };

  const filtered = filter === "All" ? entries : entries.filter((e) => e.tag === filter);

  if (status === "loading") return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Diary</h1>
        <p className="text-sm text-slate-400 mt-0.5">Capture thoughts freely — one entry at a time.</p>
      </div>

      <DiaryCompose onSave={handleSave} />
      <DiaryStats entries={entries} />

      {/* Recent Entries */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-slate-500">Recent Entries</p>
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TAGS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filter === f
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-36 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No entries yet. Write your first thought above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((entry) => (
              <DiaryEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
