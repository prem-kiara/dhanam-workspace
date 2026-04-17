"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { PersonalTaskManager } from "@/components/tasks/PersonalTaskManager";

type Tab = "personal" | "team";

export default function TasksPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("team");

  if (status === "loading") return null;

  return (
    <main className="px-4 sm:px-6 py-6 flex flex-col gap-4 h-[calc(100vh-56px)] overflow-hidden">
      {/* Header + tab switcher */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage personal tasks and team work in one place.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("personal")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "personal"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            📌 My Tasks
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "team"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            🏢 Team Board
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "personal" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PersonalTaskManager />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <TaskBoard />
        </div>
      )}
    </main>
  );
}
