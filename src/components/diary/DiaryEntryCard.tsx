"use client";

import { useState } from "react";
import { DiaryEntry } from "@/types";
import { DiaryTagBadge, diaryTagBorderClass } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatTime } from "@/lib/utils";

interface Props {
  entry:       DiaryEntry;
  onLinkTask?: (entry: DiaryEntry) => void;
}

export function DiaryEntryCard({ entry, onLinkTask }: Props) {
  const [imgExpanded, setImgExpanded] = useState(false);
  const isDrawing = entry.entry_type === "drawing" || !!entry.handwriting_url;

  return (
    <div
      className={`bg-white rounded-2xl border-l-4 ${diaryTagBorderClass(entry.tag)} border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DiaryTagBadge tag={entry.tag} />
          {isDrawing && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              ✦ Drawing
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {formatDate(entry.created_at)} · {formatTime(entry.created_at)}
        </span>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isDrawing && entry.handwriting_url ? (
        <div>
          <div
            className={`overflow-hidden rounded-xl border border-slate-100 bg-slate-50 cursor-pointer transition-all ${
              imgExpanded ? "max-h-none" : "max-h-40"
            }`}
            onClick={() => setImgExpanded((v) => !v)}
            title={imgExpanded ? "Click to collapse" : "Click to expand"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.handwriting_url}
              alt="Handwritten diary entry"
              className="w-full object-contain"
              draggable={false}
            />
          </div>
          {!imgExpanded && (
            <button
              onClick={() => setImgExpanded(true)}
              className="text-xs text-violet-500 hover:text-violet-700 mt-1.5 transition-colors"
            >
              Tap to expand drawing
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {entry.content}
        </p>
      )}

      {/* ── Author + footer ───────────────────────────────────────────────── */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
        {entry.author && (
          <div className="flex items-center gap-1.5">
            <Avatar profile={entry.author} size="xs" />
            <span className="text-xs text-slate-400">{entry.author.name}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {onLinkTask && (
            <button
              onClick={() => onLinkTask(entry)}
              className="text-xs text-slate-400 hover:text-violet-600 transition-colors"
            >
              Link to task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
