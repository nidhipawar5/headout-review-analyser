import { useState } from "react";
import { fetchReviews, analyzeReviews } from "./lib/api.js";
import HomeScreen     from "./components/HomeScreen.jsx";
import PipelineScreen from "./components/PipelineScreen.jsx";
import ResultsScreen  from "./components/ResultsScreen.jsx";
import ScheduleScreen from "./components/ScheduleScreen.jsx";

const C = { bg:"#080D17", nav:"#0B1426", border:"#1C2942", teal:"#00D09C", muted:"#7A8BA8" };

const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";

export default function App() {
  const [tab,    setTab]    = useState("analyse");   // "analyse" | "schedule"
  const [page,   setPage]   = useState("home");      // "home" | "pipeline" | "results"
  const [layers, setLayers] = useState({ active: 0, done: [] });
  const [result, setResult] = useState(null);
  const [meta,   setMeta]   = useState(null);        // { fromDate, toDate, windowDays, recipients, sources }
  const [error,  setError]  = useState("");

  async function handleStart({ windowDays, recipients }) {
    setError("");
    setPage("pipeline");
    setLayers({ active: 1, done: [] });

    try {
      // Layer 1 — scrape
      const scrape = await fetchReviews(windowDays);
      const { reviews, fromDate, toDate, sources } = scrape;

      if (!reviews?.length)
        throw new Error("No reviews found. Try a wider date window.");

      setLayers({ active: 2, done: [1] });
      setMeta({ fromDate, toDate, windowDays, recipients, sources });

      // Advance visual layers every 15s while analyze runs
      let vis = 2;
      const timer = setInterval(() => {
        if (vis < 4) {
          vis++;
          setLayers(p => ({ active: vis, done: [...p.done, vis - 1] }));
        }
      }, 15000);

      let analysis;
      try {
        analysis = await analyzeReviews({ reviews, windowDays, fromDate, toDate });
      } finally {
        clearInterval(timer);
      }

      setLayers({ active: 5, done: [1, 2, 3, 4] });
      await new Promise(r => setTimeout(r, 400));

      setResult(analysis);
      setPage("results");

    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong. Check your functions terminal.");
      setPage("home");
      setLayers({ active: 0, done: [] });
    }
  }

  function reset() { setPage("home"); setResult(null); setMeta(null); setError(""); setLayers({ active: 0, done: [] }); }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: "#EDF2F7" }}>

      {/* Nav */}
      <header style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 20 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap: 10, flexShrink: 0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.teal},#00A87A)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:C.bg, fontFamily:"Syne,sans-serif" }}>G</div>
            <span style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:14 }}>Groww Pulse</span>
          </div>

          {/* Tabs */}
          {[["analyse","📊 Analyse"],["schedule","🗓 Schedules"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
              padding:"0 4px", height:56, fontWeight: tab===id ? 700 : 400,
              color: tab===id ? C.teal : C.muted, fontSize:13,
              borderBottom: tab===id ? `2px solid ${C.teal}` : "2px solid transparent",
            }}>{label}</button>
          ))}

          {/* Right info */}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {meta && tab==="analyse" && page==="results" && (
              <span style={{ fontSize:12, color:C.muted, background:"#0F1623", padding:"3px 12px", borderRadius:99, border:`1px solid ${C.border}` }}>
                {fmt(meta.fromDate)} → {fmt(meta.toDate)}
              </span>
            )}
            {page==="results" && tab==="analyse" && (
              <button onClick={reset} style={{ fontSize:12, color:C.muted, background:"transparent", border:`1px solid ${C.border}`, padding:"4px 14px", borderRadius:99, cursor:"pointer", fontFamily:"inherit" }}>
                ← New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{ marginBottom:20, padding:"12px 16px", background:"#1F0707", border:"1px solid #7F1D1D", borderRadius:10, color:"#FCA5A5", fontSize:13, display:"flex", justifyContent:"space-between" }}>
            <span>⚠️ {error}</span>
            <button onClick={()=>setError("")} style={{ background:"none", border:"none", color:"#FCA5A5", cursor:"pointer" }}>✕</button>
          </div>
        )}

        {tab === "analyse" && (
          <>
            {page === "home"     && <HomeScreen onStart={handleStart} />}
            {page === "pipeline" && <PipelineScreen layers={layers} meta={meta} />}
            {page === "results"  && result && <ResultsScreen result={result} meta={meta} />}
          </>
        )}

        {tab === "schedule" && <ScheduleScreen />}
      </main>

      <footer style={{ borderTop:`1px solid ${C.border}`, padding:"18px 24px", textAlign:"center", fontSize:12, color:"#3D5070" }}>
        Groww Review Analyzer · Live Play Store + App Store · Gemini 2.0 Flash · No PII stored
      </footer>
    </div>
  );
}
