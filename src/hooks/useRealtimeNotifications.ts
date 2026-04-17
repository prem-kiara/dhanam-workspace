"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";

export function useRealtimeNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    const res  = await fetch("/api/notifications");
    const data = await res.json();
    const list: Notification[] = Array.isArray(data) ? data : [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
  }, [session, fetchNotifications]);

  useEffect(() => {
    if (!session?.user?.email) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `recipient_email=eq.${session.user.email}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);

          // Browser Notification API
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(notif.title, {
                body: notif.body ?? undefined,
                icon: "/favicon.ico",
              });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.email]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAllRead: true }), headers: { "Content-Type": "application/json" } });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return { notifications, unreadCount, fetchNotifications, markAllRead, markRead };
}
