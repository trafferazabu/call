# AeroVoice — Full Project Context for New Claude Sessions

This document is your briefing. Read it before doing anything else. It covers both the
personal calling app and the SaaS project, the human you are working with, every
significant decision made to date, and where to find the authoritative details.

---

## Your Human Collaborator

**GitHub:** trafferazabu  
**Email:** trafferazabu@gmail.com  
**Telnyx account:** call@prntflow.com (forwards to prntflow@gmail.com)  
**Machine:** Windows, PowerShell, paths use `D:\` — never assume Unix paths  
**Location / market focus:** Japan — his son is in Tokyo, he calls Japan regularly; Japan is
the hero pricing story for the SaaS  

**How he works:**  
- Deliberate and businesslike. Asks sharp questions. Says "convince me" before accepting
  recommendations and pushes back when he has a better idea — he is usually right when he
  does.  
- Not a full-stack developer. He handles product decisions, testing, and business logic;
  Claude handles architecture and code.  
- Works in focused sessions. Says "hold up" or "stop" mid-message when he has more to
  add — wait for the full thought before responding.  
- Values transparency over guessing. When data is available ("we have API access, can we
  pull the actual rates?"), he will always prefer the real number over an estimate.  
- Pragmatic about scope. Will say "today this is as far as we can go" and stop cleanly.  
- Reads specs carefully and treats them as binding. Keep them current.

---

## The Two Projects

### Project 1 — Personal Calling App
**Repo:** https://github.com/trafferazabu/call  
**Local path:** `D:\call`  
**Status:** Working. Do not break it.  
**Spec:** `D:\call\PROJECT_SPEC_PERSONAL.md` — read this before touching anything  
**Purpose:** Single-user browser dialer for the owner's personal international calls.
Runs at `http://localhost:3000/` via `npm start`. No auth, no payments, no DB —
everything is localStorage. This is a continuity contract, not a build target.

**Stack (frozen — do not change):**
- Frontend: Vanilla JS ES6, HTML5, CSS3 — no framework, no build step
- Backend: Node.js + Express ESM (`server.js`)
- Telephony: Telnyx WebRTC SDK v2.26.4 (pinned — do not upgrade)
- Storage: browser localStorage
- Credentials: `D:\call\.env` (gitignored — never commit)

**Current state — all bugs fixed as of 2026-05-24:**
- Ghost call / hangup state: fixed — `activeCall = null` in hangup handler
- Caller ID: fixed — `callerNumber` now passed to `newCall()`
- DTMF dual-layer: fixed — both `playDTMF()` (UX tone) and `activeCall.dtmf()` (carrier)
- XSS: fixed — `sanitize()` helper; no raw localStorage data in innerHTML
- quickDial guard: fixed — event delegation; guard for non-idle call state

**Known accepted quirks:**
- Japan domestic calls show caller ID as "Unknown" — Japanese carrier strips foreign VoIP
  CLI. Fix requires a Telnyx Japan national DID (+8150). This is a post-MVP SaaS item,
  not a personal app issue to solve now.
- CDR polling holds HTTP connection open 20s — acceptable for single user.

### Project 2 — AeroVoice SaaS
**Repo:** To be created — `trafferazabu/aerovoice` (new repo, not yet initialised)  
**Local path:** TBD — will be a new folder, e.g. `D:\aerovoice`  
**Status:** Pre-code. Specs and market analysis complete. No SaaS code written yet.  
**Spec:** `D:\call\PROJECT_SPEC_SAAS.md` — the primary build document  
**Market analysis:** `D:\call\MARKET_ANALYSIS.md`  

---

## Key Decisions Already Made (Do Not Re-litigate Without Strong Reason)

| Decision | Detail |
|---|---|
| Business model | Prepaid credits — no subscription |
| Minimum top-up | $5 |
| Billing interval | Per 20 seconds, rounded up. Displayed as $/min equivalent with "billed per 20 seconds" noted. Genuinely better for customers than per-minute; always profitable vs Telnyx sub-minute billing. |
| Per-minute decision | ❌ Reverted. Per-20-second adopted instead. |
| Japan hero price | $0.05/min — 7.5× cheaper than Yadaphone ($0.38). CDR confirmed Telnyx cost = $0.017/min. |
| Free first call | No registration, no credit card, one per device/IP |
| Auto top-up | User-configurable threshold + amount, saved Stripe card |
| Credit expiry | 2 years from last activity |
| Hosting | Railway or Fly.io — must be persistent Node.js process; Vercel serverless is incompatible with WebRTC token generation |
| Database | Postgres (Neon or Railway managed) |
| Auth | JWT self-managed — simpler and cheaper at this scale vs Supabase/Auth0 (decision leaning this way but not locked) |
| Japan national DID | ~$4.50/month via Telnyx post-MVP. Local Japanese city numbers permanently unavailable from Telnyx since March 2023 (Japanese MIC regulation). |

