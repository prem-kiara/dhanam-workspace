"use client";

import { useState } from "react";
import {
  Profile, TaskCategory, TaskSubcategory, TaskPriority,
  CreateTaskPayload, NotifyChannels,
} from "@/types";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  categories:   TaskCategory[];
  subcategories: TaskSubcategory[];
  profiles:      Profile[];
  defaultCategoryId?:    string;
  defaultSubcategoryId?: string;
  onClose:  () => void;
  onCreated: () => void;
}

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High"];

export function AddTaskModal({
  categories, subcategories, profiles,
  defaultCategoryId, defaultSubcategoryId,
  onClose, onCreated,
}: Props) {
  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [categoryId,     setCategoryId]     = useState(defaultCategoryId ?? "");
  const [subcategoryId,  setSubcategoryId]  = useState(defaultSubcategoryId ?? "");
  const [assigneeId,     setAssigneeId]     = useState("");
  const [priority,       setPriority]       = useState<TaskPriority>("Medium");
  const [dueDate,        setDueDate]        = useState("");
  const [notifyEmail,    setNotifyEmail]    = useState(true);
  const [notifyInapp,    setNotifyInapp]    = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  const filteredSubs = subcategories.filter((s) => s.category_id === categoryId);

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setSubcategoryId(""); // Reset sub when category changes
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");

    const channels: NotifyChannels = { email: notifyEmail, inapp: notifyInapp };
    const payload: CreateTaskPayload = {
      title:           title.trim(),
      description:     description.trim() || undefined,
      category_id:     categoryId    || undefined,
      subcategory_id:  subcategoryId || undefined,
      assignee_id:     assigneeId    || undefined,
      priority,
      due_date:        dueDate       || undefined,
      notify_channels: assigneeId ? channels : undefined,
    };

    // Use the API route — it uses the admin client (bypasses RLS) and
    // reads session.user.id server-side (guaranteed to be the Azure OID UUID)
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create task. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800">New Task</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)…"
              rows={3}
              className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>

          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Subcategory
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId}
                className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer disabled:opacity-40"
              >
                <option value="">— None —</option>
                {filteredSubs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Priority
              </label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => {
                  const styles: Record<TaskPriority, string> = {
                    High:   "border-red-300 bg-red-50 text-red-600",
                    Medium: "border-amber-300 bg-amber-50 text-amber-600",
                    Low:    "border-slate-200 bg-slate-50 text-slate-500",
                  };
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${
                        priority === p ? styles[p] : "border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Assign to
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAssigneeId("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  !assigneeId
                    ? "bg-slate-700 text-white border-slate-700"
                    : "border-slate-200 text-slate-400 hover:border-slate-400"
                }`}
              >
                Unassigned
              </button>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setAssigneeId(assigneeId === p.id ? "" : p.id)}
                  title={p.name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    assigneeId === p.id
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-500 hover:border-violet-200"
                  }`}
                >
                  <Avatar profile={p} size="xs" />
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Notify (only if assignee selected) */}
          {assigneeId && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Notify Assignee
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-violet-600"
                  />
                  <span className="text-xs text-slate-600">✉️ Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyInapp}
                    onChange={(e) => setNotifyInapp(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-violet-600"
                  />
                  <span className="text-xs text-slate-600">🔔 In-app</span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-6 py-2 rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
