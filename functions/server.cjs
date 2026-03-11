// ─────────────────────────────────────────────────────────────────────────────
// Local dev server  →  node functions/server.cjs
// Listens on http://localhost:9999
// Vite (port 5173) proxies  /.netlify/functions/X  →  http://localhost:9999/X
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = 9999;

// Load all handlers once at startup
const HANDLERS = {
  scrape:        require("./scrape.cjs"),
  analyze:       require("./analyze.cjs"),
  "send-email":  require("./send-email.cjs"),
  schedule:      require("./schedule.cjs"),
};

// ── Routing ───────────────────────────────────────────────────────────────────
// Vite rewrites  /.netlify/functions/scrape  →  /scrape
// So we get paths like /scrape, /analyze, /send-email, /schedule
// This function extracts the last non-empty segment.
function resolve(url) {
  return url.split("?")[0].split("/").filter(Boolean).pop() || "";
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const key     = resolve(req.url);
  const handler = HANDLERS[key];
  console.log(`[srv] ${req.method} ${req.url}  →  "${key}"  ${handler ? "OK" : "NOT FOUND"}`);

  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `No handler for "${req.url}" (resolved to "${key}"). Available: ${Object.keys(HANDLERS).join(", ")}` }));
    return;
  }

  let raw = "";
  req.on("data", c => { raw += c; });
  req.on("end", async () => {
    try {
      const result = await handler.handler({
        httpMethod: req.method,
        headers:    req.headers,
        body:       raw || "{}",
        queryStringParameters: {},
      });
      res.writeHead(result.statusCode ?? 200, result.headers ?? { "Content-Type": "application/json" });
      res.end(result.body ?? "");
    } catch (e) {
      console.error(`[srv] crash in "${key}":`, e.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log("\n✅  Functions server → http://localhost:" + PORT);
  console.log("    Handlers: " + Object.keys(HANDLERS).join("  |  "));
  console.log("\n    Env:");
  ["GEMINI_API_KEY", "RESEND_API_KEY", "SENDER_EMAIL"].forEach(k =>
    console.log("      " + k + ": " + (process.env[k] ? "✓ set" : "✗ MISSING – add to .env"))
  );
  console.log("\n    Browse: http://localhost:5173\n");
});

// ── Cron scheduler ────────────────────────────────────────────────────────────
let cron;
try { cron = require("node-cron"); } catch { console.warn("[cron] node-cron not installed, scheduler disabled"); }

if (cron) {
  const STORE = path.join(__dirname, "schedules.json");
  const readS  = () => { try { return fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : []; } catch { return []; } };
  const writeS = l  => { try { fs.writeFileSync(STORE, JSON.stringify(l, null, 2)); } catch {} };

  async function invoke(name, bodyObj) {
    const r = await HANDLERS[name].handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bodyObj), queryStringParameters: {} });
    const d = JSON.parse(r.body);
    if (r.statusCode !== 200) throw new Error(`${name}: ${d.error}`);
    return d;
  }

  async function run(s) {
    console.log("\n[cron] ▶ Running:", s.name);
    try {
      const sc = await invoke("scrape",  { windowDays: s.windowDays || 7 });
      const an = await invoke("analyze", { reviews: sc.reviews, windowDays: s.windowDays || 7, fromDate: sc.fromDate, toDate: sc.toDate });
      if (s.recipients?.trim()) {
        await invoke("send-email", { to: s.recipients, subject: an.email?.subject, plain: an.email?.plain, themes: an.themes, actions: an.actions, stats: an.stats, fromDate: sc.fromDate, toDate: sc.toDate, positiveHighlight: an.positiveHighlight, riskAlert: an.riskAlert, headline: an.overview?.headline });
      }
      const l = readS(); const i = l.findIndex(x => x.id === s.id);
      if (i >= 0) { l[i].lastRun = new Date().toISOString(); l[i].lastStatus = "success"; writeS(l); }
      console.log("[cron] ✓ Done:", s.name);
    } catch (e) {
      console.error("[cron] ✗ Failed:", s.name, e.message);
      const l = readS(); const i = l.findIndex(x => x.id === s.id);
      if (i >= 0) { l[i].lastRun = new Date().toISOString(); l[i].lastStatus = "failed"; l[i].lastError = e.message; writeS(l); }
    }
  }

  function weekNum(d) { const s = new Date(d.getFullYear(), 0, 1); return Math.ceil(((d - s) / 86400000 + s.getDay() + 1) / 7); }

  cron.schedule("* * * * *", () => {
    const now = new Date();
    const [h, m, dow, dom] = [now.getHours(), now.getMinutes(), now.getDay(), now.getDate()];
    readS().filter(s => s.active).forEach(s => {
      const [sh, sm] = (s.time || "09:00").split(":").map(Number);
      if (h !== sh || m !== sm) return;
      const due = s.frequency === "daily" ? true : s.frequency === "weekly" ? dow === (s.dayOfWeek ?? 1) : s.frequency === "biweekly" ? dow === (s.dayOfWeek ?? 1) && weekNum(now) % 2 === 0 : s.frequency === "monthly" ? dom === (s.dayOfMonth ?? 1) : false;
      if (due) run(s);
    });
  });
  console.log("    Scheduler: active (checks every minute)\n");
}
