# Market Analysis: AeroVoice — Prepaid Browser-Based International Calling

**Status:** `Complete`
**Conducted:** 2026-05-24
**Last Updated:** 2026-05-24
**Project Spec:** PROJECT_SPEC.md
**Repo:** https://github.com/trafferazabu/call

---

## Decision Gate

- [x] Is this problem experienced by enough people to justify a product? **Yes** — Skype's 300M+ users lost their primary PSTN calling tool in May 2025. Migration is still actively underway.
- [x] Are people currently paying to solve this problem? **Yes** — Yadaphone, BubblyPhone, HelloAirDial, Viber Out, Rebtel all have active paying user bases.
- [x] Is there a realistic path to reaching those customers? **Yes** — SEO ("Skype alternative"), targeted communities (expats, diaspora), and word-of-mouth from the post-Skype migration wave.
- [x] Do we have or can we build the required capability? **Yes** — Core calling stack is proven and working. Remaining build is auth + billing layer.
- [x] Can this be priced at a margin that sustains the business? **Yes** — Telnyx wholesale rates allow 3–10x markup while remaining the cheapest option in the market on key Asian routes.

**Gate result:** `Proceed`

---

## Market Definition

The international PSTN calling market for consumers who need to dial real phone numbers in other countries — not app-to-app calling — from a browser or mobile device without a monthly subscription. The core user has overseas family, colleagues, or business contacts who are not reachable via free messaging apps (WhatsApp, Line, etc.) because they're on landlines, older mobiles, or simply don't use smartphones. Skype served this market for 20+ years and was shut down by Microsoft on May 5, 2025, creating the largest single customer migration event this market has seen in a decade.

**Core problem being solved:**
Making a phone call to a foreign landline or mobile number at a reasonable rate without installing an app or committing to a subscription.

**Who experiences it:**
Expats and immigrants calling home; travellers needing local contacts; remote workers reaching overseas clients; anyone whose overseas contact doesn't use messaging apps.

**How they solve it today:**
Viber Out or Rebtel (if they use those apps), calling cards, international roaming, or simply going without since Skype closed.

**Why current solutions fall short:**
- App-based competitors require installation and account setup before a single call
- Subscription models penalise infrequent callers
- Rates for Asian destinations (Japan especially) are dramatically inflated vs. actual carrier cost
- Post-Skype, the browser-native market has very few established players

---

## Market Size

| | Estimate | Key Assumption |
|---|---|---|
| **TAM** | ~$8B/year | Global consumer international calling market (VoIP + calling cards) |
| **SAM** | ~$400M/year | Browser-native + prepaid-only segment, English-speaking markets |
| **SOM (Yr 1–3)** | $50K–$500K/year | 10K–100K active users spending $5–$50/year |

**Market trend:** Growing — the Skype shutdown in May 2025 injected a large cohort of unserved users back into the market simultaneously. Short-term demand spike is real and ongoing.

---

## Target Customer Segments

### Primary Segment — The Post-Skype Migrant
- **Profile:** 30–65 years old, tech-comfortable but not tech-native. Had Skype for years specifically for international calls. Looking for the simplest possible replacement that doesn't require a new app.
- **Pain intensity:** High — they've lost a tool they relied on and are actively searching
- **Current spend on this problem:** Was paying $0–$10/month on Skype Credit. Will pay same or more for a good replacement.
- **Willingness to try something new:** High — they have no choice
- **How to reach them:** SEO ("Skype alternative 2025/2026"), Reddit communities (r/sysadmin, expat subreddits), tech review articles, Product Hunt
- **Estimated addressable count:** Tens of millions globally; our realistic reach in year 1 = low thousands

### Secondary Segment — The Expat / Diaspora Caller
- **Profile:** Living abroad, calls home regularly to family on PSTN numbers. Price-sensitive on per-minute rates, loyalty is to low rates not to brand.
- **Pain intensity:** Medium-High — they have workarounds but are always open to cheaper options
- **Current spend:** $10–$50/month on calling cards or VoIP apps
- **How to reach them:** Expat forums, country-specific communities, WhatsApp/Facebook groups for diaspora
- **Note:** This segment is large but competitive — Boss Revolution, Rebtel, and Viber Out are well-entrenched

