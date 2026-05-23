# Project Spec: AeroVoice Personal

**Status:** `Active`
**Started:** 2025
**Last Updated:** 2026-05-24
**Repo:** https://github.com/trafferazabu/call
**Live URL:** http://localhost:3000/

---

## Purpose of This Spec

This is not a build spec — it is a **continuity contract**. The personal app is working. The goal is to keep it working exactly as-is while the SaaS version is developed on the same codebase. Any change that risks breaking personal calling capability must be reviewed against this document first.

---

## Problem Statement

Since Skype shut down in May 2025, there is no reliable, affordable way to call overseas phone numbers from a laptop browser without installing an app or committing to a subscription. This personal tool solves that for one user: the owner, based in Japan, who regularly calls contacts in Australia, Japan, and occasionally other countries.

---

## Goal

Always have a working, locally-runnable browser dialer that can place cheap international calls via Telnyx WebRTC, accessible at `http://localhost:3000/`.

---

## Success Criteria

- [x] Can dial any E.164 international number and complete a real voice call
- [x] Audio quality is clear — confirmed on Australia and Japan routes
- [x] Call cost is shown post-call from Telnyx CDR
- [x] Contact book and call history persist across sessions
- [x] App runs with `npm start` from `D:\call` — no other setup required
- [x] Simulation mode works with no credentials (for testing UI without calls)

---

## Scope

### In Scope — This App, Forever
- Outbound calls to any E.164 number via Telnyx WebRTC
- DTMF keypad (local tone + carrier signaling — fixed 2026-05-24)
- Call timer, mute, speaker selection
- Canvas audio visualizer
- Contact book (localStorage)
- Call history with cost (localStorage + Telnyx CDR)
- Simulation mode

### Out of Scope — Personal App
- User authentication (single user, no login needed)
- Payment integration (owner pays Telnyx directly)
- Inbound call handling UI (low priority; not needed for personal use)
- Any multi-user feature

---

## Tech Stack

| Layer | Choice | Locked? |
|---|---|---|
| Frontend | Vanilla JS (ES6), HTML5, CSS3 | Yes — no framework, no build step |
| Backend | Node.js + Express (ESM) | Yes |
| Telephony | Telnyx WebRTC SDK v2.26.4 | Yes — do not upgrade without testing |
| Storage | Browser localStorage | Yes — single user, no DB needed |
| Runtime | `npm start` → `node server.js` → localhost:3000 | Yes |

**Stack is frozen for the personal app.** Changes to the stack require an explicit decision and must not be introduced while working on SaaS features.

---

## Credentials & Configuration

All credentials live in `D:\call\.env` — excluded from git. See `.env.example` for required keys.

| Variable | Purpose |
|---|---|
| `TELNYX_API_KEY` | Telnyx REST API v2 key for token generation and CDR |
| `TELNYX_CREDENTIAL_ID` | WebRTC credential connection ID |
| `TELNYX_VERIFIED_NUMBER` | Outbound caller ID (`+819060125466`) |
| `PORT` | Server port (default 3000) |

Telnyx account registered with `call@prntflow.com`.

---

## Architecture

```
npm start → node server.js (localhost:3000)
    │
    ├── GET /api/token → Telnyx REST API → WebRTC JWT
    ├── GET /api/call-cost/:id → Telnyx CDR polling
    └── static files → public/
                           ├── index.html
                           ├── style.css
                           ├── app.js
                           └── telnyx-webrtc.js
```

All voice audio flows directly browser ↔ Telnyx media relay (not through local server).

---

## Known Issues (Tracked — Not Blocking Personal Use)

| Issue | Status | Notes |
|---|---|---|
| Caller ID shows "Unknown" on Japanese domestic calls | Accepted | Japanese carrier CLI validation strips foreign-originated VoIP. Not fixable without domestic DID. |
| Caller ID shows correct number to Australia | Working | ✓ Confirmed in testing |
| No inbound call UI | Accepted | Self-calls route inbound (expected); no Accept button is a quirk, not a blocker |
| CDR poll holds HTTP open 20s | Accepted | Fine for single-user; flagged for SaaS |

---

## Maintenance Rules

1. **Do not break the personal app while building SaaS.** All SaaS additions must be behind feature flags, new routes, or a separate deployment — never changes that alter existing calling behaviour.
2. **Do not upgrade the Telnyx SDK** (`telnyx-webrtc.js`) without first testing a complete call cycle in simulation mode and live mode.
3. **Do not rename localStorage keys** (`aerovoice_history`, `aerovoice_contacts`) without a migration script.
4. **`.env` must never be committed.** Rotate API keys immediately if this ever happens.
5. **Run `npm start` and make a test call** after any backend change before committing.

---

## Decisions Log

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2025 | Vanilla JS, no framework | Simplicity, no build step | Active |
| 2025 | localStorage for data | Single user, no DB needed | Active |
| 2025 | Express persistent server | WebRTC token generation needs a live process | Active |
| 2026-05-24 | Keep personal spec separate from SaaS spec | Personal continuity must not be disrupted by SaaS development | Active |
| 2026-05-24 | Fixed: hangup state now cleans up session | Ghost call prevention | Active |
| 2026-05-24 | Fixed: callerNumber passed to newCall() | Caller ID improvement | Active |
| 2026-05-24 | Fixed: activeCall.dtmf() wired to keypad | DTMF carrier signaling now works | Active |

---

## Notes

- The personal app and the SaaS app share the same git repo (`D:\call`). Personal app = current `master` branch behaviour. SaaS additions will be developed and isolated until ready.
- Telnyx verified number `+819060125466` (Japan mobile) — used as outbound caller ID.
- Telnyx costs confirmed in testing: ~$0.017/min to Australia mobile, ~$0.017/min to Japan mobile.
