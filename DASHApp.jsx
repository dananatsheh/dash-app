/**
 * DASH — Game Studio Management Dashboard
 * Four modules: Tasks | Departments | Games & Sales | QA
 * Background: ParticleField + grid overlay + scanline from original DASH app
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── GLOBAL STYLES (from original DASH) ──────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0a0a0a;
    color: #fff;
    font-family: 'Space Mono', monospace;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

  @keyframes fadeIn    { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeInUp  { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes pulse     { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes scanline  { 0% { top:-2px; } 100% { top:100%; } }

  .animate-fade { animation: fadeIn 0.4s ease forwards; }

  .toast {
    position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%);
    background: #111; border: 1px solid #333;
    padding: 10px 20px; font-size: 11px; letter-spacing: 0.1em;
    z-index: 9998; animation: fadeInUp 0.3s ease;
    max-width: calc(100vw - 40px); text-align: center;
    white-space: pre-wrap; word-break: break-word;
  }

  .dash-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  @media (max-width: 640px) {
    .dash-modal { width: calc(100vw - 20px) !important; max-height: 88vh !important; overflow-y: auto !important; }
    .dash-stats-row { flex-wrap: wrap !important; }
    .dash-stats-row > * { flex: 1 1 130px !important; min-width: 130px !important; }
    .dash-action-row { flex-wrap: wrap !important; gap: 8px !important; }
    .dash-action-row > * { flex: 1 1 100px !important; font-size: 9px !important; padding: 7px 10px !important; }
    .dash-hub-grid { grid-template-columns: 1fr 1fr !important; }
    .dash-hub-card { min-height: 220px !important; padding: 20px 16px !important; }
    .dash-hub-title { font-size: 32px !important; }
    .dash-verse-pad { padding: 16px !important; }
    .dash-nav-bar { padding: 10px 16px !important; }
    .dash-form-row { flex-direction: column !important; }
    .dash-form-row > * { width: 100% !important; }
    .dash-hub-header { padding: 24px 20px 0 !important; flex-direction: column !important; gap: 12px !important; }
    .dash-hub-header > div:last-child { text-align: left !important; }
    .dash-hub-bottom { padding: 0 20px 20px !important; flex-direction: column !important; gap: 8px !important; }
    .dash-return-btn { bottom: 16px !important; right: 16px !important; padding: 8px 14px !important; font-size: 9px !important; }
  }
`;

// ─── MOBILE HOOK ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── PARTICLE FIELD (original, unchanged) ────────────────────────────────────
function ParticleField({ accent }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      alpha: Math.random() * 0.55 + 0.08,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accent + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [accent]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, accent = "#00ff7f") => {
    setToast({ msg, accent });
    setTimeout(() => setToast(null), 2200);
  };
  const ToastEl = toast ? (
    <div className="toast" style={{ borderColor: toast.accent + "66", color: toast.accent }}>{toast.msg}</div>
  ) : null;
  return { show, ToastEl };
}

// ─── VERSE SHELL (wraps every module with particles + scanline + nav) ─────────
function VerseShell({ accent, label, moduleLabel, onExit, children }) {
  const mobile = useIsMobile();
  const bg = accent === "#ff3c5f" ? "#0d0005"
           : accent === "#00d4ff" ? "#00040d"
           : accent === "#a855f7" ? "#08000d"
           : "#000d02";

  const gridColor = accent + "07";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "#e8e8f0", fontFamily: "'Rajdhani', 'Space Mono', monospace", position: "relative", overflow: "hidden" }}>
      {/* Particle field */}
      <ParticleField accent={accent} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Scanline */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
        animation: "scanline 5s linear infinite",
        pointerEvents: "none", zIndex: 999,
      }} />

      {/* Sticky navbar */}
      <div className="dash-nav-bar" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: bg + "ee", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${accent}1a`,
        padding: mobile ? "10px 16px" : "11px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 20 }}>
          <button
            onClick={onExit}
            style={{ background: "transparent", border: `1px solid ${accent}55`, color: accent, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: mobile ? 9 : 10, letterSpacing: "0.12em", padding: mobile ? "5px 10px" : "5px 14px" }}
          >
            ← HUB
          </button>
          <div style={{ fontSize: mobile ? 9 : 10, letterSpacing: "0.15em", color: accent, opacity: 0.65 }}>{label}</div>
        </div>
        {!mobile && <div style={{ fontSize: 10, color: accent, opacity: 0.35, letterSpacing: "0.1em" }}>
          {moduleLabel}
        </div>}
      </div>

      {/* Content */}
      <div className="dash-verse-pad" style={{ position: "relative", zIndex: 2, padding: mobile ? "16px" : "32px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── THEME COLORS ─────────────────────────────────────────────────────────────
const G = {
  bg: "#0a0a0f",
  surface: "rgba(255,255,255,0.04)",
  surfaceHi: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  borderHi: "rgba(255,255,255,0.18)",
  text: "#e8e8f0",
  textMuted: "#666688",
  red: "#ff3c5f",
  cyan: "#00d4ff",
  purple: "#a855f7",
  green: "#22d3a0",
  yellow: "#fbbf24",
  orange: "#f97316",
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const css = {
  badge: (color) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 3,
    background: `${color}1a`, color, fontSize: 10, letterSpacing: 1,
    fontFamily: "'Space Mono', monospace", textTransform: "uppercase",
    border: `1px solid ${color}33`,
  }),
  btn: (color, ghost) => ({
    padding: "7px 16px", border: `1px solid ${ghost ? color + "55" : color}`,
    borderRadius: 4, background: ghost ? "transparent" : `${color}18`,
    color: ghost ? G.textMuted : color, cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1,
    transition: "all 0.2s", whiteSpace: "nowrap",
  }),
  input: {
    width: "100%", padding: "9px 13px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4, color: "#e8e8f0", fontFamily: "'Rajdhani', sans-serif",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  },
  label: {
    fontSize: 10, color: G.textMuted, letterSpacing: 1,
    textTransform: "uppercase", fontFamily: "'Space Mono', monospace",
    marginBottom: 4, display: "block",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 },
  row: { display: "flex", gap: 12, alignItems: "center" },
  statBox: (color) => ({
    background: `${color}0a`, border: `1px solid ${color}22`,
    padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4,
  }),
  statNum: (color) => ({
    fontSize: 28, fontWeight: 700, color,
    fontFamily: "'Share Tech Mono', monospace", lineHeight: 1,
  }),
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)", padding: 20,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: (color) => ({
    textAlign: "left", padding: "8px 12px",
    borderBottom: `1px solid ${color}22`, color: G.textMuted,
    fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: 400,
  }),
  td: { padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" },
};

function HoverCard({ children, color, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? G.surfaceHi : G.surface,
        border: `1px solid ${hov ? color + "55" : G.border}`,
        borderRadius: 2, padding: 20, cursor: "pointer",
        transition: "all 0.2s", position: "relative", ...style,
      }}
    >
      {/* Corner accents (from original) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, opacity: hov ? 1 : 0.2, transition: "opacity 0.3s" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, opacity: hov ? 1 : 0.2, transition: "opacity 0.3s" }} />
      {children}
    </div>
  );
}

function Modal({ open, onClose, color, title, children }) {
  if (!open) return null;
  return (
    <div style={css.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="dash-modal"
        style={{
          background: "#0a0a0f", border: `1px solid ${color}44`,
          padding: "24px 20px", width: "100%", maxWidth: 540,
          maxHeight: "88vh", overflowY: "auto", position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color, fontFamily: "'Space Mono', monospace" }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: G.textMuted, cursor: "pointer", fontSize: 18, opacity: 0.6, flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", height: 4, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, transition: "width 0.6s ease" }} />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={css.statBox(color)}>
      <div style={css.statNum(color)}>{value}</div>
      <div style={{ fontSize: 9, color: G.textMuted, letterSpacing: 1, fontFamily: "'Space Mono', monospace" }}>{label}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={css.label}>{label}</span>
      <div style={{ color: G.text, fontFamily: mono ? "'Space Mono', monospace" : "inherit", fontSize: mono ? 11 : 13, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function priorityColor(p) { return p === "High" ? G.red : p === "Medium" ? G.yellow : G.textMuted; }
function statusColor(s)   { return s === "Completed" ? G.green : s === "In Progress" ? G.cyan : s === "Almost Done" ? G.yellow : G.orange; }
function typeColor(t)     { return t === "Developer" ? G.red : t === "Designer" ? G.purple : t === "Tester" ? G.green : G.cyan; }

// ─── API LAYER ────────────────────────────────────────────────────────────────
const BASE = "/api";
async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function useResource(path) {
  const [data, setData] = useState(null); // null = not yet loaded; [] = loaded but empty
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiFetch(path)); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data: data ?? [], loading, error, refetch: load };
}

const api = {
  createTask:       (b)   => apiFetch("/tasks", { method: "POST", body: JSON.stringify(b) }),
  deleteTask:       (id)  => apiFetch(`/tasks/${id}`, { method: "DELETE" }),
  updateTask:       (id, b) => apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  createDepartment: (b)   => apiFetch("/departments", { method: "POST", body: JSON.stringify(b) }),
  assignDeptManager: (id, mgrSSN) => apiFetch(`/departments/${id}/manager`, { method: "PATCH", body: JSON.stringify({ managerSSN: mgrSSN }) }),
  createEmployee:   (b)   => apiFetch("/employees", { method: "POST", body: JSON.stringify(b) }),
  deleteEmployee:   (ssn) => apiFetch(`/employees/${ssn}`, { method: "DELETE" }),
  createCustomer:   (b)   => apiFetch("/customers", { method: "POST", body: JSON.stringify(b) }),
  deleteCustomer:   (ssn) => apiFetch(`/customers/${ssn}`, { method: "DELETE" }),
  createGame:       (b)   => apiFetch("/games", { method: "POST", body: JSON.stringify(b) }),
  deleteGame:       (id)  => apiFetch(`/games/${id}`, { method: "DELETE" }),
  createSale:       (b)   => apiFetch("/sales", { method: "POST", body: JSON.stringify(b) }),
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  tasks: [
    { Task_ID: 9001, Name: "Build Game Engine",  Priority: "High",   Status: "In Progress", Progress: 75,  Due_Date: "2025-07-30", Estimated_Hours: 120, assignees: "Omar,Sara" },
    { Task_ID: 9002, Name: "Design Main Menu",   Priority: "Medium", Status: "Almost Done", Progress: 90,  Due_Date: "2025-06-10", Estimated_Hours:  40, assignees: "Lina" },
    { Task_ID: 9003, Name: "Run QA Test Cases",  Priority: "High",   Status: "In Progress", Progress: 35,  Due_Date: "2025-08-15", Estimated_Hours:  60, assignees: "Yousef" },
    { Task_ID: 9004, Name: "Write Game Concept", Priority: "Low",    Status: "Completed",   Progress: 100, Due_Date: "2026-01-20", Estimated_Hours:  25, assignees: "Sara" },
  ],
  employees: [
    { SSN: "1001", First_Name: "Omar",  Last_Name: "Saleh",   Employee_Type: "Developer", Salary: 1800, Department_Name: "Development",       Hire_Date: "2021-03-01", Programming_Language: "Java, C++, Python", GitHub_Username: "omar-dev", Bachelor: 1, Master: 1 },
    { SSN: "1002", First_Name: "Lina",  Last_Name: "Mansour", Employee_Type: "Designer",  Salary: 1600, Department_Name: "Design",             Hire_Date: "2022-06-15", Design_Specialization: "UI/UX Game Interface Design", Portfolio_Link: "https://portfolio.example.com/lina", Bachelor: 1 },
    { SSN: "1003", First_Name: "Yousef",Last_Name: "Haddad",  Employee_Type: "Tester",    Salary: 1400, Department_Name: "Quality Assurance",   Hire_Date: "2023-02-10", Testing_Type: "Functional, Regression, Performance", Certification: "ISTQB Foundation Level", Bachelor: 1 },
    { SSN: "1004", First_Name: "Sara",  Last_Name: "Naser",   Employee_Type: "Manager",   Salary: 2200, Department_Name: "Development",         Hire_Date: "2020-01-20", Management_Level: "Senior Manager", Office_Number: "A-205", Bachelor: 1, Master: 1 },
  ],
  departments: [
    { Department_ID: 1, Name: "Development Department",       Budget: 50000, Manager_Name: "Sara Naser", Locations: "Amman Main Branch" },
    { Department_ID: 2, Name: "Design Department",            Budget: 30000, Manager_Name: null,         Locations: "Irbid Creative Office" },
    { Department_ID: 3, Name: "Quality Assurance Department", Budget: 25000, Manager_Name: null,         Locations: "Amman Testing Lab" },
  ],
  games: [
    { Game_ID: 501, Name: "Shadow Quest", Development_Status: "Released",       Age_Rating: "12+", Release_Date: "2025-09-01", Development_Budget: 120000, Description: "Adventure game with puzzle and combat missions.", genres: ["Adventure","Action"],  platforms: ["PC","PlayStation"] },
    { Game_ID: 502, Name: "Speed Rush",   Development_Status: "In Development", Age_Rating: "7+",  Release_Date: "2026-04-15", Development_Budget:  95000, Description: "Racing game with multiplayer tracks.",          genres: ["Racing","Sports"],     platforms: ["PC","Xbox"] },
  ],
  sales: [
    { Sale_ID: 7001, Date: "2025-10-01", Payment_Method: "Credit Card", Unit_Price: 35, Quantity: 2, Tax: 2.5, Discount: 5,   Total_Price: 67.5, Game_Name: "Shadow Quest", Customer_Name: "Dana Taha" },
    { Sale_ID: 7002, Date: "2025-10-05", Payment_Method: "PayPal",      Unit_Price: 30, Quantity: 1, Tax: 1.5, Discount: 0,   Total_Price: 31.5, Game_Name: "Shadow Quest", Customer_Name: "Talar Khalil" },
    { Sale_ID: 7003, Date: "2026-04-20", Payment_Method: "Cash",        Unit_Price: 40, Quantity: 1, Tax: 3,   Discount: 4,   Total_Price: 39,   Game_Name: "Speed Rush",   Customer_Name: "Dana Taha" },
  ],
  customers: [
    { SSN: "1005", User_Name: "dana_player",  Loyalty_Points: 150, First_Name: "Dana",  Last_Name: "Taha",   Email: "dana.taha@email.com" },
    { SSN: "1006", User_Name: "talar_gamer",  Loyalty_Points: 90,  First_Name: "Talar", Last_Name: "Khalil", Email: "talar.khalil@email.com" },
  ],
  stages: [
    { Stage_Order: 1, Name: "Planning",    Game_Name: "Shadow Quest", Task_Count: 0, Avg_Progress: 0 },
    { Stage_Order: 2, Name: "Development", Game_Name: "Shadow Quest", Task_Count: 2, Avg_Progress: 82.5 },
    { Stage_Order: 3, Name: "Testing",     Game_Name: "Shadow Quest", Task_Count: 1, Avg_Progress: 35 },
    { Stage_Order: 4, Name: "Planning",    Game_Name: "Speed Rush",   Task_Count: 1, Avg_Progress: 100 },
  ],
};

// ─── TASKS MODULE ─────────────────────────────────────────────────────────────
function TasksModule({ onBack }) {
  const color = G.red;
  const { data: live, loading, error, refetch } = useResource("/tasks");
  const { data: liveEmps } = useResource("/employees");
  // Only fall back to mock if: never loaded successfully (error) OR still on first load
  // Once we have real data (even []), use it so deletes/adds reflect immediately
  const tasks     = error ? MOCK.tasks : (live.length > 0 || !loading ? live : MOCK.tasks);
  const employees = liveEmps.length > 0 ? liveEmps : MOCK.employees;
  const { show: toast, ToastEl } = useToast();

  const [selected, setSelected]       = useState(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [selectedSSNs, setSelectedSSNs] = useState([]); // for new task assignee picker
  const [form, setForm] = useState({ name: "", priority: "Medium", status: "In Progress", progress: 0, due: "", estHours: "", description: "" });

  const toggleSSN = (ssn) => setSelectedSSNs(prev => prev.includes(ssn) ? prev.filter(s => s !== ssn) : [...prev, ssn]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast("⚠ Task name is required", G.yellow); return; }
    try {
      await api.createTask({ ...form, assigneeSSNs: selectedSSNs });
      refetch(); toast("✓ Task created", color);
      setShowAdd(false);
      setForm({ name: "", priority: "Medium", status: "In Progress", progress: 0, due: "", estHours: "", description: "" });
      setSelectedSSNs([]);
    } catch (e) {
      toast("✗ " + (e.message.length > 60 ? e.message.slice(0, 60) + "…" : e.message), G.red);
    }
  };
  const handleDelete = async (id) => {
    try { await api.deleteTask(id); refetch(); toast("Task removed", G.red); }
    catch (e) { toast("✗ " + e.message, G.red); }
    setSelected(null);
  };
  const handleUpdate = async (id, progress, status) => {
    try { await api.updateTask(id, { progress, status }); refetch(); toast("✓ Updated", color); }
    catch (e) { toast("✗ " + e.message, G.red); }
    setEditingId(null);
  };

  const stats = { total: tasks.length, done: tasks.filter(t => t.Progress === 100).length, inProg: tasks.filter(t => t.Status === "In Progress").length };

  return (
    <VerseShell accent={color} label="⚡ TASKS MODULE" moduleLabel="TASKS & ASSIGNMENTS" onExit={onBack}>
      {ToastEl}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.22em", marginBottom: 8 }}>⚡ DEVELOPER ACCESS — TASK MANAGEMENT</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
          TASK<br /><span style={{ color }}>CONTROL</span>
        </div>
      </div>

      {error && <div style={{ marginBottom: 16, fontSize: 10, color: "#888", padding: "8px 12px", border: "1px solid #333" }}>⚠ Backend offline — showing mock data</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 24 }}>
        <StatCard label="TOTAL TASKS"  value={stats.total}  color={color} />
        <StatCard label="IN PROGRESS"  value={stats.inProg} color={G.cyan} />
        <StatCard label="COMPLETED"    value={stats.done}   color={G.green} />
      </div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.15em" }}>▸ ALL TASKS — click card to inspect</div>
        <button style={css.btn(color)} onClick={() => setShowAdd(true)}>+ NEW TASK</button>
      </div>

      {/* Task grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12, marginBottom: 32 }}>
        {tasks.map(task => (
          <HoverCard key={task.Task_ID} color={color} onClick={() => setSelected(task)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={css.badge(priorityColor(task.Priority))}>{task.Priority}</span>
              <span style={css.badge(statusColor(task.Status))}>{task.Status}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{task.Name}</div>
            <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 12 }}>
              Due: {task.Due_Date?.slice(0,10)} · Est: {task.Estimated_Hours}h
            </div>
            <ProgressBar pct={task.Progress} color={color} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: G.textMuted }}>👥 {task.assignees || "Unassigned"}</span>
              <span style={{ fontSize: 10, color }}>{task.Progress}%</span>
            </div>
          </HoverCard>
        ))}
      </div>

      {/* Task detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} color={color} title={selected?.Name?.toUpperCase()}>
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Priority" value={<span style={css.badge(priorityColor(selected.Priority))}>{selected.Priority}</span>} />
              <Field label="Status"   value={<span style={css.badge(statusColor(selected.Status))}>{selected.Status}</span>} />
              <Field label="Due Date" value={selected.Due_Date?.slice(0,10)} />
              <Field label="Est Hours" value={`${selected.Estimated_Hours}h`} />
            </div>
            <Field label="Description" value={selected.Description} />
            <div style={{ marginBottom: 14 }}>
              <span style={css.label}>Assigned To</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {(selected.assignees || "Unassigned").split(",").map(a => (
                  <span key={a} style={css.badge(color)}>{a.trim()}</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={css.label}>Progress — {selected.Progress}%</span>
              <ProgressBar pct={selected.Progress} color={color} />
            </div>
            {editingId === selected.Task_ID ? (
              <div style={{ marginBottom: 16 }}>
                <input type="range" min={0} max={100} defaultValue={selected.Progress}
                  onChange={e => { selected._newPct = +e.target.value; }}
                  style={{ width: "100%", accentColor: color, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["In Progress", "Almost Done", "Completed"].map(s => (
                    <button key={s} style={css.btn(statusColor(s))}
                      onClick={() => handleUpdate(selected.Task_ID, selected._newPct ?? selected.Progress, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button style={{ ...css.btn(color), marginBottom: 12 }} onClick={() => setEditingId(selected.Task_ID)}>
                ✎ EDIT PROGRESS
              </button>
            )}
            <button style={{ ...css.btn(G.red, true), marginLeft: 8 }} onClick={() => handleDelete(selected.Task_ID)}>
              🗑 DELETE
            </button>
          </>
        )}
      </Modal>

      {/* Add task modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setSelectedSSNs([]); }} color={color} title="CREATE NEW TASK">
        {[["name","Task Name","text"],["description","Description","text"],["due","Due Date","date"],["estHours","Est. Hours","number"]].map(([k,l,t]) => (
          <div key={k} style={css.fieldGroup}>
            <label style={css.label}>{l}</label>
            <input style={css.input} type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
          </div>
        ))}
        <div style={css.fieldGroup}>
          <label style={css.label}>Priority</label>
          <select style={css.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {["High","Medium","Low"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        {/* Assignee picker */}
        <div style={css.fieldGroup}>
          <label style={css.label}>Assign To {selectedSSNs.length > 0 && <span style={{ color, marginLeft: 6 }}>({selectedSSNs.length} selected)</span>}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 0" }}>
            {employees.map(emp => {
              const checked = selectedSSNs.includes(emp.SSN);
              return (
                <div key={emp.SSN}
                  onClick={() => toggleSSN(emp.SSN)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", cursor: "pointer", background: checked ? `${color}12` : "transparent", transition: "background 0.15s" }}>
                  <div style={{ width: 14, height: 14, border: `1px solid ${checked ? color : "rgba(255,255,255,0.2)"}`, background: checked ? color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                    {checked && "✓"}
                  </div>
                  <span style={{ fontSize: 12, color: checked ? color : G.text }}>{emp.First_Name} {emp.Last_Name}</span>
                  <span style={{ fontSize: 10, color: G.textMuted, marginLeft: "auto" }}>{emp.Employee_Type}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => { setShowAdd(false); setSelectedSSNs([]); }}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAdd}>CREATE</button>
        </div>
      </Modal>
    </VerseShell>
  );
}

// ─── DEPARTMENTS MODULE ───────────────────────────────────────────────────────
function DepartmentsModule({ onBack }) {
  const color = G.cyan;
  const { data: liveEmps, error: empErr, loading: empLoading, refetch: empRefetch } = useResource("/employees");
  const { data: liveDepts, error: deptErr, loading: deptLoading, refetch: deptRefetch } = useResource("/departments");
  const { data: liveTasks } = useResource("/tasks");
  const { data: liveCusts, refetch: custRefetch } = useResource("/customers");
  const { show: toast, ToastEl } = useToast();

  const employees   = empErr  ? MOCK.employees  : (liveEmps.length  > 0 || !empLoading  ? liveEmps  : MOCK.employees);
  const departments = deptErr ? MOCK.departments : (liveDepts.length > 0 || !deptLoading ? liveDepts : MOCK.departments);
  const tasks       = liveTasks.length > 0 ? liveTasks : MOCK.tasks;
  const customers   = liveCusts.length > 0 ? liveCusts : MOCK.customers;

  const [tab, setTab]               = useState("employees");
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedCust, setSelectedCust] = useState(null);
  const [showAddEmp, setShowAddEmp]     = useState(false);
  const [showAddDept, setShowAddDept]   = useState(false);
  const [showAddCust, setShowAddCust]   = useState(false);
  const [showAssignMgr, setShowAssignMgr] = useState(false);
  const [assignMgrDept, setAssignMgrDept] = useState(null);
  const [selectedMgrSSN, setSelectedMgrSSN] = useState("");
  const [custForm, setCustForm] = useState({ ssn: "", firstName: "", middleName: "", lastName: "", email: "", phoneNumber: "", gender: "Male", dob: "", address: "", userName: "", password: "", loyaltyPoints: 0 });
  const [empForm, setEmpForm]  = useState({ ssn: "", firstName: "", middleName: "", lastName: "", email: "", phoneNumber: "", salary: "", role: "Developer", departmentId: "", hireDate: "", dob: "", gender: "Male", address: "", bachelor: true, master: false, phd: false, programmingLanguage: "", githubUsername: "", designSpecialization: "", portfolioLink: "", testingType: "", certification: "", managementLevel: "", officeNumber: "" });
  const [deptForm, setDeptForm] = useState({ name: "", budget: "", location: "" });

  const getEmpTasks = (emp) => tasks.filter(t => t.assignees && t.assignees.toLowerCase().includes(emp.First_Name.toLowerCase()));

  const handleAddEmp = async () => {
    if (!empForm.ssn.trim())       { toast("⚠ SSN is required", G.yellow); return; }
    if (!empForm.firstName.trim()) { toast("⚠ First name is required", G.yellow); return; }
    if (!empForm.lastName.trim())  { toast("⚠ Last name is required", G.yellow); return; }
    try {
      await api.createEmployee(empForm);
      empRefetch();
      toast("✓ Employee added", color);
      setShowAddEmp(false);
      setEmpForm({ ssn: "", firstName: "", middleName: "", lastName: "", email: "", phoneNumber: "", salary: "", role: "Developer", departmentId: "", hireDate: "", dob: "", gender: "Male", address: "", bachelor: true, master: false, phd: false, programmingLanguage: "", githubUsername: "", designSpecialization: "", portfolioLink: "", testingType: "", certification: "", managementLevel: "", officeNumber: "" });
    } catch (e) {
      toast("✗ " + (e.message.length > 90 ? e.message.slice(0, 90) + "…" : e.message), G.red);
    }
  };
  const handleAssignManager = async () => {
    try { await api.assignDeptManager(assignMgrDept.Department_ID, selectedMgrSSN); deptRefetch(); toast("✓ Manager assigned", color); }
    catch (e) { toast("Error: " + e.message, "#ff5050"); }
    setShowAssignMgr(false); setAssignMgrDept(null); setSelectedMgrSSN("");
  };
  const handleDeleteEmp = async (ssn) => {
    try { await api.deleteEmployee(ssn); empRefetch(); toast("Employee removed", G.red); }
    catch (e) { toast("✗ " + e.message, G.red); }
    setSelectedEmp(null);
  };
  const handleAddDept = async () => {
    if (!deptForm.name.trim()) { toast("⚠ Department name is required", G.yellow); return; }
    try { await api.createDepartment(deptForm); deptRefetch(); toast("✓ Department created", color); setShowAddDept(false); }
    catch (e) { toast("✗ " + e.message, G.red); }
  };

  const handleAddCust = async () => {
    if (!custForm.ssn.trim())       { toast("⚠ SSN is required", G.yellow); return; }
    if (!custForm.firstName.trim()) { toast("⚠ First name is required", G.yellow); return; }
    if (!custForm.lastName.trim())  { toast("⚠ Last name is required", G.yellow); return; }
    if (!custForm.userName.trim())  { toast("⚠ Username is required", G.yellow); return; }
    try {
      await api.createCustomer(custForm);
      custRefetch();
      toast("✓ Customer added", color);
      setShowAddCust(false);
      setCustForm({ ssn: "", firstName: "", middleName: "", lastName: "", email: "", phoneNumber: "", gender: "Male", dob: "", address: "", userName: "", password: "", loyaltyPoints: 0 });
    } catch (e) { toast("✗ " + (e.message.length > 90 ? e.message.slice(0,90) + "…" : e.message), G.red); }
  };

  const handleDeleteCust = async (ssn) => {
    try { await api.deleteCustomer(ssn); custRefetch(); toast("Customer removed", G.red); }
    catch (e) { toast("✗ " + e.message, G.red); }
    setSelectedCust(null);
  };

  return (
    <VerseShell accent={color} label="◈ DEPARTMENTS MODULE" moduleLabel="DEPARTMENTS & EMPLOYEES" onExit={onBack}>
      {ToastEl}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.22em", marginBottom: 8 }}>◈ COMMAND ACCESS — HR MODULE</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
          COMMAND<br /><span style={{ color }}>CENTER</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8, marginBottom: 24 }}>
        <StatCard label="EMPLOYEES"   value={employees.length} color={color} />
        <StatCard label="DEPARTMENTS" value={departments.length} color={G.purple} />
        <StatCard label="CUSTOMERS"   value={customers.length} color={G.green} />
        <StatCard label="AVG SALARY"  value={`$${Math.round(employees.reduce((a,e) => a + +e.Salary, 0) / (employees.length||1))}`} color={G.yellow} />
      </div>

      {/* Tabs + Add */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["employees","EMPLOYEES"],["departments","DEPARTMENTS"],["customers","CUSTOMERS"]].map(([k,l]) => (
            <button key={k} style={css.btn(color, tab !== k)} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button style={css.btn(color)} onClick={() => tab === "employees" ? setShowAddEmp(true) : tab === "departments" ? setShowAddDept(true) : setShowAddCust(true)}>
          + ADD {tab === "employees" ? "EMPLOYEE" : tab === "departments" ? "DEPARTMENT" : "CUSTOMER"}
        </button>
      </div>

      {tab === "employees" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
          {employees.map(emp => (
            <HoverCard key={emp.SSN} color={color} onClick={() => setSelectedEmp(emp)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={css.badge(typeColor(emp.Employee_Type))}>{emp.Employee_Type}</span>
                <span style={{ color: G.yellow, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>${emp.Salary}/mo</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{emp.First_Name} {emp.Last_Name}</div>
              <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 10 }}>{emp.Department_Name}</div>
              <div style={{ fontSize: 10, color: G.textMuted }}>🗓 {emp.Hire_Date?.slice(0,10)}</div>
              {getEmpTasks(emp).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color }}>{getEmpTasks(emp).length} task{getEmpTasks(emp).length > 1 ? "s" : ""} assigned</div>
              )}
            </HoverCard>
          ))}
        </div>
      )}

      {tab === "departments" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 12 }}>
          {departments.map(dept => (
            <HoverCard key={dept.Department_ID} color={color} onClick={() => setSelectedDept(dept)}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color }}>{dept.Name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: G.textMuted }}>📍 {dept.Locations}</span>
                <span style={{ color: G.yellow, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>${Number(dept.Budget).toLocaleString()}</span>
              </div>
              {dept.Manager_Name && <div style={{ fontSize: 11, color: G.textMuted }}>Manager: <span style={{ color }}>{dept.Manager_Name}</span></div>}
              <div style={{ fontSize: 11, color: G.textMuted, marginTop: 6 }}>
                👥 {employees.filter(e => e.Department_Name?.includes(dept.Name?.split(" ")[0])).length} employees
              </div>
            </HoverCard>
          ))}
        </div>
      )}

      {tab === "customers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
          {customers.map(cust => (
            <HoverCard key={cust.SSN} color={color} onClick={() => setSelectedCust(cust)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={css.badge(G.green)}>CUSTOMER</span>
                <span style={{ color: G.yellow, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>⭐ {cust.Loyalty_Points} pts</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{cust.First_Name} {cust.Last_Name}</div>
              <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 6 }}>@{cust.User_Name}</div>
              <div style={{ fontSize: 10, color: G.textMuted }}>{cust.Email}</div>
            </HoverCard>
          ))}
        </div>
      )}

      {/* Employee detail */}
      <Modal open={!!selectedEmp} onClose={() => setSelectedEmp(null)} color={color} title={`${selectedEmp?.First_Name} ${selectedEmp?.Last_Name}`.toUpperCase()}>
        {selectedEmp && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Role"   value={<span style={css.badge(typeColor(selectedEmp.Employee_Type))}>{selectedEmp.Employee_Type}</span>} />
              <Field label="Salary" value={`$${selectedEmp.Salary}/month`} />
              <Field label="Department" value={selectedEmp.Department_Name} />
              <Field label="Hire Date"  value={selectedEmp.Hire_Date?.slice(0,10)} />
            </div>
            {selectedEmp.Employee_Type === "Developer" && <><Field label="Languages" value={selectedEmp.Programming_Language} /><Field label="GitHub" value={selectedEmp.GitHub_Username} mono /></>}
            {selectedEmp.Employee_Type === "Designer"  && <><Field label="Specialization" value={selectedEmp.Design_Specialization} /><Field label="Portfolio" value={selectedEmp.Portfolio_Link} mono /></>}
            {selectedEmp.Employee_Type === "Tester"    && <><Field label="Testing Types" value={selectedEmp.Testing_Type} /><Field label="Certification" value={selectedEmp.Certification} /></>}
            {selectedEmp.Employee_Type === "Manager"   && <><Field label="Level" value={selectedEmp.Management_Level} /><Field label="Office" value={selectedEmp.Office_Number} /></>}

            <div style={{ borderTop: `1px solid ${color}18`, paddingTop: 16, marginTop: 8, marginBottom: 8 }}>
              <span style={{ ...css.label, color, marginBottom: 10, display: "block" }}>▸ ASSIGNED TASKS</span>
              {getEmpTasks(selectedEmp).length === 0
                ? <div style={{ fontSize: 12, color: G.textMuted }}>No tasks currently assigned.</div>
                : getEmpTasks(selectedEmp).map(t => (
                  <div key={t.Task_ID} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${G.border}`, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{t.Name}</span>
                      <span style={css.badge(statusColor(t.Status))}>{t.Status}</span>
                    </div>
                    <ProgressBar pct={t.Progress} color={priorityColor(t.Priority)} />
                    <div style={{ fontSize: 10, color: G.textMuted, marginTop: 4 }}>{t.Progress}% · Due {t.Due_Date?.slice(0,10)}</div>
                  </div>
                ))
              }
            </div>
            <button style={css.btn(G.red, true)} onClick={() => handleDeleteEmp(selectedEmp.SSN)}>🗑 REMOVE EMPLOYEE</button>
          </>
        )}
      </Modal>

      {/* Department detail */}
      <Modal open={!!selectedDept} onClose={() => setSelectedDept(null)} color={color} title={selectedDept?.Name?.toUpperCase()}>
        {selectedDept && (
          <>
            <Field label="Location" value={selectedDept.Locations} />
            <Field label="Budget"   value={`$${Number(selectedDept.Budget).toLocaleString()}`} />
            <Field label="Manager"  value={selectedDept.Manager_Name || "None assigned"} />
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button style={css.btn(color)} onClick={() => { setAssignMgrDept(selectedDept); setSelectedDept(null); setShowAssignMgr(true); }}>
                ✎ ASSIGN MANAGER
              </button>
            </div>
            <div style={{ borderTop: `1px solid ${color}18`, paddingTop: 16, marginTop: 8 }}>
              <span style={css.label}>▸ EMPLOYEES</span>
              {employees.filter(e => e.Department_Name?.includes(selectedDept.Name?.split(" ")[0])).map(e => (
                <div key={e.SSN} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${G.border}` }}>
                  <div><span style={{ fontWeight: 600 }}>{e.First_Name} {e.Last_Name}</span><span style={{ ...css.badge(typeColor(e.Employee_Type)), marginLeft: 8 }}>{e.Employee_Type}</span></div>
                  <span style={{ color: G.yellow, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>${e.Salary}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* Assign Manager modal */}
      <Modal open={showAssignMgr} onClose={() => { setShowAssignMgr(false); setAssignMgrDept(null); }} color={color} title={`ASSIGN MANAGER — ${assignMgrDept?.Name?.toUpperCase()}`}>
        {assignMgrDept && (
          <>
            <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 16 }}>
              Current manager: <span style={{ color }}>{assignMgrDept.Manager_Name || "None"}</span>
            </div>
            <div style={css.fieldGroup}>
              <label style={css.label}>Select Manager (Employee Type: Manager)</label>
              <select style={css.input} value={selectedMgrSSN} onChange={e => setSelectedMgrSSN(e.target.value)}>
                <option value="">-- Select an employee --</option>
                {employees.filter(e => e.Employee_Type === "Manager").map(e => (
                  <option key={e.SSN} value={e.SSN}>{e.First_Name} {e.Last_Name} (SSN: {e.SSN})</option>
                ))}
              </select>
            </div>
            {employees.filter(e => e.Employee_Type === "Manager").length === 0 && (
              <div style={{ fontSize: 11, color: G.yellow, marginBottom: 12 }}>⚠ No managers found. Add a Manager-role employee first.</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button style={css.btn(G.textMuted, true)} onClick={() => { setShowAssignMgr(false); setAssignMgrDept(null); }}>CANCEL</button>
              <button style={css.btn(color)} onClick={handleAssignManager} disabled={!selectedMgrSSN}>ASSIGN</button>
            </div>
          </>
        )}
      </Modal>

      {/* Add employee */}
      <Modal open={showAddEmp} onClose={() => setShowAddEmp(false)} color={color} title="ADD EMPLOYEE">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["ssn","SSN"],["firstName","First Name"],["middleName","Middle Name"],["lastName","Last Name"]].map(([k,l]) => (
            <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} value={empForm[k]} onChange={e => setEmpForm(f => ({ ...f, [k]: e.target.value }))} /></div>
          ))}
        </div>
        {[["email","Email","email"],["phoneNumber","Phone Number","tel"],["address","Address","text"]].map(([k,l,t]) => (
          <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} type={t} value={empForm[k]} onChange={e => setEmpForm(f => ({ ...f, [k]: e.target.value }))} /></div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={css.fieldGroup}><label style={css.label}>Salary</label><input style={css.input} type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))} /></div>
          <div style={css.fieldGroup}><label style={css.label}>Hire Date</label><input style={css.input} type="date" value={empForm.hireDate} onChange={e => setEmpForm(f => ({ ...f, hireDate: e.target.value }))} /></div>
          <div style={css.fieldGroup}><label style={css.label}>Date of Birth</label><input style={css.input} type="date" value={empForm.dob} onChange={e => setEmpForm(f => ({ ...f, dob: e.target.value }))} /></div>
          <div style={css.fieldGroup}>
            <label style={css.label}>Gender</label>
            <select style={css.input} value={empForm.gender} onChange={e => setEmpForm(f => ({ ...f, gender: e.target.value }))}>
              {["Male","Female"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {/* Degree checkboxes */}
        <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4, marginBottom: 4 }}>
          <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ DEGREE</div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["bachelor","Bachelor's"],["master","Master's"],["phd","PhD"]].map(([k,l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: empForm[k] ? color : G.textMuted }}>
                <div
                  onClick={() => setEmpForm(f => ({ ...f, [k]: !f[k] }))}
                  style={{ width: 16, height: 16, border: `1px solid ${empForm[k] ? color : "rgba(255,255,255,0.2)"}`, background: empForm[k] ? color : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                  {empForm[k] && "✓"}
                </div>
                {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={css.fieldGroup}>
            <label style={css.label}>Role</label>
            <select style={css.input} value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))}>
              {["Developer","Designer","Tester","Manager"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={css.fieldGroup}>
            <label style={css.label}>Department</label>
            <select style={css.input} value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">-- Select --</option>
              {departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Name}</option>)}
            </select>
          </div>
        </div>
        {/* Role-specific fields */}
        {empForm.role === "Developer" && (
          <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ DEVELOPER DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={css.fieldGroup}><label style={css.label}>Programming Languages</label><input style={css.input} placeholder="e.g. Java, Python" value={empForm.programmingLanguage} onChange={e => setEmpForm(f => ({ ...f, programmingLanguage: e.target.value }))} /></div>
              <div style={css.fieldGroup}><label style={css.label}>GitHub Username</label><input style={css.input} value={empForm.githubUsername} onChange={e => setEmpForm(f => ({ ...f, githubUsername: e.target.value }))} /></div>
            </div>
          </div>
        )}
        {empForm.role === "Designer" && (
          <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ DESIGNER DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={css.fieldGroup}><label style={css.label}>Design Specialization</label><input style={css.input} placeholder="e.g. UI/UX, 3D Modeling" value={empForm.designSpecialization} onChange={e => setEmpForm(f => ({ ...f, designSpecialization: e.target.value }))} /></div>
              <div style={css.fieldGroup}><label style={css.label}>Portfolio Link</label><input style={css.input} type="url" value={empForm.portfolioLink} onChange={e => setEmpForm(f => ({ ...f, portfolioLink: e.target.value }))} /></div>
            </div>
          </div>
        )}
        {empForm.role === "Tester" && (
          <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ TESTER DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={css.fieldGroup}><label style={css.label}>Testing Types</label><input style={css.input} placeholder="e.g. Functional, Regression" value={empForm.testingType} onChange={e => setEmpForm(f => ({ ...f, testingType: e.target.value }))} /></div>
              <div style={css.fieldGroup}><label style={css.label}>Certification</label><input style={css.input} placeholder="e.g. ISTQB" value={empForm.certification} onChange={e => setEmpForm(f => ({ ...f, certification: e.target.value }))} /></div>
            </div>
          </div>
        )}
        {empForm.role === "Manager" && (
          <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ MANAGER DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={css.fieldGroup}><label style={css.label}>Management Level</label><input style={css.input} placeholder="e.g. Senior Manager" value={empForm.managementLevel} onChange={e => setEmpForm(f => ({ ...f, managementLevel: e.target.value }))} /></div>
              <div style={css.fieldGroup}><label style={css.label}>Office Number</label><input style={css.input} placeholder="e.g. A-205" value={empForm.officeNumber} onChange={e => setEmpForm(f => ({ ...f, officeNumber: e.target.value }))} /></div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => setShowAddEmp(false)}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAddEmp}>ADD EMPLOYEE</button>
        </div>
      </Modal>

      {/* Add department */}
      <Modal open={showAddDept} onClose={() => setShowAddDept(false)} color={color} title="ADD DEPARTMENT">
        {[["name","Department Name"],["budget","Budget"],["location","Location"]].map(([k,l]) => (
          <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} value={deptForm[k]} onChange={e => setDeptForm(f => ({ ...f, [k]: e.target.value }))} /></div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => setShowAddDept(false)}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAddDept}>CREATE</button>
        </div>
      </Modal>

      {/* Customer detail */}
      <Modal open={!!selectedCust} onClose={() => setSelectedCust(null)} color={color} title={selectedCust ? `${selectedCust.First_Name} ${selectedCust.Last_Name}`.toUpperCase() : ""}>
        {selectedCust && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Username"      value={`@${selectedCust.User_Name}`} mono />
              <Field label="Loyalty Points" value={`⭐ ${selectedCust.Loyalty_Points}`} />
              <Field label="Email"         value={selectedCust.Email} />
              <Field label="SSN"           value={selectedCust.SSN} mono />
            </div>
            <button style={css.btn(G.red, true)} onClick={() => handleDeleteCust(selectedCust.SSN)}>🗑 REMOVE CUSTOMER</button>
          </>
        )}
      </Modal>

      {/* Add customer */}
      <Modal open={showAddCust} onClose={() => setShowAddCust(false)} color={color} title="ADD CUSTOMER">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["ssn","SSN"],["firstName","First Name"],["middleName","Middle Name"],["lastName","Last Name"]].map(([k,l]) => (
            <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} value={custForm[k]} onChange={e => setCustForm(f => ({ ...f, [k]: e.target.value }))} /></div>
          ))}
        </div>
        {[["email","Email","email"],["phoneNumber","Phone Number","tel"],["address","Address","text"]].map(([k,l,t]) => (
          <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} type={t} value={custForm[k]} onChange={e => setCustForm(f => ({ ...f, [k]: e.target.value }))} /></div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={css.fieldGroup}>
            <label style={css.label}>Gender</label>
            <select style={css.input} value={custForm.gender} onChange={e => setCustForm(f => ({ ...f, gender: e.target.value }))}>
              {["Male","Female"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={css.fieldGroup}><label style={css.label}>Date of Birth</label><input style={css.input} type="date" value={custForm.dob} onChange={e => setCustForm(f => ({ ...f, dob: e.target.value }))} /></div>
        </div>
        <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 10 }}>▸ ACCOUNT DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={css.fieldGroup}><label style={css.label}>Username *</label><input style={css.input} value={custForm.userName} onChange={e => setCustForm(f => ({ ...f, userName: e.target.value }))} /></div>
            <div style={css.fieldGroup}><label style={css.label}>Password</label><input style={css.input} type="password" value={custForm.password} onChange={e => setCustForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div style={css.fieldGroup}><label style={css.label}>Loyalty Points</label><input style={css.input} type="number" value={custForm.loyaltyPoints} onChange={e => setCustForm(f => ({ ...f, loyaltyPoints: e.target.value }))} /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => setShowAddCust(false)}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAddCust}>ADD CUSTOMER</button>
        </div>
      </Modal>
    </VerseShell>
  );
}

// ─── GAMES & SALES MODULE ─────────────────────────────────────────────────────
function GamesModule({ onBack }) {
  const color = G.purple;
  const { data: liveGames, error: gameErr, refetch: gameRefetch } = useResource("/games");
  const { data: liveSales, refetch: saleRefetch } = useResource("/sales");
  const { data: liveCustomers } = useResource("/customers");
  const { show: toast, ToastEl } = useToast();

  const games     = gameErr ? MOCK.games     : (liveGames?.length     ? liveGames     : MOCK.games);
  const sales     = liveSales?.length        ? liveSales              : MOCK.sales;
  const customers = liveCustomers?.length    ? liveCustomers          : MOCK.customers;

  const [tab, setTab]               = useState("games");
  const [selectedGame, setSelectedGame] = useState(null);
  const [showAddGame, setShowAddGame]   = useState(false);
  const [showAddSale, setShowAddSale]   = useState(false);
  const [gameForm, setGameForm] = useState({ name: "", description: "", budget: "", status: "In Development", rating: "12+", release: "", genres: "", platforms: "" });
  const [saleForm, setSaleForm] = useState({ gameID: "", customerSSN: "", unitPrice: "", qty: 1, tax: 0, discount: 0, method: "Credit Card", date: "" });

  const totalRevenue = sales.reduce((a, s) => a + +s.Total_Price, 0);

  const handleAddGame = async () => {
    if (!gameForm.name.trim()) { toast("⚠ Game name is required", G.yellow); return; }
    try {
      await api.createGame({ ...gameForm, genres: gameForm.genres.split(",").map(s=>s.trim()).filter(Boolean), platforms: gameForm.platforms.split(",").map(s=>s.trim()).filter(Boolean) });
      gameRefetch(); toast("✓ Game added", color); setShowAddGame(false);
    } catch (e) { toast("✗ " + e.message, G.red); }
  };
  const handleDeleteGame = async (id) => {
    try { await api.deleteGame(id); gameRefetch(); toast("Game removed", G.red); }
    catch (e) { toast("✗ " + e.message, G.red); }
    setSelectedGame(null);
  };
  const handleAddSale = async () => {
    try { await api.createSale(saleForm); saleRefetch(); toast("✓ Sale recorded", color); setShowAddSale(false); }
    catch (e) { toast("✗ " + e.message, G.red); }
  };

  return (
    <VerseShell accent={color} label="✦ GAMES & SALES MODULE" moduleLabel="GAMES & SALES" onExit={onBack}>
      {ToastEl}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.22em", marginBottom: 8 }}>✦ ART ACCESS — CATALOGUE & REVENUE</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
          GAME<br /><span style={{ color }}>CATALOGUE</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 24 }}>
        <StatCard label="GAMES"   value={games.length}         color={color} />
        <StatCard label="SALES"   value={sales.length}         color={G.cyan} />
        <StatCard label="REVENUE" value={`$${totalRevenue.toFixed(0)}`} color={G.green} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["games","GAMES"],["sales","SALES"]].map(([k,l]) => (
            <button key={k} style={css.btn(color, tab !== k)} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button style={css.btn(color)} onClick={() => tab === "games" ? setShowAddGame(true) : setShowAddSale(true)}>
          + ADD {tab === "games" ? "GAME" : "SALE"}
        </button>
      </div>

      {tab === "games" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 12 }}>
          {games.map(game => (
            <HoverCard key={game.Game_ID} color={color} onClick={() => setSelectedGame(game)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={css.badge(game.Development_Status === "Released" ? G.green : G.yellow)}>{game.Development_Status}</span>
                <span style={css.badge(G.orange)}>Age {game.Age_Rating}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{game.Name}</div>
              <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{game.Description?.slice(0,80)}...</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {game.genres?.map(g => <span key={g} style={css.badge(color)}>{g}</span>)}
                </div>
                <span style={{ color: G.yellow, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>${Number(game.Development_Budget).toLocaleString()}</span>
              </div>
            </HoverCard>
          ))}
        </div>
      )}

      {tab === "sales" && (
        <div className="dash-table-wrap" style={{ overflowX: "auto" }}>
          <table style={css.table}>
            <thead>
              <tr>{["ID","Game","Customer","Date","Qty","Unit Price","Tax","Discount","Total","Method"].map(h => <th key={h} style={css.th(color)}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.Sale_ID}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={css.td}><span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 10 }}>#{s.Sale_ID}</span></td>
                  <td style={css.td}>{s.Game_Name}</td>
                  <td style={css.td}>{s.Customer_Name}</td>
                  <td style={css.td}><span style={{ color: G.textMuted, fontSize: 10 }}>{s.Date?.slice(0,10)}</span></td>
                  <td style={css.td}>{s.Quantity}</td>
                  <td style={css.td}>${s.Unit_Price}</td>
                  <td style={css.td}><span style={{ color: G.textMuted }}>${s.Tax}</span></td>
                  <td style={css.td}><span style={{ color: G.green }}>-${s.Discount}</span></td>
                  <td style={css.td}><span style={{ color: G.yellow, fontWeight: 700 }}>${s.Total_Price}</span></td>
                  <td style={css.td}><span style={css.badge(color)}>{s.Payment_Method}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Game detail */}
      <Modal open={!!selectedGame} onClose={() => setSelectedGame(null)} color={color} title={selectedGame?.Name?.toUpperCase()}>
        {selectedGame && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Status"  value={<span style={css.badge(selectedGame.Development_Status === "Released" ? G.green : G.yellow)}>{selectedGame.Development_Status}</span>} />
              <Field label="Rating"  value={selectedGame.Age_Rating} />
              <Field label="Release" value={selectedGame.Release_Date?.slice(0,10)} />
              <Field label="Budget"  value={`$${Number(selectedGame.Development_Budget).toLocaleString()}`} />
            </div>
            <Field label="Description" value={selectedGame.Description} />
            <div style={{ marginBottom: 12 }}>
              <span style={css.label}>Genres</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>{selectedGame.genres?.map(g => <span key={g} style={css.badge(color)}>{g}</span>)}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={css.label}>Platforms</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>{selectedGame.platforms?.map(p => <span key={p} style={css.badge(G.textMuted)}>{p}</span>)}</div>
            </div>
            <div style={{ borderTop: `1px solid ${color}18`, paddingTop: 16, marginBottom: 16 }}>
              <span style={css.label}>▸ SALES FOR THIS GAME</span>
              {sales.filter(s => s.Game_Name === selectedGame.Name || s.Game_ID === selectedGame.Game_ID).length === 0
                ? <div style={{ fontSize: 12, color: G.textMuted, marginTop: 8 }}>No sales yet.</div>
                : sales.filter(s => s.Game_Name === selectedGame.Name || s.Game_ID === selectedGame.Game_ID).map(s => (
                  <div key={s.Sale_ID} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${G.border}`, marginTop: 4 }}>
                    <span style={{ fontSize: 12 }}>{s.Customer_Name} · {s.Date?.slice(0,10)}</span>
                    <span style={{ color: G.yellow, fontWeight: 700 }}>${s.Total_Price}</span>
                  </div>
                ))}
            </div>
            <button style={css.btn(G.red, true)} onClick={() => handleDeleteGame(selectedGame.Game_ID)}>🗑 DELETE GAME</button>
          </>
        )}
      </Modal>

      {/* Add game */}
      <Modal open={showAddGame} onClose={() => setShowAddGame(false)} color={color} title="ADD GAME">
        {[["name","Name","text"],["description","Description","text"],["budget","Dev Budget","number"],["release","Release Date","date"],["genres","Genres (comma-separated)","text"],["platforms","Platforms (comma-separated)","text"]].map(([k,l,t]) => (
          <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} type={t} value={gameForm[k]} onChange={e => setGameForm(f => ({ ...f, [k]: e.target.value }))} /></div>
        ))}
        <div style={css.fieldGroup}>
          <label style={css.label}>Status</label>
          <select style={css.input} value={gameForm.status} onChange={e => setGameForm(f => ({ ...f, status: e.target.value }))}>
            {["In Development","Released","Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => setShowAddGame(false)}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAddGame}>CREATE</button>
        </div>
      </Modal>

      {/* Add sale */}
      <Modal open={showAddSale} onClose={() => setShowAddSale(false)} color={color} title="RECORD SALE">
        <div style={css.fieldGroup}>
          <label style={css.label}>Game</label>
          <select style={css.input} value={saleForm.gameID} onChange={e => setSaleForm(f => ({ ...f, gameID: e.target.value }))}>
            <option value="">-- Select --</option>
            {games.map(g => <option key={g.Game_ID} value={g.Game_ID}>{g.Name}</option>)}
          </select>
        </div>
        <div style={css.fieldGroup}>
          <label style={css.label}>Customer</label>
          <select style={css.input} value={saleForm.customerSSN} onChange={e => setSaleForm(f => ({ ...f, customerSSN: e.target.value }))}>
            <option value="">-- Select --</option>
            {customers.map(c => <option key={c.SSN} value={c.SSN}>{c.First_Name} {c.Last_Name}</option>)}
          </select>
        </div>
        {[["unitPrice","Unit Price","number"],["qty","Quantity","number"],["tax","Tax","number"],["discount","Discount","number"],["date","Date","date"]].map(([k,l,t]) => (
          <div key={k} style={css.fieldGroup}><label style={css.label}>{l}</label><input style={css.input} type={t} value={saleForm[k]} onChange={e => setSaleForm(f => ({ ...f, [k]: e.target.value }))} /></div>
        ))}
        <div style={css.fieldGroup}>
          <label style={css.label}>Payment Method</label>
          <select style={css.input} value={saleForm.method} onChange={e => setSaleForm(f => ({ ...f, method: e.target.value }))}>
            {["Credit Card","PayPal","Cash","Bank Transfer"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button style={css.btn(G.textMuted, true)} onClick={() => setShowAddSale(false)}>CANCEL</button>
          <button style={css.btn(color)} onClick={handleAddSale}>RECORD</button>
        </div>
      </Modal>
    </VerseShell>
  );
}

// ─── QA MODULE ────────────────────────────────────────────────────────────────
function QAModule({ onBack }) {
  const color = G.green;
  const { data: liveTasks, error, refetch } = useResource("/tasks");
  const { data: liveStages }               = useResource("/stages");
  const { data: liveEmps }                 = useResource("/employees");
  const { show: toast, ToastEl }           = useToast();

  const tasks     = error ? MOCK.tasks : (Array.isArray(liveTasks) && liveTasks.length ? liveTasks : MOCK.tasks);
  const stages    = Array.isArray(liveStages) && liveStages.length ? liveStages : MOCK.stages;
  const employees = Array.isArray(liveEmps)   && liveEmps.length   ? liveEmps   : MOCK.employees;

  // FIX: separate state for task modal vs tester modal — was one `selected` causing black screen
  const [selectedTask, setSelectedTask]     = useState(null);
  const [selectedTester, setSelectedTester] = useState(null);
  const [filter, setFilter]                 = useState("All");
  const [editingId, setEditingId]           = useState(null);

  const testers  = employees.filter(e => e.Employee_Type === "Tester");
  const filtered = filter === "All" ? tasks : tasks.filter(t => t.Status === filter);
  const passRate = Math.round((tasks.filter(t => t.Progress === 100).length / Math.max(tasks.length,1)) * 100);
  const highOpen = tasks.filter(t => t.Priority === "High" && t.Progress < 100).length;

  // FIX: actually update via API, refetch after
  const cycleStatus = async (task, e) => {
    e.stopPropagation();
    const list = ["Not Started","In Progress","Almost Done","Completed"];
    const next = list[(list.indexOf(task.Status)+1) % list.length];
    const newPct = next === "Completed" ? 100 : task.Progress;
    try {
      await api.updateTask(task.Task_ID, { progress: newPct, status: next });
      refetch(); toast(`Status → ${next}`, color);
    } catch { toast(`Status → ${next} (mock)`, color); }
  };

  const handleUpdateProgress = async (id, progress, status) => {
    try { await api.updateTask(id, { progress, status }); refetch(); toast("✓ Updated", color); }
    catch { toast("Mock mode", "#888"); }
    setEditingId(null);
    setSelectedTask(null);
  };

  return (
    <VerseShell accent={color} label="▣ QA MODULE" moduleLabel="QA & TEST METRICS" onExit={onBack}>
      {ToastEl}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.22em", marginBottom: 8 }}>▣ DEBUG ACCESS — QA MODULE</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
          BUG<br /><span style={{ color }}>TERMINAL</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8, marginBottom: 24 }}>
        <StatCard label="PASS RATE"  value={`${passRate}%`}  color={color} />
        <StatCard label="OPEN TASKS" value={tasks.filter(t => t.Progress < 100).length} color={G.cyan} />
        <StatCard label="HIGH PRIO"  value={highOpen}         color={G.red} />
        <StatCard label="COMPLETED"  value={tasks.filter(t => t.Progress === 100).length} color={G.yellow} />
      </div>

      {/* System integrity bar */}
      <div style={{ border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace" }}>
          <span style={{ color }}>SYSTEM INTEGRITY</span>
          <span style={{ color: passRate >= 80 ? color : passRate >= 50 ? "#ffa040" : "#ff5050" }}>
            {passRate}% {passRate >= 80 ? "NOMINAL" : passRate >= 50 ? "DEGRADED" : "CRITICAL"}
          </span>
        </div>
        <ProgressBar pct={passRate} color={passRate >= 80 ? color : passRate >= 50 ? "#ffa040" : "#ff5050"} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, opacity: 0.35, fontFamily: "'Space Mono', monospace" }}>
          <span>CRITICAL FAILURE</span><span>NOMINAL</span>
        </div>
      </div>

      {/* Stage overview */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>▸ STAGE OVERVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
          {stages.map(s => (
            <div key={s.Stage_Order} style={{ background: `${color}05`, border: `1px solid ${color}18`, padding: "12px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{s.Name}</div>
              <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 8 }}>{s.Game_Name}</div>
              <ProgressBar pct={Math.round(parseFloat(s.Avg_Progress)||0)} color={color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 9, color: G.textMuted }}>{s.Task_Count} tasks</span>
                <span style={{ fontSize: 9, color }}>{Math.round(parseFloat(s.Avg_Progress)||0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + task log */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color, letterSpacing: "0.15em", fontFamily: "'Space Mono', monospace" }}>▸ TEST CASE LOG — click card to inspect</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["All","In Progress","Almost Done","Completed"].map(s => (
            <button key={s} style={css.btn(color, filter !== s)} onClick={() => setFilter(s)}>{s.toUpperCase().slice(0,4)}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 10, marginBottom: 28 }}>
        {filtered.map(task => (
          <HoverCard key={task.Task_ID} color={color} onClick={() => setSelectedTask(task)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={css.badge(priorityColor(task.Priority))}>{task.Priority}</span>
              <button onClick={e => cycleStatus(task, e)}
                style={{ background: "transparent", border: `1px solid ${statusColor(task.Status)}44`, color: statusColor(task.Status), cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.08em", padding: "2px 8px" }}>
                {task.Status}
              </button>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{task.Name}</div>
            <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 10 }}>Due: {task.Due_Date?.slice(0,10)} · {task.assignees || "—"}</div>
            <ProgressBar pct={task.Progress} color={color} />
            <div style={{ fontSize: 10, color: G.textMuted, marginTop: 4, textAlign: "right" }}>{task.Progress}%</div>
          </HoverCard>
        ))}
      </div>

      {/* QA Team */}
      {testers.length > 0 && (
        <div style={{ border: `1px solid ${color}22`, padding: 20 }}>
          <div style={{ fontSize: 10, color, letterSpacing: "0.15em", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>▸ TESTER CREDENTIALS — click to inspect</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 10 }}>
            {testers.map(t => (
              <div key={t.SSN}
                onClick={() => setSelectedTester(t)}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, cursor: "pointer", border: `1px solid ${color}18`, padding: 12, transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${color}55`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${color}18`}>
                {[["NAME",`${t.First_Name} ${t.Last_Name}`],["CERTIFICATION",t.Certification || "—"],["TESTING TYPES",t.Testing_Type || "—"],["DEPARTMENT",t.Department_Name || "—"],["HIRE DATE",t.Hire_Date?.slice(0,10)],["STATUS","Active"]].map(([k,v]) => (
                  <div key={k} style={{ fontSize: 11, padding: "8px 12px", border: `1px solid ${color}12`, background: `${color}04` }}>
                    <div style={{ fontSize: 9, color, opacity: 0.55, marginBottom: 4 }}>{k}</div>
                    <div>{v}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task detail modal — FIX: uses selectedTask not selected */}
      <Modal open={!!selectedTask} onClose={() => { setSelectedTask(null); setEditingId(null); }} color={color} title={selectedTask?.Name?.toUpperCase()}>
        {selectedTask && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Priority" value={<span style={css.badge(priorityColor(selectedTask.Priority))}>{selectedTask.Priority}</span>} />
              <Field label="Status"   value={<span style={css.badge(statusColor(selectedTask.Status))}>{selectedTask.Status}</span>} />
              <Field label="Due Date" value={selectedTask.Due_Date?.slice(0,10)} />
              <Field label="Est Hours" value={`${selectedTask.Estimated_Hours}h`} />
            </div>
            <Field label="Description" value={selectedTask.Description} />
            <div style={{ marginBottom: 14 }}>
              <span style={css.label}>Assigned To</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {(selectedTask.assignees || "Unassigned").split(",").map(a => <span key={a} style={css.badge(color)}>{a.trim()}</span>)}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={css.label}>Progress — {selectedTask.Progress}%</span>
              <ProgressBar pct={selectedTask.Progress} color={color} />
            </div>
            {editingId === selectedTask.Task_ID ? (
              <div style={{ marginBottom: 16 }}>
                <input type="range" min={0} max={100} defaultValue={selectedTask.Progress}
                  onChange={e => { selectedTask._newPct = +e.target.value; }}
                  style={{ width: "100%", accentColor: color, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["In Progress","Almost Done","Completed"].map(s => (
                    <button key={s} style={css.btn(statusColor(s))}
                      onClick={() => handleUpdateProgress(selectedTask.Task_ID, selectedTask._newPct ?? selectedTask.Progress, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button style={css.btn(color)} onClick={() => setEditingId(selectedTask.Task_ID)}>✎ UPDATE PROGRESS</button>
            )}
          </>
        )}
      </Modal>

      {/* Tester detail modal — FIX: separate modal, never was wired up before */}
      <Modal open={!!selectedTester} onClose={() => setSelectedTester(null)} color={color} title={selectedTester ? `${selectedTester.First_Name} ${selectedTester.Last_Name}`.toUpperCase() : ""}>
        {selectedTester && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="SSN"        value={selectedTester.SSN} mono />
              <Field label="Department" value={selectedTester.Department_Name} />
              <Field label="Hire Date"  value={selectedTester.Hire_Date?.slice(0,10)} />
              <Field label="Status"     value={<span style={css.badge(color)}>Active</span>} />
            </div>
            <Field label="Certification"  value={selectedTester.Certification} />
            <Field label="Testing Types"  value={selectedTester.Testing_Type} />
            {selectedTester.Bachelor && <Field label="Education" value="Bachelor's Degree" />}
            <div style={{ marginTop: 16, borderTop: `1px solid ${color}18`, paddingTop: 16 }}>
              <span style={css.label}>▸ ASSIGNED TASKS</span>
              {tasks.filter(t => t.assignees && t.assignees.toLowerCase().includes(selectedTester.First_Name.toLowerCase())).length === 0
                ? <div style={{ fontSize: 12, color: G.textMuted, marginTop: 8 }}>No tasks currently assigned.</div>
                : tasks.filter(t => t.assignees && t.assignees.toLowerCase().includes(selectedTester.First_Name.toLowerCase())).map(t => (
                  <div key={t.Task_ID} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${G.border}`, padding: "10px 14px", marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{t.Name}</span>
                      <span style={css.badge(statusColor(t.Status))}>{t.Status}</span>
                    </div>
                    <ProgressBar pct={t.Progress} color={color} />
                    <div style={{ fontSize: 10, color: G.textMuted, marginTop: 4 }}>{t.Progress}% · Due {t.Due_Date?.slice(0,10)}</div>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </Modal>
    </VerseShell>
  );
}

// ─── ERROR BOUNDARY — catches render crashes so you see the error not a black screen ──
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#000d02", color: "#22d3a0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", padding: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", marginBottom: 16, opacity: 0.6 }}>▣ RENDER ERROR — QA MODULE</div>
          <div style={{ fontSize: 13, color: "#ff5050", maxWidth: 480, textAlign: "center", lineHeight: 1.8 }}>{this.state.error}</div>
          <button onClick={() => { this.setState({ error: null }); this.props.onBack(); }}
            style={{ marginTop: 32, padding: "10px 24px", border: "1px solid #22d3a0", background: "transparent", color: "#22d3a0", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.15em" }}>
            ← BACK TO HUB
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


const MODULES = [
  { id: "tasks",       label: "TASKS",        role: "TASK MANAGEMENT", emoji: "⚡", color: G.red,    glow: "rgba(255,60,95,0.1)",   desc: "Create, assign and track all development tasks.", actions: ["View & manage tasks","Create new tasks","Delete tasks","Track progress"] },
  { id: "departments", label: "DEPARTMENTS",  role: "HR & ORG CHART",  emoji: "◈", color: G.cyan,   glow: "rgba(0,212,255,0.08)",  desc: "Manage employees, departments and assignments.", actions: ["View departments","Add / delete employees","Create departments","See personnel roster"] },
  { id: "games",       label: "GAMES & SALES",role: "CATALOGUE",       emoji: "✦", color: G.purple, glow: "rgba(168,85,247,0.1)",  desc: "Browse the game catalogue and track revenue.", actions: ["Browse game catalogue","Add / delete games","View sales transactions","Inspect game details"] },
  { id: "qa",          label: "QA & TESTING", role: "DEBUG TERMINAL",  emoji: "▣", color: G.green,  glow: "rgba(34,211,160,0.08)", desc: "Monitor quality, pass rates and test metrics.", actions: ["QA dashboard & pass rate","Cycle task status","Stage overview","Tester credentials"] },
];

function SpacetimeHub({ onEnter }) {
  const [hovered, setHovered] = useState(null);
  const mobile = useIsMobile();

  return (
    <div style={{ minHeight: "100vh", background: "#080808", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Particle field — pink like the original hub */}
      <ParticleField accent="#E91E8C" />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(233,30,140,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(233,30,140,0.025) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Header */}
      <div className="dash-hub-header" style={{ position: "relative", zIndex: 2, padding: mobile ? "24px 20px 0" : "44px 48px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: mobile ? 8 : 10, letterSpacing: "0.3em", color: "#E91E8C", marginBottom: 8, fontFamily: "'Space Mono',monospace" }}>
            ◈ DASH MULTIVERSE — DATABASE INTERFACE v3.0
          </div>
          <div className="dash-hub-title" style={{ fontSize: mobile ? 36 : 52, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: "#fff", fontFamily: "'Space Mono',monospace" }}>
            SPACE<span style={{ color: "#E91E8C" }}>TIME</span>
          </div>
          <div style={{ fontSize: mobile ? 10 : 12, color: "#444", marginTop: 8, fontFamily: "'Space Mono',monospace", letterSpacing: "0.12em" }}>
            HUB / CHOOSE YOUR MODULE TO BEGIN
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#333", fontFamily: "'Space Mono',monospace", lineHeight: 2 }}>
          <div>MODULES: 4</div>
          <div>STATUS: <span style={{ color: "#00ff7f" }}>ONLINE</span></div>
        </div>
      </div>

      {/* Module grid */}
      <div className="dash-hub-grid" style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 1, padding: mobile ? "20px 16px" : "40px 48px", flex: 1, alignItems: "stretch" }}>
        {MODULES.map(m => {
          const isHov = hovered === m.id;
          return (
            <div
              key={m.id}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onEnter(m.id)}
              className="dash-hub-card"
              style={{
                border: `1px solid ${isHov ? m.color : "rgba(255,255,255,0.06)"}`,
                background: isHov ? m.glow : "rgba(0,0,0,0.3)",
                padding: mobile ? "20px 14px" : "36px 28px", cursor: "pointer", transition: "all 0.3s",
                position: "relative", overflow: "hidden",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                minHeight: mobile ? 200 : 360,
              }}
            >
              {/* Corner accents */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: `2px solid ${m.color}`, borderLeft: `2px solid ${m.color}`, opacity: isHov ? 1 : 0.2, transition: "opacity 0.3s" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: `2px solid ${m.color}`, borderRight: `2px solid ${m.color}`, opacity: isHov ? 1 : 0.2, transition: "opacity 0.3s" }} />

              <div>
                <div style={{ fontSize: mobile ? 20 : 26, marginBottom: 10, filter: isHov ? "none" : "grayscale(0.6)" }}>{m.emoji}</div>
                <div style={{ fontSize: 8, letterSpacing: "0.18em", color: m.color, marginBottom: 4, fontFamily: "'Space Mono',monospace", opacity: isHov ? 1 : 0.4 }}>{m.role}</div>
                <div style={{ fontSize: mobile ? 14 : 22, fontWeight: 700, color: "#fff", fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>{m.label}</div>
                {!mobile && <div style={{ fontSize: 10, color: isHov ? "#888" : "#2a2a2a", fontFamily: "'Space Mono',monospace", lineHeight: 1.65, transition: "color 0.3s", marginBottom: 16 }}>{m.desc}</div>}
                {!mobile && <div style={{ fontSize: 9, padding: "4px 10px", border: `1px solid ${isHov ? m.color+"44" : "#1a1a1a"}`, color: isHov ? m.color : "#2a2a2a", display: "inline-block", letterSpacing: "0.08em", transition: "all 0.3s", fontFamily: "'Space Mono',monospace" }}>
                  DB MODULE ACTIVE
                </div>}
              </div>

              <div style={{ marginTop: mobile ? 10 : 20 }}>
                {!mobile && <>
                  <div style={{ fontSize: 9, color: isHov ? m.color : "#1e1e1e", letterSpacing: "0.12em", marginBottom: 8, transition: "color 0.3s", fontFamily: "'Space Mono',monospace" }}>WHAT YOU CAN DO:</div>
                  {m.actions.map((a, i) => (
                    <div key={i} style={{ fontSize: 10, color: isHov ? "#888" : "#1e1e1e", fontFamily: "'Space Mono',monospace", padding: "3px 0", transition: "color 0.3s", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: isHov ? m.color : "#1e1e1e", transition: "color 0.3s" }}>›</span> {a}
                    </div>
                  ))}
                </>}
                <div style={{ marginTop: mobile ? 0 : 16, fontSize: mobile ? 9 : 10, color: isHov ? m.color : "#555", letterSpacing: "0.1em", transition: "color 0.3s", fontFamily: "'Space Mono',monospace" }}>
                  TAP TO ENTER →
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="dash-hub-bottom" style={{ position: "relative", zIndex: 2, padding: mobile ? "0 20px 20px" : "0 48px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#1e1e1e", fontFamily: "'Space Mono',monospace", letterSpacing: "0.1em" }}>
          DASH GAME COMPANY — DB MANAGEMENT — PHASE III
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {MODULES.map(m => <div key={m.id} style={{ width: mobile ? 18 : 28, height: 3, background: m.color, opacity: 0.4 }} />)}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const MODULE_COMPONENTS = { tasks: TasksModule, departments: DepartmentsModule, games: GamesModule, qa: QAModule };

export default function App() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (!current) return <SpacetimeHub onEnter={setCurrent} />;

  const Component = MODULE_COMPONENTS[current];
  const accent = current === "tasks" ? G.red : current === "departments" ? G.cyan : current === "games" ? G.purple : G.green;

  return (
    <div key={current} className="animate-fade">
      {current === "qa"
        ? <ErrorBoundary onBack={() => setCurrent(null)}><Component onBack={() => setCurrent(null)} /></ErrorBoundary>
        : <Component onBack={() => setCurrent(null)} />
      }
      {/* Floating return button — from original */}
      <button
        onClick={() => setCurrent(null)}
        className="dash-return-btn"
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: "#0a0a0a", border: `1px solid ${accent}`,
          color: accent, cursor: "pointer",
          fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.15em",
          padding: "10px 20px",
        }}
      >
        ⊗ HUB
      </button>
    </div>
  );
}
