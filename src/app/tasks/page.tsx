"use client";

import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export default function TasksPage() {
  const { status } = useSession();

  if (status === "loading") return null;

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-3 sm:gap-4 h-[calc(100vh-56px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Personal and team work in one place. Your Personal workspace is just for you — team workspaces are shared.
        </p>
      </div>

      {/* Unified board */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <TaskBoard />
      </div>
    </main>
  );
}
