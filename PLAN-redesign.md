# Dhanam Workspace — Visual Redesign Plan

**Date:** 2026-04-17
**Author:** Prem (VP Tech) + Claude
**Reference mock:** `design-overview.jsx`
**Target app:** this repo (`dhanam-workspace`), currently live at dhanam-workspace.vercel.app

---

## 1. North star

Keep every piece of Ddiary's backend (M365 auth, Supabase, realtime, notifications, email templates, MS Graph). **Only the UI shell and data presentation changes.** The app should *feel* like the uploaded mock — two tabs, no sidebar, airy white cards on slate-50, violet accents, wide content area, fully responsive from phone to wide monitor.

## 2. Hard rule — no feature removals

**Nothing in Ddiary gets deleted or dropped.** If the new layout makes a feature *seem* gone, it has simply moved to a new home. Every capability that works today must still work after the redesign. The redesign is a relocation and restyle, never a subtraction.

Concrete consequences for this plan:

- `PersonalTaskManager.tsx` functionality → lives as the user's **Personal workspace** (auto-provisioned, private, one member). Same view, same add-task flow, same completion toggle — just rendered through the unified board.
- `WorkspaceCollabPanel.tsx` functionality (status staging, comments, activity log, reassignment) → lives inside `TaskDetailPanel.tsx`. Same buttons, same API calls, same realtime updates.
- Settings page (`/settings`) → still exists at the same route. Access moves from a top-nav tab to the avatar dropdown. The page itself is untouched.
- "My Tasks / Team Board" tab switcher → goes away visually, but both views' contents are preserved — Personal tasks appear as a Personal workspace section, team workspaces appear as their own sections, all on one screen.
- Workspace management (create, rename, invite, delete members) → still exists. Access moves into an avatar-dropdown modal. All existing `/api/workspace/**` endpoints stay wired up.
- Notifications inbox → still exists. Accessible from the bell icon as today, plus a "View all" entry in the avatar dropdown.
- Handwriting canvas → still exists. Access moves from being default to being behind a "Switch to handwriting" toggle inside compose. No code deletion.

If I'm about to remove a file and can't point to where its capability lives, I stop and ask you first.

## 3. Locked-in decisions (from our Q&A)

| Topic | Decision |
|---|---|
| Scope | Visual refresh **and** simplify surface to 2 tabs (Diary, Task Board). No sidebar. |
| Handwriting canvas | Keep, but hidden behind a "Switch to handwriting" toggle inside compose. Text is the default. |
| Task model | **Each category IS a workspace.** "Personal" is auto-created per user (private, 1 member). Creating a new category opens an "Invite people" modal. |
| Aux pages | Settings, Workspace management, Notifications inbox → all under the avatar dropdown in the top-right. |
| Responsive | Full responsive. Content should stay **wide** on large screens — no tight `max-w-5xl mx-auto` centering. |
| Plan first | You review this doc before I touch code. |

## 4. Confirmed answers (resolved 2026-04-17)

1. **Multi-workspace visibility** — ✅ Stack. The board shows every workspace the user is a member of, each as a collapsible section, matching the mock.
2. **Sub / sub-sub hierarchy** — ✅ Keep the existing `sub` / `subsub` text columns and render them as uppercase labels + indented violet-left-border groups.
3. **Existing workspaces** — ✅ Auto-become categories; no migration; users without a "Personal" workspace get one auto-provisioned on next login.
4. **Diary tags vs task categories** — ✅ Diary tag enum stays (Team Sync / Client Call / Strategy / Personal); unrelated to task workspaces.

## 5. File-by-file change list

Each entry is `path — scope-of-change`. Items marked **MAJOR** need a partial rewrite; others are styling only. Per §2, no file's functionality is lost; files only get **restyled**, **renamed**, or **retired-with-behavior-moved**.

### 5.1 Shell

| File | Change |
|---|---|
| `src/components/layout/Navbar.tsx` | Move Settings from top-nav TABS array into the existing avatar dropdown (dropdown already has it — just remove the duplicate top tab). Keep `/settings` route alive. Remove `max-w` on `<header>`, let content span. |
| `src/app/layout.tsx` | No change. |
| `src/app/globals.css` | Set `body { background: #f8fafc; font-family: ui-sans-serif, system-ui, ...; }`. |

### 5.2 Diary

