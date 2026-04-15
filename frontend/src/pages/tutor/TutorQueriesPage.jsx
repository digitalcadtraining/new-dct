/**
 * TutorQueriesPage — dedicated query management
 * - URL params: ?session_id=...&batch_id=...&session_num=...  (from session card click)
 * - Priority: Ultra High (48h+), High (24h+), Medium (recent)
 * - Student media shown correctly via mediaUrl
 * - Oldest unanswered first
 */
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { batchApi, queryApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";
import {
  HelpCircle, X, CheckCircle2, Flame, AlertTriangle,
  Minus, PlayCircle, Send, RefreshCw, Bell,
} from "lucide-react";

const C = { dark:"#1F1A17", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#9ca3af" };

function getPriority(q) {
  if (q.status === "RESOLVED" || q.status === "AUTO_RESOLVED") return "resolved";
  if (q.answer) return "answered";
  if (q.is_reminded) return "reminded";  // Student reminded = needs immediate attention
  const h = (Date.now() - new Date(q.created_at).getTime()) / 3600000;
  if (h >= 48) return "ultra";
  if (h >= 24) return "high";
  return "medium";
}

const PCFG = {
  reminded: { label:"⚡ Reminded",  bg:"#fdf4ff", color:"#7c3aed", border:"#e9d5ff", Icon:Bell,          sort:0 },
  ultra:    { label:"🔴 Ultra High", bg:"#fef2f2", color:"#dc2626", border:"#fecaca", Icon:Flame,         sort:1 },
  high:     { label:"🟠 High",       bg:"#fff7ed", color:"#ea580c", border:"#fed7aa", Icon:AlertTriangle,  sort:2 },
  medium:   { label:"🟡 Medium",     bg:"#fefce8", color:"#ca8a04", border:"#fde68a", Icon:Minus,          sort:3 },
  answered: { label:"✓ Answered",   bg:"#eff8ff", color:"#007BBF", border:"#bfdbfe", Icon:CheckCircle2,   sort:4 },
  resolved: { label:"✓ Resolved",   bg:"#f0fdf4", color:"#16a34a", border:"#86efac", Icon:CheckCircle2,   sort:5 },
};

function fmtRelative(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), days = Math.floor(d/86400000);
  if (m<1) return "Just now"; if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`; return `${days}d ago`;
}

function AnswerModal({ query, onClose, onAnswered }) {
  const [answer, setAnswer]   = useState("");
  const [loading, setLoading] = useState(false);
  const attachSrc = mediaUrl(query.media_url);
  const isVideo   = query.media_url &&
    (query.media_url.match(/\.(mp4|mov|webm|avi)$/i) || query.media_url.includes("video"));

  const submit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try { await queryApi.answer(query.id, answer); onAnswered(query.id); onClose(); }
    catch(e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",
      alignItems:"center",justifyContent:"center",padding:16 }}>
      <motion.div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",
        backdropFilter:"blur(4px)" }} initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={onClose}/>
      <motion.div style={{ position:"relative",background:"#fff",borderRadius:20,
        width:"100%",maxWidth:500,zIndex:10,padding:24,
        boxShadow:"0 24px 64px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto" }}
        initial={{ opacity:0,scale:0.95,y:16 }} animate={{ opacity:1,scale:1,y:0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div>
            <h3 style={{ fontWeight:800,color:C.dark,fontSize:16 }}>Answer Query</h3>
            <p style={{ fontSize:11,color:C.lg,marginTop:2 }}>
              {query.student?.name} · {query.batch_name||""} · {fmtRelative(query.created_at)}
            </p>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,
            background:"#f3f4f6",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <X size={14} style={{ color:C.gray }}/>
          </button>
        </div>
        {query.session && (
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,
            padding:"5px 10px",background:"#eff8ff",borderRadius:8,marginBottom:12 }}>
            <span style={{ fontSize:11,fontWeight:700,color:C.blue }}>
              Session {query.session.session_number}: {query.session.name}
            </span>
          </div>
        )}
        <div style={{ background:"#f9fafb",borderRadius:12,padding:"12px 14px",marginBottom:12 }}>
          <p style={{ fontSize:11,fontWeight:700,color:C.gray,marginBottom:5,
            textTransform:"uppercase",letterSpacing:"0.4px" }}>Question</p>
          <p style={{ fontSize:14,color:C.dark,lineHeight:1.65 }}>{query.question}</p>
        </div>
        {attachSrc && (
          <div style={{ marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb" }}>
            {isVideo
              ? <video src={attachSrc} controls style={{ width:"100%",maxHeight:220,display:"block",background:"#000" }}/>
              : <img src={attachSrc} alt="attachment"
                  style={{ width:"100%",maxHeight:220,objectFit:"cover",display:"block" }}
                  onError={e=>e.target.style.display="none"}/>}
            <div style={{ padding:"5px 12px",background:"#f9fafb",fontSize:10,color:C.lg }}>
              📎 Student attachment
            </div>
          </div>
        )}
        <textarea value={answer} onChange={e=>setAnswer(e.target.value)}
          placeholder="Type your answer…" rows={4}
          style={{ width:"100%",padding:"12px 14px",border:"1.5px solid #e5e7eb",
            borderRadius:12,fontSize:14,outline:"none",resize:"none",
            marginBottom:14,boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6 }}
          onFocus={e=>e.target.style.borderColor=C.primary}
          onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
        <button onClick={submit} disabled={loading||!answer.trim()}
          style={{ width:"100%",padding:"13px 0",border:"none",borderRadius:12,
            color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
            opacity:loading||!answer.trim()?0.6:1,
            background:`linear-gradient(135deg,${C.blue},${C.primary})`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {loading
            ? <><RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }}/> Sending…</>
            : <><Send size={14}/> Send Answer</>}
        </button>
      </motion.div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function QueryCard({ query, index, onAnswer }) {
  const p = getPriority(query);
  const P = PCFG[p];
  const cardSrc = mediaUrl(query.media_url);
  const isVideo = query.media_url &&
    (query.media_url.match(/\.(mp4|mov|webm|avi)$/i) || query.media_url.includes("video"));
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }}
      transition={{ delay:Math.min(index*0.05,0.4) }}
      style={{ background:"#fff",borderRadius:18,border:`1px solid ${P.border}`,
        overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ height:3, background:
        p==="resolved" ? "#86efac" :
        p==="ultra"    ? "linear-gradient(90deg,#dc2626,#ef4444)" :
        p==="high"     ? "linear-gradient(90deg,#ea580c,#f97316)" :
                         "linear-gradient(90deg,#ca8a04,#eab308)" }}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex",alignItems:"flex-start",
          justifyContent:"space-between",gap:10,marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:34,height:34,borderRadius:"50%",flexShrink:0,
              background:`linear-gradient(135deg,${C.blue},${C.primary})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:13,fontWeight:800 }}>
              {query.student?.name?.[0]?.toUpperCase()||"S"}
            </div>
            <div>
              <p style={{ fontSize:13,fontWeight:700,color:C.dark }}>{query.student?.name||"Student"}</p>
              <p style={{ fontSize:11,color:C.lg }}>
                {query.batch_name||"Batch"}
                {query.session && ` · Session ${query.session.session_number}`}
              </p>
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
            <span style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:10,
              fontWeight:800,padding:"3px 8px",borderRadius:999,background:P.color,color:"#fff" }}>
              <P.Icon size={10}/> {P.label}
            </span>
            <span style={{ fontSize:10,color:C.lg }}>{fmtRelative(query.created_at)}</span>
          </div>
        </div>
        <p style={{ fontSize:13,color:C.dark,lineHeight:1.6,marginBottom:10 }}>{query.question}</p>
        {cardSrc && !imgErr && (
          <div style={{ marginBottom:10,borderRadius:10,overflow:"hidden",
            border:"1px solid #e5e7eb",maxHeight:160 }}>
            {isVideo
              ? <video src={cardSrc} controls style={{ width:"100%",maxHeight:160,display:"block",background:"#000" }}/>
              : <img src={cardSrc} alt="attachment"
                  style={{ width:"100%",maxHeight:160,objectFit:"cover",display:"block" }}
                  onError={()=>setImgErr(true)}/>}
          </div>
        )}
        {query.answer && (
          <div style={{ background:"linear-gradient(135deg,#eff8ff,#e0f2fe)",
            borderRadius:12,padding:"10px 12px",marginBottom:10,
            borderLeft:`3px solid ${C.primary}` }}>
            <p style={{ fontSize:10,fontWeight:700,color:C.blue,marginBottom:4,
              textTransform:"uppercase",letterSpacing:"0.4px" }}>Your Answer</p>
            <p style={{ fontSize:13,color:C.dark,lineHeight:1.55 }}>{query.answer}</p>
          </div>
        )}
        {p!=="resolved" && (
          <button onClick={()=>onAnswer(query)}
            style={{ width:"100%",padding:"10px 0",borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${C.blue},${C.primary})`,
              color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            {query.answer ? "Update Answer" : "Answer Query"}
          </button>
        )}
        {p==="resolved" && (
          <div style={{ display:"flex",alignItems:"center",gap:6,
            padding:"8px 12px",background:"#f0fdf4",borderRadius:10 }}>
            <CheckCircle2 size={13} style={{ color:"#16a34a" }}/>
            <span style={{ fontSize:12,fontWeight:600,color:"#16a34a" }}>Resolved</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BatchPills({ batches, selected, onSelect }) {
  return (
    <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:20 }}>
      <button onClick={()=>onSelect(null)}
        style={{ flexShrink:0,padding:"6px 16px",borderRadius:999,
          border: !selected?"none":"1.5px solid #e5e7eb",
          background: !selected?`linear-gradient(135deg,${C.blue},${C.primary})`:"#fff",
          color:!selected?"#fff":C.gray,fontSize:12,fontWeight:700,cursor:"pointer",
          boxShadow:!selected?`0 3px 12px rgba(0,123,191,0.25)`:"none" }}>
        All Batches
      </button>
      {batches.map(b=>{
        const isSel = selected?.id===b.id;
        return (
          <button key={b.id} onClick={()=>onSelect(b)}
            style={{ flexShrink:0,padding:"6px 16px",borderRadius:999,
              border: isSel?"none":"1.5px solid #e5e7eb",
              background: isSel?`linear-gradient(135deg,${C.blue},${C.primary})`:"#fff",
              color:isSel?"#fff":C.gray,fontSize:12,fontWeight:700,cursor:"pointer",
              boxShadow:isSel?`0 3px 12px rgba(0,123,191,0.25)`:"none" }}>
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

export default function TutorQueriesPage() {
  const [searchParams] = useSearchParams();
  const urlSessionId  = searchParams.get("session_id")  || "";
  const urlBatchId    = searchParams.get("batch_id")    || "";
  const urlSessionNum = searchParams.get("session_num") || "";

  const [batches,        setBatches]        = useState([]);
  const [selectedBatch,  setSelectedBatch]  = useState(null);
  const [queries,        setQueries]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [answerTarget,   setAnswerTarget]   = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sessionFilter,  setSessionFilter]  = useState(urlSessionId);
  const [refreshToken,   setRefreshToken]   = useState(0);

  useEffect(() => {
    batchApi.mine().then(r=>{
      const approved = (r.data||[]).filter(b=>b.status!=="PENDING_APPROVAL");
      setBatches(approved);
      if (urlBatchId) {
        const match = approved.find(b=>b.id===urlBatchId);
        if (match) setSelectedBatch(match);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (batches.length===0) return;
    setLoading(true);
    const toFetch = selectedBatch ? [selectedBatch] : batches;
    Promise.all(toFetch.map(b=>
      queryApi.getBatchQueries(b.id)
        .then(r=>(r.data||[]).map(q=>({...q,batch_name:b.name})))
        .catch(()=>[])
    )).then(results=>{
      const all = results.flat().sort((a,b)=>{
        const pa=getPriority(a), pb=getPriority(b);
        if (pa==="resolved"&&pb!=="resolved") return 1;
        if (pb==="resolved"&&pa!=="resolved") return -1;
        return new Date(a.created_at)-new Date(b.created_at);
      });
      setQueries(all);
    }).finally(()=>setLoading(false));
  }, [batches, selectedBatch, refreshToken]);

  const handleAnswered = (id) => {
    setQueries(prev=>prev.map(q=>q.id===id?{...q,status:"RESOLVED"}:q));
    setRefreshToken(t=>t+1);
  };

  const filtered = useMemo(()=>{
    let q = queries;
    if (sessionFilter) q = q.filter(x=>x.session_id===sessionFilter);
    if (priorityFilter==="ALL")      return q;
    if (priorityFilter==="resolved") return q.filter(x=>x.status==="RESOLVED");
    return q.filter(x=>getPriority(x)===priorityFilter);
  }, [queries, priorityFilter, sessionFilter]);

  const ultraCount  = queries.filter(q=>getPriority(q)==="ultra").length;
  const highCount   = queries.filter(q=>getPriority(q)==="high").length;
  const medCount    = queries.filter(q=>getPriority(q)==="medium").length;
  const resolvedCnt = queries.filter(q=>q.status==="RESOLVED").length;
  const openCount   = ultraCount+highCount+medCount;

  const FILTERS = [
    { key:"ALL",      label:"All",        count:queries.length },
    { key:"ultra",    label:"Ultra High", count:ultraCount,  hide:ultraCount===0,  color:"#dc2626" },
    { key:"high",     label:"High",       count:highCount,   hide:highCount===0,   color:"#ea580c" },
    { key:"medium",   label:"Medium",     count:medCount,    color:"#ca8a04" },
    { key:"resolved", label:"Resolved",   count:resolvedCnt, hide:resolvedCnt===0, color:"#16a34a" },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22,fontWeight:800,color:C.dark }}>Student Queries</h2>
          <p style={{ fontSize:13,color:C.lg,marginTop:2 }}>
            {openCount} open · {resolvedCnt} resolved
            {ultraCount>0 && <span style={{ marginLeft:8,color:"#dc2626",fontWeight:700 }}>
              · {ultraCount} need immediate attention
            </span>}
          </p>
        </div>

        {/* Session filter banner */}
        {sessionFilter && (
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 14px",background:"#eff8ff",borderRadius:12,
            border:"1px solid #bfdbfe",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <HelpCircle size={14} style={{ color:C.primary }}/>
              <span style={{ fontSize:13,fontWeight:700,color:C.blue }}>
                Showing queries for Session {urlSessionNum} only
              </span>
            </div>
            <button onClick={()=>setSessionFilter("")}
              style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,
                fontWeight:700,color:C.gray,background:"none",border:"none",
                cursor:"pointer",fontFamily:"inherit" }}>
              <X size={13}/> Clear
            </button>
          </div>
        )}

        <BatchPills batches={batches} selected={selectedBatch} onSelect={setSelectedBatch}/>

        {queries.length>0 && (
          <>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20 }}>
              {[
                { val:ultraCount, label:"Ultra High",bg:"#fef2f2",color:"#dc2626" },
                { val:highCount,  label:"High",     bg:"#fff7ed",color:"#ea580c" },
                { val:medCount,   label:"Medium",   bg:"#fefce8",color:"#ca8a04" },
                { val:resolvedCnt,label:"Resolved", bg:"#f0fdf4",color:"#16a34a" },
              ].map(({val,label,bg,color})=>(
                <div key={label} style={{ textAlign:"center",padding:"10px 6px",
                  borderRadius:14,background:bg }}>
                  <p style={{ fontSize:20,fontWeight:800,color }}>{val}</p>
                  <p style={{ fontSize:9,fontWeight:700,color,opacity:0.75 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",gap:8,marginBottom:24,overflowX:"auto",paddingBottom:4 }}>
              {FILTERS.filter(f=>!f.hide).map(({key,label,count,color})=>{
                const isSel=priorityFilter===key;
                return (
                  <button key={key} onClick={()=>setPriorityFilter(key)}
                    style={{ flexShrink:0,display:"flex",alignItems:"center",gap:6,
                      padding:"7px 14px",borderRadius:999,cursor:"pointer",
                      fontFamily:"inherit",fontSize:12,fontWeight:700,
                      border:isSel?"none":"1.5px solid #e5e7eb",
                      background:isSel?(color||`linear-gradient(135deg,${C.blue},${C.primary})`):"#fff",
                      color:isSel?"#fff":C.gray,
                      boxShadow:isSel?`0 3px 12px rgba(0,0,0,0.15)`:"none" }}>
                    {label}
                    <span style={{ fontSize:10,fontWeight:800,
                      background:isSel?"rgba(255,255,255,0.25)":"#f3f4f6",
                      color:isSel?"#fff":C.gray,padding:"1px 6px",borderRadius:999 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {loading && (
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {[1,2,3].map(i=><div key={i} style={{ height:180,background:"#f3f4f6",
              borderRadius:18 }} className="animate-pulse"/>)}
          </div>
        )}

        {!loading && queries.length===0 && (
          <div style={{ background:"#fff",borderRadius:20,border:"1px solid #e5e7eb",
            padding:56,textAlign:"center" }}>
            <HelpCircle size={40} style={{ color:"#d1d5db",margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:700,color:C.dark,marginBottom:6 }}>No queries yet</p>
            <p style={{ fontSize:13,color:C.lg }}>Student queries will appear here.</p>
          </div>
        )}

        {!loading && filtered.length>0 && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14 }}>
            {filtered.map((q,i)=>(
              <QueryCard key={q.id} query={q} index={i} onAnswer={setAnswerTarget}/>
            ))}
          </div>
        )}

        {!loading && filtered.length===0 && queries.length>0 && (
          <div style={{ textAlign:"center",padding:"40px 0" }}>
            <p style={{ fontSize:14,color:C.lg }}>No {priorityFilter.toLowerCase()} queries</p>
          </div>
        )}

        <AnimatePresence>
          {answerTarget && (
            <AnswerModal query={answerTarget} onClose={()=>setAnswerTarget(null)}
              onAnswered={handleAnswered}/>
          )}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}