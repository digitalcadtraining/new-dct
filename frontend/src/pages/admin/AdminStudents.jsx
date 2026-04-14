/**
 * AdminStudents — fully live, real API, no dummy data
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, ChevronLeft, ChevronRight, X, ToggleLeft, ToggleRight } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { PageWrapper } from "../../components/ui/index.jsx";
import { adminApi } from "../../services/api.js";

const C = { dark:"#1F1A17", navy:"#003C6E", blue:"#024981", primary:"#007BBF", gray:"#6A6B6D", lg:"#7E7F81" };
const PAGE_SIZE = 15;

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
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

function StudentDrawer({ student, onClose, onToggle }) {
  if (!student) return null;
  const enrollments = student.enrollments || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}/>
        <motion.div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
          initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
          transition={{ type:"spring", stiffness:300, damping:30 }}>
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-extrabold text-base" style={{ color:C.dark }}>Student Details</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
              <X size={14} style={{ color:C.gray }}/>
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                style={{ background:`linear-gradient(135deg,${C.blue},${C.primary})` }}>
                {student.name?.[0]}
              </div>
              <div>
                <p className="font-extrabold text-base" style={{ color:C.dark }}>{student.name}</p>
                <p className="text-xs" style={{ color:C.lg }}>{student.email}</p>
                <p className="text-xs" style={{ color:C.lg }}>{student.phone}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-xs font-bold" style={{ color:C.gray }}>Account Status</p>
                <p className="text-sm font-extrabold mt-0.5" style={{ color: student.is_active ? "#16a34a" : "#dc2626" }}>
                  {student.is_active ? "Active" : "Deactivated"}
                </p>
              </div>
              <button onClick={() => onToggle(student)}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all"
                style={{
                  background: student.is_active ? "#fef2f2" : "#f0fdf4",
                  color: student.is_active ? "#dc2626" : "#16a34a",
                  borderColor: student.is_active ? "#fecaca" : "#86efac",
                }}>
                {student.is_active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                {student.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold mb-1" style={{ color:C.gray }}>Joined On</p>
              <p className="text-sm font-semibold" style={{ color:C.dark }}>{fmt(student.created_at)}</p>
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color:C.lg }}>
                Enrollments ({enrollments.length})
              </p>
              {enrollments.length === 0
                ? <p className="text-sm" style={{ color:C.lg }}>Not enrolled in any batch.</p>
                : enrollments.map((e, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-white mb-3"
                      style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                      <p className="font-bold text-sm mb-1" style={{ color:C.dark }}>{e.batch?.name || "—"}</p>
                      <p className="text-xs" style={{ color:C.lg }}>Course: {e.batch?.course?.name || "—"}</p>
                      <p className="text-xs" style={{ color:C.lg }}>Tutor: {e.batch?.tutor?.name || "—"}</p>
                      <p className="text-xs mt-1" style={{ color:C.lg }}>Enrolled: {fmt(e.enrolled_at)}</p>
                    </div>
                  ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function AdminStudents() {
  const [students,    setStudents]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [toast,       setToast]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.students(search, page, PAGE_SIZE)
      .then(r => {
        setStudents(r.data || []);
        setTotal(r.pagination?.total || r.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleToggle = async (student) => {
    try {
      const res = await adminApi.toggleUserStatus(student.id);
      const updated = res.data;
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: updated.is_active } : s));
      if (selected?.id === student.id) setSelected(s => ({ ...s, is_active: updated.is_active }));
      setToast({ msg: `${student.name} ${updated.is_active ? "activated" : "deactivated"}`, type:"success" });
    } catch(e) {
      setToast({ msg: e.message || "Failed", type:"error" });
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell>
      <PageWrapper>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color:C.dark }}>Student Management</h1>
            <p className="text-sm" style={{ color:C.gray }}>{total} total students</p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.lg }}/>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, email, phone…"
              className="pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none w-64"
              style={{ borderColor:"#e5e7eb", color:C.dark }}
              onFocus={e=>e.target.style.borderColor=C.primary}
              onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {["Student","Batch / Course","Tutor","Joined","Status"].map((h,i)=>(
              <p key={h}
                className={`text-[11px] font-extrabold uppercase tracking-wider
                  ${i===0?"col-span-3":i===1?"col-span-3":i===2?"col-span-2":i===3?"col-span-2":"col-span-2"}`}
                style={{ color:C.lg }}>{h}</p>
            ))}
          </div>

          {loading && (
            <div className="p-5 space-y-3">
              {[1,2,3,4,5].map(i=><div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse"/>)}
            </div>
          )}

          {!loading && students.length === 0 && (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3" style={{ color:"#d1d5db" }}/>
              <p className="font-semibold" style={{ color:C.dark }}>No students found</p>
              <p className="text-sm mt-1" style={{ color:C.lg }}>
                {search ? "Try a different search" : "No students registered yet"}
              </p>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {students.map((s, i) => {
              const firstEnrollment = s.enrollments?.[0];
              const batch  = firstEnrollment?.batch;
              const tutor  = batch?.tutor?.name || "—";
              const course = batch?.course?.name || "—";
              return (
                <motion.div key={s.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-gray-50/60 transition-colors cursor-pointer"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.02 }}
                  onClick={() => setSelected(s)}>
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background:`linear-gradient(135deg,${C.blue},${C.primary})` }}>
                      {s.name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color:C.dark }}>{s.name}</p>
                      <p className="text-[11px] truncate" style={{ color:C.lg }}>{s.email}</p>
                    </div>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color:C.dark }}>
                      {batch?.name || "Not enrolled"}
                    </p>
                    <p className="text-[11px]" style={{ color:C.lg }}>{course}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold truncate" style={{ color:C.dark }}>{tutor}</p>
                    {s.enrollments?.length > 1 && (
                      <p className="text-[10px]" style={{ color:C.lg }}>+{s.enrollments.length-1} more</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px]" style={{ color:C.lg }}>{fmt(s.created_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: s.is_active ? "#eff8ff" : "#f3f4f6",
                        color:      s.is_active ? C.primary : C.lg,
                      }}>
                      {s.is_active ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-xs" style={{ color:C.lg }}>
                Page {page} of {totalPages} · {total} students
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border transition-all disabled:opacity-40"
                  style={{ borderColor:"#e5e7eb" }}>
                  <ChevronLeft size={14}/>
                </button>
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border transition-all disabled:opacity-40"
                  style={{ borderColor:"#e5e7eb" }}>
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <StudentDrawer student={selected} onClose={() => setSelected(null)} onToggle={handleToggle}/>
        )}

        <AnimatePresence>
          {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
        </AnimatePresence>
      </PageWrapper>
    </AppShell>
  );
}