| File | Change |
|---|---|
| `src/app/diary/page.tsx` | Drop `max-w-5xl mx-auto`. Widen to `px-6 lg:px-8`. Re-grid: 1 col phone, 2 col tablet+. Restyle filter chips to match mock. All existing actions (archive, delete, convert-to-task) preserved. |
| `src/components/diary/DiaryCompose.tsx` | Inline tag pills matching mock. Add "Switch to handwriting" toggle top-right (handwriting preserved, just not the default). Show today's date/time. Character counter in footer. |
| `src/components/diary/DiaryEntryCard.tsx` | `border-l-4` colored strip (violet/amber/teal/blue per tag). Tag pill + date/time inline. Preserve all row actions (archive, delete, convert-to-task) — move to an overflow `···` menu to match the mock's minimal footer. |
| `src/components/diary/DiaryStats.tsx` | 4 pastel tiles (2×2 phone, 4×1 desktop) with emoji + number + label, matching mock's This Month section. |
| `src/components/diary/HandwritingCanvas.tsx` | No logic change. Wrap in a `rounded-2xl border border-slate-200` container to match card aesthetic. |

### 5.3 Task Board — **MAJOR**

| File | Change |
|---|---|
| `src/app/tasks/page.tsx` | Replace the "My Tasks / Team Board" tab switcher with a single `<TaskBoard />` render. No functional loss — My Tasks becomes the "Personal" workspace section at the top of the unified board. Remove the `h-[calc(100vh-56px)]` container. |
| `src/components/tasks/TaskBoard.tsx` | **MAJOR.** Remove `activeWsId` single-workspace filter. Fetch tasks across all the user's workspaces in one query. Group in render: workspace → sub → sub-sub. Each workspace is a top-level collapsible card (mirroring the mock's Credit & Underwriting section). Status/priority/assignee filter chips consolidate into a single compact toolbar above the list. All existing features (realtime, delete, reassign, filter, progress bar) preserved. |
| `src/components/tasks/TaskCard.tsx` | Restyle to match mock: title (truncate-2) + assignee avatar top-right; below: status pill with colored dot, priority pill, due date, 💬 comment count if > 0. All data still rendered, just re-laid-out. |
| `src/components/tasks/TaskDetailPanel.tsx` | Restyle as mock's right-side 320 px slide-in panel. On < 768 px, become a bottom-sheet covering 80 vh. **Absorb** the logic from `WorkspaceCollabPanel.tsx` (status staging, comments, activity log, reassignment) directly into this file so the detail panel is one-stop. No behaviors lost. |
| `src/components/tasks/AddTaskModal.tsx` | Add a workspace picker row (default = the workspace the "+ Add" button was clicked in, else Personal). Rest unchanged. |
| `src/components/tasks/AddSubCategoryModal.tsx` | Keep as-is or rename to `AddSubGroupModal` for clarity. Same text-only `sub` / `subsub` creation flow. |
| **NEW:** `src/components/tasks/CreateWorkspaceModal.tsx` | "+ Category" button opens this. Name input + OrgPeoplePicker (multi-select) + create button. Calls POST `/api/workspace`, then POST `/api/workspace/[wsId]/invites` for each invitee. |
| `src/components/tasks/PersonalTaskManager.tsx` | **Retire the file** — but only because its role is fully replaced by the Personal workspace rendering inside `TaskBoard.tsx`. Every feature the user had in My Tasks (add, toggle complete, expand-to-see-collab-panel) continues to work, just through the unified board. If the Personal workspace render doesn't achieve 100% parity, I keep the file and wire it as the "Personal" tab instead. |
| `src/components/tasks/WorkspaceCollabPanel.tsx` | **Retire the file** after inlining its logic into `TaskDetailPanel.tsx`. Zero behavior lost — it's purely a code-org move. |
| `src/components/tasks/NotifyModal.tsx` | No logic change. Light restyle to match mock. |

### 5.4 Hooks & data

| File | Change |
|---|---|
| `src/hooks/useWorkspace.ts` | Remove concept of single "active" workspace. Return `workspaces[]`, `membersByWsId{}`. Still fetches on mount. |
| `src/hooks/useRealtimeTasks.ts` | Subscribe to the full `tasks` table for any workspace the user is in, not just one. |
| `src/app/api/workspace/route.ts` | On GET: if user has zero workspaces, auto-create a "Personal" workspace (name = "Personal", created_by = user, single member). Idempotent. |
| `src/app/api/tasks/route.ts` | GET: accept optional `?workspace_id=` for filtering; by default return all tasks across all user's workspaces. |

### 5.5 Avatar dropdown (the new aux-page home)

Content inside the existing dropdown (in `Navbar.tsx`):
- Profile header (name + email) — already there
- `⚙️ Settings` link → `/settings` — already there
- **NEW:** `🏢 Manage workspaces` → opens a modal listing all the user's workspaces with rename / delete / invite controls (wraps existing `/api/workspace/**` endpoints)
- **NEW:** `🔔 All notifications` → opens the full notification inbox (right-side drawer). The bell icon and its popup also stay where they are.
- `↩ Sign out` — already there

### 5.6 No changes

