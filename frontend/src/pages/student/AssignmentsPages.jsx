/**
 * AssignmentsPages.jsx — Real API, no dummy data
 * - Downloads use mediaUrl() so file links work correctly
 * - Submit/resubmit wired to real API
 * - Feedback sheet shows tutor grade + comments
 */
import { useState, useEffect, useMemo, useRef } from "react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { batchApi, assignmentApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";
import {
  FileText, Upload, X, Download, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink,
  BookOpen, Star, ChevronDown,
} from "lucide-react";

const C = { dark:"#1F1A17", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#9ca3af" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function isOverdue(d) { return d && new Date(d) < new Date(); }

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
      className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-lg"
      style={{ background: type==="success" ? "#16a34a" : "#dc2626" }}>
      {msg}
    </motion.div>
  );
}

/* ─── Bottom Sheet ───────────────────────────────────────── */
function BottomSheet({ onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex",
      flexDirection:"column", justifyContent:"flex-end" }}>
      <motion.div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)",
        backdropFilter:"blur(3px)" }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={onClose}/>
      <motion.div style={{ position:"relative", background:"#fff",
        borderRadius:"24px 24px 0 0", maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)", zIndex:10 }}
        initial={{ y:"100%" }} animate={{ y:0 }}
        transition={{ type:"spring", stiffness:300, damping:32 }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:999, background:"#e5e7eb" }}/>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Submit Sheet ───────────────────────────────────────── */
