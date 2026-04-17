"use client";

/**
 * OrgPeoplePicker
 * ───────────────
 * Search your M365 org via /api/org-search (MS Graph → Supabase fallback).
 * Shows existing Supabase profiles as quick-select avatars.
 * Returns a unified { id, name, email, phone } object on selection.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Profile } from "@/types";

export interface OrgPerson {
  id:          string;   // Supabase profile UUID or Azure AD OID
  name:        string;
  email:       string;
  phone?:      string | null;
  initials?:   string;
  color?:      string;
  avatar_url?: string | null;
  jobTitle?:   string | null;
}

interface Props {
  /** Already-loaded Supabase profiles for quick-select */
  profiles?:      Profile[];
  /** Currently selected person */
  selected?:      OrgPerson | null;
  /** Called when a person is selected or cleared */
  onChange:       (person: OrgPerson | null) => void;
  placeholder?:   string;
  label?:         string;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-indigo-500"];
function colorFor(email: string) {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function OrgPeoplePicker({ profiles = [], selected, onChange, placeholder = "Search people…", label = "Assign to" }: Props) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<OrgPerson[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  // Debounced org search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/org-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      // Graph returns { id, displayName, mail, jobTitle, mobilePhone, businessPhones }
      // Supabase fallback returns same shape
      const shaped: OrgPerson[] = (Array.isArray(data) ? data : []).map((p: Record<string, string>) => ({
        id:       p.id,
        name:     p.displayName ?? p.name ?? p.mail,
        email:    p.mail ?? p.email ?? "",
        phone:    p.mobilePhone ?? (Array.isArray(p.businessPhones) ? p.businessPhones[0] : null) ?? null,
        jobTitle: p.jobTitle ?? null,
      }));
      setResults(shaped);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (person: OrgPerson) => {
    onChange(person);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => { onChange(null); setQuery(""); };

  // Shape supabase profiles for quick-select
  const quickProfiles: OrgPerson[] = profiles.map((p) => ({
    id:        p.id,
    name:      p.name,
    email:     p.email,
    phone:     p.phone ?? null,
    initials:  p.initials ?? initials(p.name),
    color:     p.color,
    avatar_url: p.avatar_url,
  }));

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">{label}</label>
      )}

      {/* Selected person pill */}
      {selected ? (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 w-fit">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${selected.color ?? colorFor(selected.email)}`}>
            {selected.initials ?? initials(selected.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-violet-700 leading-none truncate max-w-[140px]">{selected.name}</p>
            {selected.jobTitle && <p className="text-[10px] text-violet-400 truncate max-w-[140px]">{selected.jobTitle}</p>}
          </div>
          <button onClick={clear} className="text-violet-400 hover:text-violet-700 ml-1 text-sm font-bold leading-none">×</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Quick-select from loaded profiles */}
          {quickProfiles.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {quickProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick(p)}
                  title={`${p.name} (${p.email})`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all hover:ring-2 hover:ring-offset-1 hover:ring-violet-400 ${p.color ?? colorFor(p.email)}`}
                >
                  {p.initials ?? initials(p.name)}
                </button>
              ))}
            </div>
          )}

          {/* Search box */}
          <div className="relative" ref={dropRef}>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-violet-300 transition-all">
              <span className="text-slate-400 text-xs">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className="flex-1 text-xs bg-transparent focus:outline-none text-slate-700 placeholder-slate-400 min-w-0"
              />
              {loading && <span className="text-slate-400 text-xs animate-spin">⟳</span>}
            </div>

            {open && (query.length >= 2) && (
              <div className="absolute left-0 right-0 top-10 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                {results.length === 0 && !loading && (
                  <p className="text-xs text-slate-400 text-center py-4">No results for "{query}"</p>
                )}
                {results.map((person) => (
                  <button
                    key={person.id + person.email}
                    onClick={() => pick(person)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${colorFor(person.email)}`}>
                      {initials(person.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{person.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{person.email}{person.jobTitle ? ` · ${person.jobTitle}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