---

## Telnyx Rate Findings (CDR-Confirmed)

| Destination | Our confirmed Telnyx cost | Source |
|---|---|---|
| Japan mobile | $0.0172/min | CDR: $0.0220 / 1.28 min |
| Australia mobile | $0.0167/min | CDR: $0.0405 / 2.42 min |
| All other destinations | Unverified estimates | Must test-call + CDR before publishing |

**Telnyx billing increment:** CDR empirically confirms sub-minute billing (per-6-second
or per-second). A Telnyx support article claims "60/60" (per-minute) billing — this
contradicts the CDR numbers and is treated as unreliable until Telnyx support confirms
in writing. Email support@telnyx.com before writing billing settlement code.

**Telnyx API for rates:** The REST API `/v2/pricing` returns only inbound DID rates —
not outbound termination rates. There is no public API for outbound rates. CDR from real
test calls is the only authoritative source.

**Volume discounts (Growth Plan):** 8% automatic discount on voice at $1,000+/month
spend. Additional tiers exist but are negotiated, not published.

---

## E911 Status
- Serving Japanese users calling US numbers: **does NOT trigger US E911**
- MVP (outbound only, no US DIDs): block 911/112/999 at server pre-call gate; display
  "not an emergency service" notice
- US DIDs (V2 add-on): each DID must be E911-registered via Telnyx API

---

## Important Technical Constraints

- WebRTC requires HTTPS in production (localhost exempt)
- Telnyx "local calling": when CLI and CLD are in the same country, Telnyx routes
  through in-country Tier-1 carrier. Improves completion rates and caller ID display.
  Does NOT change the per-minute rate charged to us.
- Telnyx SDK: pinned at v2.26.4. Do not upgrade without a complete call cycle test.
- Server must be ESM (`"type": "module"` in package.json). Use `import/export`, never
  `require()`.
- No build step on frontend. Raw `.js`, `.html`, `.css` files served directly.
  No TypeScript, no bundlers, no npm imports in `public/`.

---

## File Map

```
D:\call\
├── .env                      — live credentials (gitignored, never commit)
├── .env.example              — safe placeholder for new setups
├── .gitignore
├── CLAUDE.md                 — project coding guidelines (binding)
├── MARKET_ANALYSIS.md        — completed market analysis
├── PROJECT_SPEC.md           — original spec (superseded; keep for reference)
├── PROJECT_SPEC_PERSONAL.md  — personal app continuity contract
├── PROJECT_SPEC_SAAS.md      — SaaS build spec (primary document)
├── HANDOFF_CONTEXT.md        — this file
├── HANDOFF_NEXT.md           — next session task list
├── server.js                 — Express backend (personal app)
├── package.json
├── public/
│   ├── index.html
│   ├── app.js                — all 5 bug fixes applied here
│   ├── style.css
│   └── telnyx-webrtc.js      — Telnyx SDK v2.26.4 (pinned)
├── zDocs/notes.md            — owner's scratch notes
├── task.md                   — early task notes
└── walkthrough.md            — early walkthrough notes

D:\Claude\
├── CLAUDE.md                 — global coding guidelines (symlinked from C:\Users\Traffer\.claude\CLAUDE.md)
└── templates\
    ├── MARKET_ANALYSIS.md    — reusable market analysis template
    └── PROJECT_SPEC.md       — reusable project spec template
```

---

## Repo Structure Going Forward

| Repo | Purpose | Status |
|---|---|---|
| `trafferazabu/call` | Personal calling app — frozen, working | Exists |
| `trafferazabu/aerovoice` | AeroVoice SaaS — build target | To be created |
| `trafferazabu/claude-config` | Global Claude guidelines and templates | Exists at `D:\Claude` |

The SaaS repo does not exist yet. Creating it is the first task of the next build session.

---

## What Not to Assume

- Do not assume the personal app (`D:\call`) is the SaaS build target. It is not.
  The SaaS gets its own repo.
- Do not upgrade the Telnyx SDK without explicit instruction and a full call test.
- Do not introduce a framework, build step, or TypeScript to the frontend.
- Do not commit `.env`. Rotate the key immediately if it ever lands in a commit.
- Do not add `Co-Authored-By` trailers to commits in this repo — the Vercel gotcha in
  CLAUDE.md applies (different GitHub accounts).
- Do not change localStorage keys (`aerovoice_history`, `aerovoice_contacts`) without
  a migration script.
- Do not place any real Telnyx API key, Stripe key, or other secret in any file under
  `public/` — ever.
