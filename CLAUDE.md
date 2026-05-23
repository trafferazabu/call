# Coding Guidelines

These guidelines apply to coding tasks only. If the current task is not related to writing, reviewing, or refactoring code, ignore this file entirely.

---

## Proportional Rigor

Assess complexity first. Scale the guidelines accordingly.

**Trivial** — genuine one-liner, fully isolated, no side effects, intent unambiguous. Proceed directly. No plan needed.

**Moderate** — touches more than one location, or has a non-obvious dependency. State assumptions briefly, then proceed.

**Non-trivial** — multiple components, shared state, architectural impact, or unclear requirements. Apply all guidelines in full.

When in doubt, treat as one level higher. Trivial tasks that bite are usually moderate in disguise.

---

## Project Context

At the start of any coding task, run both checks:

**1. Project CLAUDE.md**
- No `CLAUDE.md` in project root → create one with `## Project-Specific Guidelines`. Infer from codebase patterns (language, framework, testing, error handling, folder structure). Note what was inferred so it can be corrected.
- `CLAUDE.md` exists but no `## Project-Specific Guidelines` section → append one using the same inference approach.
- Section exists → read it. Treat as binding constraints alongside these global guidelines.
- Update the section when new patterns emerge during the build.

**2. Project Spec**
- New project, no `PROJECT_SPEC.md` → generate one from `D:\Claude\templates\PROJECT_SPEC.md` before writing any code. Do not proceed until Goal, Scope, and Tech Stack are confirmed.
- `PROJECT_SPEC.md` exists → read it fully before proceeding.
- During the build: log every significant technical decision to the Decisions Log. Mark reversals ❌ Reverted with the reason — do not delete them. Check Constraints & Platform Limits before architectural choices.

The workflow is always: **Conversation → Spec → Code.**

---

## Think Before Coding

Before implementing anything:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach satisfies the requirement, propose it before implementing the complex version.
- If something is unclear, stop. Name what's confusing. Ask.

---

## Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No configurability that wasn't requested.
- No error handling for impossible scenarios.
- If it could be materially shorter without losing correctness, rewrite it.

Test: could a senior engineer reasonably call this overcomplicated? If yes, simplify.

---

## Surgical Changes

When editing existing code:
- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Test: every changed line should trace directly to the user's request.

---

## Goal-Driven Execution

Transform vague tasks into verifiable goals before starting:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan first:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Agentic Workflow & Model Selection

In agentic sessions, I (Sonnet) am always the orchestrator. Sub-agents are assigned model tiers based on task complexity. Default to the cheapest capable model for every subtask — model choice is a cost decision as much as a quality decision.

**Haiku — execution layer**
Assign when: the subtask has a clear spec, no ambiguity, and a wrong output is easily caught in review.
- Routine implementation following explicit instructions
- File operations, formatting, repetitive edits
- Straightforward coding, summarization, refactors with defined outcomes

**Sonnet — orchestration layer (me, always)**
Handles: planning, architecture, debugging, research, task decomposition, decision-making, and reviewing all sub-agent output. Every agentic session runs through Sonnet. Sonnet does not get delegated away.

**Opus — escalation layer only**
Escalate when at least one of these is true:
- My confidence is genuinely low after attempting the problem
- Security audit, critical architecture verification, or compliance review
- Two failed Haiku attempts on the same subtask
- The cost of a wrong answer outweighs the cost of Opus

Never use Opus as a default or a comfort choice. Justify the escalation when announcing it.

**Workflow:**
1. Analyze the task and produce an execution plan before any implementation starts
2. Delegate implementation subtasks to Haiku with explicit instructions
3. Review Haiku's output — correctness, completeness, alignment with spec
4. If a sub-problem meets escalation criteria, route it to Opus for targeted review only
5. Opus findings return to me for revised instructions, then back to Haiku for implementation

**Standing rules:**
- Never spawn a sub-agent for work I can do inline — sub-agents add overhead
- Announce model tier when switching phases: *"Delegating to Haiku for implementation"* / *"Escalating to Opus — confidence low on auth boundary"*
- On blockers: make best guess and flag for review — **except** when the action involves real-world spend beyond token usage. Stop and wait for those.

**Cowork-specific:**
- Sub-agents in Cowork start cold — no session context carries over. Brief them explicitly with file paths, decisions, and relevant spec content.
- Prefer inline execution for tasks completable in a few tool calls. Sub-agent overhead is not justified for small work.

---

## Platform & Framework Gotchas