function SubmitSheet({ assignment, onClose, onSubmitted }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");
  const fileRef = useRef();

  const sub       = assignment?.submissions?.[0];
  const fileUrl   = mediaUrl(assignment?.file_url);

  const handleSubmit = async () => {
    if (!file) return setErr("Please select your file.");
    setLoading(true); setErr("");
    try {
      await assignmentApi.submit(assignment.id, file);
      setDone(true);
      setTimeout(() => { onSubmitted(); onClose(); }, 1600);
    } catch(e) { setErr(e.message || "Upload failed."); }
    finally { setLoading(false); }
  };

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding:"0 20px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10,
              background:`linear-gradient(135deg,${C.blue},${C.primary})`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Upload size={15} style={{ color:"#fff" }}/>
            </div>
            <div>
              <p style={{ fontSize:16, fontWeight:800, color:C.dark }}>Submit Assignment</p>
              <p style={{ fontSize:12, color:C.primary, fontWeight:600 }}>{assignment?.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10,
            border:"none", background:"#f3f4f6", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} style={{ color:C.gray }}/>
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:"#fafafa", borderRadius:12, padding:"10px 12px", border:"1px solid #e8ecf0" }}>
            <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.4px", marginBottom:2 }}>Session</p>
            <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>
              {assignment?.session ? `Session ${assignment.session.session_number}` : "General"}
            </p>
          </div>
          <div style={{ background: isOverdue(assignment?.due_date)?"#fef2f2":"#fafafa",
            borderRadius:12, padding:"10px 12px",
            border:`1px solid ${isOverdue(assignment?.due_date)?"#fecaca":"#e8ecf0"}` }}>
            <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.4px", marginBottom:2 }}>Due Date</p>
            <p style={{ fontSize:12, fontWeight:700,
              color: isOverdue(assignment?.due_date)&&!sub ? "#dc2626" : C.dark }}>
              {fmt(assignment?.due_date)}
            </p>
          </div>
        </div>

        {assignment?.description && (
          <div style={{ background:"#eff8ff", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.blue, marginBottom:4,
              textTransform:"uppercase", letterSpacing:"0.4px" }}>Instructions</p>
            <p style={{ fontSize:13, color:C.dark, lineHeight:1.6 }}>{assignment.description}</p>
          </div>
        )}

        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 14px", background:"#f0fdf4", borderRadius:12,
              border:"1px solid #86efac", textDecoration:"none", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Download size={14} style={{ color:"#16a34a" }}/>
              <p style={{ fontSize:13, fontWeight:700, color:"#16a34a" }}>Download Assignment File</p>
            </div>
            <ExternalLink size={13} style={{ color:"#86efac" }}/>
          </a>
        )}

        {done ? (
          <div style={{ textAlign:"center", padding:"28px 0" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"#dcfce7",
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <CheckCircle2 size={28} style={{ color:"#16a34a" }}/>
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:"#16a34a" }}>Submitted!</p>
          </div>
        ) : (
          <>
            {sub && (
              <p style={{ fontSize:11, fontWeight:700, color:C.lg, textAlign:"center",
                marginBottom:10, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                — Resubmit —
              </p>
            )}
            {file ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", background:"#eff8ff", borderRadius:12,
                border:"1px solid #bfdbfe", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <FileText size={16} style={{ color:C.primary }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>{file.name}</p>
                    <p style={{ fontSize:10, color:C.lg }}>{(file.size/1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button onClick={()=>setFile(null)} style={{ width:24, height:24,
                  borderRadius:"50%", border:"none", background:"#fee2e2",
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={11} style={{ color:"#dc2626" }}/>
                </button>
              </div>
            ) : (
              <button onClick={()=>fileRef.current?.click()}
                style={{ width:"100%", padding:"22px 14px", border:"2px dashed #d1d5db",
                  borderRadius:14, background:"#fafafa", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:8, marginBottom:12, boxSizing:"border-box" }}>
                <Upload size={24} style={{ color:C.lg }}/>
                <p style={{ fontSize:13, color:C.lg }}>Tap to select your file</p>
              </button>
            )}
            <input ref={fileRef} type="file" style={{ display:"none" }}
              onChange={e=>setFile(e.target.files[0])}/>

            {err && (
              <div style={{ display:"flex", gap:6, padding:"10px 12px", background:"#fef2f2",
                borderRadius:10, marginBottom:10 }}>
                <AlertCircle size={13} style={{ color:"#dc2626", flexShrink:0 }}/>
                <span style={{ fontSize:12, color:"#dc2626" }}>{err}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading||!file}
              style={{ width:"100%", padding:"14px 0",
                background: !file?"#e5e7eb":`linear-gradient(135deg,${C.blue},${C.primary})`,
                color: !file?C.lg:"#fff", border:"none", borderRadius:14,
                fontSize:15, fontWeight:800, cursor:!file?"not-allowed":"pointer",
                fontFamily:"inherit", display:"flex", alignItems:"center",
                justifyContent:"center", gap:8 }}>
              {loading
                ? <><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }}/> Uploading…</>
                : <><Upload size={15}/> Submit</>}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </BottomSheet>
  );
}

/* ─── Feedback Sheet ─────────────────────────────────────── */
function FeedbackSheet({ assignment, submission, onClose }) {
  if (!submission || !assignment) return null;
  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding:"0 20px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10,
              background:"linear-gradient(135deg,#7c3aed,#8b5cf6)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Star size={15} style={{ color:"#fff" }}/>
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:C.dark }}>Tutor Feedback</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10,
            border:"none", background:"#f3f4f6", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} style={{ color:C.gray }}/>
          </button>
        </div>

        <div style={{ background:"#eff8ff", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:800, color:C.blue, marginBottom:2 }}>{assignment.title}</p>
          {assignment.session && (
            <p style={{ fontSize:11, color:C.primary }}>
              Session {assignment.session.session_number}: {assignment.session.name}
            </p>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <div style={{ background:"#fafafa", borderRadius:12, padding:"10px 12px", border:"1px solid #e8ecf0" }}>
            <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.4px", marginBottom:2 }}>Submitted</p>
            <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>{fmt(submission.submitted_at)}</p>
          </div>
          <div style={{ background:"#fafafa", borderRadius:12, padding:"10px 12px", border:"1px solid #e8ecf0" }}>
            <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.4px", marginBottom:2 }}>Status</p>
            <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>{submission.status}</p>
          </div>
        </div>

        {submission.grade && (
          <div style={{ textAlign:"center", padding:"16px 0", marginBottom:16,
            background:"linear-gradient(135deg,#f5f3ff,#ede9fe)", borderRadius:16 }}>
            <p style={{ fontSize:11, fontWeight:600, color:"#7c3aed", marginBottom:4 }}>Your Grade</p>
            <p style={{ fontSize:52, fontWeight:900, color:"#7c3aed", lineHeight:1 }}>{submission.grade}</p>
          </div>
        )}

        {submission.feedback ? (
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:C.gray, marginBottom:8,
              textTransform:"uppercase", letterSpacing:"0.5px" }}>Tutor's Comments</p>
            <div style={{ background:"#fafafa", borderRadius:14, padding:"14px 16px", border:"1px solid #e5e7eb" }}>
              <p style={{ fontSize:14, color:C.dark, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                {submission.feedback}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize:13, color:C.lg, textAlign:"center", padding:"20px 0" }}>
            No written feedback yet.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

/* ─── Assignment Card ────────────────────────────────────── */
function AssignmentCard({ assignment, onSubmit, onViewFeedback, index }) {
  const sub        = assignment.submissions?.[0];
  const isSubmitted= sub?.status === "SUBMITTED" || sub?.status === "REVIEWED";
  const isReviewed = sub?.status === "REVIEWED";
  const fileUrl    = mediaUrl(assignment.file_url);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index*0.07 }}
      style={{ background:"#fff", borderRadius:20, border:"1px solid #e5e7eb",
        padding:"18px 18px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.05)",
        overflow:"hidden", position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
        background: isReviewed ? "linear-gradient(90deg,#7c3aed,#8b5cf6)"
          : isSubmitted ? "linear-gradient(90deg,#16a34a,#22c55e)"
            : "linear-gradient(90deg,#f97316,#ea580c)" }}/>

      <div style={{ display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", gap:12, marginBottom:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:C.dark, marginBottom:3, lineHeight:1.3 }}>
            {assignment.title}
          </h3>
          {assignment.session && (
            <p style={{ fontSize:12, fontWeight:600, color:C.primary }}>
              Session {assignment.session.session_number}: {assignment.session.name}
            </p>
          )}
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:999, flexShrink:0,
          background: isReviewed?"#f5f3ff":isSubmitted?"#f0fdf4":isOverdue(assignment.due_date)?"#fef2f2":"#fff7ed",
          color: isReviewed?"#7c3aed":isSubmitted?"#16a34a":isOverdue(assignment.due_date)?"#dc2626":"#ea580c" }}>
          {isReviewed?"Reviewed ★":isSubmitted?"Submitted ✓":isOverdue(assignment.due_date)?"Overdue":"Pending"}
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        <div style={{ background:"#fafafa", borderRadius:10, padding:"9px 11px", border:"1px solid #e8ecf0" }}>
          <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
            letterSpacing:"0.4px", marginBottom:2 }}>Due Date</p>
          <p style={{ fontSize:12, fontWeight:700,
            color: isOverdue(assignment.due_date)&&!isSubmitted ? "#dc2626" : C.dark }}>
            {fmt(assignment.due_date)}
          </p>
        </div>
        <div style={{ background:"#fafafa", borderRadius:10, padding:"9px 11px", border:"1px solid #e8ecf0" }}>
          <p style={{ fontSize:9, color:C.lg, fontWeight:600, textTransform:"uppercase",
            letterSpacing:"0.4px", marginBottom:2 }}>Submitted</p>
          <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>
            {isSubmitted ? fmt(sub.submitted_at) : "—"}
          </p>
        </div>
      </div>

      {/* Download tutor's assignment file */}
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
            background:"#f0fdf4", borderRadius:10, border:"1px solid #86efac",
            textDecoration:"none", marginBottom:10 }}>
          <Download size={13} style={{ color:"#16a34a" }}/>
          <span style={{ fontSize:12, fontWeight:600, color:"#16a34a", flex:1 }}>
            Download Assignment File
          </span>
          <ExternalLink size={11} style={{ color:"#86efac" }}/>
        </a>
      )}

      {isReviewed ? (
        <button onClick={() => onViewFeedback(assignment, sub)}
          style={{ width:"100%", padding:"12px 0",
            background:"linear-gradient(135deg,#7c3aed,#8b5cf6)",
            color:"#fff", border:"none", borderRadius:12,
            fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <Star size={14}/> View Tutor Feedback
        </button>
      ) : isSubmitted ? (
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center",
            justifyContent:"center", gap:6, padding:"11px 0",
            background:"#f0fdf4", borderRadius:12 }}>
            <CheckCircle2 size={14} style={{ color:"#16a34a" }}/>
            <span style={{ fontSize:12, fontWeight:700, color:"#16a34a" }}>Submitted</span>
          </div>
          <button onClick={() => onSubmit(assignment)}
            style={{ padding:"11px 14px", background:"#fff",
              border:"1.5px solid #e5e7eb", borderRadius:12,
              fontSize:12, fontWeight:700, color:C.gray,
              cursor:"pointer", fontFamily:"inherit" }}>
            Resubmit
          </button>
        </div>
      ) : (
        <button onClick={() => onSubmit(assignment)}
          style={{ width:"100%", padding:"12px 0",
            background:`linear-gradient(135deg,${C.blue},${C.primary})`,
            color:"#fff", border:"none", borderRadius:12,
            fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <Upload size={14}/> Submit Assignment
        </button>
      )}
    </motion.div>
  );
}

