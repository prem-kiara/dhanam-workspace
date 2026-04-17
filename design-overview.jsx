import { useState } from "react";

const TEAM = [
  { id: 1, name: "Suren", initials: "SU", color: "bg-violet-500", email: "suren@dhanam.finance", phone: "+91 98400 00001" },
  { id: 2, name: "Priya", initials: "PR", color: "bg-rose-500", email: "priya@dhanam.finance", phone: "+91 98400 00002" },
  { id: 3, name: "Arjun", initials: "AR", color: "bg-amber-500", email: "arjun@dhanam.finance", phone: "+91 98400 00003" },
  { id: 4, name: "Meera", initials: "ME", color: "bg-teal-500", email: "meera@dhanam.finance", phone: "+91 98400 00004" },
];

const DIARY_ENTRIES = [
  {
    id: 1, date: "Apr 16, 2026", time: "10:42 AM", tag: "Team Sync",
    content: "Discussed Q2 priorities — credit analysis automation should be the focus. Priya raised a point about document ingestion delays from SharePoint. Need to loop in Arjun on the PDF pipeline. Key decision: freeze feature scope by Apr 25.",
    color: "border-violet-400",
  },
  {
    id: 2, date: "Apr 15, 2026", time: "3:15 PM", tag: "Client Call",
    content: "Spoke with Ramesh re: LAP application for his property in Coimbatore. Title deed looks clean but EC has a 3-year gap between 2019–2022. Need legal team to verify before proceeding. He's expecting a decision by end of month.",
    color: "border-amber-400",
  },
  {
    id: 3, date: "Apr 14, 2026", time: "11:00 AM", tag: "Strategy",
    content: "Branch expansion — Madurai and Tirupur are shortlisted. Rental negotiations ongoing for Madurai premises. Tirupur landlord wants a 5-year lock-in which is too long. Revisit after we close the Coimbatore deal.",
    color: "border-teal-400",
  },
  {
    id: 4, date: "Apr 13, 2026", time: "9:30 AM", tag: "Personal",
    content: "Need to review the audit findings from last quarter before the board meeting. Also follow up with Meera on the compliance tracker status. Schedule time with legal team next week.",
    color: "border-blue-400",
  },
];

const TASKS_INIT = [
  {
    id: 1, category: "Credit & Underwriting", sub: "Document Review", subsub: null,
    title: "Review Ramesh Kumar LAP file", assignee: 2, status: "In Progress", priority: "High", due: "Apr 20", comments: 2,
  },
  {
    id: 2, category: "Credit & Underwriting", sub: "Document Review", subsub: null,
    title: "Verify income documents for Kumar Trading", assignee: 3, status: "To Do", priority: "Medium", due: "Apr 23", comments: 0,
  },
  {
    id: 3, category: "Credit & Underwriting", sub: "CRIF & Bureau", subsub: null,
    title: "Pull CRIF report for 3 new applicants", assignee: 4, status: "Done", priority: "High", due: "Apr 15", comments: 1,
  },
  {
    id: 4, category: "Legal & Compliance", sub: "Title Verification", subsub: null,
    title: "EC gap check — Ramesh Coimbatore property", assignee: 1, status: "In Review", priority: "High", due: "Apr 18", comments: 3,
  },
  {
    id: 5, category: "Legal & Compliance", sub: "Title Verification", subsub: "Sale Deed Review",
    title: "Draft legal scrutiny report — Selvam property", assignee: 2, status: "To Do", priority: "Medium", due: "Apr 25", comments: 0,
  },
  {
    id: 6, category: "Operations", sub: "Branch Setup", subsub: null,
    title: "Finalise Madurai branch rental agreement", assignee: 1, status: "In Progress", priority: "Medium", due: "Apr 30", comments: 1,
  },
  {
    id: 7, category: "Operations", sub: "Tech & Systems", subsub: null,
    title: "Test PDF ingestion pipeline from SharePoint", assignee: 3, status: "To Do", priority: "Low", due: "May 02", comments: 0,
  },
];

