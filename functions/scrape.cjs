const gplay = require("google-play-scraper");
const fetch = require("node-fetch");

const PLAY_ID  = "com.tourlandish.chronos";
const IOS_ID   = "1065646194";
const COUNTRY  = "in";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function clamp(n) { return Math.max(1, Math.min(5, parseInt(n, 10) || 3)); }
function isoDay(d) { return new Date(d).toISOString().split("T")[0]; }

function theme(title, text) {
  const s = (title + " " + text).toLowerCase();
  if (/support|refund|service|reply|contact|call|email|agent|help|chat/.test(s)) return "Customer Support";
  if (/charge|fee|price|expensive|cheap|cost|currency|exchange|pay|money|card|bank/.test(s)) return "Pricing & Value";
  if (/guide|tour|experience|audio|walk|view|crowd|skip|line|wait|enjoy|bad/.test(s)) return "Experience Quality";
  return "Booking & Tickets";
}

async function playReviews(days) {
  const cutoff = Date.now() - days * 86400000;
  const out = [];
  for (let page = 0; page < 5; page++) {
    try {
      const batch = await gplay.reviews({ appId: PLAY_ID, lang: "en", country: COUNTRY, sort: gplay.sort.NEWEST, num: 40 });
      const items = Array.isArray(batch) ? batch : (batch.data ?? []);
      let old = false;
      for (const r of items) {
        const ts = r.date ? new Date(r.date).getTime() : Date.now();
        if (ts < cutoff) { old = true; continue; }
        out.push({
          id: `ps_${r.id}`,
          date: isoDay(r.date ?? new Date()),
          platform: "Play Store",
          rating: clamp(r.score),
          title: (r.title || "Review").slice(0, 80),
          text: (r.text || r.content || "").slice(0, 300),
          theme: theme(r.title, r.text || r.content || ""),
          url: `https://play.google.com/store/apps/details?id=${PLAY_ID}&reviewId=${encodeURIComponent(r.id || "")}`,
        });
      }
      if (old || !batch.nextPaginationToken) break;
    } catch (e) { console.error("[scrape] play page", page, e.message); break; }
  }
  return out;
}

async function iosReviews(days) {
  const cutoff = Date.now() - days * 86400000;
  const out = [];
  for (let page = 1; page <= 10; page++) {
    try {
      const res = await fetch(`https://itunes.apple.com/${COUNTRY}/rss/customerreviews/page=${page}/id=${IOS_ID}/sortby=mostrecent/json`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) break;
      const json  = await res.json();
      const items = (json?.feed?.entry ?? []).filter(i => i["im:rating"]);
      if (!items.length) break;
      let allOld = true;
      for (const r of items) {
        const ts = r.updated?.label ? new Date(r.updated.label).getTime() : Date.now();
        if (ts < cutoff) continue;
        allOld = false;
        const title = r.title?.label ?? "Review";
        const text  = r.content?.label ?? "";
        out.push({
          id: `as_${r.id?.label ?? Math.random().toString(36).slice(2)}`,
          date: isoDay(r.updated?.label ?? new Date()),
          platform: "App Store",
          rating: clamp(r["im:rating"]?.label),
          title: title.slice(0, 80),
          text: text.slice(0, 300),
          theme: theme(title, text),
          url: `https://apps.apple.com/in/app/headout/id${IOS_ID}?see-all=reviews`,
        });
      }
      if (allOld) break;
    } catch (e) { console.error("[scrape] ios page", page, e.message); break; }
  }
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  let windowDays = 7;
  try { windowDays = Math.min(35, Math.max(7, parseInt(JSON.parse(event.body || "{}").windowDays, 10) || 7)); } catch {}

  try {
    console.log("[scrape] fetching", windowDays, "days");
    const [ps, ios] = await Promise.allSettled([playReviews(windowDays), iosReviews(windowDays)]);
    const play  = ps.status  === "fulfilled" ? ps.value  : [];
    const apple = ios.status === "fulfilled" ? ios.value : [];
    if (ps.status  === "rejected") console.error("[scrape] play failed:", ps.reason.message);
    if (ios.status === "rejected") console.error("[scrape] ios failed:", ios.reason.message);

    const reviews  = [...play, ...apple].sort((a, b) => b.date.localeCompare(a.date));
    const toDate   = isoDay(new Date());
    const fromDate = isoDay(new Date(Date.now() - windowDays * 86400000));

    console.log(`[scrape] Play=${play.length} iOS=${apple.length} Total=${reviews.length}`);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ reviews, fromDate, toDate, total: reviews.length, sources: { playStore: play.length, appStore: apple.length } }) };
  } catch (e) {
    console.error("[scrape] fatal:", e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