/* ─── Batch Pills ────────────────────────────────────────── */
function BatchPills({ batches, selected, onSelect }) {
  if (batches.length <= 1) return null;
  return (
    <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:20 }}>
      {batches.map(b => {
        const isSel = selected?.id === b.id;
        return (
          <button key={b.id} onClick={() => onSelect(b)}
            style={{ flexShrink:0, padding:"6px 16px", borderRadius:999,
              border: isSel?"none":"1.5px solid #e5e7eb",
              background: isSel?`linear-gradient(135deg,${C.blue},${C.primary})`:"#fff",
              color: isSel?"#fff":C.gray, fontSize:12, fontWeight:700, cursor:"pointer",
              boxShadow: isSel?`0 3px 12px rgba(0,123,191,0.25)`:"none" }}>
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Shared hook ────────────────────────────────────────── */
function useBatchAssignments() {
  const [batches,     setBatches]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refresh,     setRefresh]     = useState(0);

  useEffect(() => {
    batchApi.enrolled()
      .then(r => {
        const list = (r.data||[]).map(e => e.batch).filter(Boolean);
        setBatches(list);
        if (list.length > 0) setSelected(list[0]);
      }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    assignmentApi.getForBatch(selected.id)
      .then(r => setAssignments(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected, refresh]);

  return { batches, selected, setSelected, assignments, loading,
    refresh: () => setRefresh(t => t+1) };
}

/* ═══════════════ ALL ASSIGNMENTS PAGE ═══════════════ */
export function AllAssignmentsPage() {
  const { batches, selected, setSelected, assignments, loading, refresh } = useBatchAssignments();
  const [submitSheet,   setSubmitSheet]   = useState(null);
  const [feedbackSheet, setFeedbackSheet] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [filter, setFilter] = useState("ALL");

  const pending   = assignments.filter(a => !a.submissions?.[0]);
  const submitted = assignments.filter(a => a.submissions?.[0]?.status === "SUBMITTED");
  const reviewed  = assignments.filter(a => a.submissions?.[0]?.status === "REVIEWED");

  const filtered = useMemo(() => {
    if (filter === "ALL")     return assignments;
    if (filter === "PENDING") return pending;
    if (filter === "DONE")    return [...submitted, ...reviewed];
    return assignments;
  }, [assignments, filter]);

  const FILTERS = [
    { key:"ALL",     label:"All",       count:assignments.length },
    { key:"PENDING", label:"Pending",   count:pending.length,   hide:pending.length===0 },
    { key:"DONE",    label:"Submitted", count:submitted.length+reviewed.length,
      hide:submitted.length+reviewed.length===0 },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.dark }}>Assignments</h2>
          <p style={{ fontSize:13, color:C.lg, marginTop:2 }}>
            {pending.length > 0 ? `${pending.length} pending · ${reviewed.length} reviewed` : `${assignments.length} assignments`}
          </p>
        </div>

        <BatchPills batches={batches} selected={selected} onSelect={setSelected}/>

        {assignments.length > 0 && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              {[
                { val:pending.length,   label:"Pending",   bg:"#fff7ed", color:"#ea580c" },
                { val:submitted.length, label:"Submitted", bg:"#eff8ff", color:C.primary },
                { val:reviewed.length,  label:"Reviewed",  bg:"#f5f3ff", color:"#7c3aed" },
              ].map(({ val,label,bg,color }) => (
                <div key={label} style={{ textAlign:"center", padding:"12px 8px",
                  borderRadius:14, background:bg }}>
                  <p style={{ fontSize:22, fontWeight:800, color }}>{val}</p>
                  <p style={{ fontSize:10, fontWeight:600, color, opacity:0.75 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {FILTERS.filter(f=>!f.hide).map(({ key,label,count }) => (
                <button key={key} onClick={() => setFilter(key)} style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"7px 14px", borderRadius:999,
                  border: filter===key?"none":"1.5px solid #e5e7eb",
                  background: filter===key?`linear-gradient(135deg,${C.blue},${C.primary})`:"#fff",
                  color: filter===key?"#fff":C.gray,
                  fontSize:12, fontWeight:700, cursor:"pointer",
                  boxShadow: filter===key?`0 3px 12px rgba(0,123,191,0.25)`:"none" }}>
                  {label}
                  <span style={{ fontSize:10, fontWeight:800,
                    background: filter===key?"rgba(255,255,255,0.2)":"#f3f4f6",
                    color: filter===key?"#fff":C.gray,
                    padding:"1px 6px", borderRadius:999 }}>{count}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[1,2].map(i=>(
              <div key={i} style={{ height:220, background:"#f3f4f6", borderRadius:20 }}
                className="animate-pulse"/>
            ))}
          </div>
        )}

        {!loading && assignments.length === 0 && (
          <div style={{ background:"#fff", borderRadius:20, border:"1px solid #e5e7eb",
            padding:56, textAlign:"center" }}>
            <BookOpen size={40} style={{ color:"#d1d5db", margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:700, color:C.dark, marginBottom:6 }}>No assignments yet</p>
            <p style={{ fontSize:13, color:C.lg }}>Your tutor will share assignments here.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {filtered.map((a,i) => (
              <AssignmentCard key={a.id} assignment={a} index={i}
                onSubmit={setSubmitSheet}
                onViewFeedback={(a,s)=>setFeedbackSheet({assignment:a,submission:s})}/>
            ))}
          </div>
        )}

        <AnimatePresence>
          {submitSheet && (
            <SubmitSheet assignment={submitSheet}
              onClose={()=>setSubmitSheet(null)}
              onSubmitted={()=>{ refresh(); setToast({msg:"Submitted!",type:"success"}); }}/>
          )}
          {feedbackSheet && (
            <FeedbackSheet assignment={feedbackSheet.assignment}
              submission={feedbackSheet.submission}
              onClose={()=>setFeedbackSheet(null)}/>
          )}
          {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}

/* ═══════════════ ASSIGNMENT FEEDBACK PAGE ═══════════════ */
export function AssignmentFeedbackPage() {
  const { batches, selected, setSelected, assignments, loading } = useBatchAssignments();
  const [feedbackSheet, setFeedbackSheet] = useState(null);
  const reviewed = useMemo(() =>
    assignments.filter(a => a.submissions?.[0]?.status === "REVIEWED"),
    [assignments]);

  return (
    <AppShell>
      <PageWrapper>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.dark }}>Assignment Feedback</h2>
          <p style={{ fontSize:13, color:C.lg, marginTop:2 }}>{reviewed.length} reviewed by tutor</p>
        </div>
        <BatchPills batches={batches} selected={selected} onSelect={setSelected}/>

        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[1,2].map(i=>(
              <div key={i} style={{ height:200, background:"#f3f4f6", borderRadius:20 }}
                className="animate-pulse"/>
            ))}
          </div>
        )}

        {!loading && reviewed.length === 0 && (
          <div style={{ background:"#fff", borderRadius:20, border:"1px solid #e5e7eb",
            padding:56, textAlign:"center" }}>
            <Star size={40} style={{ color:"#d1d5db", margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:700, color:C.dark, marginBottom:6 }}>No feedback yet</p>
            <p style={{ fontSize:13, color:C.lg }}>
              Feedback appears once your tutor reviews your submission.
            </p>
          </div>
        )}

        {!loading && reviewed.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {reviewed.map((a,i) => (
              <AssignmentCard key={a.id} assignment={a} index={i}
                onSubmit={()=>{}}
                onViewFeedback={(a,s)=>setFeedbackSheet({assignment:a,submission:s})}/>
            ))}
          </div>
        )}

        <AnimatePresence>
          {feedbackSheet && (
            <FeedbackSheet assignment={feedbackSheet.assignment}
              submission={feedbackSheet.submission}
              onClose={()=>setFeedbackSheet(null)}/>
          )}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}