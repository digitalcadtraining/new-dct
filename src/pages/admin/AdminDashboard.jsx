/**
 * AdminDashboard — fully live, no dummy data
 * Fetches: /admin/stats, /admin/applications?status=PENDING,
 *          /admin/queries?status=OPEN, /admin/batches
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, GraduationCap, Layers, MessageSquare,
  Clock, ArrowUpRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { adminApi } from "../../services/api.js";
import { useNavigate } from "react-router-dom";

const C = { dark:"#1F1A17", navy:"#003C6E", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#7E7F81" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

/* ─── Skeleton ─────────────────────────────────────────── */
function Skeleton({ h = "h-24", cls = "" }) {
  return <div className={`${h} ${cls} rounded-2xl bg-gray-100 animate-pulse`} />;
}

/* ─── Stat Card ────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, onClick, delay = 0, loading }) {
  if (loading) return <Skeleton h="h-28" />;
  return (
    <motion.div
      className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer group hover:-translate-y-1 transition-all duration-200"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + "18" }}>
          <Icon size={20} style={{ color }} />
        </div>
        <ArrowUpRight size={14} style={{ color: C.lg }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-extrabold mb-0.5" style={{ color: C.dark }}>{value ?? "—"}</p>
      <p className="text-sm font-semibold" style={{ color: C.gray }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: C.lg }}>{sub}</p>}
    </motion.div>
  );
}

/* ─── Panel ────────────────────────────────────────────── */
function Panel({ title, children, onViewAll, delay = 0, loading, empty }) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-extrabold" style={{ color: C.dark }}>{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll}
            className="text-xs font-bold flex items-center gap-1 hover:underline"
            style={{ color: C.primary }}>
            View All <ArrowUpRight size={11} />
          </button>
        )}
      </div>
      {loading
        ? <div className="p-5 space-y-3">{[1,2,3].map(i=><Skeleton key={i} h="h-12"/>)}</div>
        : empty
          ? <div className="py-10 text-center text-sm" style={{ color: C.lg }}>{empty}</div>
          : <div className="divide-y divide-gray-50">{children}</div>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]    = useState(null);
  const [pending,   setPending]  = useState([]);
  const [openQ,     setOpenQ]    = useState([]);
  const [batches,   setBatches]  = useState([]);
  const [loading,   setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.applications("PENDING"),
      adminApi.queries("OPEN"),
      adminApi.batches("ACTIVE"),
    ]).then(([s, apps, queries, batchRes]) => {
      setStats(s.data || s);
      setPending((apps.data || []).slice(0, 3));
      setOpenQ((queries.data || []).slice(0, 4));
      setBatches((batchRes.data || []).slice(0, 4));
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const s = stats || {};

  const statCards = [
    { icon: Users,         label: "Total Students",    value: s.totalStudents,      sub: `${s.activeStudents ?? "—"} active`,              color: C.primary,  path: "/admin/students" },
    { icon: GraduationCap, label: "Tutors",             value: s.totalTutors,        sub: `${s.pendingApplications ?? "—"} pending approval`, color: "#8b5cf6",  path: "/admin/tutors"   },
    { icon: Layers,        label: "Active Batches",     value: s.activeBatches,      sub: `${s.completedBatches ?? "—"} completed`,           color: "#10b981",  path: "/admin/batches"  },
    { icon: MessageSquare, label: "Unresolved Queries", value: s.unresolvedQueries,  sub: `of ${s.totalQueries ?? "—"} total`,               color: "#f59e0b",  path: "/admin/queries"  },
    { icon: Clock,         label: "Pending Approvals",  value: s.pendingApplications, sub: "Tutor applications",                             color: "#ef4444",  path: "/admin/tutors"   },
    { icon: CheckCircle2,  label: "Completed Batches",  value: s.completedBatches,   sub: "All time",                                       color: "#6366f1",  path: "/admin/batches"  },
  ];

  // Platform health metrics (only shown when stats loaded)
  const totalQ      = s.totalQueries     || 0;
  const resolved    = totalQ - (s.unresolvedQueries || 0);
  const totalB      = (s.activeBatches   || 0) + (s.completedBatches || 0);
  const healthItems = [
    { label: "Active Students",  pct: s.totalStudents ? Math.round((s.activeStudents/s.totalStudents)*100)  : 0, color: C.primary },
    { label: "Query Resolution", pct: totalQ          ? Math.round((resolved/totalQ)*100)                    : 0, color: "#10b981" },
    { label: "Batch Completion", pct: totalB          ? Math.round((s.completedBatches/totalB)*100)          : 0, color: "#8b5cf6" },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.dark }}>Admin Dashboard</h1>
          <p className="text-sm" style={{ color: C.gray }}>Live overview of DigitalCAD Training platform</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map((st, i) => (
            <StatCard key={st.label} {...st} delay={i * 0.05} loading={loading}
              onClick={() => st.path && navigate(st.path)} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Pending tutor approvals */}
          <Panel title="🕐 Pending Tutor Approvals"
            onViewAll={() => navigate("/admin/tutors")} delay={0.2}
            loading={loading}
            empty={!loading && pending.length === 0 ? "No pending applications" : null}>
            {pending.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${C.blue},${C.primary})` }}>
                  {t.name?.[0] || "T"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: C.dark }}>{t.name}</p>
                  <p className="text-xs" style={{ color: C.gray }}>
                    {t.years_exp}y exp · {t.syllabus_sessions?.length ?? 0} sessions · {t.location}
                  </p>
                </div>
                <button onClick={() => navigate("/admin/tutors")}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${C.blue},${C.primary})` }}>
                  Review
                </button>
              </div>
            ))}
          </Panel>

          {/* Unresolved queries */}
          <Panel title="❓ Unresolved Queries"
            onViewAll={() => navigate("/admin/queries")} delay={0.25}
            loading={loading}
            empty={!loading && openQ.length === 0 ? "All queries resolved 🎉" : null}>
            {openQ.map(q => (
              <div key={q.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold flex-1 leading-snug" style={{ color: C.dark }}>
                    {q.question?.length > 70 ? q.question.slice(0, 70) + "…" : q.question}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "#fef3c7", color: "#92400e" }}>Open</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: C.lg }}>
                  {q.student?.name} · {fmt(q.created_at)}
                </p>
              </div>
            ))}
          </Panel>

          {/* Active batches */}
          <Panel title="📚 Active Batches"
            onViewAll={() => navigate("/admin/batches")} delay={0.3}
            loading={loading}
            empty={!loading && batches.length === 0 ? "No active batches" : null}>
            {batches.map(b => {
              const enrolled = b._count?.enrollments || 0;
              const max      = b.max_students || 1;
              const pct      = Math.round((enrolled / max) * 100);
              return (
                <div key={b.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold" style={{ color: C.dark }}>{b.name}</p>
                    <span className="text-xs font-semibold" style={{ color: C.gray }}>{enrolled}/{max}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: C.lg }}>
                    {b.tutor?.name} · {b.course?.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg,${C.blue},${C.primary})` }} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: C.primary }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </Panel>

          {/* Platform health */}
          <Panel title="👥 Platform Health" delay={0.35} loading={loading}>
            {healthItems.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: C.dark }}>{item.label}</p>
                  <p className="text-sm font-extrabold" style={{ color: item.color }}>{item.pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <motion.div className="h-full rounded-full" style={{ background: item.color }}
                    initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }} />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </PageWrapper>
    </AppShell>
  );
}