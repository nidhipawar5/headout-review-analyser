import { useState } from "react";
import { sendEmail } from "../lib/api.js";
import { THEME_META, PRIORITY_STYLE } from "../lib/theme.js";

// Headout brand palette
const C = {
  surface: "#13101F",
  card: "#1A1428",
  border: "#2A1F40",
  primary: "#8000FF",   // Purps
  candy: "#FF6B35",   // Candy
  muted: "#9B8EB8",
  dim: "#5A4D75",
  red: "#F87171",
  bg: "#0D0B14",
};
const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function Badge({ priority }) {
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.WATCH;
  return <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", padding: "2px 9px", borderRadius: 99, background: s.bg, color: s.badge, border: `1px solid ${s.border}` }}>{priority}</span>;
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ flex: 1, minWidth: 90, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 800, color: highlight ? C.primary : "#F0EAF8", fontFamily: '"Halyard Display", Inter, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function ThemeCard({ theme }) {
  const [open, setOpen] = useState(false);
  const m = THEME_META[theme.name] || { color: "#8000FF", icon: "●" };
  const pct = n => Math.max(0, Math.min(100, n || 0));

  return (
    <div onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", background: C.card, border: `1px solid ${open ? m.color + "70" : C.border}`, borderRadius: 14, padding: 20, transition: "border-color .2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}18`, border: `1px solid ${m.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#F0EAF8" }}>{theme.name}</span>
            <Badge priority={theme.priority} />
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>{theme.corePain}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: m.color }}>{theme.reviewCount}</div>
            <div style={{ fontSize: 10, color: C.dim }}>reviews</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#F0EAF8" }}>{theme.avgRating}★</div>
            <div style={{ fontSize: 10, color: C.dim }}>avg</div>
          </div>
          <div style={{ color: C.muted, fontSize: 16, marginLeft: 4 }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>

      {/* Sentiment bar */}
      <div style={{ marginTop: 14, height: 5, borderRadius: 3, overflow: "hidden", display: "flex", gap: 1 }}>
        <div style={{ flex: pct(theme.sentiment_split?.positive), background: "#34D399", transition: "flex .4s" }} />
        <div style={{ flex: pct(theme.sentiment_split?.neutral), background: "#3D2F55", transition: "flex .4s" }} />
        <div style={{ flex: pct(theme.sentiment_split?.negative), background: C.candy, transition: "flex .4s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: C.dim }}>
        <span style={{ color: "#34D399" }}>▮ {theme.sentiment_split?.positive ?? 0}% positive</span>
        <span>▮ {theme.sentiment_split?.neutral ?? 0}% neutral</span>
        <span style={{ color: C.candy }}>▮ {theme.sentiment_split?.negative ?? 0}% negative</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, background: `${m.color}0A`, border: `1px solid ${m.color}25`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 700, marginBottom: 6 }}>NEGATIVE COUNT</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{theme.negativeCount}</div>
              <div style={{ fontSize: 11, color: C.muted }}>out of {theme.reviewCount} reviews</div>
            </div>
            <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>CORE PAIN</div>
              <div style={{ fontSize: 14, color: "#D8CCF0", lineHeight: 1.5 }}>{theme.corePain}</div>
            </div>
          </div>

          {/* Sample reviews with links */}
          {theme.sampleReviews?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                📋 Reviews
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {theme.sampleReviews.map((r, i) => (
                  <div key={r.id || i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: r.rating <= 2 ? C.candy : r.rating >= 4 ? "#34D399" : C.muted }}>
                          {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                          background: r.platform === "Play Store" ? "#0D2A1A" : "#1A1A3A",
                          color: r.platform === "Play Store" ? "#34D399" : "#818CF8",
                          border: `1px solid ${r.platform === "Play Store" ? "#1A5A30" : "#3730A3"}`,
                        }}>
                          {r.platform === "Play Store" ? "🤖 Play Store" : "🍎 App Store"}
                        </span>
                        <span style={{ fontSize: 11, color: C.dim }}>{r.date}</span>
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                          fontSize: 11, color: C.primary, textDecoration: "none", fontWeight: 600,
                          padding: "3px 10px", borderRadius: 99, border: `1px solid ${C.primary}50`,
                          background: `${C.primary}10`, whiteSpace: "nowrap",
                        }}>
                          View original ↗
                        </a>
                      )}
                    </div>
                    {r.title && r.title !== "Review" && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E0F8", marginBottom: 4 }}>{r.title}</div>
                    )}
                    {r.text && (
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, fontStyle: "italic" }}>
                        "{r.text.length > 200 ? r.text.slice(0, 197) + "…" : r.text}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function ResultsScreen({ result, meta }) {
  const [emailStatus, setEmailStatus] = useState("idle"); // idle | sending | sent | error
  const [emailError, setEmailError] = useState("");
  const [recipients, setRecipients] = useState(meta?.recipients || "");

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
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
              HEADOUT REVIEW PULSE · {fmt(meta?.fromDate)} – {fmt(meta?.toDate)} · {meta?.windowDays}-DAY WINDOW
            </div>
            <h1 style={{ fontFamily: '"Halyard Display", Inter, sans-serif', fontWeight: 900, fontSize: "clamp(18px,3vw,26px)", lineHeight: 1.25, maxWidth: 600, color: "#F0EAF8" }}>
              {overview?.headline}
            </h1>
          </div>
          {meta?.sources && (
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              {[["🤖", meta.sources.playStore, "Play Store"], ["🍎", meta.sources.appStore, "App Store"]].map(([icon, n, lbl]) => (
                <div key={lbl} style={{ textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 16 }}>{icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{n}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <Stat label="Total Reviews" value={stats.total} highlight />
          <Stat label="Avg Rating" value={`${stats.avg}★`} />
          <Stat label="Positive" value={stats.pos} />
          <Stat label="Negative" value={stats.neg} />
          <Stat label="NPS Proxy" value={npsStr} highlight />
        </div>
      </div>

      {/* Positive + Risk */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.card, border: `1px solid #1A4A2A`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: "#34D399", fontWeight: 700, marginBottom: 8 }}>✓ POSITIVE HIGHLIGHT</div>
          <p style={{ fontSize: 14, color: "#A7F3D0", margin: 0 }}>{positiveHighlight}</p>
        </div>
        <div style={{ background: C.card, border: `1px solid #5A1A00`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: C.candy, fontWeight: 700, marginBottom: 8 }}>⚠ RISK ALERT</div>
          <p style={{ fontSize: 14, color: "#FFD4BC", margin: 0 }}>{riskAlert}</p>
        </div>
      </div>

      {/* Themes */}
      <h2 style={{ fontFamily: '"Halyard Display", Inter, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 14, color: "#F0EAF8" }}>Theme Breakdown</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {(themes || []).map(t => <ThemeCard key={t.name} theme={t} />)}
      </div>

      {/* Actions */}
      <h2 style={{ fontFamily: '"Halyard Display", Inter, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 14, color: "#F0EAF8" }}>Action Roadmap</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {(actions || []).map((a, i) => {
          const m = THEME_META[a.theme] || { color: "#8000FF" };
          return (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${m.color}18`, border: `1px solid ${m.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: m.color, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#F0EAF8" }}>{a.title}</span>
                  <Badge priority={a.priority} />
                  <span style={{ fontSize: 11, color: C.muted, background: C.card, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.border}` }}>⏱ {a.timeline}</span>
                  <span style={{ fontSize: 11, color: C.muted, background: C.card, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.border}` }}>👤 {a.owner}</span>
                </div>
                <p style={{ fontSize: 13, color: "#C4B8DC", marginBottom: 6, margin: "4px 0" }}>{a.description}</p>
                <div style={{ fontSize: 12, color: C.muted }}>📏 {a.successMetric}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Email section */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontFamily: '"Halyard Display", Inter, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 6, color: "#F0EAF8" }}>Send Email Digest</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Send this pulse to your team. Subject: <em style={{ color: "#F0EAF8" }}>{email?.subject}</em></p>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={recipients}
            onChange={e => setRecipients(e.target.value)}
            placeholder="pm@company.com, ceo@company.com"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: "#F0EAF8", fontSize: 14, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={handleSendEmail} disabled={emailStatus === "sending" || !recipients.trim()} style={{
            padding: "10px 22px", borderRadius: 10, border: "none", cursor: emailStatus === "sending" || !recipients.trim() ? "not-allowed" : "pointer",
            background: emailStatus === "sent" ? "#1A4A2A" : `linear-gradient(135deg,${C.primary},#5500BB)`,
            color: emailStatus === "sent" ? "#34D399" : "#fff",
            fontWeight: 700, fontSize: 14, fontFamily: "inherit", whiteSpace: "nowrap", opacity: !recipients.trim() ? 0.5 : 1,
            transition: "all .2s",
          }}>
            {emailStatus === "sending" ? "Sending…" : emailStatus === "sent" ? "✓ Sent!" : "Send Email"}
          </button>
        </div>

        {emailStatus === "error" && <p style={{ color: C.candy, fontSize: 13, marginTop: 10 }}>⚠ {emailError}</p>}
        {emailStatus === "sent" && <p style={{ color: "#34D399", fontSize: 13, marginTop: 10 }}>✓ Email sent successfully to {recipients}</p>}
      </div>
    </div>
  );
}