- Supabase migrations — nothing new.
- `src/lib/auth.ts` — stays.
- `src/lib/email/templates/**` — stay (already violet-branded).
- `src/lib/notifications/**` — stay.
- `src/app/api/send-notification/route.ts`, `org-search/route.ts`, etc. — stay.

## 6. Responsive breakpoints

| Screen | Diary cards | Task board | Task detail panel | Nav |
|---|---|---|---|---|
| < 640 px (phone) | 1 col | full-width stack | bottom sheet, 80 vh | hamburger drawer |
| 640–1024 px (tablet) | 2 col | full-width with collapsible workspaces | slide-in from right, 75% width overlay | inline tabs |
| 1024–1440 px (laptop) | 2 col | 2-pane: list + 320 px panel | 320 px side panel | inline tabs |
| > 1440 px (wide) | 2 col, cards wider | 2-pane, list uses `flex-1 min-w-0`, no artificial max width | 360–400 px side panel | inline tabs |

Tailwind classes use `sm:`, `md:`, `lg:`, `xl:` consistently. Container is `px-4 sm:px-6 lg:px-8` with no `max-w` wrapper — content breathes on wide monitors.

## 7. Rollout order (how I'll code it)

1. **Shell** (~30 min) — Navbar dropdown reshuffle, widen container, `globals.css`. Ship-able on its own.
2. **Diary visuals** (~1 h) — restyle compose / card / stats / filter row. Handwriting toggle in compose. Backend untouched.
3. **Task board refactor** (~2–3 h, highest risk) — multi-workspace grouping; retire PersonalTaskManager *after* verifying parity; fold WorkspaceCollabPanel into TaskDetailPanel; new `CreateWorkspaceModal`; auto-provision Personal workspace in API.
4. **Responsive sweep** (~45 min) — test at 375 / 768 / 1440 / 1920 px. Bottom-sheet for task detail on phones.
5. **Avatar dropdown polish** (~30 min) — Workspaces management modal, Notifications inbox drawer.
6. **QA pass** — click through every existing flow with a real M365 session and tick off the feature-parity checklist (§10).

Total estimate: **half a working day** of hands-on coding, assuming no schema surprises.

## 8. What I will NOT touch unless you say so

- Any Supabase migration.
- M365 / NextAuth configuration.
- Email template HTML.
- WhatsApp / Resend integrations.
- The `/api/org-search` proxy.

## 9. Risk notes

- **Personal-workspace parity.** Before I retire `PersonalTaskManager.tsx`, I'll verify that every action it supports (add task, toggle complete, expand collab panel, realtime updates) is reproducible by scrolling to the auto-provisioned Personal workspace on the unified board. If parity isn't 100%, I keep the file in place and wire it in as the first collapsible section.
- **Multi-workspace rendering performance.** If a user ends up in 20 workspaces, stacking all of them may hurt. Mitigation: collapse all by default except the user's Personal + most-recently-touched; lazy-load task lists when a workspace expands. Deferred until we see real usage.
- **Existing `tasks.category` text column.** Under the new model it becomes redundant (workspace name replaces it). I leave it nullable and ignored in the UI rather than migrate it away — preserves v1 read paths in case anything still depends on it.

## 10. Feature-parity checklist (to tick off in step 6)

I won't close this task until every item below is reachable in the new UI:

**Diary**
- [ ] Text entry create
- [ ] Handwriting entry create (via toggle)
- [ ] Title field
- [ ] Tag selection (all 4 tags)
- [ ] Archive entry
- [ ] Soft-delete entry
- [ ] Convert diary entry → task
- [ ] Tag filter chips
- [ ] Realtime new-entry updates
- [ ] Stats tiles populate

**Tasks**
- [ ] Create task (personal + team workspace)
- [ ] Status change (To Do / In Progress / In Review / Done)
- [ ] Priority change
- [ ] Due date
- [ ] Assignee pick from M365 org search
- [ ] Reassign with notify modal
- [ ] Delete task
- [ ] Sub / sub-sub grouping
- [ ] Comments
- [ ] Activity log
- [ ] Realtime task updates
- [ ] Filter by assignee
- [ ] Filter by status
- [ ] Progress bar

**Workspaces**
- [ ] Create workspace
- [ ] Invite people by email
- [ ] Accept / reject pending invite
- [ ] Delete workspace
- [ ] Auto-provisioned Personal workspace on first login

**Notifications**
- [ ] In-app realtime bell
- [ ] Email (Resend, 6 templates)
- [ ] WhatsApp deep link
- [ ] Browser push
- [ ] "All notifications" inbox

**Auth & settings**
- [ ] M365 sign in
- [ ] Sign out
- [ ] Profile name + phone edit
- [ ] Reminder settings
- [ ] Timezone

---

**Your turn — §4 answers are locked in.** Flag anything in §5 / §7 you want adjusted. Say "go" and I start on step 1 (shell).
