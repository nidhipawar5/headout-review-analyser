import { useState } from "react";
import { sendEmail } from "../lib/api.js";
import { THEME_META, PRIORITY_STYLE } from "../lib/theme.js";

const C = { surface:"#0F1623", card:"#131C2B", border:"#1C2942", teal:"#00D09C", muted:"#7A8BA8", dim:"#3D5070", red:"#F87171" };
const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";

function Badge({ priority }) {
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.WATCH;
  return <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.06em", padding:"2px 8px", borderRadius:99, background:s.bg, color:s.badge, border:`1px solid ${s.border}` }}>{priority}</span>;
}

function Stat({ label, value, teal }) {
  return (
    <div style={{ flex:1, minWidth:90, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
      <div style={{ fontSize:"clamp(18px,3vw,26px)", fontWeight:800, color: teal ? C.teal : "#EDF2F7", fontFamily:"Syne,sans-serif" }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{label}</div>
    </div>
  );
}

function ThemeCard({ theme }) {
  const [open, setOpen] = useState(false);
  const m = THEME_META[theme.name] || { color:"#60A5FA", icon:"●" };
  const ps = PRIORITY_STYLE[theme.priority] || PRIORITY_STYLE.WATCH;
  const pct = n => Math.max(0, Math.min(100, n || 0));

  return (
    <div onClick={() => setOpen(o => !o)} style={{ cursor:"pointer", background:C.card, border:`1px solid ${open ? m.color+"60" : C.border}`, borderRadius:14, padding:20, transition:"border-color .2s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ width:38, height:38, borderRadius:10, background:`${m.color}15`, border:`1px solid ${m.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{theme.name}</span>
            <Badge priority={theme.priority} />
          </div>
          <div style={{ fontSize:13, color:C.muted }}>{theme.corePain}</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:18, color:m.color }}>{theme.reviewCount}</div>
            <div style={{ fontSize:10, color:C.dim }}>reviews</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:18 }}>{theme.avgRating}★</div>
            <div style={{ fontSize:10, color:C.dim }}>avg</div>
          </div>
          <div style={{ color:C.muted, fontSize:16, marginLeft:4 }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>

      {/* Sentiment bar */}
      <div style={{ marginTop:14, height:6, borderRadius:3, overflow:"hidden", display:"flex", gap:1 }}>
        <div style={{ flex:pct(theme.sentiment_split?.positive), background:"#34D399", transition:"flex .4s" }} />
        <div style={{ flex:pct(theme.sentiment_split?.neutral),  background:"#4B5563", transition:"flex .4s" }} />
        <div style={{ flex:pct(theme.sentiment_split?.negative), background:C.red,    transition:"flex .4s" }} />
      </div>
      <div style={{ display:"flex", gap:16, marginTop:6, fontSize:11, color:C.dim }}>
        <span style={{ color:"#34D399" }}>▮ {theme.sentiment_split?.positive ?? 0}% positive</span>
        <span>▮ {theme.sentiment_split?.neutral ?? 0}% neutral</span>
        <span style={{ color:C.red }}>▮ {theme.sentiment_split?.negative ?? 0}% negative</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ padding:14, background:`${m.color}08`, border:`1px solid ${m.color}20`, borderRadius:10 }}>
              <div style={{ fontSize:11, color:m.color, fontWeight:700, marginBottom:6 }}>NEGATIVE COUNT</div>
              <div style={{ fontSize:24, fontWeight:800, color:m.color }}>{theme.negativeCount}</div>
              <div style={{ fontSize:11, color:C.muted }}>out of {theme.reviewCount} reviews</div>
            </div>
            <div style={{ padding:14, background:"#0F1623", border:`1px solid ${C.border}`, borderRadius:10 }}>
              <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:6 }}>CORE PAIN</div>
              <div style={{ fontSize:14, color:"#CBD5E1", lineHeight:1.5 }}>{theme.corePain}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsScreen({ result, meta }) {
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | sending | sent | error
  const [emailError,  setEmailError]  = useState("");
  const [recipients,  setRecipients]  = useState(meta?.recipients || "");

  const { overview, themes, positiveHighlight, riskAlert, actions, stats, email } = result;
  const npsStr = stats.nps >= 0 ? `+${stats.nps}` : String(stats.nps);

  async function handleSendEmail() {
    if (!recipients.trim()) return;
    setEmailStatus("sending"); setEmailError("");
    try {
      await sendEmail({ to: recipients, subject: email?.subject, plain: email?.plain, themes, actions, stats, fromDate: meta?.fromDate, toDate: meta?.toDate, positiveHighlight, riskAlert, headline: overview?.headline });
      setEmailStatus("sent");
    } catch (e) {
      setEmailError(e.message);
      setEmailStatus("error");
    }
  }

  return (
    <div className="fade-up">
      {/* Masthead */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:"24px 28px", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:"0.08em", marginBottom:8 }}>
              GROWW REVIEW PULSE · {fmt(meta?.fromDate)} – {fmt(meta?.toDate)} · {meta?.windowDays}-DAY WINDOW
            </div>
            <h1 style={{ fontFamily:"Syne,sans-serif", fontWeight:900, fontSize:"clamp(18px,3vw,26px)", lineHeight:1.25, maxWidth:600 }}>
              {overview?.headline}
            </h1>
          </div>
          {meta?.sources && (
            <div style={{ display:"flex", gap:10, flexShrink:0 }}>
              {[["🤖",meta.sources.playStore,"Play Store"],["🍎",meta.sources.appStore,"App Store"]].map(([icon,n,lbl]) => (
                <div key={lbl} style={{ textAlign:"center", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:16 }}>{icon}</div>
                  <div style={{ fontWeight:800, fontSize:18, color:C.teal }}>{n}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:10, marginTop:20, flexWrap:"wrap" }}>
          <Stat label="Total Reviews"  value={stats.total} teal />
          <Stat label="Avg Rating"     value={`${stats.avg}★`} />
          <Stat label="Positive"       value={stats.pos} />
          <Stat label="Negative"       value={stats.neg} />
          <Stat label="NPS Proxy"      value={npsStr} teal />
        </div>
      </div>

      {/* Positive + Risk */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <div style={{ background:C.card, border:"1px solid #064E3B", borderRadius:14, padding:18 }}>
          <div style={{ fontSize:11, color:"#34D399", fontWeight:700, marginBottom:8 }}>✓ POSITIVE HIGHLIGHT</div>
          <p style={{ fontSize:14, color:"#A7F3D0" }}>{positiveHighlight}</p>
        </div>
        <div style={{ background:C.card, border:"1px solid #7F1D1D", borderRadius:14, padding:18 }}>
          <div style={{ fontSize:11, color:C.red, fontWeight:700, marginBottom:8 }}>⚠ RISK ALERT</div>
          <p style={{ fontSize:14, color:"#FECACA" }}>{riskAlert}</p>
        </div>
      </div>

      {/* Themes */}
      <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:18, marginBottom:14 }}>Theme Breakdown</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {(themes || []).map(t => <ThemeCard key={t.name} theme={t} />)}
      </div>

      {/* Actions */}
      <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:18, marginBottom:14 }}>Action Roadmap</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
        {(actions || []).map((a, i) => {
          const m = THEME_META[a.theme] || { color:"#60A5FA" };
          const ps = PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.WATCH;
          return (
            <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:18, display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:`${m.color}15`, border:`1px solid ${m.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:m.color, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>{a.title}</span>
                  <Badge priority={a.priority} />
                  <span style={{ fontSize:11, color:C.muted, background:"#131C2B", padding:"2px 8px", borderRadius:99, border:`1px solid ${C.border}` }}>⏱ {a.timeline}</span>
                  <span style={{ fontSize:11, color:C.muted, background:"#131C2B", padding:"2px 8px", borderRadius:99, border:`1px solid ${C.border}` }}>👤 {a.owner}</span>
                </div>
                <p style={{ fontSize:13, color:"#CBD5E1", marginBottom:6 }}>{a.description}</p>
                <div style={{ fontSize:12, color:C.muted }}>📏 {a.successMetric}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Email section */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
        <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:18, marginBottom:6 }}>Send Email Digest</h2>
        <p style={{ fontSize:13, color:C.muted, marginBottom:18 }}>Send this pulse to your team. Subject: <em style={{ color:"#EDF2F7" }}>{email?.subject}</em></p>

        <div style={{ display:"flex", gap:10 }}>
          <input
            type="text"
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            placeholder="pm@company.com, ceo@company.com"
            style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:"#080D17", color:"#EDF2F7", fontSize:14, fontFamily:"inherit", outline:"none" }}
          />
          <button onClick={handleSendEmail} disabled={emailStatus==="sending" || !recipients.trim()} style={{
            padding:"10px 22px", borderRadius:10, border:"none", cursor: emailStatus==="sending" || !recipients.trim() ? "not-allowed" : "pointer",
            background: emailStatus==="sent" ? "#064E3B" : `linear-gradient(135deg,${C.teal},#00A87A)`,
            color: emailStatus==="sent" ? "#34D399" : "#080D17",
            fontWeight:700, fontSize:14, fontFamily:"inherit", whiteSpace:"nowrap", opacity: !recipients.trim() ? 0.5 : 1,
          }}>
            {emailStatus==="sending" ? "Sending…" : emailStatus==="sent" ? "✓ Sent!" : "Send Email"}
          </button>
        </div>

        {emailStatus==="error" && <p style={{ color:C.red, fontSize:13, marginTop:10 }}>⚠ {emailError}</p>}
        {emailStatus==="sent"  && <p style={{ color:"#34D399", fontSize:13, marginTop:10 }}>✓ Email sent successfully to {recipients}</p>}
      </div>
    </div>
  );
}
