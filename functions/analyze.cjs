const fetch = require("node-fetch");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function fmt(iso) {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso || ""; }
}

// All counting happens in Node — zero user text ever reaches Gemini
function aggregate(reviews) {
  const THEMES = [
    { name: "Booking & Tickets",  priority: "CRITICAL" },
    { name: "Customer Support",   priority: "HIGH"     },
    { name: "Pricing & Value",    priority: "FOCUS"    },
    { name: "Experience Quality", priority: "WATCH"    },
  ];
  const total = reviews.length || 1;
  const pos   = reviews.filter(r => r.rating >= 4).length;
  const neg   = reviews.filter(r => r.rating <= 2).length;
  const avg   = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const nps   = Math.round((pos - neg) / total * 100);

  const themes = THEMES.map(({ name, priority }) => {
    const b  = reviews.filter(r => r.theme === name);
    const bn = b.filter(r => r.rating <= 2).length;
    const bp = b.filter(r => r.rating >= 4).length;
    const bt = b.length || 1;
    // top 3 lowest-rated reviews to surface as proof links (no text sent to AI)
    const sampleReviews = [...b]
      .sort((a, x) => a.rating - x.rating || b.date - a.date)
      .slice(0, 3)
      .map(r => ({ id: r.id, platform: r.platform, rating: r.rating, title: r.title, text: r.text, date: r.date, url: r.url || null }));
    return {
      name, priority,
      reviewCount:   b.length,
      negativeCount: bn,
      avgRating:     b.length ? parseFloat((b.reduce((s, r) => s + r.rating, 0) / b.length).toFixed(1)) : 3.0,
      sentiment_split: {
        positive: Math.round(bp / bt * 100),
        negative: Math.round(bn / bt * 100),
        neutral:  100 - Math.round(bp / bt * 100) - Math.round(bn / bt * 100),
      },
      topIssues: [],
      sampleReviews,
    };
  });
  themes.sort((a, b) => b.negativeCount - a.negativeCount);
  return { themes, stats: { total, avg, pos, neg, nps } };
}

async function gemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set in .env");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data   = await res.json();
  const text   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const reason = data.candidates?.[0]?.finishReason;
  console.log(`[analyze] gemini finishReason=${reason} len=${text.length}`);
  if (!text) throw new Error(`Gemini empty response (finishReason=${reason})`);
  return text;
}

