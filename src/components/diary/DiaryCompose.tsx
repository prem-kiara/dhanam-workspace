"use client";

import { useState } from "react";
import { DiaryTag, DiaryEntryType, CreateDiaryEntryPayload } from "@/types";
import { HandwritingCanvas } from "./HandwritingCanvas";

const TAGS: DiaryTag[] = ["Team Sync", "Client Call", "Strategy", "Personal"];

type Mode = "text" | "drawing";

interface Props {
  onSave: (payload: CreateDiaryEntryPayload) => Promise<void>;
}

export function DiaryCompose({ onSave }: Props) {
  const [tag,             setTag]             = useState<DiaryTag>("Team Sync");
  const [mode,            setMode]            = useState<Mode>("text");
  const [content,         setContent]         = useState("");
  const [handwritingUrl,  setHandwritingUrl]  = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);

  const canSave = mode === "text"
    ? content.trim().length > 0
    : handwritingUrl !== null;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    let entryType: DiaryEntryType = "text";
    if (mode === "drawing") entryType = "drawing";

    await onSave({
      tag,
      content:          mode === "text" ? content.trim() : "(drawing)",
      entry_type:       entryType,
      handwriting_url:  mode === "drawing" ? handwritingUrl : null,
    });

    setContent("");
    setHandwritingUrl(null);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">New Entry</span>

        {/* Mode toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setMode("text")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === "text"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            ✏️ Text
          </button>
          <button
            onClick={() => setMode("drawing")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === "drawing"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            ✦ Draw
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:block">
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* ── Tag selector ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              tag === t
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      {mode === "text" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Capture your thoughts freely — no formatting needed. Just write what's on your mind..."
          rows={5}
          className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 rounded-xl p-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
        />
      ) : (
        <HandwritingCanvas onChange={setHandwritingUrl} height={280} />
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3">
        {mode === "text" ? (
          <p className="text-xs text-slate-400">{content.length} characters</p>
        ) : (
          <p className="text-xs text-slate-400">
            {handwritingUrl ? "✓ Drawing ready to save" : "Draw something above…"}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Entry"}
        </button>
      </div>
    </div>
  );
}