### Segments Explicitly Not Targeted (V1)
- Business users needing high-volume calling or CRM integration — out of scope
- Users needing inbound phone numbers — out of scope for MVP
- Users in countries where VoIP is restricted (UAE, North Korea, etc.)

---

## Competitive Landscape

### Tier 1 — Direct Competitors (Browser-Native, Prepaid, No App)

| Company | Model | Min Entry | Billing | Status | Notable Weakness |
|---|---|---|---|---|---|
| **Yadaphone** | Prepaid credits, no subscription | $5 | Per-minute, round up | Active, growing | Very high rates on Japan/Asia mobile; no auto top-up found |
| **BubblyPhone** | Prepaid credits, no subscription | $5 | Per-minute | Active | Newer, less established; limited brand recognition |
| **HelloAirDial** | Prepaid credits, never expire | Unknown | Per-minute | Active | Less feature-rich; minimal UX investment visible |

### Tier 2 — Indirect Competitors (App Required)

| Company | Their approach | Why customers choose them | Our counter |
|---|---|---|---|
| **Viber Out** | Prepaid + subscription, inside Viber app | Existing Viber users; very low rates | No app required; better for non-Viber users |
| **Rebtel** | Prepaid + unlimited plans, app | Strong diaspora community fit | No app; simpler pricing |
| **Boss Revolution** | Prepaid + unlimited, app + physical cards | Cheapest rates on many routes; trusted by diaspora | No app; browser access; modern UX |
| **Yolla** | Prepaid, mobile app only | iOS/Android native feel | Browser access; no install |
| **Talk360** | Prepaid, mobile app | Good African route coverage | Browser access |

### Tier 3 — Substitutes

| Substitute | Why used | Our advantage |
|---|---|---|
| WhatsApp / Line / FaceTime calling | Free app-to-app | We reach PSTN numbers, not just app users |
| International roaming | No extra setup | 10–50x cheaper per minute |
| Physical calling cards | Available offline | No PIN dialling, browser native, no expiry games |
| Google Voice | Free US → US; cheap international | US-only service; not available internationally |

### Competitor Deep Dives

**Yadaphone** (the benchmark)
Launched as a direct browser-based PSTN calling service with a clean UX and transparent pricing. Their marketing explicitly targets the post-Skype gap. $5 minimum purchase, first call free with no credit card, per-minute billing. Their key weakness is wildly inconsistent pricing across destinations — Australia at $0.06/min is reasonable, but Japan mobile at $0.38/min is 20x+ what Telnyx actually charges for that route. This suggests they are either using a different carrier with poor Asian peering, or are applying an aggressive markup on routes where they perceive users have no alternative. This is our single biggest pricing opportunity.

**BubblyPhone**
A close technical equivalent to AeroVoice's planned SaaS model. Browser-native, Stripe payments, $5 minimum, per-minute billing. UK calls from $0.006/min, India from $0.014/min. Their rates appear to be some of the lowest in the browser-native segment, suggesting Telnyx or a similar quality carrier backend. Less known brand, less polished UX observed. Worth monitoring closely — they are the most technically comparable competitor.

---

## Pricing Analysis

### Market Pricing Norms
The market has established $0.02–$0.08/min as "obviously cheap" for Western destinations. African and some Asian mobile routes command $0.10–$0.40/min across most competitors. Users who have used Skype calibrate against Skype's historical rates (~$0.023/min to Australia, ~$0.023/min to UK). Anything below that feels like a deal; anything above raises questions.

### Detailed Pricing by Competitor

| Company | Billing Model | Billing Interval | Min Purchase | Free Trial |
|---|---|---|---|---|
| Yadaphone | Prepaid credits | Per-minute (round up) | $5 | First call free (no CC) |
| BubblyPhone | Prepaid credits | Per-minute | $5 | Unknown |
| HelloAirDial | Prepaid, no expiry | Per-minute | Unknown | 1 free minute |
| Viber Out | Prepaid + subscriptions | Per-minute | ~$2 | No |
| Rebtel | Prepaid + unlimited | Per-minute | Unknown | No |
| Boss Revolution | Prepaid + unlimited | Per-minute | Unknown | No |
| **Skype** (dead) | Prepaid + subscription | Per-minute (round up) | ~$5 | No |

