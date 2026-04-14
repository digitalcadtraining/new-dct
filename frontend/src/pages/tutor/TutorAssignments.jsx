/**
 * TutorAssignments.jsx — Real API, no dummy data
 * Shows all tutor assignments with student submissions + review modal
 */
import { useState, useEffect, useMemo } from "react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { batchApi, assignmentApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";
import {
  BookOpen, Download, ExternalLink, ChevronDown,
  ChevronUp, Star, X, RefreshCw, Users, FileText,
  CheckCircle2, AlertCircle,
} from "lucide-react";

const C = { dark:"#1F1A17", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#9ca3af" };

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

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

/* ─── Review Modal ─────────────────────────────────────── */
function ReviewModal({ submission, assignment, onClose, onReviewed }) {
  const [grade,    setGrade]    = useState(submission?.grade    || "");
  const [feedback, setFeedback] = useState(submission?.feedback || "");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const GRADES = ["A+","A","B+","B","C","Resubmit"];
  const fileUrl = mediaUrl(submission?.file_url);

  const handleSubmit = async () => {
    setLoading(true); setErr("");
    try {
      await assignmentApi.review(submission.id, {
        grade:   grade    || undefined,
        feedback:feedback || undefined,
        status:  grade === "Resubmit" ? "RESUBMIT" : "REVIEWED",
      });
      onReviewed();
      onClose();
    } catch(e) { setErr(e.message || "Failed to submit review."); }
    finally { setLoading(false); }
  };

  if (!submission) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex",
      alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)",
        backdropFilter:"blur(4px)" }} initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={onClose}/>
      <motion.div style={{ position:"relative", background:"#fff", borderRadius:20,
        width:"100%", maxWidth:460, zIndex:10, overflow:"hidden",
        boxShadow:"0 24px 64px rgba(0,0,0,0.2)", maxHeight:"92vh", overflowY:"auto" }}
        initial={{ opacity:0, scale:0.95, y:16 }} animate={{ opacity:1, scale:1, y:0 }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#7c3aed,#8b5cf6)" }}/>
        <div style={{ padding:"22px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div>
              <p style={{ fontSize:16, fontWeight:800, color:C.dark }}>Review Submission</p>
              <p style={{ fontSize:12, color:C.lg, marginTop:2 }}>
                {submission.student?.name} · {assignment?.title}
              </p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8,
              border:"none", background:"#f3f4f6", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={14} style={{ color:C.gray }}/>
            </button>
          </div>

          {/* Download submission */}
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", background:"#eff8ff", borderRadius:12,
                border:"1px solid #bfdbfe", textDecoration:"none", marginBottom:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Download size={15} style={{ color:C.primary }}/>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:C.primary }}>Download Student File</p>
                  <p style={{ fontSize:11, color:C.lg }}>Submitted {fmt(submission.submitted_at)}</p>
                </div>
              </div>
              <ExternalLink size={13} style={{ color:C.lg }}/>
            </a>
          )}

          {/* Grade */}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gray,
              marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Grade</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)}
                  style={{ padding:"6px 14px", borderRadius:999, cursor:"pointer",
                    fontFamily:"inherit", fontSize:12, fontWeight:700,
                    border: grade===g ? "none" : "1.5px solid #e5e7eb",
                    background: grade===g
                      ? g==="Resubmit" ? "linear-gradient(135deg,#dc2626,#ef4444)"
                        : "linear-gradient(135deg,#7c3aed,#8b5cf6)"
                      : "#fff",
                    color: grade===g ? "#fff" : C.gray }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gray,
              marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Feedback</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Write specific, constructive feedback…" rows={4}
              style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e5e7eb",
                borderRadius:12, fontSize:13, resize:"none", outline:"none",
                fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box", color:C.dark }}
              onFocus={e=>e.target.style.borderColor=C.primary}
              onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
          </div>

          {err && (
            <div style={{ display:"flex", gap:6, padding:"9px 12px", background:"#fef2f2",
              borderRadius:10, marginBottom:12 }}>
              <AlertCircle size={13} style={{ color:"#dc2626", flexShrink:0 }}/>
              <span style={{ fontSize:12, color:"#dc2626" }}>{err}</span>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"13px 0",
              background:loading?"#e5e7eb":"linear-gradient(135deg,#7c3aed,#8b5cf6)",
              color:loading?C.lg:"#fff", border:"none", borderRadius:12,
              fontSize:14, fontWeight:800, cursor:loading?"not-allowed":"pointer",
              fontFamily:"inherit", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8 }}>
            {loading
              ? <><RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }}/> Submitting…</>
              : <><Star size={14}/> Submit Review</>}
          </button>
        </div>
      </motion.div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Submission Row ───────────────────────────────────── */
