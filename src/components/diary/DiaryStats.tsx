import { DiaryEntry } from "@/types";

interface Props {
  entries: DiaryEntry[];
}

export function DiaryStats({ entries }: Props) {
  const now   = new Date();
  const month = entries.filter((e) => {
    const d = new Date(e.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const stats = [
    { label: "Total Entries",  val: month.length,                                         icon: "📓", color: "bg-violet-50 text-violet-700" },
    { label: "Team Syncs",     val: month.filter((e) => e.tag === "Team Sync").length,    icon: "🤝", color: "bg-blue-50 text-blue-700"    },
    { label: "Client Calls",   val: month.filter((e) => e.tag === "Client Call").length,  icon: "📞", color: "bg-amber-50 text-amber-700"  },
    { label: "Strategy Notes", val: month.filter((e) => e.tag === "Strategy").length,     icon: "🎯", color: "bg-teal-50 text-teal-700"   },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">This Month</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
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
  );
}