**Vercel + Multiple GitHub Accounts (Critical)**
Vercel Hobby validates that every commit author's email matches the Vercel account owner's email. When a repo belongs to a GitHub account different from the one that owns the Vercel project:
- Set `git config --local user.email "owner@email.com"` and `git config --local user.name "..."` in that repo before any commits
- **Never add `Co-Authored-By` trailers** — Vercel treats them as non-owner contributions and blocks the deploy
- This must be set locally per repo; never rely on global git config when managing multiple accounts
- Symptom: "The Deployment was blocked because the commit author does not have contributing access"

**Next.js: Edge Runtime vs Node.js Runtime**
Middleware runs in Edge Runtime — no access to Node.js built-ins including `crypto`. Use the Web Crypto API (`SubtleCrypto`) for HMAC and cryptographic operations in middleware. API routes (`app/api/`) use Node.js runtime by default and can use `crypto` normally. Both runtimes produce compatible HMAC output when using the same algorithm and key.

**Browser AudioContext Autoplay Policy**
Creating a new `AudioContext` per audio call is blocked by browser autoplay policy after the first user gesture. Correct pattern: one module-level instance (`let _audioCtx`), unlocked by a one-time event listener on the first user interaction (`click`, `keydown`, `touchstart`). Call `.resume()` before each use in case it was suspended. Never create a new instance per play call.

**Layout-Preserving Hide (Tailwind / CSS)**
Use `className="invisible"` instead of conditional rendering (`{condition && <Component />}`) when a hidden element must still occupy its layout space — e.g. a sort bar that keeps column headers aligned even when a list is empty. Conditional rendering removes the element from flow; `invisible` preserves it.

**Shopify App Code Freeze During Review**
Never touch a submitted Shopify app's codebase while it is under Shopify review. The review period is typically 1–3 weeks. Any change to app routes, webhooks, or server logic risks restarting the review or causing rejection. Plan all monitoring hooks, webhook additions, and feature work for a post-approval pass. Confirm app submission status before proposing changes to any Shopify app route or handler.

---

## File Maintenance

`C:\Users\Traffer\.claude\CLAUDE.md` is a symlink to `D:\Claude\CLAUDE.md`. They are the same file — no syncing needed. The `templates\` folder is a junction to `D:\Claude\templates\` — also the same.

In Cowork, `D:\Claude` must be connected at the start of each session. If it isn't, request it before proceeding with any coding task.

**Whenever this file is edited, commit and push:**
```
cd D:\Claude
git add CLAUDE.md
git commit -m "update CLAUDE.md: [brief description of change]"
git push
```

---

## Project-Specific Guidelines

**Project:** AeroVoice (`D:\call`)
**Stack:** Vanilla JS ES6 + HTML5 + CSS3 frontend, Node.js + Express ESM backend, Telnyx WebRTC SDK v2.26.4

### No Build Step
The frontend is served as raw `.js`, `.html`, `.css` files. Do not introduce bundlers, TypeScript, or npm imports in any file under `public/`. All frontend code must run directly in the browser.

### Call State Machine
`callState` is the single source of truth for call phase (`idle | ringing | connected`). Always transition through `transitionCallState(state)` — never mutate `callState` directly from event handlers.

### Simulation Mode is First-Class
Every feature path must work in both `appConfig.simulation_mode === true` and `false`. When adding a new call feature, implement the simulated branch first, then the live branch.

### AudioContext: One Instance
`audioContext` is a module-level singleton. `setupAudioContext()` creates it once. Call `setupAudioContext()` at the top of any function that needs audio, then `await audioContext.resume()` before using it. Never create a new instance per operation.

### Telnyx SDK Detection
Check `window.TelnyxRTC || window.TelnyxWebRTC` (both top-level constructor and namespace pattern). The local file `public/telnyx-webrtc.js` is the primary source; CDN unpkg and jsdelivr are fallbacks. Do not change the pinned version (2.26.4) without testing.

### XSS: No Raw localStorage Data in innerHTML
Contact names and phone numbers from localStorage are untrusted. Always create DOM text nodes or use `textContent` / `setAttribute` when rendering user-controlled data. Never interpolate them directly into innerHTML template literals.

### In-Call DTMF
Local Web Audio tones (`playDTMF()`) handle UX feedback only. Carrier signaling requires `activeCall.dtmf(digit)` to be called separately during an active production call. Both must fire; neither replaces the other.

### localStorage Keys
`aerovoice_history` — call log array (max 50 entries, newest first)
`aerovoice_contacts` — contact array
Do not rename these keys without writing a migration.

### Server is ESM
`package.json` sets `"type": "module"`. Use `import`/`export` throughout `server.js`. Do not use `require()`.

### Secrets
`TELNYX_API_KEY` and `TELNYX_CREDENTIAL_ID` live in `.env` only. `.gitignore` excludes `.env` and `telnyx_account_creds.txt`. Never reference these values in any file under `public/`.