### Destination Rate Comparison (per minute, mobile unless noted)

| Destination | Yadaphone | BubblyPhone | Rebtel | Viber Out | Our Telnyx cost | Our proposed rate |
|---|---|---|---|---|---|---|
| USA | ~$0.02 | ~$0.01 | ~$0.01 | $0.019 | ~$0.004 | **$0.02** |
| UK | ~$0.04 | $0.006+ | $0.04 | ~$0.06 | ~$0.008 | **$0.03** |
| Australia | $0.06 | ~$0.03 | ~$0.04 | ~$0.06 | ~$0.017 | **$0.05** |
| Japan mobile | **$0.38** | Unknown | Unknown | Unknown | ~$0.017 | **$0.05** |
| India | $0.08 | $0.014 | $0.012 | $0.015 | ~$0.005 | **$0.03** |
| Nigeria | $0.34 | Unknown | Unknown | $0.13–0.23 | ~$0.05* | **$0.15** |
| Brazil | Unknown | Unknown | Unknown | ~$0.10 | ~$0.015* | **$0.05** |

*Africa and Latin America Telnyx rates estimated — verify before launch.*

**Note on Japan:** Our Telnyx cost for Japan mobile was confirmed at $0.017/min in live testing (1.28 min = $0.022). Yadaphone charges $0.38/min — 22x our cost. At our proposed $0.05/min we are still 3x our cost AND 7.5x cheaper than Yadaphone. **Japan is our hero pricing story.**

### Our Pricing Position

| Option | Approach | Rationale | Risk |
|---|---|---|---|
| Premium | 10x+ Telnyx cost | Not justified, we have no brand premium yet | Users will find BubblyPhone |
| Parity | Match Yadaphone | Easy to communicate, still profitable | Leave Japan opportunity on table |
| **Penetration** | **3x Telnyx cost; beat Yadaphone on Asia** | **Wins on Japan dramatically; competitive on all routes** | **Margin is thinner on African routes** |

