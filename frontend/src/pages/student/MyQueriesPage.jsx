/**
 * MyQueriesPage — Student queries with:
 * - Image/video attachment in query
 * - "Remind Tutor" button for unanswered queries
 * - Auto-resolved state shown clearly
 * - Only student can mark resolved (if satisfied)
 * - Priority display: open unanswered first
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { batchApi, queryApi } from "../../services/api.js";
import { mediaUrl } from "../../services/api.js";
import {
  Plus,
  X,
  Send,
  CheckCircle2,
  HelpCircle,
  Clock,
  Image,
  Video,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  Bell,
} from "lucide-react";

const C = {
  dark: "#1F1A17",
  blue: "#024981",
  primary: "#007BBF",
  gray: "#6A6B6D",
  lg: "#9ca3af",
};

function fmtRelative(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000),
    h = Math.floor(d / 3600000),
    days = Math.floor(d / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
}

function getStatus(q) {
  if (q.status === "RESOLVED")
    return { label: "Resolved ✓", bg: "#f0fdf4", color: "#16a34a" };
  if (q.status === "AUTO_RESOLVED")
    return { label: "Auto-Resolved ✓", bg: "#f0fdf4", color: "#16a34a" };
  if (q.answer) return { label: "Answered", bg: "#eff8ff", color: C.primary };
  if (q.is_reminded)
    return { label: "Reminder Sent 🔔", bg: "#fff7ed", color: "#ea580c" };
  return { label: "Open", bg: "#fef3c7", color: "#92400e" };
}

/* ─── Ask Query Sheet ─────────────────────────────────────── */
function AskSheet({
  batches,
  selectedBatchId,
  sessionId,
  sessionNum,
  queryNumber,
  onClose,
  onSubmitted,
}) {
  const [batchId, setBatchId] = useState(
    selectedBatchId || batches[0]?.id || "",
  );
  const [question, setQuestion] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setMediaFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!question.trim()) return setErr("Please write your query.");
    setLoading(true);
    setErr("");
    try {
      await queryApi.create(
        {
          batch_id: batchId,
          session_id: sessionId || undefined,
          question: question.trim(),
        },
        mediaFile || undefined,
      );
      onSubmitted();
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to submit.");
    } finally {
      setLoading(false);
    }
  };

  const isVideo = preview && mediaFile?.type?.startsWith("video/");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: "#e5e7eb",
            }}
          />
        </div>

        <div style={{ padding: "0 20px 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: `linear-gradient(135deg,${C.blue},${C.primary})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HelpCircle size={15} style={{ color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>
                  Ask a Query
                </p>
                <p style={{ fontSize: 11, color: C.lg }}>
                  Query #{queryNumber}
                  {sessionNum ? ` · Session ${sessionNum}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "none",
                background: "#f3f4f6",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} style={{ color: C.gray }} />
            </button>
          </div>

          {batches.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.gray,
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Batch
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 11,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.gray,
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Your Question *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe your doubt clearly… e.g. 'In Session 3, how do I apply the fillet tool on a curved surface?'"
              rows={4}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 12,
                fontSize: 13,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                boxSizing: "border-box",
                color: C.dark,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.primary)}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Media attachment */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.gray,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Attach Image / Video{" "}
              <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            {preview ? (
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  marginBottom: 0,
                }}
              >
                {isVideo ? (
                  <video
                    src={preview}
                    controls
                    style={{
                      width: "100%",
                      maxHeight: 180,
                      display: "block",
                      background: "#000",
                    }}
                  />
                ) : (
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      width: "100%",
                      maxHeight: 180,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    setMediaFile(null);
                    setPreview(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} style={{ color: "#fff" }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "18px 14px",
                  border: "2px dashed #d1d5db",
                  borderRadius: 14,
                  background: "#fafafa",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <Image size={18} style={{ color: C.lg }} />
                  <Video size={18} style={{ color: C.lg }} />
                </div>
                <p style={{ fontSize: 12, color: C.lg }}>
                  Tap to attach photo or video
                </p>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>

          {err && (
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                padding: "10px 13px",
                background: "#fef2f2",
                borderRadius: 11,
                marginBottom: 14,
              }}
            >
              <AlertCircle
                size={13}
                style={{ color: "#dc2626", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "#dc2626" }}>{err}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 0",
              background: loading
                ? "#e5e7eb"
                : `linear-gradient(135deg,${C.blue},${C.primary})`,
              color: loading ? C.lg : "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <RefreshCw
                  size={15}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Submitting…
              </>
            ) : (
              <>
                <Send size={15} /> Submit Query
              </>
            )}
          </button>
        </div>
      </motion.div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Query Bubble ────────────────────────────────────────── */
function QueryBubble({
  query,
  index,
  onResolve,
  onRemind,
  resolving,
  reminding,
}) {
  const attachSrc = mediaUrl(query.media_url);
  const isVideo =
    query.media_url && query.media_url.match(/\.(mp4|mov|webm|avi)$/i);
  const st = getStatus(query);
  const isOpen = query.status === "OPEN" || query.status === "AUTO_RESOLVED";
  const isResolved =
    query.status === "RESOLVED" || query.status === "AUTO_RESOLVED";

  // Can remind if: no answer yet, and either never reminded or reminded 2h+ ago
  const canRemind =
    !query.answer &&
    !isResolved &&
    (() => {
      if (!query.reminded_at) return true;
      return (
        Date.now() - new Date(query.reminded_at).getTime() > 2 * 3600 * 1000
      );
    })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{ marginBottom: 20 }}
    >
      {/* Query number + status + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.lg }}>
            #{index + 1}
          </span>
          {query.session && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#eff8ff",
                color: C.primary,
              }}
            >
              Session {query.session.session_number}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: st.bg,
              color: st.color,
            }}
          >
            {st.label}
          </span>
          <span style={{ fontSize: 10, color: C.lg }}>
            {fmtRelative(query.created_at)}
          </span>
        </div>
      </div>

      {/* Student bubble */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}
      >
        <div
          style={{
            maxWidth: "85%",
            background: `linear-gradient(135deg,${C.blue},${C.primary})`,
            borderRadius: "18px 18px 4px 18px",
            padding: "12px 14px",
          }}
        >
          <p
            style={{ fontSize: 13, color: "#fff", lineHeight: 1.6, margin: 0 }}
          >
            {query.question}
          </p>
          {attachSrc && (
            <div
              style={{ marginTop: 10, borderRadius: 10, overflow: "hidden" }}
            >
              {isVideo ? (
                <video
                  src={attachSrc}
                  controls
                  style={{
                    width: "100%",
                    maxHeight: 160,
                    display: "block",
                    background: "#000",
                  }}
                />
              ) : (
                <img
                  src={attachSrc}
                  alt="attachment"
                  style={{
                    width: "100%",
                    maxHeight: 160,
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tutor answer bubble */}
      {query.answer && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              maxWidth: "85%",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px 18px 18px 4px",
              padding: "12px 14px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.primary,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Tutor's Answer
            </p>
            <p
              style={{
                fontSize: 13,
                color: C.dark,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {query.answer}
            </p>
            {query.answered_at && (
              <p style={{ fontSize: 10, color: C.lg, marginTop: 6 }}>
                Answered {fmtRelative(query.answered_at)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Auto-resolved note */}
      {query.status === "AUTO_RESOLVED" && (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <span style={{ fontSize: 11, color: C.lg }}>
            Auto-resolved after 24h · Was this helpful?
          </span>
        </div>
      )}

      {/* Action buttons */}
      {!isResolved && (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          {canRemind && (
            <button
              onClick={() => onRemind(query.id)}
              disabled={reminding === query.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: "#ea580c",
                cursor: "pointer",
                opacity: reminding === query.id ? 0.6 : 1,
              }}
            >
              <Bell size={12} />
              {reminding === query.id ? "Reminding…" : "Remind Tutor"}
            </button>
          )}
          {query.answer && (
            <button
              onClick={() => onResolve(query.id)}
              disabled={resolving === query.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: "#16a34a",
                cursor: "pointer",
                opacity: resolving === query.id ? 0.6 : 1,
              }}
            >
              <CheckCircle2 size={12} />
              {resolving === query.id ? "Resolving…" : "Mark Resolved"}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────── */
export default function MyQueriesPage() {
  const [searchParams] = useSearchParams();
  const sessionIdFilter = searchParams.get("session_id");
  const sessionNumFilter = searchParams.get("session_num");
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [askOpen, setAskOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [reminding, setReminding] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    batchApi
      .enrolled()
      .then((r) => {
        const list = (r.data || []).map((e) => e.batch).filter(Boolean);
        setBatches(list);
        if (list.length > 0) setSelectedBatch(list[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    setLoading(true);
    queryApi
      .mine(selectedBatch.id)
      .then((r) => setQueries(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBatch, refresh]);

  const filteredQueries = useMemo(
    () =>
      sessionIdFilter
        ? queries.filter((q) => q.session_id === sessionIdFilter)
        : queries,
    [queries, sessionIdFilter],
  );

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await queryApi.resolve(id);
      setQueries((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: "RESOLVED" } : q)),
      );
      showToast("Query resolved ✓");
    } catch (e) {
      showToast(e.message || "Failed", "error");
    } finally {
      setResolving(null);
    }
  };

  const handleRemind = async (id) => {
    setReminding(id);
    try {
      const r = await queryApi.remindTutor(id);
      setQueries((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, is_reminded: true, reminded_at: new Date().toISOString() }
            : q,
        ),
      );
      showToast("Tutor has been reminded 🔔");
    } catch (e) {
      showToast(e.message || "Failed", "error");
    } finally {
      setReminding(null);
    }
  };

  return (
    <AppShell>
      <PageWrapper>
        {/* Session filter banner */}
        {sessionIdFilter && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: `linear-gradient(135deg,${C.blue},${C.primary})`,
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={14} style={{ color: "#fff" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                Showing queries for Session {sessionNumFilter}
              </span>
            </div>
            <a
              href={window.location.pathname}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.8)",
                textDecoration: "none",
              }}
            >
              Clear filter ×
            </a>
          </motion.div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.dark,
                marginBottom: 2,
              }}
            >
              My Queries
            </h2>
            <p style={{ fontSize: 13, color: C.lg }}>
              {filteredQueries.filter((q) => q.status === "OPEN").length} open ·{" "}
              {
                filteredQueries.filter(
                  (q) =>
                    q.status === "RESOLVED" || q.status === "AUTO_RESOLVED",
                ).length
              }{" "}
              resolved
            </p>
          </div>
          <button
            onClick={() => setAskOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: `linear-gradient(135deg,${C.blue},${C.primary})`,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> Ask Query
          </button>
        </div>

        {/* Batch pills */}
        {batches.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
              marginBottom: 20,
            }}
          >
            {batches.map((b) => {
              const isSel = selectedBatch?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 16px",
                    borderRadius: 999,
                    border: isSel ? "none" : "1.5px solid #e5e7eb",
                    background: isSel
                      ? `linear-gradient(135deg,${C.blue},${C.primary})`
                      : "#fff",
                    color: isSel ? "#fff" : C.gray,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ height: 120, background: "#f3f4f6", borderRadius: 16 }}
                className="animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && filteredQueries.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <HelpCircle
              size={40}
              style={{ color: "#d1d5db", margin: "0 auto 12px" }}
            />
            <p style={{ fontWeight: 700, color: C.dark, marginBottom: 6 }}>
              {sessionIdFilter
                ? "No queries for this session"
                : "No queries yet"}
            </p>
            <p style={{ fontSize: 13, color: C.lg, marginBottom: 20 }}>
              Ask your tutor anything about the course
            </p>
            <button
              onClick={() => setAskOpen(true)}
              style={{
                padding: "11px 24px",
                background: `linear-gradient(135deg,${C.blue},${C.primary})`,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Ask First Query
            </button>
          </div>
        )}

        {!loading && filteredQueries.length > 0 && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {filteredQueries.map((q, i) => (
              <QueryBubble
                key={q.id}
                query={q}
                index={i}
                onResolve={handleResolve}
                onRemind={handleRemind}
                resolving={resolving}
                reminding={reminding}
              />
            ))}
          </div>
        )}

        {askOpen && selectedBatch && (
          <AskSheet
            batches={batches}
            selectedBatchId={selectedBatch.id}
            sessionId={sessionIdFilter}
            sessionNum={sessionNumFilter}
            queryNumber={queries.length + 1}
            onClose={() => setAskOpen(false)}
            onSubmitted={() => {
              setRefresh((r) => r + 1);
              showToast("Query submitted!");
            }}
          />
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.msg}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 70,
                padding: "12px 20px",
                borderRadius: 14,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                background: toast.type === "error" ? "#dc2626" : "#16a34a",
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}
