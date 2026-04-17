"use client";

import { useEffect, useRef, useState } from "react";
import type { DiaryEntry } from "@/types";
import { DiaryTagBadge, diaryTagBorderClass } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatTime } from "@/lib/utils";

interface Props {
  entry:            DiaryEntry;
  onLinkTask?:      (entry: DiaryEntry) => void;
  onArchive?:       () => void;
  onDelete?:        () => void;
  onConvertToTask?: () => void;
}

export function DiaryEntryCard({ entry, onLinkTask, onArchive, onDelete, onConvertToTask }: Props) {
  const [imgExpanded, setImgExpanded] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDrawing = entry.entry_type === "drawing" || !!entry.handwriting_url;

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Only render the overflow button if at least one secondary action exists
  const hasOverflow = Boolean(onArchive || onDelete);
  const hasFooterActions = Boolean(onConvertToTask || onLinkTask);

  return (
    <div
      className={`bg-white rounded-2xl border-l-4 ${diaryTagBorderClass(entry.tag)} border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow`}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <DiaryTagBadge tag={entry.tag} />
          {isDrawing && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              ✦ Drawing
            </span>
          )}
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {formatDate(entry.created_at)} · {formatTime(entry.created_at)}
          </span>
        </div>

        {/* Overflow menu — Archive / Delete tuck in here so the visible chrome
            stays clean, matching the `···` affordance in the design mock. */}
        {hasOverflow && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-slate-300 hover:text-slate-600 text-lg leading-none px-1.5 py-0.5 rounded-md hover:bg-slate-50 transition-colors"
              aria-label="More actions"
              title="More actions"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-white rounded-xl border border-slate-200 shadow-xl py-1 w-40 z-20">
                {onArchive && (
                  <button
                    onClick={() => { setMenuOpen(false); onArchive(); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                  >
                    📦 Archive
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors font-medium"
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Title ─────────────────────────────────────────────────── */}
      {entry.title && (
        <h3 className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{entry.title}</h3>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
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
        <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {entry.content}
        </p>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      {(entry.author || hasFooterActions) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
          {entry.author && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar profile={entry.author} size="xs" />
              <span className="text-xs text-slate-400 truncate">{entry.author.name}</span>
            </div>
          )}
          {hasFooterActions && (
            <div className="ml-auto flex items-center gap-4">
              {onConvertToTask && (
                <button
                  onClick={onConvertToTask}
                  className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
                  title="Convert this entry into a task"
                >
                  → Task
                </button>
              )}
              {onLinkTask && (
                <button
                  onClick={() => onLinkTask(entry)}
                  className="text-xs text-slate-400 hover:text-violet-600 transition-colors"
                >
                  Link to task
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