function SubmissionRow({ submission, assignment, onReview, index }) {
  const isReviewed = submission.status === "REVIEWED";
  const isResubmit = submission.status === "RESUBMIT";
  const fileUrl    = mediaUrl(submission.file_url);

  return (
    <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
      transition={{ delay: index * 0.04 }}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
        borderRadius:12, marginBottom:8,
        background: isReviewed?"#f0fdf4":isResubmit?"#fef2f2":"#fafafa",
        border:`1px solid ${isReviewed?"#86efac":isResubmit?"#fecaca":"#e5e7eb"}` }}>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
        background:`linear-gradient(135deg,${C.blue},${C.primary})`,
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", fontSize:13, fontWeight:800 }}>
        {submission.student?.name?.[0]?.toUpperCase() || "S"}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.dark }}>
          {submission.student?.name || "Student"}
        </p>
        <p style={{ fontSize:11, color:C.lg }}>
          Submitted {fmt(submission.submitted_at)}
          {submission.grade && (
            <span style={{ marginLeft:8, fontWeight:700, color:"#7c3aed" }}>
              · Grade: {submission.grade}
            </span>
          )}
        </p>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:4, fontSize:11,
              fontWeight:700, color:C.primary, textDecoration:"none",
              padding:"5px 10px", background:"#eff8ff", borderRadius:8,
              border:"1px solid #bfdbfe" }}>
            <Download size={12}/> File
          </a>
        )}
        <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:999,
          background: isReviewed?"#dcfce7":isResubmit?"#fee2e2":"#fff7ed",
          color: isReviewed?"#16a34a":isResubmit?"#dc2626":"#ea580c" }}>
          {isReviewed?"Reviewed":isResubmit?"Resubmit":"Pending"}
        </span>
        <button onClick={() => onReview(submission)}
          style={{ padding:"6px 12px", borderRadius:8, cursor:"pointer",
            fontFamily:"inherit", fontSize:11, fontWeight:700, border:"none",
            background: isReviewed
              ? "#fff" : `linear-gradient(135deg,${C.blue},${C.primary})`,
            color: isReviewed ? C.primary : "#fff",
            outline: isReviewed ? `1px solid ${C.primary}` : "none" }}>
          {isReviewed ? "Edit" : "Review"}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Assignment Card ──────────────────────────────────── */
