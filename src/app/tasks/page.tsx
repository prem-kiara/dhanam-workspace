"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export default function TasksPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  if (status === "loading") return null;

  return (
    <main className="px-4 sm:px-6 py-6 flex flex-col gap-4 h-[calc(100vh-56px)] overflow-hidden">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Task Board</h1>
        <p className="text-sm text-slate-400 mt-0.5">Track work across your team with full visibility.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <TaskBoard />
      </div>
    </main>
  );
}
