# Project: AeroVoice

**Status:** `In Progress`
**Started:** 2025
**Last Updated:** 2026-05-23
**Repo:** TBD — pending GitHub account decision
**Live URL:** http://localhost:3000/ (local only — SaaS deployment TBD)

---

## Problem Statement

Since Skype shut down, there is no affordable, reliable way to call international landlines and mobile numbers directly from a browser. Existing VoIP solutions are either enterprise-focused, require dedicated native apps, or charge rates comparable to legacy carriers. AeroVoice fills that gap: a browser-based international dialer backed by Telnyx's carrier network, providing low per-minute rates with no app install required. The immediate use case is personal (owner needs overseas calling capability); the longer-term vision is a low-cost SaaS product for others in the same situation.

---

## Goal

Build a browser-based international calling app on Telnyx WebRTC that works locally today, with an architecture clean enough to become a multi-user SaaS product without a full rewrite.

---

## Success Criteria

- [ ] User can dial any E.164 international number and complete a real voice call
- [ ] DTMF keypad transmits tones to the carrier (IVR menus work)
- [ ] Outbound caller ID presents the verified number (not "Unknown")
- [ ] Ghost call / session resurrection does not occur after failed calls
- [ ] Call history and cost-per-call persist across browser sessions
- [ ] No API keys are ever exposed to the client or committed to version control

---

## Scope

### In Scope (MVP — local single-user)
- Outbound calls to any E.164 number via Telnyx WebRTC
- DTMF keypad: local UX tones + carrier signaling (RFC2833)
- Call state machine: idle → ringing → connected → idle
- Call timer and per-call cost display (Telnyx CDR polling)
- Contact book and call history (localStorage)
- Audio device selection (mic/speaker)
- Simulation mode (no credentials required for UI testing)
- Canvas audio visualizer

### In Scope (Post-MVP — SaaS)
- User registration and authentication
- Per-user Telnyx credential management or shared credential pool
- Server-side persistent call history and contacts (database)
- Subscription billing (Stripe) or pay-as-you-go credit top-up
- Inbound call support
- Contact sync across devices
- Admin dashboard

### Out of Scope (This Version)
- Video calling
- SMS / MMS messaging
- Native mobile app (iOS/Android)
- Conference / multi-party calling
- Call recording

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend Language | Vanilla JS (ES6), HTML5, CSS3 | No framework, no build step |
| Backend | Node.js + Express (ESM) | Thin auth proxy; holds API secrets |
| Telephony SDK | Telnyx WebRTC SDK v2.26.4 | Loaded from local file + CDN fallback |
| Telephony API | Telnyx REST API v2 | Token generation, CDR retrieval |
| Local Storage | Browser localStorage | Contacts + call history (single-user) |
| Version Control | Git / GitHub | Account TBD |
| Hosting (future) | TBD — Railway / Fly.io / Render preferred over Vercel | Needs persistent Node.js process for WebRTC signaling |
| Database (future) | TBD — Postgres (Neon or Railway) | |
| Auth (future) | TBD — JWT sessions or NextAuth equivalent | |
| Payments (future) | Stripe | Subscription or credit top-up |

---

## Constraints & Platform Limits

**Telnyx WebRTC**
- SDK pinned at v2.26.4 — test before upgrading; breaking changes in SDK history
- JWT login tokens are short-lived — client must re-fetch from `/api/token` on reconnect
- WebRTC requires HTTPS in production (localhost is exempt)
- DTMF must use `activeCall.dtmf(digit)` for carrier signaling — local Web Audio tones alone do not reach the remote end
- Outbound caller ID requires a verified/purchased Telnyx number on the outbound voice profile
- STIR/SHAKEN attestation level (A/B/C) depends on Telnyx account configuration and impacts CNAM display

**Telnyx Billing / CDR**
- CDR records are compiled seconds to minutes post-call — poll `/api/call-cost` with retries
- Current CDR polling holds HTTP connection open for up to 20s (acceptable single-user; must be async or webhook-driven for SaaS)

**Architecture Constraint**
- Express server must be a persistent process (not serverless) — WebRTC signaling and token generation require it
- ⚠️ Vercel Hobby/serverless is NOT suitable for this backend — use Railway, Fly.io, or Render

**Security Constraints**
- `.env` must never be committed — `.gitignore` enforced
- All user-controlled data (contact names, phone numbers) must be sanitized before `innerHTML` insertion — current code has XSS exposure
- `cors()` must be restricted to known origin before any public deployment
- Rate limiting required on `/api/token` and `/api/call-cost` before multi-user exposure

---

## Architecture Overview

```
Browser (localhost:3000)
  │
  ├─ GET /api/token  ──────────────────► Express Server (server.js)
  │   returns JWT                              │
  │                                      POST Telnyx REST API
  │                                      /v2/telephony_credentials/{id}/token
  │
  ├─ WebRTC signaling (WSS) ───────────► Telnyx Signaling Servers (rtc.telnyx.com)
  │   (Telnyx SDK handles this)                │
  │                                      Routes to PSTN carrier
  │
  ├─ Voice audio (WebRTC RTP) ─────────► Remote phone (PSTN)
  │   (peer-to-peer via Telnyx media relay)
  │
  └─ GET /api/call-cost/:id ──────────► Express Server
      returns cost from CDR               │
                                     GET Telnyx REST API
                                     /v2/detail_records
```