// Pull the first {...} block out of any text
function parseJSON(raw) {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) throw new Error("No JSON object in response");
  return JSON.parse(raw.slice(s, e + 1));
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const { reviews, windowDays, fromDate, toDate } = body;
  if (!Array.isArray(reviews) || reviews.length === 0)
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "No reviews provided" }) };

  const { themes, stats } = aggregate(reviews);
  console.log(`[analyze] ${reviews.length} reviews aggregated`);

  // Build a short numbered-stats prompt — NO user text, NO JSON template inside
  const npsStr = stats.nps >= 0 ? `+${stats.nps}` : String(stats.nps);
  const rows   = themes.map(t => `  ${t.name}: ${t.reviewCount} reviews, ${t.negativeCount} negative, avg ${t.avgRating}/5`).join("\n");
  const period = `${fmt(fromDate)} to ${fmt(toDate)}`;

  const prompt = `You are a senior product analyst at Headout, a travel and experiences booking platform.

Here are aggregated user review statistics for ${period}:

${rows}

Overall: ${stats.total} total reviews, average ${stats.avg} stars, ${stats.pos} positive (4-5★), ${stats.neg} negative (1-2★), NPS proxy ${npsStr}.

Using your knowledge of Indian fintech apps, write a JSON object. Rules:
- Return ONLY the JSON object, nothing before or after it.
- Do NOT include any markdown, backticks, or code fences.
- Every string value must be under 15 words.
- Do NOT include quotes-within-strings that would break JSON.

The JSON must have exactly these keys:
headline: one sentence summarising overall user sentiment this period
sentiment: exactly one of: positive, mixed, negative
pain_booking: main pain point for Booking and Tickets theme
pain_support: main pain point for Customer Support theme
pain_pricing: main pain point for Pricing and Value theme
pain_experience: main pain point for Experience Quality theme
positive_highlight: one thing users genuinely appreciate
risk_alert: biggest product risk right now
action1_title: 3-4 word title for top priority action
action1_owner: team responsible, one of: Eng, Product, Design, Support
action1_timeline: one of: This week, 2 weeks, 1 month
action1_description: concrete action in under 15 words
action1_metric: how to measure success in under 10 words
action2_title: 3-4 word title for second action
action2_owner: team responsible
action2_timeline: one of: This week, 2 weeks, 1 month
action2_description: concrete action in under 15 words
action2_metric: how to measure success in under 10 words
action3_title: 3-4 word title for third action
action3_owner: team responsible
action3_timeline: one of: This week, 2 weeks, 1 month
action3_description: concrete action in under 15 words
action3_metric: how to measure success in under 10 words
email_subject: email subject line for this pulse report
email_body: plain-text email body starting with Hi Team and ending with Pulse Bot pipe Automated Weekly Digest, maximum 120 words`;

  // Fallback values used when Gemini fails or JSON can't be parsed
  const FB = {
    headline:          "Mixed user sentiment across all themes this period",
    sentiment:         "mixed",
    pain_booking:      "Tickets not arriving on time and venue entry issues",
    pain_support:      "Long wait times for refunds and support replies",
    pain_pricing:      "Hidden conversion fees on international bookings",
    pain_experience:   "Poorly managed queues at popular attractions",
    positive_highlight:"Users appreciate the ease of finding skip-the-line tours",
    risk_alert:        "Customer support delays causing user churn and negative reviews",
    action1_title:     "Fix booking delays",  action1_owner: "Eng",     action1_timeline: "This week", action1_description: "Investigate and patch ticket delivery delays", action1_metric: "Booking failure rate below 1%",
    action2_title:     "Improve refund flow",   action2_owner: "Product", action2_timeline: "2 weeks",   action2_description: "Automate refunds for verified cancellations",   action2_metric: "Support backlog drops 15%",
    action3_title:     "Improve fee clarity",   action3_owner: "Design",  action3_timeline: "1 month",   action3_description: "Show itemised fee breakdown before payment",        action3_metric: "Pricing complaints down 20%",
    email_subject:     `Headout Review Pulse | ${period}`,
    email_body:        `Hi Team,\n\nHere is the weekly Headout review pulse for ${period}.\n\nTotal: ${stats.total} reviews | Avg: ${stats.avg}★ | NPS: ${npsStr}\n\nTop Issues:\n- Booking & Tickets: Ticket delivery delays\n- Customer Support: Refund delays\n- Pricing & Value: Hidden fees\n\nPulse Bot | Automated Weekly Digest`,
  };

  let g = FB;
  try {
    const raw = await gemini(prompt);
    g = { ...FB, ...parseJSON(raw) };
    console.log("[analyze] JSON parsed OK");
  } catch (e) {
    console.error("[analyze] Gemini/parse error, using fallback:", e.message);
  }

  const corePains = {
    "Booking & Tickets":  g.pain_booking,
    "Customer Support":   g.pain_support,
    "Pricing & Value":    g.pain_pricing,
    "Experience Quality": g.pain_experience,
  };

  const finalThemes = themes.map(t => ({ ...t, corePain: corePains[t.name] || "See review data", topQuote: "" }));

  const actions = [
    { title: g.action1_title, theme: themes[0]?.name || "Booking & Tickets", priority: themes[0]?.priority || "CRITICAL", owner: g.action1_owner, timeline: g.action1_timeline, description: g.action1_description, successMetric: g.action1_metric },
    { title: g.action2_title, theme: themes[1]?.name || "Customer Support",  priority: themes[1]?.priority || "HIGH",     owner: g.action2_owner, timeline: g.action2_timeline, description: g.action2_description, successMetric: g.action2_metric },
    { title: g.action3_title, theme: themes[2]?.name || "Pricing & Value",   priority: themes[2]?.priority || "FOCUS",    owner: g.action3_owner, timeline: g.action3_timeline, description: g.action3_description, successMetric: g.action3_metric },
  ];

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      overview:          { headline: g.headline, sentiment: g.sentiment },
      themes:            finalThemes,
      positiveHighlight: g.positive_highlight,
      riskAlert:         g.risk_alert,
      actions,
      stats,
      email:             { subject: g.email_subject, plain: g.email_body },
    }),
  };
};
