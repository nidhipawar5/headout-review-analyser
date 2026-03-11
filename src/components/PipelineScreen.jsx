const C = { surface:"#0F1623", border:"#1C2942", teal:"#00D09C", muted:"#7A8BA8", dim:"#3D5070" };

const STEPS = [
  { id:1, icon:"🔍", label:"Scraping Reviews",  desc:"Fetching live data from Play Store & App Store" },
  { id:2, icon:"🧠", label:"Classifying Themes", desc:"Gemini is categorising reviews into 4 themes" },
  { id:3, icon:"⚡", label:"Generating Insights",desc:"Building theme analysis & priority scores" },
  { id:4, icon:"📋", label:"Creating Actions",   desc:"Drafting action roadmap and email digest" },
];

export default function PipelineScreen({ layers }) {
  const { active, done } = layers;

  return (
    <div className="fade-up" style={{ maxWidth:560, margin:"0 auto", paddingTop:20 }}>
      <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:900, fontSize:24, textAlign:"center", marginBottom:8 }}>
        Running Pulse Pipeline
      </h2>
      <p style={{ color:C.muted, textAlign:"center", fontSize:14, marginBottom:36 }}>
        This takes about 30–60 seconds. Please wait…
      </p>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:24, display:"flex", flexDirection:"column", gap:4 }}>
        {STEPS.map(step => {
          const isDone    = done.includes(step.id);
          const isActive  = active === step.id;
          const isPending = !isDone && !isActive;

          return (
            <div key={step.id} style={{ display:"flex", gap:16, alignItems:"flex-start", padding:"14px 16px", borderRadius:12, background: isActive ? `${C.teal}0a` : "transparent", border: isActive ? `1px solid ${C.teal}30` : "1px solid transparent", transition:"all .3s" }}>
              {/* Icon/status */}
              <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
                background: isDone ? `${C.teal}20` : isActive ? `${C.teal}10` : "#131C2B",
                border: `1px solid ${isDone ? C.teal : isActive ? `${C.teal}60` : C.border}`,
              }}>
                {isDone   ? <span style={{ color:C.teal, fontWeight:900 }}>✓</span>
                 : isActive ? <span style={{ display:"inline-block", width:16, height:16, border:`2px solid ${C.teal}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
                 : <span style={{ opacity:.3 }}>{step.icon}</span>}
              </div>

              <div style={{ flex:1, paddingTop:2 }}>
                <div style={{ fontWeight:700, fontSize:15, color: isDone ? C.teal : isActive ? "#EDF2F7" : C.muted, transition:"color .3s" }}>
                  {step.label}
                </div>
                <div style={{ fontSize:12, color:C.dim, marginTop:2 }}>{step.desc}</div>
              </div>

              <div style={{ fontSize:12, color: isDone ? C.teal : isActive ? C.teal : C.dim, fontWeight: isDone||isActive ? 700 : 400, paddingTop:4, animation: isActive ? "pulse 1.5s ease infinite" : "none" }}>
                {isDone ? "Done" : isActive ? "Running…" : "Waiting"}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign:"center", fontSize:12, color:C.dim, marginTop:20 }}>
        Groww Pulse · Live data · No PII stored
      </p>
    </div>
  );
}
