const fetch = require("node-fetch");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const PRIORITY_COLOR = { CRITICAL: "#F87171", HIGH: "#FBBF24", FOCUS: "#34D399", WATCH: "#60A5FA" };

function htmlEmail({ headline, fromDate, toDate, stats, themes, actions, positiveHighlight, riskAlert }) {
  const fmt = iso => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };
  const npsStr = stats.nps >= 0 ? `+${stats.nps}` : String(stats.nps);

  const themeRows = (themes || []).map(t => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;">
        <span style="color:${PRIORITY_COLOR[t.priority]||"#60A5FA"};font-weight:700;">${t.name}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#94A3B8;">${t.reviewCount} reviews</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#94A3B8;">${t.avgRating}★</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#CBD5E1;font-size:13px;">${t.corePain || ""}</td>
    </tr>`).join("");

  const actionRows = (actions || []).map((a, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#00D09C;font-weight:700;">${i + 1}. ${a.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#94A3B8;">${a.owner}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#94A3B8;">${a.timeline}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1C2942;color:#CBD5E1;font-size:13px;">${a.description}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#080D17;font-family:'DM Sans',Arial,sans-serif;color:#EDF2F7;">
  <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(135deg,#0F1623,#131C2B);border:1px solid #1C2942;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid #1C2942;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00D09C,#00A87A);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#080D17;">G</div>
          <div>
            <div style="font-size:11px;color:#00D09C;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Groww Review Pulse</div>
            <div style="font-size:14px;color:#7A8BA8;">${fmt(fromDate)} – ${fmt(toDate)}</div>
          </div>
        </div>
        <h1 style="margin:0;font-size:22px;font-weight:800;line-height:1.3;">${headline || "Weekly Review Summary"}</h1>
      </div>

      <div style="padding:20px 32px;display:flex;gap:16px;border-bottom:1px solid #1C2942;">
        ${[["Reviews", stats.total], ["Avg Rating", stats.avg + "★"], ["NPS Proxy", npsStr], ["Negative", stats.neg]].map(([l, v]) =>
          `<div style="flex:1;background:#080D17;border:1px solid #1C2942;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#00D09C;">${v}</div><div style="font-size:11px;color:#7A8BA8;margin-top:4px;">${l}</div></div>`
        ).join("")}
      </div>

      <div style="padding:24px 32px;border-bottom:1px solid #1C2942;">
        <h2 style="margin:0 0 16px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7A8BA8;">Themes</h2>
        <table style="width:100%;border-collapse:collapse;"><tbody>${themeRows}</tbody></table>
      </div>

      <div style="padding:24px 32px;border-bottom:1px solid #1C2942;">
        <h2 style="margin:0 0 16px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7A8BA8;">Actions</h2>
        <table style="width:100%;border-collapse:collapse;"><tbody>${actionRows}</tbody></table>
      </div>

      <div style="padding:20px 32px;background:#0B1020;display:flex;gap:16px;">
        <div style="flex:1;padding:14px;background:#0F1623;border:1px solid #1C2942;border-radius:10px;">
          <div style="font-size:11px;color:#34D399;font-weight:700;margin-bottom:6px;">✓ POSITIVE</div>
          <div style="font-size:13px;color:#CBD5E1;">${positiveHighlight || ""}</div>
        </div>
        <div style="flex:1;padding:14px;background:#0F1623;border:1px solid #1C2942;border-radius:10px;">
          <div style="font-size:11px;color:#F87171;font-weight:700;margin-bottom:6px;">⚠ RISK ALERT</div>
          <div style="font-size:13px;color:#CBD5E1;">${riskAlert || ""}</div>
        </div>
      </div>

      <div style="padding:16px 32px;text-align:center;color:#3D5070;font-size:12px;">
        Pulse Bot · Automated Weekly Digest · Groww Review Analyzer
      </div>
    </div>
  </div>
</body></html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { to, subject, plain, themes, actions, stats, fromDate, toDate, positiveHighlight, riskAlert, headline } = body;

  if (!to)      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "to is required" }) };
  if (!subject) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "subject is required" }) };

  const key    = process.env.RESEND_API_KEY;
  const sender = process.env.SENDER_EMAIL || "onboarding@resend.dev";
  if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "RESEND_API_KEY not set in .env" }) };

  const recipients = to.split(",").map(s => s.trim()).filter(Boolean);
  const html = htmlEmail({ headline, fromDate, toDate, stats: stats || { total: 0, avg: 0, nps: 0, neg: 0 }, themes: themes || [], actions: actions || [], positiveHighlight, riskAlert });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: sender, to: recipients, subject, html, text: plain || subject }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));
    console.log("[email] sent:", data.id);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (e) {
    console.error("[email] error:", e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