function AssignmentCard({ assignment, index, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const subs     = assignment.submissions || [];
  const reviewed = subs.filter(s => s.status === "REVIEWED").length;
  const pending  = subs.filter(s => s.status === "SUBMITTED").length;
  const fileUrl  = mediaUrl(assignment.file_url);

  return (
    <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.07 }}
      style={{ background:"#fff", borderRadius:20, border:"1px solid #e5e7eb",
        overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${C.blue},${C.primary})` }}/>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:C.dark, marginBottom:3 }}>
              {assignment.title}
            </h3>
            {assignment.session && (
              <p style={{ fontSize:12, fontWeight:600, color:C.primary }}>
                Session {assignment.session.session_number}: {assignment.session.name}
              </p>
            )}
            {assignment.description && (
              <p style={{ fontSize:12, color:C.gray, marginTop:4, lineHeight:1.5 }}>
                {assignment.description}
              </p>
            )}
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <p style={{ fontSize:10, color:C.lg, fontWeight:600,
              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:2 }}>Due</p>
            <p style={{ fontSize:12, fontWeight:700, color:C.dark }}>{fmt(assignment.due_date)}</p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Users size={12} style={{ color:C.lg }}/>
              <span style={{ fontSize:12, fontWeight:600, color:C.dark }}>
                {subs.length} submitted
              </span>
            </div>
            {pending > 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                borderRadius:999, background:"#fff7ed", color:"#ea580c" }}>
                {pending} pending review
              </span>
            )}
            {reviewed > 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                borderRadius:999, background:"#f0fdf4", color:"#16a34a" }}>
                {reviewed} reviewed
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px",
                  background:"#eff8ff", borderRadius:8, border:"1px solid #bfdbfe",
                  textDecoration:"none" }}>
                <Download size={12} style={{ color:C.primary }}/>
                <span style={{ fontSize:11, fontWeight:700, color:C.primary }}>
                  Assignment File
                </span>
              </a>
            )}
            <button onClick={() => setExpanded(v => !v)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px",
                background: expanded ? `linear-gradient(135deg,${C.blue},${C.primary})` : "#f3f4f6",
                borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit",
                fontSize:11, fontWeight:700,
                color: expanded ? "#fff" : C.gray }}>
              {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              {subs.length === 0 ? "No submissions" : `${subs.length} submission${subs.length!==1?"s":""}`}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:"hidden" }}>
            <div style={{ padding:"0 18px 18px", borderTop:"1px solid #f3f4f6", paddingTop:14 }}>
              {subs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <FileText size={28} style={{ color:"#d1d5db", margin:"0 auto 8px" }}/>
                  <p style={{ fontSize:13, color:C.lg }}>No submissions yet</p>
                </div>
              ) : subs.map((sub, i) => (
                <SubmissionRow key={sub.id} submission={sub}
                  assignment={assignment} onReview={onReview} index={i}/>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Batch Pills ──────────────────────────────────────── */
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

/* ─── MAIN PAGE ────────────────────────────────────────── */
export default function TutorAssignments() {
  const [batches,      setBatches]      = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [assignments,  setAssignments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null); // { submission, assignment }
  const [refreshToken, setRefreshToken] = useState(0);
  const [toast,        setToast]        = useState(null);
  const [filterSession,setFilterSession]= useState("");

  useEffect(() => {
    batchApi.mine()
      .then(r => {
        const approved = (r.data||[]).filter(b => b.status !== "PENDING_APPROVAL");
        setBatches(approved);
        if (approved.length > 0) setSelected(approved[0]);
      }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    assignmentApi.getTutorBatch(selected.id)
      .then(r => setAssignments(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected, refreshToken]);

  const sessionOptions = useMemo(() => {
    const seen = new Set();
    return assignments.filter(a => a.session).filter(a => {
      if (seen.has(a.session_id)) return false; seen.add(a.session_id); return true;
    }).map(a => ({ id:a.session_id, label:`Session ${a.session.session_number}: ${a.session.name}` }));
  }, [assignments]);

  const filtered = useMemo(() =>
    filterSession ? assignments.filter(a => a.session_id === filterSession) : assignments,
    [assignments, filterSession]
  );

  const totalSubs   = assignments.reduce((n,a)=>n+(a.submissions?.length||0),0);
  const pendingSubs = assignments.reduce((n,a)=>n+(a.submissions?.filter(s=>s.status==="SUBMITTED").length||0),0);

  return (
    <AppShell>
      <PageWrapper>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.dark }}>Assignments</h2>
          <p style={{ fontSize:13, color:C.lg, marginTop:2 }}>
            {assignments.length} assignments · {pendingSubs} submission{pendingSubs!==1?"s":""} pending review
          </p>
        </div>

        <BatchPills batches={batches} selected={selected} onSelect={b=>{setSelected(b);setFilterSession("");}}/>

        {/* Stats */}
        {assignments.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {[
              { val:assignments.length, label:"Assignments",  bg:"#eff8ff", color:C.primary  },
              { val:pendingSubs,        label:"To Review",    bg:"#fff7ed", color:"#ea580c"   },
              { val:totalSubs-pendingSubs, label:"Reviewed",  bg:"#f5f3ff", color:"#7c3aed"  },
            ].map(({ val,label,bg,color }) => (
              <div key={label} style={{ textAlign:"center", padding:"12px 8px", borderRadius:14, background:bg }}>
                <p style={{ fontSize:22, fontWeight:800, color }}>{val}</p>
                <p style={{ fontSize:10, fontWeight:600, color, opacity:0.75 }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Session filter */}
        {sessionOptions.length > 1 && (
          <div style={{ marginBottom:20 }}>
            <select value={filterSession} onChange={e=>setFilterSession(e.target.value)}
              style={{ padding:"10px 14px", border:"1.5px solid #e5e7eb", borderRadius:12,
                fontSize:13, outline:"none", fontFamily:"inherit", color:C.dark,
                background:"#fff", minWidth:240 }}>
              <option value="">All Sessions</option>
              {sessionOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ height:100, background:"#f3f4f6", borderRadius:20 }}
                className="animate-pulse"/>
            ))}
          </div>
        )}

        {!loading && assignments.length === 0 && (
          <div style={{ background:"#fff", borderRadius:20, border:"1px solid #e5e7eb",
            padding:56, textAlign:"center" }}>
            <BookOpen size={40} style={{ color:"#d1d5db", margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:700, color:C.dark, marginBottom:6 }}>No assignments yet</p>
            <p style={{ fontSize:13, color:C.lg }}>
              Upload assignments from your session cards in the Sessions tab.
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {filtered.map((a, i) => (
              <AssignmentCard key={a.id} assignment={a} index={i}
                onReview={sub => setReviewTarget({ submission:sub, assignment:a })}/>
            ))}
          </div>
        )}

        <AnimatePresence>
          {reviewTarget && (
            <ReviewModal
              submission={reviewTarget.submission}
              assignment={reviewTarget.assignment}
              onClose={() => setReviewTarget(null)}
              onReviewed={() => {
                setReviewTarget(null);
                setRefreshToken(t => t+1);
                setToast({ msg:"Review submitted!", type:"success" });
              }}/>
          )}
          {toast && (
            <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>
          )}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}