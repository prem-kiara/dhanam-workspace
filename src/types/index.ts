// ─────────────────────────────────────────────────────────────────────────────
// Dhanam Workspace — Shared TypeScript Types (v2)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus     = "To Do" | "In Progress" | "In Review" | "Done";
export type TaskPriority   = "Low" | "Medium" | "High";
export type DiaryTag       = "Team Sync" | "Client Call" | "Strategy" | "Personal";
export type NotifType      = "assign" | "reassign" | "comment" | "status" | "email"
                           | "task_assigned" | "status_changed" | "task_completed"
                           | "workspace_invite";
export type DiaryEntryType = "text" | "drawing" | "mixed";
export type WorkspaceRole  = "admin" | "member";
export type ProfileRole    = "owner" | "member" | "collaborator";
export type ActivityAction = "created" | "status_changed" | "commented" | "reassigned"
                           | "completed" | "reopened";

// ─── Profile settings ─────────────────────────────────────────────────────────
export interface ProfileSettings {
  reminderEmail:          string | null;
  reminderTime:           string;   // "09:00"
  timezone:               string;   // "Asia/Kolkata"
  emailRemindersEnabled:  boolean;
}

// ─── Database row types ───────────────────────────────────────────────────────

export interface Profile {
  id:         string;
  name:       string;
  email:      string;
  phone:      string | null;
  avatar_url: string | null;
  initials:   string;
  color:      string;
  role:       ProfileRole;
  settings:   ProfileSettings;
  created_at: string;
}

export interface DiaryEntry {
  id:              string;
  author_id:       string;
  title:           string | null;
  tag:             DiaryTag;
  content:         string;
  entry_type:      DiaryEntryType;
  handwriting_url: string | null;
  deleted:         boolean;
  archived:        boolean;
  created_at:      string;
  updated_at:      string;
  // Joined
  author?:         Profile;
}

// ─── Workspace types ──────────────────────────────────────────────────────────

export interface Workspace {
  id:          string;
  name:        string;
  created_by:  string;
  created_at:  string;
  is_personal: boolean;
}

export interface WorkspaceMember {
  id:           string;
  workspace_id: string;
  user_id:      string;
  email:        string;
  display_name: string | null;
  role:         WorkspaceRole;
  pending:      boolean;
  created_at:   string;
}

export interface WorkspaceInvite {
  id:             string;
  workspace_id:   string;
  workspace_name: string;
  inviter_id:     string;
  inviter_name:   string;
  invitee_email:  string;
  invitee_name:   string | null;
  status:         "pending" | "accepted" | "rejected";
  created_at:     string;
}

// ─── Task types (unified personal + workspace) ────────────────────────────────

export interface Task {
  id:                 string;
  workspace_id:       string | null;   // null = personal task
  owner_id:           string | null;
  title:              string;          // DB column "title" for backward compat
  task_text:          string | null;   // DB column "task_text" (v2 alias)
  description:        string | null;
  notes:              string | null;
  // Hierarchical grouping (text-based, no FK in v2)
  category:           string | null;
  sub:                string | null;
  subsub:             string | null;
  // Legacy FK-based (v1 compat)
  category_id:        string | null;
  subcategory_id:     string | null;
  subsubcategory_id:  string | null;
  assignee_id:        string | null;
  assignee_email:     string | null;
  assignee_name:      string | null;
  assignee_phone:     string | null;
  created_by:         string | null;
  created_by_name:    string | null;
  status:             TaskStatus;
  priority:           TaskPriority;
  due_date:           string | null;
  completed:          boolean;
  completed_at:       string | null;
  linked_diary_entry: string | null;
  created_at:         string;
  updated_at:         string;
  // Joined
  assignee?:          Profile | null;
  creator?:           Profile | null;
  category_obj?:      TaskCategory | null;
  subcategory?:       TaskSubcategory | null;
  subsubcategory?:    TaskSubsubcategory | null;
  comments?:          TaskComment[];
  activity?:          TaskActivity[];
  _comment_count?:    number;
}

export interface TaskComment {
  id:           string;
  task_id:      string;
  author_id:    string | null;
  author_name:  string;
  author_email: string | null;
  text?:        string;        // v2 field name
  content?:     string;        // v1 field name (compat)
  created_at:   string;
  // Joined
  author?:      Profile;
}

