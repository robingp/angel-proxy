# The Recommended Plan

**What this is:** my integrated recommendation across every role — CEO, CTO, architect, developer, designer. It **amends the Phase 3 roadmap** (P3 §9). Where the two conflict, this document wins and Phase 3 §9 should be read as superseded.

**Why it exists:** Phase 3 was written to answer "what is the product." This answers "what should you actually do on Monday."

---

## 1. The recommendation in one paragraph

> Do not build the safety kernel first. Build **read-only checkout verification** first, ship it in four months as a small paid product, and use the revenue and the customer knowledge to fund the kernel. Spend the first two weeks talking to people instead of coding. Never let your first production release be code that modifies a customer's site.

Everything below is the argument and the execution detail.

---

## 2. What is wrong with my Phase 3 roadmap

Phase 3 §9 sequences: M0 foundations → **M1 the kernel** (10–14 weeks) → M2 verification → M3 product → M4 revenue. Ten to fourteen months to the first pound.

Three flaws, and I should have caught all three when the resourcing answer came in.

**Flaw 1 — It builds the hardest thing first, and that thing has zero standalone customer value.**
Restore points, transactional apply, and rollback are the moat. They are also invisible. Nobody will pay for "I can revert a plugin update." They pay for the *outcome* that safety enables. Four months of the hardest engineering in the product, delivering nothing a customer can see, is the wrong first move when you have 15 hours a week and no revenue.

**Flaw 2 — It makes your first release site-mutating code.**
This is the serious one. Phase 1 §6.4 already names the existential risk: *one widely-shared incident where our "safe" change destroyed a site.* Under that analysis, shipping mutation as your **first ever production code** — written part-time, by one person, with no operational track record — is the single riskiest sequencing available.

The inverse is nearly free: a monitoring product that has a bug shows a wrong status. A fix engine that has a bug destroys a business.

> **Start read-only. Earn the right to mutate.**

**Flaw 3 — It validates the core hypothesis last.**
The entire differentiator rests on an unproven claim: that operators will pay for functional verification of revenue paths (P2 §9). Phase 3 tests that at M2, roughly eight months in. If it's wrong, you find out after eight months of evenings. Test it at month four instead — or better, at week two, for free (§4).

---

## 3. The corrected sequence

Same destination, same kernel, same moats. Different order — each step sells on its own and de-risks the next.

### v0.1 — **Checkout Monitor** *(read-only)* — ~4 months
Continuously verifies that the store's revenue path actually functions, and tells you the moment it doesn't.

- Runs the E2 verification sequence on a schedule: product → add to cart → cart → checkout render → payment methods present → AJAX fragments respond.
- Detects PHP fatals, uncaught exceptions, and 5xx anywhere in the flow.
- Alerts only on a real transition to broken (P3 E6 discipline from day one).
- **Zero mutation. Zero blast radius.**

Sells to Dana immediately, because "your checkout is verified working" is the one sentence in this market that speaks to their actual fear. It is also, per P2 §9, something no competitor does — uptime monitors check that the homepage returns 200.

### v0.2 — **+ Change Attribution** *(still read-only)* — ~2–3 months
The timeline (P3 E3). Now the product answers the second question too: *checkout broke at 14:20; these three things changed at 14:18.*

This is Moat 2, it is still read-only, and it converts the product from an alarm into a diagnosis. It roughly doubles the price you can charge and it is the data asset that compounds.

### v1.0 — **+ The Safety Kernel** *(first mutation)* — ~4–5 months
Restore points, transactional apply, verification gate, automatic rollback. The full Phase 3 product.

By now you have: revenue, real sites to test against, a year of operational experience, customers who trust you, and — critically — a **verification engine already proven in production**, which is exactly what the kernel needs to decide whether to roll back. You are building the dangerous part on top of a component you already know works.

### Why this is strictly better

| | Phase 3 order | This order |
|---|---|---|
| First revenue | ~12 months | **~4 months** |
| Core hypothesis tested | month 8 | **month 4** (or week 2, free) |
| First release can destroy a site | **Yes** | No |
| Kernel built with customer knowledge | No — on spec | **Yes** |
| Wasted work if the hypothesis is wrong | ~8 months | ~4 months |

Nothing is thrown away. v0.1's verification engine *is* P3 FR-4. v0.2's timeline *is* FR-6. You are building the same product, in the order that pays you soonest and can hurt you least.

---

## 4. The next 30 days

### Week 1–2 — Do not write code. Talk to twenty people.

This is the highest-return two weeks available to you, and it is the step founders skip. Twenty conversations is roughly twenty hours — **one week of your capacity to de-risk a year of it.**

Find them where they already are: WooCommerce and agency communities, WordPress meetups, freelancer forums. Ten store operators (Dana), ten freelancers or agencies (Priya, Marcus).

Ask, and do not pitch:

1. "Tell me about the last time a site you look after broke. What happened, how did you find out, how long until you knew why?" *(Tests P2 §11.2 — the load-bearing unverified claim under this whole strategy.)*
2. "How do you know right now that your checkout works?" *(Almost everyone will say: a customer tells us. That answer is the business.)*
3. "What did the last outage cost you?" *(Prices the product — P2 §11.3.)*
4. "Are you letting AI tools make changes to client sites yet?" *(Times the 2027 position — P2 §11.1.)*
5. "What would you pay for something that told you within five minutes that checkout stopped working, and what changed just before?"

**Listen for the wince.** People are polite about ideas and honest about pain. If nobody winces at question 1 or 2, the strategy is wrong and you have lost two weeks instead of a year.

### Week 3 — Three technical spikes, throwaway code

Prove the riskiest unknowns before committing to an architecture. Timebox to two evenings each.

1. **Can we drive a checkout flow from inside WordPress on cheap shared hosting?** Try the internal-dispatch route and the loopback-HTTP route on two budget hosts. This decides P3 §13.3 and it is the highest technical risk in v0.1.
2. **Can we reliably catch a PHP fatal that occurs during that flow?** Shutdown handler plus error capture — prove it catches a deliberate fatal in a checkout hook.
3. **Does scheduled background work actually run on those hosts?** Action Scheduler on a site with no real cron and aggressive timeouts.

If all three are green, the plan is sound. If spike 1 fails on both routes, stop and reconsider before writing a line of product code.

### Week 4 — In parallel, cheap and non-technical

- **Commission the trademark clearance search** (P2 §13.4). Slow, cheap, irreversible if skipped.
- **Settle the name.** Still unanswered (P1 §12.3), still my recommendation to change it — "AI" in the name promises the thing you say you are not building, and "guru" contradicts your own brand voice.
- Register the domain. Put up one honest page describing the problem and collect email addresses. It costs an evening and it starts measuring demand.

---

## 5. Architecture — the decisions, made

You asked me to be the architect, so these are decisions rather than options. They resolve most of P3 §13.

**5.1 Background processing → use Action Scheduler.**
Do not build your own. It is battle-tested against exactly the hostile shared-hosting conditions in NFR-2.3, and on WooCommerce sites — your v0.1 market — **it is already installed and already running.** Building a custom runner would cost a month and be worse. *(Resolves P3 §13.1, the highest-risk technical decision, at near-zero cost.)*

**5.2 Verification execution → inside WordPress, no external infrastructure.**
Internal request dispatch where the flow allows it, loopback HTTP where a real request is needed, with explicit detection and a clear message when a host blocks both. This honours P3 §8.3 — no cloud, no uptime obligation, nothing to be on call for. Week 3's spike 1 decides the balance between the two.

**5.3 Storage → custom tables from day one.**
The timeline and ledger are append-only, high-volume, and query-shaped. Do not put them in post meta or the options table; retrofitting is a migration you will resent. Options table for settings only. *(Feeds Phase 5.)*

**5.4 Admin UI → server-rendered, with interactivity islands. Not a React SPA.**
This contradicts the brief, so here is the reasoning. A full React application inside wp-admin means a build pipeline, a router, state management, an API surface, and a bundle to keep secure and current — for **one part-time person**. Nothing in P3 §6.6 requires an SPA. Server-rendered PHP with small React or Preact islands where interactivity genuinely earns it (the timeline, live status) gives you the same polish at a fraction of the maintenance cost, and it is faster on the low-end hosting your customers use. Use `wp-scripts` and core's registered packages, per C1.1.
*If you want the full SPA anyway, that is a legitimate call — but recognise it as spending your scarcest resource on the layer customers judge least.*

**5.5 Licensing → build minimal, in-house.**
C1.1 forbids obfuscated code, which disqualifies most commercial licensing libraries. A signed licence token verified against a public key embedded in the plugin, with a grace period on network failure, is a few days of work and has no third-party dependency. Signed update packages (C2.7) matter more than sophisticated licence enforcement — piracy is not your problem at this stage; a compromised update channel would be fatal.

**5.6 Restore points → not in v0.1 at all.**
When you build them for v1.0: filesystem-based, scoped to affected components, with delegation to an existing backup plugin where one is present (FR-3.6). Deferring this is most of what makes the corrected sequence affordable.

**5.7 The one thing you must not compromise on now.**
**Every engine gets a REST endpoint and a WP-CLI command from its first commit** (P3 FR-11.2/11.3). It feels like overhead when you are the only user. It is what makes the fleet view and the cloud a thin client later instead of a rewrite — and it makes the whole product testable without a browser, which for a solo developer is worth the cost on its own.

---

## 6. UI/UX — the design that fits the strategy

The market is full of dense, anxious dashboards. The strongest available design position is the opposite.

### 6.1 The whole of v0.1 is one screen

At the top, in large type, **one sentence of truth**:

> **Checkout is working.**
> Last verified 3 minutes ago · 1,247 consecutive successful checks

Nothing else competes with it. When it goes wrong, that sentence — and only that sentence — changes:

> **Checkout is broken.**
> Failed 4 minutes ago at *payment methods*. A PHP fatal error occurred in `some-plugin/gateway.php:214`.

Below it, a horizontal timeline of verification results. In v0.2, the changes overlay onto the same strip, and the correlation becomes visual rather than explained — the eye finds the cause before the text does.

That's the product. No tabs, no score, no badge count, no gauge.

### 6.2 Design principles

1. **One number, one sentence.** If a screen has two primary messages, it has none.
2. **Green is quiet, red is loud.** A healthy site should be a *boring* screen. Boring is the feature.
3. **Never a red dot for something that isn't urgent.** Badge counts on menu items are the alert-fatigue disease in miniature.
4. **Say what you did not check.** Every result carries its scope (P1 §3, value 6). This is a design element, not fine print — it is the honesty that earns trust in a category built on exaggeration.
5. **Errors are instructions.** Never a message the reader cannot act on.
6. **Zero configuration to be useful** (NFR-6.1). Detect the store, detect the paths, start verifying. Settings exist for people who want them and are invisible to everyone else.
7. **Accessible because we say we care** (NFR-5.1). WCAG 2.2 AA on our own admin, or the later accessibility rule pack is not credible.

### 6.3 The emotional target

Priya opens wp-admin on Saturday morning expecting bad news, sees one calm sentence saying the store is fine, and closes the laptop.

**That relief is the product.** Design every screen to produce it or to break it honestly.

---

## 7. Money

**v0.1 pricing: £19–29/month for a single store; £49–79/month for up to ten.**

The logic is P3 §1.2 — we sell evidence and prevented loss, not a response promise. Dana compares that number to one hour of broken checkout, not to a £2 plugin. Do not anchor to the €1.99 fleet-tool market (P2 §5.1); you are not selling a dashboard.

Sell **direct, premium-only** at first (P3 §11.2). WordPress.org comes after you know your support load per customer — a free tier reaching thousands of installs while you have no paid base is a full-time unpaid support job, and that is the most likely way this quietly ends.

**Ten paying customers is the goal for month six.** Not a thousand users. Ten people who pay, answer your emails, and tell you what is wrong.

---

## 8. What would make me tell you to stop

Defining failure in advance is what stops a project consuming three years by inches. Review these honestly at each gate.

| Gate | Kill / pivot signal |
|---|---|
| **Week 2** | Nobody winces. If twenty operators cannot recall a recent painful breakage and do not care how they'd learn checkout broke, the premise is wrong. Stop here — cost: two weeks. |
| **Week 3** | All three spikes fail on mainstream shared hosting. The product may only be viable on managed hosting, which is a much smaller market and a different plan. |
| **Month 4** | v0.1 ships and nobody converts after 30 conversations. The pain is real but not purchase-motivating — reconsider the buyer, not the product. |
| **Month 6** | Fewer than five paying customers. Not fatal, but stop building features and fix distribution — more product will not help. |
| **Month 9** | Support contacts per customer are not falling (P3 §10.3). The product is not self-serve enough to scale part-time; fix that before growing. |
| **Any time** | An escaped failure destroys a customer site and you cannot recover it. Stop shipping mutation until you understand exactly why. |

---

## 9. The honest assessment

You asked for my judgment, so here it is without cushioning.

**This is a hard market.** Contested wedge (P2 §4), price ceiling compressed to near-zero by WP Umbrella and the hosts (P2 §5), incumbents with real moats, and you are part-time and alone against teams.

**And there is a genuine opening.** Nobody verifies function — everyone diffs pixels, and a checkout can fail completely while every pixel test passes (P2 §9). That gap is real, it attaches directly to money, and it is small enough for one person to fill. The agent-governance position beyond it (P2 §3) is a genuinely rare thing: a real gap on a new platform shift with no incumbent at all.

**The plan is viable. The original sequencing was not.** Fourteen months of evenings before the first pound, with the riskiest code shipping first, is how solo projects die — not from being wrong, but from running out of belief before they find out.

**The three things that decide this:**

1. **Talk to twenty people before you write code.** One week to de-risk a year. Everything else is downstream of what you hear.
2. **Ship something read-only and small in four months, and charge for it.** Revenue and real users make every subsequent decision better and cheaper.
3. **Protect the moat, not the feature list.** Depth of verification, quality of the record, and calm. Not breadth. Every hour spent adding a domain is an hour not spent making the core thing undeniable — and breadth is the failure mode your own brief is most at risk of (P1 §11.1).

---

## 10. What I need from you

1. **Approve or reject the resequencing** (§3). If approved, Phase 4 is scoped to the v0.1 monitor rather than the full kernel — a much smaller and more useful architecture document.
2. **Commit to the twenty conversations** (§4), or tell me you are skipping validation and accept that Phase 4 is built on four unverified assumptions (P2 §12).
3. **Settle the name** and start clearance (P1 §12.3, P2 §13.4).
4. **Confirm or overrule the UI stack call** (§5.4) — it contradicts your brief and it is your call, not mine.
