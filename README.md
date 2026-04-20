# Headout Review Pulse 📊

An automated pipeline that scrapes live Headout app reviews from Google Play Store and Apple App Store, runs AI analysis via Gemini 2.0 Flash, and delivers a one-page weekly health pulse to your product team.

## Live Link: 

![Home Screen](public/screenshots/Screenshot%202026-04-20%20at%205.43.33%E2%80%AFPM.png)

![Review Analysis](public/screenshots/Screenshot%202026-04-20%20at%205.43.56%E2%80%AFPM.png)

![Pipeline Running](public/screenshots/Screenshot%202026-04-20%20at%205.44.05%E2%80%AFPM.png)

![Theme Breakdown](public/screenshots/Screenshot%202026-04-20%20at%205.44.19%E2%80%AFPM.png)

![Report Scheduler](public/screenshots/Screenshot%202026-04-20%20at%205.44.24%E2%80%AFPM.png)

---

## What It Does

1. **Scrapes** live reviews from Play Store + App Store (7 / 14 / 21 / 28 day windows)
2. **Classifies** reviews into 4 product themes using heuristics + Gemini AI
3. **Analyses** sentiment, NPS proxy, and priority scores — all aggregation happens in Node so no user PII reaches the AI
4. **Generates** a structured pulse: theme breakdown, action roadmap, positive highlights, risk alerts
5. **Emails** a rich HTML digest to your team via Resend
6. **Schedules** automated reports — daily, weekly, bi-weekly, or monthly — with cron

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Serverless functions | Netlify Functions (Node.js) |
| AI analysis | Gemini 2.0 Flash (Google AI Studio) |
| Play Store scraping | `google-play-scraper` |
| App Store scraping | iTunes RSS public API |
| Email delivery | Resend API |
| Local scheduler | `node-cron` (dev only) |
| Hosting | Netlify |

---

## Project Structure

```
headout-pulse/
├── functions/               ← Netlify serverless functions
│   ├── scrape.cjs           ← Layer 1: live Play Store + App Store scraper
│   ├── analyze.cjs          ← Layer 2-4: Gemini aggregation + analysis
│   ├── send-email.cjs       ← Email delivery via Resend API
│   ├── schedule.cjs         ← CRUD for saved schedules (stored in schedules.json)
│   └── package.json         ← Function-specific deps (reference only)
├── src/
│   ├── components/
│   │   ├── HomeScreen.jsx   ← Config UI: window slider + recipients
│   │   ├── PipelineScreen.jsx ← Animated 4-layer progress indicator
│   │   ├── ResultsScreen.jsx  ← Masthead, stats, theme cards, actions, email
│   │   └── ScheduleScreen.jsx ← Schedule manager with create/edit/toggle/delete
│   ├── lib/
│   │   ├── api.js           ← All fetch wrappers (scrape, analyze, email, schedule)
│   │   └── theme.js         ← Theme metadata + priority badge styles
│   ├── App.jsx              ← Root: nav tabs, pipeline orchestration
│   ├── main.jsx
│   └── index.css
├── server.cjs               ← Local dev HTTP server (port 9999) + cron scheduler
├── public/favicon.svg
├── index.html
├── vite.config.js           ← Dev proxy: /.netlify/functions/* → localhost:9999
├── netlify.toml
├── package.json             ← All deps (frontend + functions) merged for Netlify
└── .env.example
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A free [Google AI Studio](https://aistudio.google.com) account for the Gemini API key
- A free [Resend](https://resend.com) account for email delivery

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/headout-pulse.git
cd headout-pulse

# 2. Install all dependencies
npm install
cd functions && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your keys
```

### Environment Variables

```env
# Get free key at https://aistudio.google.com
GEMINI_API_KEY=your_gemini_key_here

# Get free key at https://resend.com (100 emails/day, no card needed)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# For local testing — emails only deliver to your Resend account email
# For real recipients, verify a domain at resend.com/domains
SENDER_EMAIL=onboarding@resend.dev
```

### Running Locally

You need **two terminals** running simultaneously:

