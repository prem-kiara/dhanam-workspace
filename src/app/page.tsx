"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DiaryEntry, DiaryTag, CreateDiaryEntryPayload } from "@/types";
import { DiaryCompose } from "@/components/diary/DiaryCompose";
import { DiaryStats } from "@/components/diary/DiaryStats";
import { DiaryEntryCard } from "@/components/diary/DiaryEntryCard";

const FILTER_TAGS: (DiaryTag | "All")[] = ["All", "Team Sync", "Client Call", "Strategy", "Personal"];

export default function DiaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [entries,         setEntries]         = useState<DiaryEntry[]>([]);
  const [filter,          setFilter]          = useState<DiaryTag | "All">("All");
  const [loading,         setLoading]         = useState(true);
  const [convertEntry,    setConvertEntry]     = useState<DiaryEntry | null>(null);
  const [convertTitle,    setConvertTitle]     = useState("");
  const [convertPriority, setConvertPriority] = useState("Medium");
  const [convertStatus,   setConvertStatus]   = useState("To Do");
  const [converting,      setConverting]      = useState(false);
  const [convertDone,     setConvertDone]      = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Fetch via API route (uses admin client → bypasses RLS, filters by session user)
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/diary");
    const data = await res.json();
    if (Array.isArray(data)) setEntries(data as DiaryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session, fetchEntries]);

  const handleSave = async (payload: CreateDiaryEntryPayload) => {
    const res = await fetch("/api/diary", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (res.ok) fetchEntries();
    else {
      const err = await res.json().catch(() => ({}));
      alert("Failed to save entry: " + (err.error ?? "unknown error"));
    }
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/diary/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ archived: true }),
    });
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this diary entry?")) return;
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    fetchEntries();
  };

  // Convert diary entry → task
  const openConvert = (entry: DiaryEntry) => {
    setConvertEntry(entry);
    setConvertTitle(entry.title ?? entry.content.slice(0, 80));
    setConvertPriority("Medium");
    setConvertStatus("To Do");
    setConvertDone(false);
  };

  const handleConvertToTask = async () => {
    if (!convertEntry || !convertTitle.trim()) return;
    setConverting(true);
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        title:       convertTitle.trim(),
        description: convertEntry.content,
        status:      convertStatus,
        priority:    convertPriority,
        category:    convertEntry.tag ?? null,
      }),
    });
    setConverting(false);
    if (res.ok) {
      setConvertDone(true);
      setTimeout(() => { setConvertEntry(null); setConvertDone(false); }, 1500);
    } else {
      alert("Failed to create task.");
    }
  };

  const filtered = filter === "All" ? entries : entries.filter((e) => e.tag === filter);

  if (status === "loading") return null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">
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
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filter === f ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-36 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No entries yet. Write your first thought above!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((entry) => (
              <DiaryEntryCard
                key={entry.id}
                entry={entry}
                onArchive={() => handleArchive(entry.id)}
                onDelete={() => handleDelete(entry.id)}
                onConvertToTask={() => openConvert(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Convert to Task modal ────────────────────────────────── */}
      {convertEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Convert to Task</h2>
              <button onClick={() => setConvertEntry(null)} className="text-slate-300 hover:text-slate-600 text-xl">×</button>
            </div>

            {convertDone ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-semibold text-emerald-700">Task created! Go to Task Board to view it.</p>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                {/* Source entry preview */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 line-clamp-2 italic border border-slate-100">
                  "{convertEntry.content.slice(0, 120)}{convertEntry.content.length > 120 ? "…" : ""}"
                </div>

                {/* Task title */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Task Title *</label>
                  <input
                    autoFocus
                    type="text"
                    value={convertTitle}
                    onChange={(e) => setConvertTitle(e.target.value)}
                    className="w-full text-sm bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
                  <div className="flex gap-1.5">
                    {["To Do", "In Progress", "In Review", "Done"].map((s) => (
                      <button key={s} onClick={() => setConvertStatus(s)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex-1 ${convertStatus === s ? "bg-violet-100 text-violet-700 border-violet-300" : "border-slate-200 text-slate-400"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Priority</label>
                  <div className="flex gap-1.5">
                    {["High","Medium","Low"].map((p) => {
                      const c: Record<string,string> = { High:"border-red-300 bg-red-50 text-red-600", Medium:"border-amber-300 bg-amber-50 text-amber-600", Low:"border-slate-200 bg-slate-50 text-slate-500" };
                      return (
                        <button key={p} onClick={() => setConvertPriority(p)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${convertPriority === p ? c[p] : "border-slate-200 text-slate-400"}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setConvertEntry(null)}
                    className="flex-1 text-sm text-slate-500 py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleConvertToTask} disabled={converting || !convertTitle.trim()}
                    className="flex-1 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 py-2 rounded-xl disabled:opacity-50 transition-colors">
                    {converting ? "Creating…" : "Create Task →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
