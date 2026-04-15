/**
 * TutorQueriesPage — session-centric query management
 * Priority: Reminded(N) > Ultra(24h+) > High(12h+) > Mild(6h+) > Recent > Answered > Resolved
 * Auto-resolve: unanswered + no remind = 36h old → AUTO_RESOLVED
 * Tutor answer can include optional file attachment
 * WhatsApp direct connect to student's tutor
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { batchApi, queryApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";
import {
  HelpCircle, X, CheckCircle2, Flame, AlertTriangle, Minus,
  Send, RefreshCw, Bell, Paperclip, MessageCircle,
} from "lucide-react";

const C = { dark:"#1F1A17", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#9ca3af" };

// Priority: 6h=mild, 12h=high, 24h=ultra, reminded=top (no answer check)
function getPriority(q) {
  if (q.status === "RESOLVED" || q.status === "AUTO_RESOLVED") return "resolved";
  if (q.answer) return "answered";
  if (q.is_reminded) return "reminded";
  const h = (Date.now() - new Date(q.created_at).getTime()) / 3600000;
  if (h >= 24) return "ultra";
  if (h >= 12) return "high";
  if (h >= 6)  return "mild";
  return "recent";
}

const PCFG = {
  reminded: { label:"⚡ Reminded",   bg:"#fdf4ff", color:"#7c3aed", border:"#e9d5ff", Icon:Bell,          sort:0 },
  ultra:    { label:"🔴 Ultra High", bg:"#fef2f2", color:"#dc2626", border:"#fecaca", Icon:Flame,          sort:1 },
  high:     { label:"🟠 High",       bg:"#fff7ed", color:"#ea580c", border:"#fed7aa", Icon:AlertTriangle,  sort:2 },
  mild:     { label:"🟡 Mild",       bg:"#fefce8", color:"#ca8a04", border:"#fde68a", Icon:Minus,          sort:3 },
  recent:   { label:"🔵 Recent",     bg:"#eff8ff", color:"#007BBF", border:"#bfdbfe", Icon:Minus,          sort:4 },
  answered: { label:"✓ Answered",    bg:"#f0fdf4", color:"#16a34a", border:"#86efac", Icon:CheckCircle2,   sort:5 },
  resolved: { label:"✓ Resolved",    bg:"#f3f4f6", color:"#6b7280", border:"#d1d5db", Icon:CheckCircle2,   sort:6 },
};

function fmtRelative(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), days = Math.floor(d/86400000);
  if (m<1) return "Just now"; if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`; return `${days}d ago`;
}

/* ─── Answer Modal ─────────────────────────────────────────── */
function AnswerModal({ query, onClose, onAnswered }) {
  const [answer,  setAnswer]  = useState("");
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const fileRef = useRef();

  const attachSrc = mediaUrl(query.media_url);
  const isVideo   = query.media_url && query.media_url.match(/\.(mp4|mov|webm|avi)$/i);

  const submit = async () => {
    if (!answer.trim()) return setErr("Answer is required.");
    setLoading(true); setErr("");
    try {
      await queryApi.answer(query.id, answer, file || undefined);
      onAnswered(query.id);
      onClose();
    } catch(e) { setErr(e.message || "Failed to send answer."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex",
      alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)",
        backdropFilter:"blur(4px)" }} initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={onClose}/>
      <motion.div style={{ position:"relative", background:"#fff", borderRadius:20,
        width:"100%", maxWidth:500, zIndex:10, padding:24,
        boxShadow:"0 24px 64px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}
        initial={{ opacity:0, scale:0.95, y:16 }} animate={{ opacity:1, scale:1, y:0 }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <h3 style={{ fontWeight:800, color:C.dark, fontSize:16 }}>Answer Query</h3>
            <p style={{ fontSize:11, color:C.lg, marginTop:2 }}>
              {query.student?.name} · {fmtRelative(query.created_at)}
              {query.remind_count > 0 && (
                <span style={{ marginLeft:8, color:"#7c3aed", fontWeight:700 }}>
                  🔔 Reminded {query.remind_count}×
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8,
            background:"#f3f4f6", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} style={{ color:C.gray }}/>
          </button>
        </div>

        {query.session && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6,
            padding:"5px 10px", background:"#eff8ff", borderRadius:8, marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>
              Session {query.session.session_number}: {query.session.name}
            </span>
          </div>
        )}

        {/* Student question */}
        <div style={{ background:"#f9fafb", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.gray, marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.4px" }}>Student's Question</p>
          <p style={{ fontSize:14, color:C.dark, lineHeight:1.65 }}>{query.question}</p>
        </div>

        {/* Student media */}
        {attachSrc && (
          <div style={{ marginBottom:14, borderRadius:12, overflow:"hidden", border:"1px solid #e5e7eb" }}>
            {isVideo
              ? <video src={attachSrc} controls style={{ width:"100%", maxHeight:220, display:"block", background:"#000" }}/>
              : <img src={attachSrc} alt="attachment"
                  style={{ width:"100%", maxHeight:220, objectFit:"cover", display:"block" }}
                  onError={e=>e.target.style.display="none"}/>}
            <div style={{ padding:"5px 12px", background:"#f9fafb", fontSize:10, color:C.lg }}>
              📎 Student's attachment
            </div>
          </div>
        )}

        {/* Answer textarea */}
        <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
          placeholder="Type your detailed answer…" rows={4}
          style={{ width:"100%", padding:"12px 14px", border:"1.5px solid #e5e7eb",
            borderRadius:12, fontSize:14, outline:"none", resize:"none",
            marginBottom:10, boxSizing:"border-box", fontFamily:"inherit", lineHeight:1.6 }}
          onFocus={e=>e.target.style.borderColor=C.primary}
          onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>

        {/* Optional file attachment */}
        <div style={{ marginBottom:14 }}>
          {file ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 13px",
              background:"#eff8ff", borderRadius:10, border:"1px solid #bfdbfe" }}>
              <Paperclip size={13} style={{ color:C.primary, flexShrink:0 }}/>
              <span style={{ fontSize:12, color:C.dark, flex:1, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</span>
              <button onClick={()=>setFile(null)} style={{ border:"none", background:"none",
                cursor:"pointer", display:"flex" }}>
                <X size={12} style={{ color:"#dc2626" }}/>
              </button>
            </div>
          ) : (
            <button onClick={()=>fileRef.current?.click()}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 13px",
                background:"#f3f4f6", border:"1.5px dashed #d1d5db", borderRadius:10,
                cursor:"pointer", fontSize:12, color:C.gray, fontFamily:"inherit" }}>
              <Paperclip size={13}/>
              Attach file (optional — reference material, solution, etc.)
            </button>
          )}
          <input ref={fileRef} type="file" style={{ display:"none" }}
            onChange={e=>setFile(e.target.files[0])}/>
        </div>

        {err && (
          <div style={{ padding:"9px 12px", background:"#fef2f2", borderRadius:10,
            fontSize:12, color:"#dc2626", marginBottom:10 }}>{err}</div>
        )}

        <button onClick={submit} disabled={loading || !answer.trim()}
          style={{ width:"100%", padding:"13px 0", border:"none", borderRadius:12,
            color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            opacity: loading || !answer.trim() ? 0.6 : 1,
            background:`linear-gradient(135deg,${C.blue},${C.primary})`,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading
            ? <><RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }}/> Sending…</>
            : <><Send size={14}/> Send Answer</>}
        </button>
      </motion.div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Query Card ─────────────────────────────────────────────── */
function QueryCard({ query, index, onAnswer }) {
  const p   = getPriority(query);
  const P   = PCFG[p];
  const { Icon } = P;
  const attachSrc     = mediaUrl(query.media_url);
  const answerAttach  = mediaUrl(query.answer_media);
  const isVideo       = query.media_url && query.media_url.match(/\.(mp4|mov|webm|avi)$/i);
  const isAnswered    = !!query.answer;
  const isResolved    = query.status === "RESOLVED" || query.status === "AUTO_RESOLVED";

  const topBarColor =
    p === "reminded" ? "linear-gradient(90deg,#7c3aed,#8b5cf6)" :
    p === "ultra"    ? "linear-gradient(90deg,#dc2626,#ef4444)" :
    p === "high"     ? "linear-gradient(90deg,#ea580c,#f97316)" :
    p === "mild"     ? "linear-gradient(90deg,#ca8a04,#eab308)" :
    p === "recent"   ? `linear-gradient(90deg,${C.blue},${C.primary})` :
    p === "answered" ? "linear-gradient(90deg,#16a34a,#22c55e)" :
                       "linear-gradient(90deg,#9ca3af,#d1d5db)";

  // WhatsApp link using student's batch tutor phone
  // We pass tutor phone via batch on getBatchQueries
  const whatsappNum = query.tutor_phone?.replace(/\D/g, "");
  const whatsappUrl = whatsappNum
    ? `https://wa.me/91${whatsappNum}?text=${encodeURIComponent(`Hi, regarding my query: "${query.question?.slice(0,80)}…"`)}`
    : null;

  return (
    <motion.div
      style={{ background:"#fff", borderRadius:16, border:`1px solid ${P.border}`,
        overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", marginBottom:14 }}
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.04 }}>

      <div style={{ height:3, background:topBarColor }}/>

      <div style={{ padding:"14px 16px" }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:10, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px",
              borderRadius:999, background:P.bg, border:`1px solid ${P.border}` }}>
              <Icon size={11} style={{ color:P.color }}/>
              <span style={{ fontSize:11, fontWeight:700, color:P.color }}>
                {p === "reminded" && query.remind_count > 1
                  ? `Reminded (${query.remind_count}×)` : P.label}
              </span>
            </div>
            {query.session && (
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px",
                borderRadius:999, background:"#eff8ff", color:C.blue }}>
                Session {query.session.session_number}
              </span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <span style={{ fontSize:10, color:C.lg }}>{fmtRelative(query.created_at)}</span>
            <span style={{ fontSize:11, fontWeight:600, color:C.gray }}>
              {query.student?.name}
            </span>
          </div>
        </div>

        {/* Question */}
        <p style={{ fontSize:13, color:C.dark, lineHeight:1.6, marginBottom:10 }}>
          {query.question}
        </p>

        {/* Student media */}
        {attachSrc && (
          <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #e5e7eb", marginBottom:10 }}>
            {isVideo
              ? <video src={attachSrc} controls style={{ width:"100%", maxHeight:160, display:"block", background:"#000" }}/>
              : <img src={attachSrc} alt="attachment"
                  style={{ width:"100%", maxHeight:160, objectFit:"cover", display:"block" }}
                  onError={e=>e.target.style.display="none"}/>}
          </div>
        )}

        {/* Tutor answer */}
        {query.answer && (
          <div style={{ background:"#f0fdf4", borderRadius:12, padding:"12px 14px",
            border:"1px solid #86efac", marginBottom:10 }}>
            <p style={{ fontSize:10, fontWeight:700, color:"#16a34a", marginBottom:5,
              textTransform:"uppercase", letterSpacing:"0.4px" }}>
              Your Answer · {fmtRelative(query.answered_at)}
            </p>
            <p style={{ fontSize:13, color:C.dark, lineHeight:1.6 }}>{query.answer}</p>
            {answerAttach && (
              <a href={answerAttach} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8,
                  fontSize:11, color:"#16a34a", fontWeight:700, textDecoration:"none" }}>
                <Paperclip size={12}/> View attachment
              </a>
            )}
          </div>
        )}

        {/* Status tag for resolved */}
        {isResolved && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px",
              borderRadius:999, background:"#f3f4f6", color:"#6b7280" }}>
              {query.status === "AUTO_RESOLVED" ? "Auto-Resolved" : "Resolved ✓"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {!isAnswered && !isResolved && (
            <button onClick={() => onAnswer(query)}
              style={{ flex:1, padding:"9px 0", background:`linear-gradient(135deg,${C.blue},${C.primary})`,
                color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:700,
                cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", gap:6 }}>
              <Send size={12}/> Answer Query
            </button>
          )}
          {isAnswered && !isResolved && (
            <button onClick={() => onAnswer(query)}
              style={{ padding:"7px 14px", background:"#fff",
                border:`1px solid ${C.primary}`, borderRadius:10,
                fontSize:12, fontWeight:700, color:C.primary,
                cursor:"pointer" }}>
              Edit Answer
            </button>
          )}
          {/* WhatsApp direct connect */}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
                background:"#dcfce7", border:"1px solid #86efac",
                borderRadius:10, textDecoration:"none" }}>
              <MessageCircle size={14} style={{ color:"#16a34a" }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#16a34a" }}>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function TutorQueriesPage() {
  const [searchParams] = useSearchParams();
  const sessionIdFilter  = searchParams.get("session_id");
  const batchIdFilter    = searchParams.get("batch_id");
  const sessionNumFilter = searchParams.get("session_num");

  const [batches,       setBatches]       = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [queries,       setQueries]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [answerTarget,  setAnswerTarget]  = useState(null);
  const [priorityFilter,setPriorityFilter]= useState("all");
  const [refresh,       setRefresh]       = useState(0);

  useEffect(() => {
    batchApi.mine()
      .then(r => {
        const approved = (r.data || []).filter(b => b.status !== "PENDING_APPROVAL");
        setBatches(approved);
        const matched = batchIdFilter ? approved.find(b => b.id === batchIdFilter) : null;
        setSelectedBatch(matched || approved[0] || null);
      }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    setLoading(true);
    queryApi.getBatchQueries(selectedBatch.id)
      .then(r => setQueries(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBatch, refresh]);

  const filtered = useMemo(() => {
    let q = sessionIdFilter
      ? queries.filter(x => x.session_id === sessionIdFilter)
      : queries;
    if (priorityFilter !== "all")
      q = q.filter(x => getPriority(x) === priorityFilter);
    return q;
  }, [queries, sessionIdFilter, priorityFilter]);

  const counts = useMemo(() => {
    const c = {};
    queries.forEach(q => { const p = getPriority(q); c[p] = (c[p]||0)+1; });
    return c;
  }, [queries]);

  const urgentCount = (counts.reminded||0)+(counts.ultra||0)+(counts.high||0)+(counts.mild||0);

  const FILTERS = [
    { key:"all",      label:"All",         count:queries.length },
    { key:"reminded", label:"⚡ Reminded",  count:counts.reminded||0, hide:!counts.reminded },
    { key:"ultra",    label:"🔴 Ultra",     count:counts.ultra||0,    hide:!counts.ultra    },
    { key:"high",     label:"🟠 High",      count:counts.high||0,     hide:!counts.high     },
    { key:"mild",     label:"🟡 Mild",      count:counts.mild||0,     hide:!counts.mild     },
    { key:"answered", label:"✓ Answered",   count:counts.answered||0, hide:!counts.answered },
    { key:"resolved", label:"✓ Resolved",   count:counts.resolved||0, hide:!counts.resolved },
  ].filter(f => !f.hide || f.key === "all");

  return (
    <AppShell>
      <PageWrapper>
        {/* Session filter banner */}
        {sessionIdFilter && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            style={{ background:`linear-gradient(135deg,${C.blue},${C.primary})`,
              borderRadius:14, padding:"12px 16px", marginBottom:16,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
              🎯 Filtered: Session {sessionNumFilter} queries
            </span>
            <a href={window.location.pathname}
              style={{ fontSize:11, color:"rgba(255,255,255,0.8)", textDecoration:"none", fontWeight:700 }}>
              Clear ×
            </a>
          </motion.div>
        )}

        {/* Header */}
        <div style={{ marginBottom:18 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.dark, marginBottom:2 }}>Student Queries</h2>
          <p style={{ fontSize:13, color:C.lg }}>
            {urgentCount > 0
              ? <span style={{ color:"#dc2626", fontWeight:700 }}>{urgentCount} need attention</span>
              : "All caught up"
            }
            {" · "}{queries.length} total
          </p>
        </div>

        {/* Batch pills */}
        {batches.length > 1 && (
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
            {batches.map(b => {
              const isSel = selectedBatch?.id === b.id;
              return (
                <button key={b.id} onClick={() => setSelectedBatch(b)}
                  style={{ flexShrink:0, padding:"6px 16px", borderRadius:999,
                    border: isSel ? "none" : "1.5px solid #e5e7eb",
                    background: isSel ? `linear-gradient(135deg,${C.blue},${C.primary})` : "#fff",
                    color: isSel ? "#fff" : C.gray, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {b.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Priority filter pills */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:20 }}>
          {FILTERS.map(f => {
            const isSel = priorityFilter === f.key;
            return (
              <button key={f.key} onClick={() => setPriorityFilter(f.key)}
                style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5,
                  padding:"6px 12px", borderRadius:999,
                  border: isSel ? "none" : "1.5px solid #e5e7eb",
                  background: isSel ? `linear-gradient(135deg,${C.blue},${C.primary})` : "#fff",
                  color: isSel ? "#fff" : C.gray, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {f.label}
                {f.count > 0 && (
                  <span style={{ fontSize:10, fontWeight:800,
                    background: isSel ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                    color: isSel ? "#fff" : C.lg,
                    padding:"1px 6px", borderRadius:999 }}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ height:120, background:"#f3f4f6", borderRadius:16 }}
                className="animate-pulse"/>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <HelpCircle size={40} style={{ color:"#d1d5db", margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:700, color:C.dark, marginBottom:6 }}>No queries</p>
            <p style={{ fontSize:13, color:C.lg }}>
              {priorityFilter !== "all" ? "No queries in this priority level" : "Students haven't raised any queries yet"}
            </p>
          </div>
        )}

        {!loading && filtered.map((q, i) => (
          <QueryCard key={q.id} query={q} index={i} onAnswer={setAnswerTarget} />
        ))}

        <AnimatePresence>
          {answerTarget && (
            <AnswerModal
              query={answerTarget}
              onClose={() => setAnswerTarget(null)}
              onAnswered={(id) => {
                setAnswerTarget(null);
                setRefresh(r => r + 1);
              }}
            />
          )}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}