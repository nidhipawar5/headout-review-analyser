const BASE = "/.netlify/functions";

async function post(route, body) {
  const res  = await fetch(`${BASE}/${route}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const text = await res.text();
  if (!text) throw new Error(`Empty response from /${route} (HTTP ${res.status})`);
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Invalid JSON from /${route}: ${text.slice(0, 120)}`); }
  if (!res.ok) throw new Error(data.error || `/${route} failed (HTTP ${res.status})`);
  return data;
}

export const fetchReviews   = (windowDays)                       => post("scrape",     { windowDays });
export const analyzeReviews = ({ reviews, windowDays, fromDate, toDate }) => post("analyze", { reviews, windowDays, fromDate, toDate });
export const sendEmail      = (payload)                          => post("send-email", payload);
export const listSchedules  = ()                                 => post("schedule",   { action: "list" }).then(d => d.schedules ?? []);
export const saveSchedule   = (schedule)                         => post("schedule",   { action: "save",   schedule }).then(d => d.schedule);
export const deleteSchedule = (id)                               => post("schedule",   { action: "delete", id });
export const toggleSchedule = (id)                               => post("schedule",   { action: "toggle", id }).then(d => d.schedule);
