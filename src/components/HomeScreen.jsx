import { useState } from "react";

// Headout brand palette
const C = {
  bg:      "#0D0B14",
  surface: "#13101F",
  card:    "#1A1428",
  border:  "#2A1F40",
  primary: "#8000FF",   // Purps
  candy:   "#FF6B35",   // Candy accent
  muted:   "#9B8EB8",
  dim:     "#5A4D75",
};

export default function HomeScreen({ onStart }) {
  const [days,       setDays]       = useState(7);
  const [recipients, setRecipients] = useState("");
  const [loading,    setLoading]    = useState(false);

  async function go() {
    setLoading(true);
    await onStart({ windowDays: days, recipients });
    setLoading(false);
  }

  return (
    <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign:"center", marginBottom: 36 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.card, border:`1px solid ${C.border}`, borderRadius:99, padding:"5px 16px", fontSize:12, color:C.candy, fontWeight:700, marginBottom:20, letterSpacing:"0.05em" }}>
          🟠 LIVE · Play Store + App Store
        </div>
        <h1 style={{ fontFamily:'"Halyard Display", Inter, sans-serif', fontWeight:900, fontSize:"clamp(28px,5vw,44px)", lineHeight:1.1, marginBottom:14, color:"#F0EAF8" }}>
          Headout App<br/>
          <span style={{ background:`linear-gradient(90deg, ${C.primary}, ${C.candy})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Review Pulse</span>
        </h1>
        <p style={{ color:C.muted, fontSize:15, maxWidth:440, margin:"0 auto", lineHeight:1.6 }}>
          Scrapes live reviews, runs Gemini AI analysis, and delivers a one-page health pulse to your team.
        </p>
      </div>

      {/* Config card */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:28 }}>

        {/* Window selector */}
        <div style={{ marginBottom:22 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
            Review Window
          </label>
          <div style={{ display:"flex", gap:8 }}>
            {[7,14,21,28].map(d => (
              <button key={d} onClick={()=>setDays(d)} style={{
                flex:1, padding:"11px 0", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                border:`1px solid ${days===d ? C.primary : C.border}`,
                background: days===d ? `${C.primary}1A` : C.card,
                color: days===d ? C.primary : C.muted,
                fontWeight: days===d ? 700 : 400, fontSize:14,
                transition:"all .15s",
              }}>{d}d</button>
            ))}
          </div>
        </div>

        {/* Recipients */}
        <div style={{ marginBottom:28 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
            Email Recipients <span style={{ fontWeight:400, textTransform:"none", fontSize:11 }}>(optional, comma-separated)</span>
          </label>
          <input
            type="text"
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            placeholder="pm@company.com, ceo@company.com"
            style={{ width:"100%", boxSizing:"border-box", padding:"11px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:"#F0EAF8", fontSize:14, fontFamily:"inherit", outline:"none" }}
          />
        </div>

        {/* Run button */}
        <button onClick={go} disabled={loading} style={{
          width:"100%", padding:"15px 0", borderRadius:12, border:"none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? C.card : `linear-gradient(135deg,${C.primary},#5500BB)`,
          color: loading ? C.muted : "#fff", fontWeight:800, fontSize:16, fontFamily:'"Halyard Display", Inter, sans-serif',
          letterSpacing:"0.01em", transition:"all .2s", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Starting…" : `▶ Run ${days}-Day Pulse`}
        </button>

        {/* How it works */}
        <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${C.border}`, display:"flex", gap:0, flexWrap:"wrap" }}>
          {[["1","Scrape","Live reviews from Play Store + App Store"],["2","Analyse","Gemini AI classifies travel themes & insights"],["3","Report","One-page pulse with actions & NPS"],["4","Email","Sent automatically to your team"]].map(([n,t,d],i,arr) => (
            <div key={n} style={{ flex:"1 1 100px", display:"flex", gap:10, padding:"8px 12px", borderRight: i<arr.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:`${C.primary}20`, border:`1px solid ${C.primary}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:C.primary, fontWeight:700, flexShrink:0 }}>{n}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#F0EAF8" }}>{t}</div>
                <div style={{ fontSize:11, color:C.dim, lineHeight:1.4 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
