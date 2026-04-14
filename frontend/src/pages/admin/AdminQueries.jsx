/**
 * AdminQueries — fully live, real API, no dummy data
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Check, X, Eye, Clock } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { adminApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";

const C = { dark:"#1F1A17", navy:"#003C6E", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#7E7F81" };

function fmtRelative(iso) {
  if (!iso) return "";
  const h = Math.floor((Date.now()-new Date(iso).getTime())/3600000);
  const d = Math.floor(h/24);
  if (h < 1) return "Just now"; if (h < 24) return `${h}h ago`; return `${d}d ago`;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
      className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-lg"
      style={{ background: type === "success" ? "#16a34a" : "#dc2626" }}>
      {msg}
    </motion.div>
  );
}

function QueryModal({ query, onClose, onResolve }) {
  if (!query) return null;
  const isResolved = query.status === "RESOLVED";
  const attachUrl  = mediaUrl(query.media_url);
  const isVideo    = query.media_url &&
    (query.media_url.match(/\.(mp4|mov|webm|avi)$/i) || query.media_url.includes("video"));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
        <motion.div
          className="relative bg-white rounded-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto"
          style={{ boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}
          initial={{ opacity:0, scale:0.95, y:16 }} animate={{ opacity:1, scale:1, y:0 }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-extrabold text-base" style={{ color:C.dark }}>Query Details</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
              <X size={14} style={{ color:C.gray }}/>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background:"#eff8ff", color:C.primary }}>
                👤 {query.student?.name || "Student"}
              </span>
              {query.session && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background:"#f3f4f6", color:C.gray }}>
                  📅 Session {query.session.session_number}: {query.session.name}
                </span>
              )}
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background:"#f3f4f6", color:C.gray }}>
                🕐 {fmtRelative(query.created_at)}
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: isResolved ? "#f0fdf4" : "#fef3c7",
                  color:      isResolved ? "#16a34a" : "#92400e",
                }}>
                {isResolved ? "✓ Resolved" : "⚠ Open"}
              </span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:C.lg }}>Question</p>
              <p className="text-sm leading-relaxed" style={{ color:C.dark }}>{query.question}</p>
            </div>

            {attachUrl && (
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                {isVideo
                  ? <video src={attachUrl} controls className="w-full max-h-48 bg-black"/>
                  : <img src={attachUrl} alt="attachment" className="w-full max-h-48 object-cover"
                      onError={e=>e.target.style.display="none"}/>}
                <p className="text-xs px-3 py-1.5 bg-gray-50" style={{ color:C.lg }}>📎 Student attachment</p>
              </div>
            )}

            {query.answer ? (
              <div className="rounded-2xl p-4 border border-blue-100"
                style={{ background:"linear-gradient(135deg,#eff8ff,#e0f2fe)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:C.blue }}>
                  Tutor's Answer
                </p>
                <p className="text-sm leading-relaxed" style={{ color:C.dark }}>{query.answer}</p>
              </div>
            ) : (
              <div className="rounded-2xl p-4 bg-gray-50 border border-dashed border-gray-200">
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color:C.lg }}/>
                  <p className="text-sm" style={{ color:C.lg }}>No tutor answer yet</p>
                </div>
              </div>
            )}

            {!isResolved && (
              <button onClick={() => onResolve(query)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background:"linear-gradient(135deg,#16a34a,#22c55e)" }}>
                <Check size={15}/> Mark as Resolved
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function AdminQueries() {
  const [queries,  setQueries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState(null);

  const load = (f = filter) => {
    setLoading(true);
    const statusMap = { ALL: undefined, OPEN: "OPEN", RESOLVED: "RESOLVED" };
    adminApi.queries(statusMap[f])
      .then(r => setQueries(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleResolve = async (query) => {
    try {
      await adminApi.resolveQuery(query.id);
      setQueries(prev => prev.map(q => q.id === query.id ? { ...q, status:"RESOLVED" } : q));
      if (selected?.id === query.id) setSelected(q => ({ ...q, status:"RESOLVED" }));
      setToast({ msg:"Query marked as resolved", type:"success" });
    } catch(e) {
      setToast({ msg: e.message || "Failed", type:"error" });
    }
  };

  const openCount     = queries.filter(q => q.status !== "RESOLVED").length;
  const resolvedCount = queries.filter(q => q.status === "RESOLVED").length;

  const FILTERS = [
    { key:"ALL",      label:"All",      count:queries.length },
    { key:"OPEN",     label:"Open",     count:openCount      },
    { key:"RESOLVED", label:"Resolved", count:resolvedCount  },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color:C.dark }}>Student Queries</h1>
            <p className="text-sm" style={{ color:C.gray }}>
              {openCount} open · {resolvedCount} resolved
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-2xl border border-gray-200 bg-white">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: filter===f.key ? `linear-gradient(135deg,${C.blue},${C.primary})` : "transparent",
                  color: filter===f.key ? "white" : C.gray,
                }}>
                {f.label}
                {f.count > 0 && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: filter===f.key ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                      color: filter===f.key ? "white" : C.lg,
                    }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i=><div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse"/>)}
          </div>
        )}

        {!loading && queries.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
            <MessageSquare size={36} className="mx-auto mb-3" style={{ color:"#d1d5db" }}/>
            <p className="font-bold" style={{ color:C.dark }}>No queries</p>
            <p className="text-sm mt-1" style={{ color:C.lg }}>Nothing to show for this filter.</p>
          </div>
        )}

        <div className="space-y-3">
          {queries.map((q, i) => {
            const isResolved = q.status === "RESOLVED";
            return (
              <motion.div key={q.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer"
                style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:i*0.03 }}
                onClick={() => setSelected(q)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug mb-2" style={{ color:C.dark }}>
                      {q.question?.length > 90 ? q.question.slice(0,90)+"…" : q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background:"#eff8ff", color:C.primary }}>
                        👤 {q.student?.name || "Student"}
                      </span>
                      {q.session && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background:"#f3f4f6", color:C.gray }}>
                          📅 Session {q.session.session_number}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background:"#f3f4f6", color:C.gray }}>
                        🕐 {fmtRelative(q.created_at)}
                      </span>
                      {q.answer && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background:"#f0fdf4", color:"#16a34a" }}>
                          ✓ Answered by tutor
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: isResolved ? "#f0fdf4" : "#fef3c7",
                        color:      isResolved ? "#16a34a" : "#92400e",
                      }}>
                      {isResolved ? "✓ Resolved" : "⚠ Open"}
                    </span>
                    <button onClick={e => { e.stopPropagation(); setSelected(q); }}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
                      <Eye size={13} style={{ color:C.gray }}/>
                    </button>
                    {!isResolved && (
                      <button onClick={e => { e.stopPropagation(); handleResolve(q); }}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                        style={{ background:"linear-gradient(135deg,#16a34a,#22c55e)" }}>
                        <Check size={12}/> Resolve
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {selected && (
          <QueryModal query={selected} onClose={() => setSelected(null)} onResolve={handleResolve}/>
        )}

        <AnimatePresence>
          {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}