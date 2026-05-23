# AeroVoice — Next Session: Immediate Build Goals

Read HANDOFF_CONTEXT.md first. This document tells you what to do; that one tells you
everything you need to know before you start.

---

## Where We Are

- Personal calling app: **complete and working.** Do not touch it.
- SaaS: **pre-code.** Specs done, zero SaaS code written. No new repo yet.
- All spec decisions are logged in `PROJECT_SPEC_SAAS.md` — read it in full before
  writing a single line of code.

---

## Session Goal

Repo split + SaaS M0 Foundation (auth, balance ledger, Stripe top-up working end-to-end
in staging). At the end of this session, a user should be able to: register, verify
email, log in, top up $5 via Stripe test mode, and have their balance updated.
No calling yet — that comes in M1.

---

## Task 1 — Repo Split (Do This First, Before Any Code)

**Personal app repo stays:** `trafferazabu/call` at `D:\call`  
Keep it exactly as-is. No changes. The personal app is done.

**Create the SaaS repo:**
1. Create new GitHub repo: `trafferazabu/aerovoice` (public or private — owner's call)
2. Create new local folder: `D:\aerovoice`
3. Seed it from the personal app — copy these files as the starting point:
   - `server.js` (will be heavily extended)
   - `public/index.html`, `public/app.js`, `public/style.css`, `public/telnyx-webrtc.js`
   - `package.json`, `.gitignore`, `.env.example`, `CLAUDE.md`
4. Copy spec and analysis docs across:
   - `PROJECT_SPEC_SAAS.md` → rename to `PROJECT_SPEC.md` in the new repo
   - `MARKET_ANALYSIS.md`
   - `HANDOFF_CONTEXT.md`, `HANDOFF_NEXT.md`
5. Update `CLAUDE.md` in the new repo to reflect the SaaS project name and path
6. Create `.env` in `D:\aerovoice` — same Telnyx keys as personal app for now, plus
   placeholders for Stripe and DB keys (do not commit)
7. Initial commit and push to `trafferazabu/aerovoice`

**Verify:** `D:\call` still runs with `npm start` and makes a call. Confirm before
proceeding.

---

## Task 2 — Resolve the One Blocker Before Writing Code

**Telnyx billing increment** is unconfirmed. The billing settlement code depends on
whether Telnyx bills per-6-second or per-minute. CDR strongly suggests per-6-second
but a support article claims per-minute. Send one email to support@telnyx.com:

> Subject: Billing increment for WebRTC outbound termination calls
> "Can you confirm the current billing increment for outbound WebRTC-to-PSTN calls
> on a Call Control / Credential Connection setup? Our CDR shows sub-minute billing
> consistent with per-6-second, but a help article states 60/60 (per-minute). Which
> is correct for our account type?"

Do not wait for the reply before building — proceed with per-6-second as the working
assumption. Update the billing logic when the reply arrives.

---

## Task 3 — Hosting and Database Decision

Must be decided before writing any backend code. Present the owner with a clear
one-page comparison. Key constraint: **must be a persistent Node.js process** —
no serverless (WebRTC token generation cannot tolerate cold starts).

**Options to evaluate:**
- **Railway** — simpler setup, managed Postgres add-on, $5/month hobby tier
- **Fly.io** — better global edge presence (lower latency for international users),
  managed Postgres, slightly more complex initial setup

**Postgres options:**
- Railway managed Postgres (included if hosting on Railway)
- Neon (serverless Postgres, generous free tier, works with any host)
- Supabase (adds Auth if auth decision swings that way — see below)

Get the owner's decision, then set up staging environment before writing auth code.

---

## Task 4 — Auth Decision

Current lean: **self-managed JWT**. Present the tradeoff once and lock it:

| Option | Pros | Cons |
|---|---|---|
| Self-managed JWT | No dependency, full control, simple at this scale | Must implement token refresh, password reset, email verify yourself |
| Supabase Auth | Managed auth + DB in one service, handles edge cases | Adds vendor dependency, $25/month at scale |
| Auth0 | Battle-tested, generous free tier | Overkill for MVP, external redirect flow feels wrong for a calling app |

Recommendation: self-managed JWT. Build it once, own it forever. Email verification
via Resend (generous free tier, simple API).

Get the owner's sign-off, then proceed.

---

## Task 5 — M0 Foundation Build

Once hosting, DB, and auth decisions are made, build in this order. Each step has a
verification gate — do not proceed to the next step until the gate passes.

### 5a — Database Schema
```
users           id, email, password_hash, verified, created_at
sessions        id, user_id, token_hash, expires_at
balance_ledger  id, user_id, amount_cents, type (topup|call|refund|expiry), ref, created_at
```
Do not create the full schema in one go. Start with these three tables only.  
Verify: connect to DB, run `SELECT * FROM users LIMIT 1` — no error.

### 5b — Auth Endpoints
Build: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/verify/:token`  
Email verification via Resend (or Postmark — owner's call based on pricing/preference).  
Verify: register a test user → receive verification email → click link → login returns JWT.

### 5c — Balance Ledger
Build: `GET /api/balance` (authenticated — returns current balance in cents)  
Seed one test user with a $5 balance entry directly in the DB.  
Verify: GET /api/balance with valid JWT returns `{ balance_cents: 500 }`.

### 5d — Stripe Top-up
Build:
- `POST /api/topup` — creates Stripe PaymentIntent, returns client secret
- `POST /api/webhooks/stripe` — webhook handler: on `payment_intent.succeeded`,
  insert credit row into balance_ledger

Use Stripe test mode throughout. Never use live keys until launch checklist is complete.  
Webhook signature validation is **mandatory** — never trust client-side success callback.  
Verify: complete a $5 top-up with Stripe test card → balance_ledger has new row →
GET /api/balance returns updated amount.

### 5e — Token Gate
Modify the existing `GET /api/token` endpoint:
- Require valid JWT (authenticated user)
- Check balance > 0 before issuing Telnyx WebRTC token
- Return 402 Payment Required if balance is zero

Verify: user with $0 balance cannot get a token. User with $5 can.

---

## Things to Build Later (Not This Session)

These are in the spec. Do not start them until M0 is complete and verified:

- Call start/end balance reservation and settlement
- Free first call (no registration, IP/device gate)
- Auto top-up (Stripe saved card + threshold trigger)
- Rate table UI
- Call history (server-side)
- Fraud controls beyond the token gate
- OFAC and IRSF blocklists
- Front-end redesign for multi-user SaaS

---

## Spec Cross-Reference

Before any architectural decision, check these in order:
1. `PROJECT_SPEC_SAAS.md` — primary build document (constraints, schema, routes, fraud)
2. `MARKET_ANALYSIS.md` — pricing constraints are binding
3. `CLAUDE.md` in the project root — coding rules are binding

If a decision contradicts something in those docs, surface the conflict before proceeding.
Do not resolve it silently.
