"use client";

import { useState } from "react";

interface Props {
  parentLabel: string;       // e.g. "Credit & Underwriting / Document Review"
  onAdd:       (name: string) => Promise<void>;
  onClose:     () => void;
}

export function AddSubCategoryModal({ parentLabel, onAdd, onClose }: Props) {
  const [name,   setName]   = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xs p-5">
        <p className="text-sm font-bold text-slate-800 mb-1">Add Sub-category</p>
        <p className="text-xs text-slate-400 mb-4">
          Under: <span className="font-medium text-slate-600">{parentLabel}</span>
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Sale Deed Review"
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            className="flex-1 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
