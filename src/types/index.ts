// ─────────────────────────────────────────────────────────────────────────────
// Dhanam Workspace — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus   = "To Do" | "In Progress" | "In Review" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";
export type DiaryTag     = "Team Sync" | "Client Call" | "Strategy" | "Personal";
export type NotifType    = "assign" | "reassign" | "comment" | "status" | "email";
export type DiaryEntryType = "text" | "drawing" | "mixed";

// ─── Database row types ───────────────────────────────────────────────────────

export interface Profile {
  id:         string;
  name:       string;
  email:      string;
  phone:      string | null;
  avatar_url: string | null;
  initials:   string;
  color:      string;
  created_at: string;
}

export interface DiaryEntry {
  id:              string;
  author_id:       string;
  tag:             DiaryTag;
  content:         string;
  entry_type:      DiaryEntryType;
  handwriting_url: string | null;
  created_at:      string;
  updated_at:      string;
  // Joined
  author?:         Profile;
}

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
  // Joined
  subsubcategories?: TaskSubsubcategory[];
}

export interface TaskSubsubcategory {
  id:             string;
  subcategory_id: string;
  name:           string;
  sort_order:     number;
  created_at:     string;
}

export interface Task {
  id:                 string;
  title:              string;
  description:        string | null;
  category_id:        string | null;
  subcategory_id:     string | null;
  subsubcategory_id:  string | null;
  assignee_id:        string | null;
  created_by:         string | null;
  status:             TaskStatus;
  priority:           TaskPriority;
  due_date:           string | null;
  linked_diary_entry: string | null;
  created_at:         string;
  updated_at:         string;
  // Joined
  assignee?:          Profile | null;
  creator?:           Profile | null;
  category?:          TaskCategory | null;
  subcategory?:       TaskSubcategory | null;
  subsubcategory?:    TaskSubsubcategory | null;
  comments?:          TaskComment[];
  _comment_count?:    number;
}

export interface TaskComment {
  id:         string;
  task_id:    string;
  author_id:  string;
  content:    string;
  created_at: string;
  // Joined
  author?:    Profile;
}

export interface Notification {
  id:         string;
  user_id:    string;
  type:       NotifType;
  title:      string;
  body:       string | null;
  task_id:    string | null;
  read:       boolean;
  created_at: string;
  // Joined
  task?:      Task | null;
}

// ─── API payload types ────────────────────────────────────────────────────────

export interface CreateDiaryEntryPayload {
  tag:              DiaryTag;
  content:          string;
  entry_type?:      DiaryEntryType;
  handwriting_url?: string | null;
}

export interface CreateTaskPayload {
  title:              string;
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
  title?:             string;
  description?:       string;
  assignee_id?:       string;
  status?:            TaskStatus;
  priority?:          TaskPriority;
  due_date?:          string;
  subsubcategory_id?: string;
  notify_channels?:   NotifyChannels;
}

export interface NotifyChannels {
  email: boolean;
  inapp: boolean;
}

export interface SendNotificationPayload {
  assignee_id:   string;
  task_id:       string;
  task_title:    string;
  channels:      NotifyChannels;
  action:        "assign" | "reassign";
}

// ─── Board view types (client-side grouping) ──────────────────────────────────

export interface BoardSubsub {
  subsubcategory: TaskSubsubcategory;
  tasks:          Task[];
}

export interface BoardSub {
  subcategory:  TaskSubcategory;
  tasks:        Task[];           // tasks with no sub-sub
  subsubgroups: BoardSubsub[];
}

export interface BoardCategory {
  category:  TaskCategory;
  subgroups: BoardSub[];
  taskCount: number;
}