All call audio bypasses the local Express server — it flows directly between the browser and Telnyx's media relay infrastructure. The Express server is only an auth proxy and CDR proxy.

---

## Features

### Must Have — MVP
- [x] Dial outbound to any E.164 international number
- [x] Hang up call
- [x] Mute/unmute microphone
- [x] Call timer
- [x] DTMF keypad with local tone playback
- [ ] DTMF carrier signaling (`activeCall.dtmf()`) — **currently broken**
- [x] Canvas audio visualizer
- [x] Call history (localStorage, max 50 entries)
- [x] Contact book (localStorage)
- [x] Per-call cost display (Telnyx CDR)
- [x] Simulation mode (no credentials required)
- [x] Audio device selection
- [x] Country flag from number prefix

### Should Have — Post-MVP
- [ ] Multi-user auth and registration
- [ ] Server-side persistent history and contacts
- [ ] Inbound call support
- [ ] Subscription billing (Stripe)
- [ ] Contact sync across devices
- [ ] Call recording (with consent disclosure)

### Won't Have — This Version
- Video calling
- SMS/MMS
- Native mobile app
- Conference calling

---

## External API & Service Versioning

| Service | Version / Endpoint | Config Files |
|---|---|---|
| Telnyx REST API | v2 (`api.telnyx.com/v2`) | `server.js`, `.env` |
| Telnyx WebRTC SDK | v2.26.4 | `public/telnyx-webrtc.js`, `public/app.js` (CDN fallback URL) |
| WebRTC Adapter | latest (CDN) | `public/index.html` |

---

## Decisions Log

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2025 | Vanilla JS only — no framework | Simplicity; no build step; fast iteration for a single-user tool | Active |
| 2025 | Express persistent server (not serverless) | Token generation + WebRTC signaling proxy needs a long-lived process; serverless cold-start latency is unacceptable for calls | Active |
| 2025 | Telnyx over Twilio | Lower international per-minute rates; WebRTC SDK more accessible | Active |
| 2025 | localStorage for data | MVP is single-user local — no DB needed until SaaS | Active |
| 2025 | CDR polling server-side | Telnyx billing takes seconds post-call; polling keeps API key server-side | Active |
| 2026-05-23 | Railway/Fly.io preferred over Vercel for SaaS hosting | Vercel serverless cannot run persistent Node.js; WebRTC needs a real server | Active |

---

## Open Questions

- [ ] Which GitHub account to host the repo? (personal Traffer / prntflow / dedicated AeroVoice account?)
- [ ] SaaS hosting: Railway vs. Fly.io vs. Render — evaluate pricing and cold-start behavior
- [ ] Multi-user Telnyx credentials: one credential per user account vs. shared pool with routing?
- [ ] Pricing model: monthly subscription vs. pay-as-you-go credit top-up?
- [ ] Inbound calls: support forwarding from purchased Telnyx number to browser client?

---

## Pre-Launch Security Checklist

- [x] API keys held server-side only — never sent to client
- [ ] `.env` confirmed excluded from git (`.gitignore` created 2026-05-23)
- [ ] Input sanitization before `innerHTML` insertion (contact names, phone numbers)
- [ ] CORS restricted to known origin
- [ ] Rate limiting on `/api/token` and `/api/call-cost`
- [ ] No admin or debug endpoints without auth
- [ ] Telnyx webhook signature validation (required when inbound calls are added)
- [ ] HTTPS enforced in production (required for WebRTC)

---

## Milestone Upgrades

| Milestone | Action |
|---|---|
| Git repo created | Confirm `.env` excluded; add branch protection |
| Ghost call fixed | Audit Telnyx session cleanup on failed/rejected outbound calls |
| DTMF wired | Add `activeCall.dtmf(digit)` call on key press during active call |
| Caller ID fixed | Audit Telnyx outbound voice profile + SIP `From` / `P-Asserted-Identity` headers |
| First paying customer | Migrate to persistent host (Railway/Fly.io); add Stripe; add auth |
| 50+ users | Add server-side DB; per-user credentials; admin dashboard |

---

## Known Issues & Gotchas

- **Ghost call / session resurrection** — Failed outbound calls sometimes trigger inbound ringing or state updates later; Telnyx signaling session may not be fully torn down on failure
- **Caller ID shows "Unknown"** — Verified number set in `.env` but not presented correctly to PSTN; likely outbound voice profile or SIP header misconfiguration in Telnyx Mission Control
- **DTMF carrier signaling missing** — `playDTMF()` plays local Web Audio tones only; `activeCall.dtmf()` is not called; IVR and voicemail PIN entry are broken in production mode
- **XSS in history/contacts render** — `renderHistoryList()` and `renderContactsList()` interpolate raw localStorage data into `innerHTML`; must sanitize before SaaS deployment
- **CDR long-poll** — `/api/call-cost` holds HTTP connection open 20s max; acceptable for single-user, must go async (webhook or background job) for SaaS

---

## Notes

- Simulation mode is a first-class feature — all UI paths must work without real Telnyx credentials
- The project name is **AeroVoice**; the npm package name is `telnyx-local-dialer` — align before public launch
- Telnyx account registered with `call@prntflow.com` (forwards to `prntflow@gmail.com`)
- Verified outbound number: `+81 90-6012-5466` (Japan)
