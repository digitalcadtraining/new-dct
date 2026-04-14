/**
 * AdminDashboard — clean, fast, no duplicate cards
 * - Single parallel fetch for everything
 * - 4 stat cards: Students, Tutors, Batches, Queries
 * - Red badge on card only when there are pending items needing attention
 * - Batches panel: shows ALL batches (pending+upcoming+active) together
 * - Loading: all data fetches in parallel, skeleton shown until ready
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, GraduationCap, Layers, MessageSquare, ArrowUpRight,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { adminApi } from "../../services/api.js";
import { useNavigate } from "react-router-dom";

const C = { dark:"#1F1A17", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#9ca3af" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

/* ── Skeleton ──────────────────────────────────────────── */
function Skel({ h = "h-28", cls = "" }) {
  return <div className={`${h} ${cls} rounded-2xl bg-gray-100 animate-pulse`} />;
}

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, onClick, delay, loading, badge }) {
  if (loading) return <Skel h="h-32" />;
  return (
    <motion.div onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer group relative overflow-visible hover:-translate-y-1 transition-all duration-200"
      style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25, delay }}>

      {/* Red badge — only shown when badge > 0 */}
      {badge > 0 && (
        <motion.span initial={{ scale:0 }} animate={{ scale:1 }}
          className="absolute -top-2 -right-2 z-10 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black text-white flex items-center justify-center"
          style={{ background:"#ef4444", boxShadow:"0 2px 8px rgba(239,68,68,0.5)" }}>
          {badge > 99 ? "99+" : badge}
        </motion.span>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:color+"18" }}>
          <Icon size={20} style={{ color }} />
        </div>
        <ArrowUpRight size={14} style={{ color:C.lg }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-extrabold mb-0.5" style={{ color:C.dark }}>{value ?? "—"}</p>
      <p className="text-sm font-semibold" style={{ color:C.gray }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color:C.lg }}>{sub}</p>}
    </motion.div>
  );
}

/* ── Panel ─────────────────────────────────────────────── */
function Panel({ title, children, onViewAll, delay, loading, empty }) {
  return (
    <motion.div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25, delay }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-extrabold" style={{ color:C.dark }}>{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-bold flex items-center gap-1 hover:underline"
            style={{ color:C.primary }}>
            View All <ArrowUpRight size={11} />
          </button>
        )}
      </div>
      {loading
        ? <div className="p-4 space-y-3">{[1,2,3].map(i => <Skel key={i} h="h-11" />)}</div>
        : empty
          ? <div className="py-10 text-center text-sm" style={{ color:C.lg }}>{empty}</div>
          : <div className="divide-y divide-gray-50">{children}</div>}
    </motion.div>
  );
}

/* ── Batch status pill ─────────────────────────────────── */
const BATCH_STATUS = {
  ACTIVE:           { bg:"#f0fdf4", text:"#16a34a", label:"Active"   },
  UPCOMING:         { bg:"#eff8ff", text:"#007BBF", label:"Upcoming" },
  PENDING_APPROVAL: { bg:"#fff7ed", text:"#ea580c", label:"Pending ⚠" },
  COMPLETED:        { bg:"#f3f4f6", text:"#6b7280", label:"Completed" },
};