export interface TaskActivity {
  id:          string;
  task_id:     string;
  actor_id:    string | null;
  actor_name:  string;
  action:      ActivityAction;
  detail:      string | null;
  created_at:  string;
}

// ─── Legacy category types (v1 task board) ────────────────────────────────────

export interface TaskCategory {
  id:         string;
  name:       string;
  sort_order: number;
  created_at: string;
}

export interface TaskSubcategory {
  id:          string;
  category_id: string;
  name:        string;
  sort_order:  number;
  created_at:  string;
  subsubcategories?: TaskSubsubcategory[];
}

export interface TaskSubsubcategory {
  id:             string;
  subcategory_id: string;
  name:           string;
  sort_order:     number;
  created_at:     string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id:              string;
  user_id:         string | null;
  recipient_email: string | null;
  sender_email:    string | null;
  sender_name:     string | null;
  type:            NotifType | string;
  title:           string;
  body:            string | null;
  task_id:         string | null;
  workspace_id:    string | null;
  read:            boolean;
  created_at:      string;
  // Joined
  task?:           Task | null;
}

// ─── MS Graph person (org search result) ─────────────────────────────────────

export interface OrgPerson {
  id:               string;
  displayName:      string;
  mail:             string | null;
  jobTitle:         string | null;
  mobilePhone:      string | null;
  businessPhones:   string[];
}

// ─── User phone (WhatsApp) ────────────────────────────────────────────────────

export interface UserPhone {
  email:      string;
  phone:      string;
  updated_at: string;
}

// ─── API payload types ────────────────────────────────────────────────────────

export interface CreateDiaryEntryPayload {
  title?:           string;
  tag:              DiaryTag;
  content:          string;
  entry_type?:      DiaryEntryType;
  handwriting_url?: string | null;
}

export interface CreateTaskPayload {
  // v2 fields
  workspace_id?:      string;
  task_text?:         string;
  notes?:             string;
  category?:          string;
  sub?:               string;
  subsub?:            string;
  assignee_email?:    string;
  assignee_name?:     string;
  assignee_phone?:    string;
  // v1 compat
  title?:             string;
  description?:       string;
  category_id?:       string;
  subcategory_id?:    string;
  subsubcategory_id?: string;
  assignee_id?:       string;
  priority?:          TaskPriority;
  due_date?:          string;
  notify_channels?:   NotifyChannels;
}

export interface UpdateTaskPayload {
  task_text?:         string;
  title?:             string;
  description?:       string;
  notes?:             string;
  assignee_id?:       string;
  assignee_email?:    string;
  assignee_name?:     string;
  assignee_phone?:    string;
  status?:            TaskStatus;
  priority?:          TaskPriority;
  due_date?:          string;
  completed?:         boolean;
  subsubcategory_id?: string;
  subsub?:            string;
  workspace_id?:      string | null;
  notify_channels?:   NotifyChannels;
}

export interface NotifyChannels {
  email:    boolean;
  inapp:    boolean;
  whatsapp?: boolean;
}

export interface SendNotificationPayload {
  assignee_id?:    string;
  assignee_email?: string;
  task_id:         string;
  task_title:      string;
  channels:        NotifyChannels;
  action:          "assign" | "reassign" | "status_changed" | "comment" | "completed";
}

// ─── Board view types (client-side grouping, v1) ──────────────────────────────

export interface BoardSubsub {
  subsubcategory: TaskSubsubcategory;
  tasks:          Task[];
}

export interface BoardSub {
  subcategory:  TaskSubcategory;
  tasks:        Task[];
  subsubgroups: BoardSubsub[];
}

export interface BoardCategory {
  category:  TaskCategory;
  subgroups: BoardSub[];
  taskCount: number;
}

// ─── V2 Board grouping (text-based) ──────────────────────────────────────────

export interface V2BoardSubsub {
  name:  string;
  tasks: Task[];
}

export interface V2BoardSub {
  name:       string;
  tasks:      Task[];
  subgroups:  V2BoardSubsub[];
}

export interface V2BoardGroup {
  category:  string;
  subs:      V2BoardSub[];
  taskCount: number;
}
