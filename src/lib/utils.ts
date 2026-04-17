import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export function formatTime(dateStr: string) {
  return format(new Date(dateStr), "h:mm a");
}

export function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy · h:mm a");
}

export function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "MMM d");
}

// Avatar colour palette — deterministic per name
const COLORS = [
  "bg-violet-500", "bg-rose-500", "bg-amber-500",
  "bg-teal-500",   "bg-blue-500", "bg-pink-500",
  "bg-indigo-500", "bg-orange-500",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
