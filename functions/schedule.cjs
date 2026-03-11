const fs   = require("fs");
const path = require("path");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const STORE = path.join(__dirname, "schedules.json");

function read()       { try { return fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : []; } catch { return []; } }
function write(list)  { fs.writeFileSync(STORE, JSON.stringify(list, null, 2)); }

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, schedule, id } = body;
  const list = read();

  if (action === "list") return { statusCode: 200, headers: CORS, body: JSON.stringify({ schedules: list }) };

  if (action === "save") {
    if (!schedule) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "schedule required" }) };
    const s = { ...schedule, id: schedule.id || `sch_${Date.now()}`, createdAt: schedule.createdAt || new Date().toISOString(), active: schedule.active !== false };
    const idx = list.findIndex(x => x.id === s.id);
    if (idx >= 0) list[idx] = s; else list.push(s);
    write(list);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, schedule: s }) };
  }

  if (action === "delete") {
    if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "id required" }) };
    write(list.filter(s => s.id !== id));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
  }

  if (action === "toggle") {
    if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "id required" }) };
    const idx = list.findIndex(s => s.id === id);
    if (idx < 0) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Not found" }) };
    list[idx].active = !list[idx].active;
    write(list);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, schedule: list[idx] }) };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
};
