"use client";

import { useState, useEffect, useCallback } from "react";
import type { Workspace, WorkspaceMember } from "@/types";

export function useWorkspace() {
  const [workspaces,   setWorkspaces]   = useState<Workspace[]>([]);
  const [activeWsId,   setActiveWsId]   = useState<string | null>(null);
  const [members,      setMembers]      = useState<WorkspaceMember[]>([]);
  const [loading,      setLoading]      = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/workspace");
    const data = await res.json();
    const list: Workspace[] = Array.isArray(data) ? data : [];
    setWorkspaces(list);
    if (list.length > 0 && !activeWsId) {
      setActiveWsId(list[0].id);
    }
    setLoading(false);
  }, [activeWsId]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!activeWsId) return;
    fetch(`/api/workspace/${activeWsId}/members`)
      .then((r) => r.json())
      .then((m) => setMembers(Array.isArray(m) ? m : []));
  }, [activeWsId]);

  const createWorkspace = async (name: string) => {
    const res  = await fetch("/api/workspace", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    if (res.ok) {
      const ws = await res.json();
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWsId(ws.id);
    }
  };

  return {
    workspaces, activeWsId, setActiveWsId,
    members, loading, fetchWorkspaces, createWorkspace,
  };
}