/* ══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);   // all data in one state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single parallel fetch — all 4 calls fire at once
    Promise.all([
      adminApi.stats(),
      adminApi.applications("PENDING"),
      adminApi.queries("OPEN"),
      adminApi.batches(),           // all batches, filter client-side
    ])
    .then(([statsRes, appsRes, queriesRes, batchesRes]) => {
      const allBatches = batchesRes.data || [];
      setData({
        stats:   statsRes.data || {},
        pending: (appsRes.data || []).slice(0, 3),
        queries: (queriesRes.data || []).slice(0, 4),
        batches: allBatches
          .filter(b => b.status !== "COMPLETED")   // show all non-completed in panel
          .slice(0, 5),
      });
    })
    .catch(e => {
      console.error("Dashboard load failed:", e);
      setData({ stats:{}, pending:[], queries:[], batches:[] });
    })
    .finally(() => setLoading(false));
  }, []);

  const s       = data?.stats   || {};
  const pending = data?.pending || [];
  const queries = data?.queries || [];
  const batches = data?.batches || [];

  const totalQ   = s.totalQueries   || 0;
  const resolved = totalQ - (s.unresolvedQueries || 0);
  const totalB   = (s.activeBatches || 0) + (s.upcomingBatches || 0) + (s.completedBatches || 0);

  /* 4 clean stat cards — badge only appears when action needed */
  const statCards = [
    {
      icon: Users, label: "Students", color: C.primary,
      value: s.totalStudents,
      sub:   `${s.activeStudents ?? "—"} active`,
      badge: 0,   // students don't need admin action
      onClick: () => navigate("/admin/students"),
    },
    {
      icon: GraduationCap, label: "Tutors", color: "#8b5cf6",
      value: s.totalTutors,
      sub:   `${s.pendingApplications ?? "—"} pending approval`,
      badge: s.pendingApplications || 0,   // badge when tutor apps need review
      onClick: () => navigate(s.pendingApplications > 0 ? "/admin/tutors?tab=pending" : "/admin/tutors?tab=approved"),
    },
    {
      icon: Layers, label: "Batches", color: "#10b981",
      value: (s.upcomingBatches || 0) + (s.activeBatches || 0),
      sub:   `${s.pendingBatches ?? "—"} pending approval`,
      badge: s.pendingBatches || 0,   // badge when batch requests need approval
      onClick: () => navigate("/admin/batches"),
    },
    {
      icon: MessageSquare, label: "Queries", color: "#f59e0b",
      value: s.unresolvedQueries,
      sub:   `of ${s.totalQueries ?? "—"} total`,
      badge: s.unresolvedQueries || 0,   // badge when open queries exist
      onClick: () => navigate("/admin/queries"),
    },
  ];

  const healthItems = [
    { label:"Active Students",  pct: s.totalStudents ? Math.round((s.activeStudents/s.totalStudents)*100) : 0, color:C.primary  },
    { label:"Query Resolution", pct: totalQ          ? Math.round((resolved/totalQ)*100)                  : 0, color:"#10b981"  },
    { label:"Batch Completion", pct: totalB          ? Math.round(((s.completedBatches||0)/totalB)*100)   : 0, color:"#8b5cf6"  },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold mb-1" style={{ color:C.dark }}>Admin Dashboard</h1>
          <p className="text-sm" style={{ color:C.gray }}>Live overview of DigitalCAD Training platform</p>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((st, i) => (
            <StatCard key={st.label} {...st} delay={i * 0.04} loading={loading} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Pending tutor approvals */}
          <Panel title="🎓 Pending Tutor Approvals"
            onViewAll={() => navigate("/admin/tutors?tab=pending")} delay={0.15}
            loading={loading}
            empty={!loading && pending.length === 0 ? "No pending applications ✅" : null}>
            {pending.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${C.blue},${C.primary})` }}>
                  {t.name?.[0]?.toUpperCase() || "T"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color:C.dark }}>{t.name}</p>
                  <p className="text-xs" style={{ color:C.gray }}>
                    {t.years_exp}y exp · {t.course?.name || ""} · {t.location}
                  </p>
                </div>
                <button onClick={() => navigate("/admin/tutors?tab=pending")}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl text-white flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${C.blue},${C.primary})` }}>
                  Review
                </button>
              </div>
            ))}
          </Panel>

          {/* Unresolved queries */}
          <Panel title="❓ Unresolved Queries"
            onViewAll={() => navigate("/admin/queries")} delay={0.2}
            loading={loading}
            empty={!loading && queries.length === 0 ? "All queries resolved 🎉" : null}>
            {queries.map(q => (
              <div key={q.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold flex-1 leading-snug" style={{ color:C.dark }}>
                    {q.question?.length > 70 ? q.question.slice(0, 70) + "…" : q.question}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background:"#fef3c7", color:"#92400e" }}>Open</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color:C.lg }}>
                  {q.student?.name} · {fmt(q.created_at)}
                </p>
              </div>
            ))}
          </Panel>

          {/* All batches (pending+upcoming+active) in one panel */}
          <Panel title="📦 Batches"
            onViewAll={() => navigate("/admin/batches")} delay={0.25}
            loading={loading}
            empty={!loading && batches.length === 0 ? "No batches yet" : null}>
            {batches.map(b => {
              const enrolled = b._count?.enrollments || 0;
              const max      = b.max_students || 1;
              const pct      = Math.round((enrolled / max) * 100);
              const sc       = BATCH_STATUS[b.status] || BATCH_STATUS.UPCOMING;
              return (
                <div key={b.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="text-sm font-bold truncate flex-1" style={{ color:C.dark }}>{b.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold" style={{ color:C.gray }}>{enrolled}/{max}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background:sc.bg, color:sc.text }}>{sc.label}</span>
                    </div>
                  </div>
                  <p className="text-xs mb-2" style={{ color:C.lg }}>
                    {b.tutor?.name} · {b.course?.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full"
                        style={{ width:`${pct}%`, background:`linear-gradient(90deg,${C.blue},${C.primary})` }} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color:C.primary }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </Panel>

          {/* Platform health */}
          <Panel title="👥 Platform Health" delay={0.3} loading={loading}>
            {healthItems.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color:C.dark }}>{item.label}</p>
                  <p className="text-sm font-extrabold" style={{ color:item.color }}>{item.pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <motion.div className="h-full rounded-full" style={{ background:item.color }}
                    initial={{ width:0 }} animate={{ width:`${item.pct}%` }}
                    transition={{ duration:0.8, delay:0.4+i*0.1 }} />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </PageWrapper>
    </AppShell>
  );
}