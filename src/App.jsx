import { useState } from "react";
import { fetchReviews, analyzeReviews } from "./lib/api.js";
import HomeScreen     from "./components/HomeScreen.jsx";
import PipelineScreen from "./components/PipelineScreen.jsx";
import ResultsScreen  from "./components/ResultsScreen.jsx";
import ScheduleScreen from "./components/ScheduleScreen.jsx";

// Headout brand palette — Purps + Candy + deep Slate
const C = {
  bg:      "#0D0B14",   // Slate Black
  nav:     "#13101F",   // Darker nav bar
  border:  "#2A1F40",   // Purple-tinted border
  primary: "#8000FF",   // Purps
  candy:   "#FF6B35",   // Candy (warm coral-orange accent)
  muted:   "#9B8EB8",   // Muted lavender
  dim:     "#5A4D75",   // Dimmed text
};

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
    <div style={{ minHeight: "100vh", background: C.bg, color: "#F0EAF8", fontFamily: "Inter, sans-serif" }}>

      {/* Nav */}
      <header style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 20 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap: 10, flexShrink: 0 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${C.primary},#5500BB)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:17, color:"#fff", fontFamily:'"Halyard Display", Inter, sans-serif' }}>H</div>
            <span style={{ fontFamily:'"Halyard Display", Inter, sans-serif', fontWeight:800, fontSize:15, color:"#F0EAF8", letterSpacing:"-0.01em" }}>Headout Pulse</span>
          </div>

          {/* Tabs */}
          {[["analyse","📊 Analyse"],["schedule","🗓 Schedules"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
              padding:"0 4px", height:60, fontWeight: tab===id ? 700 : 400,
              color: tab===id ? C.primary : C.muted, fontSize:13,
              borderBottom: tab===id ? `2px solid ${C.primary}` : "2px solid transparent",
              transition:"color .15s",
            }}>{label}</button>
          ))}

          {/* Right info */}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {meta && tab==="analyse" && page==="results" && (
              <span style={{ fontSize:12, color:C.muted, background:"#1A1428", padding:"3px 12px", borderRadius:99, border:`1px solid ${C.border}` }}>
                {fmt(meta.fromDate)} → {fmt(meta.toDate)}
              </span>
            )}
            {page==="results" && tab==="analyse" && (
              <button onClick={reset} style={{ fontSize:12, color:C.muted, background:"transparent", border:`1px solid ${C.border}`, padding:"4px 14px", borderRadius:99, cursor:"pointer", fontFamily:"inherit", transition:"border-color .15s" }}>
                ← New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{ marginBottom:20, padding:"12px 16px", background:"#200808", border:"1px solid #7F1D1D", borderRadius:10, color:"#FCA5A5", fontSize:13, display:"flex", justifyContent:"space-between" }}>
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

      <footer style={{ borderTop:`1px solid ${C.border}`, padding:"18px 24px", textAlign:"center", fontSize:12, color:C.dim }}>
        Headout Review Analyzer · Live Play Store + App Store · Gemini 2.0 Flash · No PII stored
      </footer>
    </div>
  );
}