```bash
# Terminal 1 — functions server + scheduler (port 9999)
npm run dev:functions

# Terminal 2 — React app (port 5173)
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies all `/.netlify/functions/*` requests to `localhost:9999`, so everything works identically to production.

---

## How the Pipeline Works

```
User clicks "Run Pulse"
        │
        ▼
Layer 1 ─ Scrape
  ├── google-play-scraper → up to 200 Play Store reviews
  └── iTunes RSS API      → up to 100 App Store reviews
        │
        ▼
Layer 2 ─ Aggregate (in Node.js — no PII sent to AI)
  └── Count reviews per theme, calculate avg ratings,
      sentiment splits, NPS proxy
        │
        ▼
Layer 3 ─ Gemini Analysis
  └── Receives only aggregated numbers (counts, averages)
      Returns: headline, core pains, risk alert, 3 actions, email copy
        │
        ▼
Layer 4 ─ Deliver
  ├── Display results in UI
  └── Send HTML email via Resend API
```

### The 4 Themes

| Theme | Priority | What it tracks |
|---|---|---|
| 🎫 Booking & Tickets | CRITICAL | Tickets not arriving, entry issues, booking failures |
| 🧑‍💻 Customer Support | HIGH | Refund delays, no agent response, bad service |
| 💰 Pricing & Value | FOCUS | Hidden fees, currency exchange rates, high cost |
| ⭐ Experience Quality | WATCH | Tour guide quality, skip-the-line wait times, crowds |

---

## Scheduling Automated Reports

The **🗓 Schedules** tab lets you create automated reports that run without any manual trigger.

Supported frequencies: **Daily · Weekly · Bi-weekly · Monthly**

Each schedule stores: frequency, day/time, review window (days), and recipient emails. When a schedule is due, `server.cjs` automatically runs the full scrape → analyse → email pipeline.

> **Note:** The scheduler uses `node-cron` and only runs during local development (`npm run dev:functions`). For production scheduling on Netlify, use a free external cron service like [cron-job.org](https://cron-job.org) to POST to your function endpoints on a schedule.

---

## Deploying to Netlify

### One-time setup

1. Push the repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Select your repo. Build settings auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `functions`
4. Go to **Site configuration → Environment variables** and add:
   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`
   - `SENDER_EMAIL`
5. Trigger a deploy

### Function timeouts

The analyze function can take 20–40 seconds. On Netlify's free plan the default timeout is 10 seconds. Increase it:

**Site configuration → Functions → Set timeout to 26s**

### Sending emails to real recipients

By default `onboarding@resend.dev` only delivers to the email address you used to sign up for Resend. To send to any recipient:

1. Go to [resend.com/domains](https://resend.com/domains) and add your domain
2. Add the DNS records Resend provides
3. Update `SENDER_EMAIL` to `noreply@yourdomain.com`

---

## API Reference

All functions are called via `POST /.netlify/functions/<name>`.

### `POST /scrape`
```json
// Request
{ "windowDays": 7 }

// Response
{
  "reviews": [...],
  "fromDate": "2024-01-01",
  "toDate": "2024-01-07",
  "total": 362,
  "sources": { "playStore": 200, "appStore": 162 }
}
```

### `POST /analyze`
```json
// Request
{ "reviews": [...], "windowDays": 7, "fromDate": "...", "toDate": "..." }

// Response
{
  "overview": { "headline": "...", "sentiment": "mixed" },
  "themes": [...],
  "actions": [...],
  "stats": { "total": 362, "avg": "3.2", "pos": 120, "neg": 180, "nps": -16 },
  "email": { "subject": "...", "plain": "..." }
}
```

### `POST /send-email`
```json
// Request
{ "to": "pm@co.com, ceo@co.com", "subject": "...", "plain": "...", "themes": [...], "actions": [...], "stats": {...}, ... }
```

### `POST /schedule`
```json
// List all
{ "action": "list" }

// Save / update
{ "action": "save", "schedule": { "name": "Weekly Pulse", "frequency": "weekly", "dayOfWeek": 1, "time": "09:00", "windowDays": 7, "recipients": "pm@co.com" } }

// Delete
{ "action": "delete", "id": "sch_1234567890" }

// Toggle active/paused
{ "action": "toggle", "id": "sch_1234567890" }
```

---

## Privacy

- No user review text is ever sent to Gemini or any external AI service
- Only aggregated statistics (counts, averages) reach the AI
- No data is stored permanently — reviews exist only in memory during a pipeline run
- Schedules are stored locally in `functions/schedules.json` (gitignored)

---

## License

nidhipawar5