**Recommended:** Penetration pricing, starting at $0.02/min for cheap destinations scaling to $0.15/min for expensive. Headline: "Call Japan for $0.05/min" (vs Yadaphone's $0.38).

**Billing interval recommendation:** Per-minute, rounding up to next full minute. This is the universal market standard — all competitors use it, users understand it. Do not deviate; the simplicity benefit outweighs any micro-optimisation in billing granularity.

---

## Market Gaps & Opportunities

| # | Gap | Evidence | Impact | Feasibility | Opportunity |
|---|---|---|---|---|---|
| 1 | Japan and Asia routes massively overpriced | Yadaphone $0.38 vs our $0.017 Telnyx cost | High | High | Lead marketing with Japan rate |
| 2 | Post-Skype migration window (May 2025–2026) | Active search volume for "Skype alternative" | High | High | SEO-targetable right now |
| 3 | Browser-native is a thin field | Only 3 clear browser-native players found | Medium | High | "No download, dial from your browser" |
| 4 | Free first call removes all adoption friction | Yadaphone and HelloAirDial use this; converts well | High | Medium | Implement before launch |
| 5 | Auto top-up not prominently marketed by competitors | Not visible in any competitor marketing | Medium | Medium | Make this a feature differentiator |
| 6 | Transparent real-time rate display | Most competitors bury rate tables | Medium | High | Show rate before every call |

---

## Positioning

**One-sentence positioning statement:**
> For people who need to call real phone numbers overseas without installing an app or paying a monthly fee, AeroVoice is a browser-based calling service that charges only for what you use — with the cheapest rates to Japan and Asia of any service on the market.

**Why we win:**
- Japan and Asian routes dramatically cheaper than any browser-native competitor
- Zero friction: no app, no subscription, free first call
- Modern UX — clean, fast, not a legacy calling card interface
- Transparent per-minute pricing shown before every call

**Why we lose:**
- No brand recognition; users have to find us and trust us
- BubblyPhone has lower rates than us on UK and some Western European destinations
- App-based competitors (Viber Out, Rebtel) have better rates on India

**Key messages:**
- Primary (post-Skype migrant): "Skype is gone. Open your browser and call."
- Secondary (Japan/Asia expat): "Call Japan mobile for 5¢/minute."

---

## Go-to-Market Considerations

**Primary acquisition channel:** SEO — "Skype alternative," "call Japan from browser," "cheap international calls no app." The search intent is high and the market is actively looking.

**Secondary channels:** Reddit (expat communities, r/digitalnomad, country-specific subs), Product Hunt launch, Hacker News Show HN.

**Trust signals needed for first conversion:**
- Rate clearly shown before account creation
- Free first call requires no credit card — remove all risk from trial
- Call quality testimonial (your Sydney/Tokyo test is a real data point)

**Time to first value:** Under 2 minutes — browser open, free call placed, done.

**Viral potential:** Medium — "I just called Tokyo for 5 cents a minute from my browser" is a shareable moment. Build share prompt post-call.

**Launch strategy:**
Post on Product Hunt and relevant Reddit communities the day of launch with the Japan rate as the headline. "Skype alternative, no app, 5¢/min to Japan" will get organic traction in expat communities where that route matters.

---

## Regulatory & Compliance Snapshot

| Jurisdiction | Requirement | Risk Level | Action Required |
|---|---|---|---|
| USA | E911 for interconnected VoIP; CALEA compliance | High | Implement E911 via Telnyx before US marketing push |
| EU (GDPR) | Call metadata is personal data; right to erasure | Medium | Privacy policy + data retention controls |
| Japan | Registration requirements for VoIP providers (Telnyx handles carrier layer) | Low-Medium | Monitor; Telnyx handles as registered carrier |
| All | OFAC sanctions list — block prohibited destinations | Medium | Implement destination blocklist at server level |
| All | Do not promise anonymity | Low | ToS must state call metadata retained and provided to lawful requests |

**Legal counsel needed:** Yes — before US marketing push specifically for E911 obligation confirmation.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Market too small / CAC too high | Low | High | Post-Skype migration window reduces CAC; browser-native reduces friction |
| BubblyPhone responds with marketing | Medium | Medium | Compete on Asia rates; they have no Japan advantage |
| Telnyx rate changes erode Japan margin | Medium | High | Monitor quarterly; rates table in spec is versioned |
| International Revenue Share Fraud (IRSF) | High (industry-wide) | High | Block known IRSF prefixes; hard cap per-call duration and daily spend |
| Credit card chargebacks | Medium | Medium | Stripe Radar + 3DS for large top-ups; credits non-refundable in ToS |
| Regulatory change (E911 enforcement) | Low | High | Address before US launch |
| Skype comes back (Microsoft reverses) | Very low | High | Unlikely; Teams is their bet |

---

## SaaS Conversion Readiness

Current state of the personal app vs. SaaS requirements:

| Dimension | Current State | SaaS Requirement | Effort |
|---|---|---|---|
| Authentication | None | Email/password + email verification | M |
| Data isolation | localStorage (single user) | Per-user server-side DB | M |
| Billing | None | Stripe prepaid credits + ledger | L |
| Multi-tenancy | Single Telnyx credential | Per-user token generation (already architected correctly) | S |
| Fraud controls | None | Rate limits, IRSF blocking, spend caps | M |
| E911 | None | Telnyx E911 provisioning per user | M |
| Compliance | None | Privacy policy, ToS, OFAC blocklist | M |

**Estimated conversion effort:** Medium — 4–6 weeks part-time for a competent solo developer.

**Architecture decisions made during personal build that HELP SaaS conversion:**
- Server holds API keys, never client — already multi-user-ready
- Token generation is per-request via `/api/token` — trivially scoped per user
- No hardcoded single-user assumptions in the calling stack

**Architecture decisions that need to change:**
- localStorage → server-side Postgres per-user ledger
- No auth → JWT session auth
- No balance check → pre-call balance gate
- CDR polling in one long HTTP request → async webhook or background job

---

## Decision: Build as SaaS?

**Recommendation:** `Yes — after personal MVP is stable`

**Confidence:** High

**Rationale:** The market is real, timing is excellent (post-Skype window is open now), the competitive gap on Asian routes is genuine and verifiable, and the architecture already supports conversion. The personal MVP maintains our calling capability while we build the SaaS layer. The two can coexist on the same codebase — the SaaS layer is additive, not a replacement.

**Conditions:**
- [x] Personal calling capability remains stable and uninterrupted during SaaS build
- [ ] Telnyx rates verified for at least 10 major destinations before pricing table is published
- [ ] E911 obligation confirmed with legal counsel before US marketing
- [ ] Free first call feature implemented (acquisition-critical, proved by competitors)

**Revisit trigger:** If BubblyPhone closes the gap on Japan rates, revisit our Japan pricing hero story and find the next rate advantage.

---

## Sources & Research Notes

| Source | URL | Date Accessed | Notes |
|---|---|---|---|
| Yadaphone rates | https://www.yadaphone.com/rates | 2026-05-24 | Australia $0.06/min; Japan mobile $0.38/min; India $0.08/min; Nigeria $0.34/min |
| Yadaphone billing | https://www.yadaphone.com/billing | 2026-05-24 | $5 minimum; per-minute round-up; first call free no CC |
| Yadaphone Nomads review | https://freakingnomads.com/resources/yadaphone | 2026-05-24 | Positive reviews; noted as Skype replacement |
| BubblyPhone | https://bubblyphone.com/ | 2026-05-24 | $5 minimum; UK $0.006/min; India $0.014/min; browser-native |
| HelloAirDial | https://www.helloairdial.com/ | 2026-05-24 | Prepaid no expiry; 1 free minute; 200+ countries |
| Viber Out rates | https://account.viber.com/en/rates-index | 2026-05-24 | USA $0.019/min; India $0.015/min; multiple plan types |
| Rebtel | https://www.rebtel.com/en/rates/ | 2026-05-24 | From $0.01/min; India $0.012/min; UK $0.04/min |
| Boss Revolution | https://www.bossrevolution.com/en-us/rates | 2026-05-24 | US $0.005/min; India $0.01/min; diaspora-focused |
| Skype shutdown confirmation | https://support.microsoft.com/en-us/skype/ | 2026-05-24 | Officially closed May 5, 2025 |
| Yolla | https://yollacalls.com/en/rates/ | 2026-05-24 | App only; from $0.04/min |
| Talk360 | https://play.google.com/store/apps/details?id=com.ringcredible | 2026-05-24 | App only; Nigeria $0.13–$0.23/min |
| HelloAirDial comparison | https://www.helloairdial.com/blog/best-international-calling-app | 2026-05-24 | Browser-native comparison roundup |
| AeroVoice live test data | Internal (D:\call CDR) | 2026-05-24 | Australia $0.017/min; Japan mobile $0.017/min via Telnyx — verified |

---

## Open Questions

- [ ] Verify Telnyx rates for UK, USA, India, Nigeria, Brazil — currently estimated, not confirmed
- [ ] Confirm Yadaphone's Japan rate is for mobile (not landline) — if so, our advantage is even stronger
- [ ] Does Telnyx have minimum billing per call that affects short-call economics?
- [ ] E911 obligation: does serving Japanese-based users making calls *to* US numbers trigger US E911 requirement?
- [ ] BubblyPhone's Japan rate — not found in research; if they match us, Japan hero story weakens
- [ ] Credit expiry: 2-year window discussed — confirm legal in target markets (some jurisdictions restrict gift card expiry)
- [ ] Auto top-up: Stripe supports this via saved payment methods — confirm implementation path

---

## Revision Log

| Date | Change | Reason |
|---|---|---|
| 2026-05-24 | Initial draft | First market analysis for AeroVoice SaaS decision |