const NOTIF_INIT = [
  { id: 1, type: "assign", text: "Priya assigned you 'EC gap check — Ramesh'", time: "2m ago", read: false },
  { id: 2, type: "comment", text: "Arjun commented on 'PDF ingestion pipeline'", time: "18m ago", read: false },
  { id: 3, type: "status", text: "Meera moved 'CRIF report' to Done", time: "1h ago", read: true },
  { id: 4, type: "whatsapp", text: "WhatsApp sent to Priya for task assignment", time: "2h ago", read: true },
  { id: 5, type: "email", text: "Email sent to Arjun for new task", time: "3h ago", read: true },
];

const STATUS_CONFIG = {
  "To Do": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  "In Progress": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "In Review": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Done: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const PRIORITY_CONFIG = {
  High: { bg: "bg-red-50", text: "text-red-600" },
  Medium: { bg: "bg-amber-50", text: "text-amber-600" },
  Low: { bg: "bg-slate-50", text: "text-slate-500" },
};

function Avatar({ memberId, size = "sm" }) {
  const m = TEAM.find((t) => t.id === memberId);
  if (!m) return null;
  const s = size === "sm" ? "w-6 h-6 text-xs" : size === "md" ? "w-8 h-8 text-sm" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} ${m.color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {m.initials}
    </div>
  );
}

