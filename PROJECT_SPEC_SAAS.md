# Project Spec: AeroVoice SaaS

**Status:** `Discovery`
**Started:** 2026-05-24
**Last Updated:** 2026-05-24
**Repo:** https://github.com/trafferazabu/call
**Live URL:** TBD — Railway or Fly.io deployment
**Market Analysis:** MARKET_ANALYSIS.md
**Personal App Spec:** PROJECT_SPEC_PERSONAL.md

---

## Problem Statement

Skype shut down in May 2025, leaving tens of millions of users without an affordable, reliable way to call international phone numbers from a browser. Existing alternatives either require app installation, demand a monthly subscription that penalises infrequent callers, or charge dramatically inflated rates on Asian routes. There is no modern, browser-native, prepaid-only calling service with transparent pricing that directly fills the Skype gap.

---

## Goal

Build and ship a browser-based international calling SaaS on a prepaid credit model — no subscription, no app download, free first call — priced at roughly 3× Telnyx wholesale cost, with Japan as the hero pricing story.

---

## Success Criteria

- [ ] A new user can place their first call within 2 minutes of landing on the site — no app, no subscription, no credit card for the first call
- [ ] Registered user can top up with $5 minimum and place paid calls immediately
- [ ] Per-minute call cost deducted from user balance in real time; balance visible at all times
- [ ] Auto top-up triggers reliably when balance falls below user-set threshold
- [ ] Call to Japan mobile costs ≤ $0.05/min (vs Yadaphone's $0.38)
- [ ] No call can be placed if balance is zero — pre-call gate is server-enforced, not client-enforced
- [ ] IRSF and abuse controls block fraudulent call patterns before significant cost is incurred
- [ ] Service remains live and stable with no disruption to the personal app during development

---

## Scope

### Must Have — SaaS MVP
- [ ] User registration (email + password) and email verification
- [ ] User login with JWT session
- [ ] Balance ledger — server-side credit balance per user
- [ ] Stripe top-up: $5 minimum, accept major cards
- [ ] Auto top-up: configurable threshold and amount, saved payment method via Stripe
- [ ] Pre-call balance check — server blocks call initiation if balance insufficient
- [ ] Real-time balance decrement during call (post-call settlement acceptable for MVP)
- [ ] Free first call — no registration or credit card required, one per IP/device
- [ ] Published rate table — per-minute rates by country, shown before every call
- [ ] Call history per user (server-side, not localStorage)
- [ ] Basic fraud controls: IRSF prefix blocklist, per-call duration cap (60 min), daily spend cap per account
- [ ] Privacy policy and Terms of Service pages
- [ ] OFAC destination blocklist

### Should Have — Post-MVP V1
- [ ] Contact book (server-side, synced across sessions)
- [ ] 2-year credit expiry with 90-day notice email before expiry
- [ ] Referral / share prompt post-call ("I just called Tokyo for 5¢/min")
- [ ] E911 compliance for US-based users (Telnyx provisioning)
- [ ] Admin dashboard: user list, balance overview, fraud flags, call volume
- [ ] Email receipt after each top-up

### Should Have — V2
- [ ] Inbound phone number add-on ($1–2/month per DID via Telnyx)
- [ ] Mobile PWA (installable from browser, push notifications for incoming calls)
- [ ] Call recording with opt-in consent flow
- [ ] Bulk/business top-up tiers

### Won't Have — This Version
- Native iOS/Android apps (PWA covers this adequately)
- Conference calling
- SMS/MMS
- Video calling
- White-label / reseller programme

---

## Business Model

| Element | Decision |
|---|---|
| **Model** | Prepaid credit — no subscription |
| **Minimum top-up** | $5 |
| **Credit expiry** | 2 years from last activity |
| **Billing interval** | Per minute, partial minutes rounded up |
| **Margin target** | ~3× Telnyx wholesale cost per destination |
| **Free first call** | Yes — no registration, no credit card; one per device/IP |
| **Auto top-up** | User-configurable threshold ($x) and amount ($y); never runs out mid-call |
| **Breakage revenue** | Dormant/abandoned balances contribute to margin; legal in target markets with ToS disclosure |

### Published Rate Table (Launch Rates — Verify Telnyx Cost Before Publishing)

| Destination | Our Rate | Telnyx est. cost | Margin |
|---|---|---|---|
| USA (mobile + landline) | $0.02/min | ~$0.004 | ~5× |
| Canada | $0.02/min | ~$0.004 | ~5× |
| UK (mobile) | $0.03/min | ~$0.008 | ~3.75× |
| Australia (mobile) | $0.05/min | ~$0.017 | ~3× |
| Japan (mobile) | **$0.05/min** | ~$0.017 | ~3× |
| Germany (mobile) | $0.04/min | ~$0.012 | ~3.3× |
| France (mobile) | $0.04/min | ~$0.012 | ~3.3× |
| India (mobile) | $0.03/min | ~$0.008 | ~3.75× |
| Brazil (mobile) | $0.06/min | ~$0.018* | ~3.3× |
| Nigeria (mobile) | $0.15/min | ~$0.05* | ~3× |
| South Africa (mobile) | $0.12/min | ~$0.04* | ~3× |

*Estimated — verify live Telnyx CDR before publishing these destinations.*

**⚠️ Action required before launch:** Place test calls to each destination, pull CDR, confirm actual Telnyx rate, then set published rate at 3× that figure.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS (ES6), HTML5, CSS3 | No framework, no build step — same as personal app |
| Backend | Node.js + Express (ESM) | Extend current server.js — add auth and billing routes |
| Telephony | Telnyx WebRTC SDK v2.26.4 | Pin version; test before upgrading |
| Database | Postgres (Neon or Railway managed) | User accounts, balance ledger, call history, sessions |
| Payments | Stripe | Top-up charges, saved cards for auto top-up |
| Auth | JWT (self-managed) or Supabase Auth | Decision needed — see Open Questions |
| Hosting | Railway or Fly.io | Must be persistent Node.js process — NOT Vercel serverless |
| Email | Resend or Postmark | Email verification, top-up receipts, expiry warnings |
| Version Control | GitHub — trafferazabu/call | Master branch = personal app; SaaS on feature branches until ready |

---

## Architecture

```
User browser
  │
  ├── GET / → Serve frontend (public/)
  │
  ├── POST /api/auth/register    → create user, send verification email
  ├── POST /api/auth/login       → issue JWT
  ├── GET  /api/auth/verify/:tok → confirm email
  │
  ├── GET  /api/token            → [authenticated] generate Telnyx WebRTC JWT
  │                                 check balance > $0 before issuing
  │
  ├── POST /api/topup            → Stripe PaymentIntent creation
  ├── POST /api/webhooks/stripe  → Stripe webhook → credit user balance
  ├── POST /api/topup/auto       → save auto top-up config (Stripe customer + threshold)
  │
  ├── POST /api/call/start       → reserve balance for call; return call session token
  ├── POST /api/call/end         → settle actual cost from CDR; refund over-reservation
  │
  ├── GET  /api/balance          → [authenticated] current balance
  ├── GET  /api/history          → [authenticated] call history (server-side)
  │
  └── POST /api/webhooks/telnyx  → Telnyx call events (for real-time settlement, future)

Voice audio: browser ↔ Telnyx media relay (never through our server)
```

**Database schema (core tables):**
```
users           id, email, password_hash, verified, created_at
sessions        id, user_id, token_hash, expires_at
balance_ledger  id, user_id, amount_cents, type (topup/call/refund/expiry), created_at, ref
calls           id, user_id, destination, duration_sec, cost_cents, telnyx_call_id, created_at
contacts        id, user_id, name, phone, created_at
auto_topup      id, user_id, threshold_cents, amount_cents, stripe_customer_id, active
```

---

## Competitive Positioning

*From MARKET_ANALYSIS.md — treat as binding constraints on feature and pricing decisions.*

| Competitor | Their Japan rate | Our rate | Our advantage |
|---|---|---|---|
| Yadaphone | $0.38/min | $0.05/min | **7.5× cheaper** |
| Viber Out | Unknown | $0.05/min | Browser-native; no app |
| BubblyPhone | Unknown | $0.05/min | Japan as explicit hero story |

**Primary positioning:** "Call Japan for 5¢/minute — open your browser, no app, no subscription."
**Secondary positioning:** Post-Skype replacement for anyone making occasional international calls.

---

## Constraints & Platform Limits

**Telnyx**
- WebRTC requires HTTPS in production (localhost is exempt)
- One WebRTC credential connection per user session — current architecture already handles this correctly
- Telnyx bills per 6-second increment on most routes — we round up to nearest minute for simplicity
- Telnyx E911 provisioning required for US users before US marketing

**Hosting (Railway / Fly.io)**
- Must be a persistent Node.js process — no serverless cold-start latency on token generation
- Postgres available as a managed add-on on both platforms
- Estimated cost at launch scale: $5–20/month

**Stripe**
- Transaction fee ~2.9% + $0.30 per top-up
- On $5 top-up: $0.45 fee (9%) — acceptable at launch; pricing model absorbs this
- Saved card for auto top-up requires Stripe Customer + PaymentMethod — standard pattern
- Require webhooks for all payment confirmation — never trust client-side success callback

**Fraud**
- IRSF (International Revenue Share Fraud) is the highest-cost attack vector
- Pre-call balance gate must be server-enforced — client cannot be trusted
- Hard limits: 60-minute max call duration, $20/day max spend per new account (raise after history established)
- Block known IRSF destination prefix ranges at call initiation (maintain blocklist server-side)
- Stripe Radar + 3DS for top-ups above $20

---

## Fraud Controls Architecture

```
Call initiation request
    │
    ├── [Check 1] User authenticated? → No → Reject
    ├── [Check 2] Balance ≥ 1 minute at destination rate? → No → Show top-up prompt
    ├── [Check 3] Destination in IRSF blocklist? → Yes → Reject with "destination unavailable"
    ├── [Check 4] User under daily spend cap? → No → Reject with "daily limit reached"
    ├── [Check 5] User under simultaneous call limit (1)? → No → Reject
    │
    └── [Pass] Reserve balance, issue call token, proceed
```

---

## Regulatory & Compliance

| Item | Status | Action |
|---|---|---|
| E911 (US users, interconnected VoIP) | Required before US marketing | Implement via Telnyx E911 API |
| GDPR (EU users) | Required | Privacy policy, data retention controls, right to erasure |
| OFAC sanctions list | Required at launch | Destination blocklist server-side |
| Call metadata retention | Required | Keep for 12 months; provide to valid legal requests |
| Credit expiry disclosure | Required | Prominently in ToS; 90-day email notice |
| Anonymous calling | Prohibited | ToS must state metadata retained; no promise of anonymity |
| LLC formation | Required before first paying customer | Form before taking any customer money |

---

## Milestones

| Milestone | Definition |
|---|---|
| **M0 — Foundation** | Auth system, balance ledger, Stripe top-up working end-to-end in staging |
| **M1 — Private Beta** | Owner + 5 invited users can register, top up, and make real calls |
| **M2 — Public Launch** | Free first call live, rate table published, Product Hunt / Reddit launch |
| **M3 — Auto Top-up** | Stripe saved card + threshold trigger working |
| **M4 — Compliance** | ToS, privacy policy, OFAC blocklist, E911 provisioned |
| **M5 — Scale** | Admin dashboard, fraud monitoring, email receipts |

---

## Decisions Log

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2026-05-24 | Prepaid credits, no subscription | Market fit for infrequent callers; eliminates churn psychology | Active |
| 2026-05-24 | $5 minimum top-up | Market standard (Yadaphone, BubblyPhone); covers Stripe transaction fees | Active |
| 2026-05-24 | Per-minute billing, round up | Universal market standard; user-familiar; no deviating from industry norm | Active |
| 2026-05-24 | Free first call, no CC | Proven acquisition tactic by top competitors; removes all trial friction | Active |
| 2026-05-24 | Japan at $0.05/min as hero price | 7.5× cheaper than Yadaphone on that route; defensible via Telnyx rates | Active |
| 2026-05-24 | Railway/Fly.io over Vercel | WebRTC needs persistent Node.js process; Vercel serverless incompatible | Active |
| 2026-05-24 | Postgres for user data | Standard relational fit for ledger, call history, user records | Active |
| 2026-05-24 | Personal app protected during SaaS build | Separate spec; no changes that disrupt personal calling capability | Active |

---

## Open Questions

- [ ] **Auth:** Self-managed JWT vs. Supabase Auth vs. Auth0? — Self-managed is simpler and cheaper at this scale; Supabase adds managed DB + auth in one service. Decide before M0.
- [ ] **Hosting:** Railway vs. Fly.io? — Railway is simpler to get started; Fly.io has better global edge presence (lower latency for international calls). Needs a cost comparison.
- [ ] **Telnyx rates:** Verify actual per-minute cost for all destinations in the rate table before publishing. Current data is from 2 live test calls only.
- [ ] **E911:** Does serving Japanese-based users calling US numbers trigger US E911 requirement? Needs legal confirmation.
- [ ] **Credit expiry legality:** 2-year expiry — confirm this is legal in US, EU, Japan.
- [ ] **Free first call implementation:** IP-based or device fingerprint? IP is easily circumvented; device fingerprint is more robust but raises privacy questions.
- [ ] **BubblyPhone Japan rate:** Not found in research. If they match our $0.05, Japan hero story weakens. Verify before betting marketing on it.
- [ ] **LLC jurisdiction:** Where to form? Delaware (US standard), Japan, or elsewhere? Affects banking, taxes, and liability.

---

## Pre-Launch Security Checklist

- [ ] All DB queries scoped by `user_id` — no cross-user data leakage
- [ ] Pre-call balance gate enforced server-side — client cannot bypass
- [ ] Stripe webhook signature validation on every webhook event
- [ ] IRSF blocklist loaded and active
- [ ] OFAC destination blocklist active
- [ ] Rate limiting on all `/api/auth/*` endpoints (prevent brute force)
- [ ] Rate limiting on `/api/token` (prevent call farming)
- [ ] `.env` excluded from git — API keys never in source control
- [ ] HTTPS enforced in production (required for WebRTC)
- [ ] CORS restricted to production domain only
- [ ] 3DS required for Stripe top-ups above $20
- [ ] No raw user data in `innerHTML` (sanitize() function in place — done 2026-05-24)

---

## Known Issues Inherited from Personal App

| Issue | SaaS Impact | Plan |
|---|---|---|
| Caller ID "Unknown" on Japan domestic calls | Medium — affects Japanese users calling Japan | Purchase Telnyx Japanese DID for proper domestic CLI |
| CDR poll holds HTTP connection 20s | High — blocks Express worker per call end | Replace with Telnyx webhook → async DB write |
| No inbound call UI | Low for MVP | Inbound is post-MVP add-on feature |

---

## Notes

- The SaaS brand name is **AeroVoice**. The npm package is `telnyx-local-dialer` — align before public launch.
- Telnyx account: `call@prntflow.com` (forwards to `prntflow@gmail.com`)
- Market window: Skype died May 2025. We are in that migration window now. Speed to M2 (public launch) matters.
- Japan is not just a route — it is the founding user's home country and the story that differentiates us from every browser-native competitor currently in the market.