function TagBadge({ tag }) {
  const map = {
    "Team Sync": "bg-violet-100 text-violet-700",
    "Client Call": "bg-amber-100 text-amber-700",
    Strategy: "bg-teal-100 text-teal-700",
    Personal: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[tag] || "bg-slate-100 text-slate-600"}`}>
      {tag}
    </span>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell({ notifs, onMarkAll }) {
  const [open, setOpen] = useState(false);
  const unread = notifs.filter((n) => !n.read).length;

  const iconMap = {
    assign: "👤",
    comment: "💬",
    status: "🔄",
    email: "✉️",
    whatsapp: "💬",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">Notifications</span>
            <button onClick={onMarkAll} className="text-xs text-violet-600 hover:underline">Mark all read</button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex gap-3 items-start border-b border-slate-50 ${!n.read ? "bg-violet-50" : ""}`}>
                <span className="text-base mt-0.5">{iconMap[n.type]}</span>
                <div className="flex-1">
                  <p className={`text-xs leading-snug ${!n.read ? "text-slate-800 font-medium" : "text-slate-500"}`}>{n.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 text-center">
            <button className="text-xs text-violet-600 hover:underline">View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFY MODAL ─────────────────────────────────────────────────────────────
function NotifyModal({ assigneeId, taskTitle, onClose, onSend }) {
  const member = TEAM.find((t) => t.id === assigneeId);
  const [channels, setChannels] = useState({ email: true, whatsapp: true, inapp: true });
  const [sent, setSent] = useState(false);

  const toggle = (ch) => setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const handleSend = () => {
    setSent(true);
    setTimeout(() => { onSend(channels); onClose(); }, 1200);
  };

  if (!member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-96 p-6">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">✅</div>
            <p className="text-sm font-semibold text-slate-700">Notifications sent!</p>
            <p className="text-xs text-slate-400 text-center">
              {channels.email && `Email → ${member.email}`}<br />
              {channels.whatsapp && `WhatsApp → ${member.phone}`}<br />
              {channels.inapp && "In-app notification delivered"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <Avatar memberId={assigneeId} size="lg" />
              <div>
                <p className="text-sm font-bold text-slate-800">Notify {member.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">Task assigned: <span className="text-slate-600 font-medium">"{taskTitle}"</span></p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {/* Email */}
              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${channels.email ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Email</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </div>
                <input type="checkbox" checked={channels.email} onChange={() => toggle("email")} className="w-4 h-4 accent-violet-600" />
              </label>

              {/* WhatsApp */}
              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${channels.whatsapp ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">WhatsApp</p>
                    <p className="text-xs text-slate-400">{member.phone}</p>
                  </div>
                </div>
                <input type="checkbox" checked={channels.whatsapp} onChange={() => toggle("whatsapp")} className="w-4 h-4 accent-emerald-600" />
              </label>

              {/* In-app */}
              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${channels.inapp ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">In-app notification</p>
                    <p className="text-xs text-slate-400">Delivered in workspace</p>
                  </div>
                </div>
                <input type="checkbox" checked={channels.inapp} onChange={() => toggle("inapp")} className="w-4 h-4 accent-blue-600" />
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50">
                Skip
              </button>
              <button onClick={handleSend} className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700">
                Send Notifications
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DIARY ────────────────────────────────────────────────────────────────────
function DiaryView() {
  const [newEntry, setNewEntry] = useState("");
  const [newTag, setNewTag] = useState("Team Sync");

  return (
    <div className="flex flex-col gap-5">
      {/* Compose — full width */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">New Entry</span>
          <span className="text-xs text-slate-400">Apr 16, 2026 · 10:44 AM</span>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {["Team Sync", "Client Call", "Strategy", "Personal"].map((t) => (
            <button
              key={t}
              onClick={() => setNewTag(t)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                newTag === t ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="Capture your thoughts freely — no formatting needed. Just write what's on your mind..."
          className="w-full h-28 text-sm text-slate-700 placeholder-slate-300 bg-slate-50 rounded-xl p-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-400">{newEntry.length} characters</p>
          <button className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Save Entry
          </button>
        </div>
      </div>

      {/* This Month — full width */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">This Month</p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Entries", val: "12", icon: "📓", color: "bg-violet-50 text-violet-700" },
            { label: "Team Syncs", val: "5", icon: "🤝", color: "bg-blue-50 text-blue-700" },
            { label: "Client Calls", val: "4", icon: "📞", color: "bg-amber-50 text-amber-700" },
            { label: "Strategy Notes", val: "3", icon: "🎯", color: "bg-teal-50 text-teal-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3`}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold">{s.val}</p>
                <p className="text-xs font-medium opacity-75">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-500">Recent Entries</p>
          <div className="flex gap-2">
            {["All", "Team Sync", "Client Call", "Strategy"].map((f) => (
              <button key={f} className={`text-xs px-3 py-1 rounded-full border ${f === "All" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {DIARY_ENTRIES.map((entry) => (
            <div key={entry.id} className={`bg-white rounded-2xl border-l-4 ${entry.color} border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TagBadge tag={entry.tag} />
                  <span className="text-xs text-slate-400">{entry.date} · {entry.time}</span>
                </div>
                <button className="text-slate-300 hover:text-slate-500 text-xs">···</button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{entry.content}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
                <button className="text-xs text-slate-400 hover:text-violet-600">+ Add note</button>
                <button className="text-xs text-slate-400 hover:text-violet-600">Link to task</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick, isSelected }) {
  const st = STATUS_CONFIG[task.status];
  const pr = PRIORITY_CONFIG[task.priority];
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-3.5 hover:shadow-md transition-all cursor-pointer group ${isSelected ? "border-violet-400 shadow-md" : "border-slate-200 hover:border-violet-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-700 font-medium leading-snug group-hover:text-violet-700 transition-colors">{task.title}</p>
        <Avatar memberId={task.assignee} />
      </div>
      {task.subsub && (
        <p className="text-xs text-slate-400 mb-1.5">↳ {task.subsub}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{task.status}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.bg} ${pr.text}`}>{task.priority}</span>
        <span className="text-xs text-slate-400 ml-auto">Due {task.due}</span>
        {task.comments > 0 && <span className="text-xs text-slate-400">💬 {task.comments}</span>}
      </div>
    </div>
  );
}

// ─── TASK DETAIL PANEL ────────────────────────────────────────────────────────
function TaskDetailPanel({ task, onClose, onReassign }) {
  const member = TEAM.find((t) => t.id === task.assignee);
  const st = STATUS_CONFIG[task.status];

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col max-h-full overflow-y-auto">
      <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 font-medium">{task.category} / {task.sub}{task.subsub ? ` / ${task.subsub}` : ""}</span>
          <h3 className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{task.title}</h3>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-xl leading-none mt-0.5 flex-shrink-0">×</button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Status + Due */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <select className={`text-xs font-medium px-2 py-1.5 rounded-lg border ${st.bg} ${st.text} border-slate-200 cursor-pointer w-full`}>
              {Object.keys(STATUS_CONFIG).map((s) => <option key={s} selected={s === task.status}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Due Date</p>
            <p className="text-xs font-medium text-slate-700 mt-1.5">{task.due}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Assignee</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar memberId={task.assignee} />
              <span className="text-xs font-medium text-slate-700">{member?.name}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Priority</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].text}`}>
              {task.priority}
            </span>
          </div>
        </div>

        {/* Reassign + Notify */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Reassign to</p>
          <div className="flex gap-2 mb-2">
            {TEAM.map((m) => (
              <button
                key={m.id}
                title={m.name}
                onClick={() => onReassign(task, m.id)}
                className={`w-8 h-8 ${m.color} rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all ${m.id === task.assignee ? "ring-2 ring-offset-1 ring-violet-500" : "opacity-50 hover:opacity-100"}`}
              >
                {m.initials}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded-lg font-medium flex items-center gap-1">✉️ Auto email</span>
            <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-medium flex items-center gap-1">💬 Auto WhatsApp</span>
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium flex items-center gap-1">🔔 In-app</span>
          </div>
        </div>

        {/* Comments */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Collaboration</p>
          <div className="flex flex-col gap-2">
            {task.comments > 0 ? (
              <>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Avatar memberId={2} size="sm" />
                    <span className="text-xs font-medium text-slate-600">Priya</span>
                    <span className="text-xs text-slate-400 ml-auto">2h ago</span>
                  </div>
                  <p className="text-xs text-slate-600">EC gap documents uploaded. Please verify the 2019 sale deed copy.</p>
                </div>
                {task.comments > 1 && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Avatar memberId={1} size="sm" />
                      <span className="text-xs font-medium text-slate-600">Suren</span>
                      <span className="text-xs text-slate-400 ml-auto">1h ago</span>
                    </div>
                    <p className="text-xs text-slate-600">On it. Will update status by EOD.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">No comments yet.</p>
            )}
          </div>
        </div>

        {/* Add comment */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <input placeholder="Add a comment..." className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300" />
          <button className="bg-violet-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-violet-700">Send</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD SUBSUB MODAL ─────────────────────────────────────────────────────────
function AddSubSubModal({ category, sub, onAdd, onClose }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-80 p-5">
        <p className="text-sm font-bold text-slate-800 mb-1">Add sub-category</p>
        <p className="text-xs text-slate-400 mb-4">Under: <span className="font-medium text-slate-600">{category} / {sub}</span></p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sale Deed Review"
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={() => name.trim() && onAdd(name.trim())} className="flex-1 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700">Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── TASK BOARD ───────────────────────────────────────────────────────────────
function TaskBoardView({ onNotify }) {
  const [tasks, setTasks] = useState(TASKS_INIT);
  const [selectedTask, setSelectedTask] = useState(null);
  const [collapsedCat, setCollapsedCat] = useState({});
  const [collapsedSub, setCollapsedSub] = useState({});
  const [addSubSubFor, setAddSubSubFor] = useState(null); // { category, sub }

  const categories = [...new Set(tasks.map((t) => t.category))];

  const toggleCat = (cat) => setCollapsedCat((p) => ({ ...p, [cat]: !p[cat] }));
  const toggleSub = (key) => setCollapsedSub((p) => ({ ...p, [key]: !p[key] }));

  const handleReassign = (task, newMemberId) => {
    if (task.assignee === newMemberId) return;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, assignee: newMemberId } : t));
    setSelectedTask((prev) => prev && prev.id === task.id ? { ...prev, assignee: newMemberId } : prev);
    onNotify({ ...task, assignee: newMemberId });
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
            {TEAM.map((m) => (
              <button key={m.id} title={m.name} className={`w-7 h-7 ${m.color} rounded-full flex items-center justify-center text-white text-xs font-semibold opacity-70 hover:opacity-100 transition-all`}>
                {m.initials}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex gap-1.5 flex-wrap">
            {Object.keys(STATUS_CONFIG).map((s) => {
              const st = STATUS_CONFIG[s];
              return (
                <span key={s} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{s}
                </span>
              );
            })}
          </div>
          <button className="ml-auto text-xs bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 font-medium">
            + New Task
          </button>
        </div>

        {/* Categories */}
        {categories.map((cat) => {
          const catTasks = tasks.filter((t) => t.category === cat);
          const subs = [...new Set(catTasks.map((t) => t.sub))];
          const isCatCollapsed = collapsedCat[cat];

          return (
            <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">{cat}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{catTasks.length} tasks</span>
                  <div className="flex gap-1">
                    {catTasks.map((t) => (
                      <span key={t.id} className={`w-2 h-2 rounded-full ${STATUS_CONFIG[t.status].dot}`} title={t.status} />
                    ))}
                  </div>
                </div>
                <span className="text-slate-400 text-sm">{isCatCollapsed ? "▸" : "▾"}</span>
              </button>

              {!isCatCollapsed && (
                <div className="border-t border-slate-100">
                  {subs.map((sub) => {
                    const subKey = `${cat}::${sub}`;
                    const subTasks = catTasks.filter((t) => t.sub === sub);
                    const subSubNames = [...new Set(subTasks.filter((t) => t.subsub).map((t) => t.subsub))];
                    const noSubSubTasks = subTasks.filter((t) => !t.subsub);
                    const isSubCollapsed = collapsedSub[subKey];

                    return (
                      <div key={sub} className="border-b border-slate-100 last:border-0">
                        {/* Sub header — collapsible */}
                        <button
                          onClick={() => toggleSub(subKey)}
                          className="w-full px-5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{sub}</span>
                            <span className="text-xs text-slate-400">({subTasks.length})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddSubSubFor({ category: cat, sub }); }}
                              className="text-xs text-violet-500 hover:text-violet-700 px-2 py-0.5 rounded-md hover:bg-violet-50 font-medium"
                            >
                              + Sub-category
                            </button>
                            <span className="text-slate-400 text-xs">{isSubCollapsed ? "▸" : "▾"}</span>
                          </div>
                        </button>

                        {!isSubCollapsed && (
                          <div className="p-3">
                            {/* Tasks without subsub */}
                            {noSubSubTasks.length > 0 && (
                              <div className="grid grid-cols-1 gap-2 mb-2">
                                {noSubSubTasks.map((task) => (
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTask?.id === task.id}
                                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Sub-sub-categories */}
                            {subSubNames.map((ssName) => {
                              const ssKey = `${subKey}::${ssName}`;
                              const ssTasks = subTasks.filter((t) => t.subsub === ssName);
                              const isSsCollapsed = collapsedSub[ssKey];
                              return (
                                <div key={ssName} className="ml-3 border-l-2 border-violet-100 pl-3 mb-2">
                                  <button
                                    onClick={() => toggleSub(ssKey)}
                                    className="w-full flex items-center justify-between py-1.5 mb-1.5"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-violet-500">↳ {ssName}</span>
                                      <span className="text-xs text-slate-400">({ssTasks.length})</span>
                                    </div>
                                    <span className="text-slate-400 text-xs">{isSsCollapsed ? "▸" : "▾"}</span>
                                  </button>
                                  {!isSsCollapsed && (
                                    <div className="grid grid-cols-1 gap-2">
                                      {ssTasks.map((task) => (
                                        <TaskCard
                                          key={task.id}
                                          task={task}
                                          isSelected={selectedTask?.id === task.id}
                                          onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <button className="text-xs text-slate-400 hover:text-violet-600 text-left px-1 py-1 hover:bg-violet-50 rounded-lg transition-colors w-full mt-1">
                              + Add task in {sub}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onReassign={handleReassign}
        />
      )}

      {/* Add sub-subcategory modal */}
      {addSubSubFor && (
        <AddSubSubModal
          category={addSubSubFor.category}
          sub={addSubSubFor.sub}
          onAdd={(name) => {
            setAddSubSubFor(null);
          }}
          onClose={() => setAddSubSubFor(null)}
        />
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("diary");
  const [notifs, setNotifs] = useState(NOTIF_INIT);
  const [notifyModal, setNotifyModal] = useState(null); // { task, newMemberId }

  const handleNotify = (task) => {
    setNotifyModal(task);
  };

  const handleNotifySent = (channels) => {
    const member = TEAM.find((t) => t.id === notifyModal.assignee);
    const newNotifs = [];
    if (channels.inapp) newNotifs.push({ id: Date.now(), type: "assign", text: `Task assigned to ${member?.name}: "${notifyModal.title}"`, time: "Just now", read: false });
    if (channels.email) newNotifs.push({ id: Date.now() + 1, type: "email", text: `Email sent to ${member?.name} → ${member?.email}`, time: "Just now", read: false });
    if (channels.whatsapp) newNotifs.push({ id: Date.now() + 2, type: "whatsapp", text: `WhatsApp sent to ${member?.name} → ${member?.phone}`, time: "Just now", read: false });
    setNotifs((prev) => [...newNotifs, ...prev]);
    setNotifyModal(null);
  };

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top nav */}
      <div className="bg-white border-b border-slate-200 px-8 py-0 flex items-center gap-8 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 py-4">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <span className="font-bold text-slate-800 text-sm">Dhanam</span>
          <span className="text-slate-300 text-xs font-medium ml-1">Workspace</span>
        </div>
        <div className="flex gap-1 ml-4">
          {[{ id: "diary", label: "📓  Diary" }, { id: "tasks", label: "📋  Task Board" }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {TEAM.map((m) => (
              <div key={m.id} className={`w-7 h-7 ${m.color} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold`} title={m.name}>
                {m.initials}
              </div>
            ))}
          </div>
          <NotificationBell notifs={notifs} onMarkAll={markAllRead} />
          <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold">SU</div>
        </div>
      </div>

      {/* Page content */}
      <div className="px-8 py-6 max-w-6xl mx-auto">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{tab === "diary" ? "My Diary" : "Task Board"}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {tab === "diary" ? "Capture thoughts freely — one entry at a time." : "Track work across your team with full visibility."}
            </p>
          </div>
          {tab === "tasks" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{TASKS_INIT.filter((t) => t.status === "Done").length}/{TASKS_INIT.length} tasks complete</span>
              <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(TASKS_INIT.filter((t) => t.status === "Done").length / TASKS_INIT.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {tab === "diary"
          ? <DiaryView />
          : <div style={{ height: "calc(100vh - 160px)" }}><TaskBoardView onNotify={handleNotify} /></div>
        }
      </div>

      {/* Notify modal */}
      {notifyModal && (
        <NotifyModal
          assigneeId={notifyModal.assignee}
          taskTitle={notifyModal.title}
          onClose={() => setNotifyModal(null)}
          onSend={handleNotifySent}
        />
      )}
    </div>
  );
}
