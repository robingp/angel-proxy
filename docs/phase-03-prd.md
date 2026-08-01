# Phase 3 — Product Requirements Document

**Status:** Complete — awaiting review.
**Decisions incorporated:** P2 §13.1 (wedge revision, accepted), P2 §13.2 (liability pricing, accepted), resourcing (solo founder, part-time).
**Binding:** [Standing Constraints](constraints.md) C1 and C2 apply to every requirement below.

---

## 1. What the resourcing answer changes

The founder is building this **solo, part-time**. That is the single most important input to this document, and pretending otherwise would produce a roadmap that fails in month four.

Realistic capacity: **12–20 focused hours per week**, with variance. Roughly 700–900 hours in the first year, of which perhaps 60% is code and the rest is support, admin, marketing, and thinking.

For calibration: that is under a third of one full-time engineer. WP Umbrella has a team and a four-year head start. We cannot out-build them. We can only out-*narrow* them.

### 1.1 What this invalidates from earlier phases

| Earlier claim | Reality under solo part-time |
|---|---|
| P1 §7.2: kernel + full stack matrix + 20 design partners in 6 months | ~18 months at this capacity. Horizon 1 is rescoped in §9. |
| P1 §7.2: cloud spine at Horizon 2 | A cloud service means uptime obligations and on-call. A part-time solo founder cannot carry that alongside a day job. Deferred hard — see §8.3. |
| P2 §5.4: accountability tiers as the premium ladder | **Direct conflict. See §1.2.** |
| P1 §12.5 / C1: free tier on WordPress.org | Still the decision, but the *sequencing* now matters enormously — see §11.2. Free-tier support load is the most underrated threat to a solo founder. |

### 1.2 The conflict between liability pricing and solo capacity

The accepted pricing decision says: sell into the liability budget, not the tooling budget. That is right, and §5.2 of Phase 2 proves the market pays for it — Wordfence charges roughly $1,250 versus $149 for the same software plus a promise.

**But that promise is a human answering the phone.** A part-time solo founder cannot sell a four-hour response commitment, and should not sell indemnity. Doing so converts a software business into unbounded personal liability, backed by one person who has a day job.

The resolution is to separate two things that Phase 2 ran together:

| | What it is | Solo-compatible? |
|---|---|---|
| **Liability *evidence*** | Proof of what was checked, changed, verified, and reverted. The Ledger. The customer uses it to defend their own position with *their* client. | **Yes.** It is software. It scales with zero marginal human effort. |
| **Liability *assumption*** | We commit to response times, remediation, or indemnity. | **No.** Requires people. Horizon 3, if ever. |

So the pricing decision stands, with a precise reading:

> **We sell evidence and prevented work at a price set by the liability it addresses — not a promise to answer the phone.**

The customer's willingness to pay comes from what the outage would have cost them and what the proof is worth in their own client relationship. Not from our SLA. This is the version of the pricing decision a solo founder can actually deliver, and it keeps the Ledger (Moat 4) as the commercial engine.

### 1.3 The design principle this forces

**Every hour of the customer's problem must be solved by software, never by us.**

Which means, concretely: obsessive defaults (nothing requires configuration to be safe), self-explaining UI (no support ticket to understand a finding), self-diagnosing failures (the error message says what to do), and documentation written before the feature ships. A feature that generates support tickets is a net negative at this capacity even if customers like it.

---

## 2. Product definition

The specification everything else must serve:

> BuildWithGuru intercepts changes to a WordPress site. For each change it assesses the risk, takes a scoped restore point, applies the change, verifies that the site's critical paths still work, automatically reverts if they do not, and records the whole sequence in a tamper-evident ledger the site owner can export.
>
> Version 1 governs one change source — plugin and theme updates — and verifies one thing better than anyone else: **that the site's revenue and conversion paths still function.**

Everything in this document is either that, or support for that, or explicitly deferred.

---

## 3. User personas

Pronouns are they/them throughout — these are composites, not real people.

### 3.1 Primary: "Priya" — the solo freelancer *(the v1 customer)*

- Maintains 12 client sites; built five of them, inherited the rest.
- Charges £40–80/month per site for maintenance. Maintenance is 30% of their income and 70% of their anxiety.
- Currently: has auto-updates **off** on the sites that matter, because of one bad experience two years ago. Updates manually on Friday afternoons, in a rush.
- Their nightmare: a client phones on Saturday morning about a broken checkout, and they have no idea what changed.
- **Buys because:** the fear goes away and Friday afternoon comes back.
- **Will churn if:** it emails them more than the problem does, or one bad update slips through and they lose trust.
- **Price sensitivity:** high on tooling, low on the specific thing that prevents a client crisis.

### 3.2 Primary: "Dana" — the WooCommerce operator *(the differentiator's customer)*

- Runs one store doing meaningful revenue. Not a developer. Has a developer they call.
- An hour of broken checkout is a quantifiable, painful number they can state immediately.
- Currently: terrified of updates, so the store runs outdated plugins — trading a security risk for an availability risk without realising it.
- **Buys because:** "your checkout is verified working after every change" is the only sentence in this market that speaks to their actual fear.
- **Will churn if:** it ever breaks the store, or cries wolf about the store being broken when it isn't.
- **Price sensitivity:** low. They compare our price to an hour of downtime, not to a plugin.

### 3.3 Secondary: "Marcus" — agency operations lead *(Horizon 2)*

- 120 sites across four hosts, three technicians.
- Already pays for a fleet tool. Will not pay for a second dashboard.
- **Buys because:** the Ledger justifies the retainer and the impact ranking stops their juniors wasting hours on trivia.
- **Blocker:** will not adopt anything requiring 120 separate logins. Needs the fleet view, which is Horizon 2.

### 3.4 Deferred: "Sam" — in-house developer at a mid-size company *(Horizon 3)*

Needs SSO, RBAC, change approval, and audit export. Explicitly out of scope until the kernel is proven; building for Sam at Horizon 1 kills velocity (P1 §10.10).

### 3.5 Emerging: "Alex" — the agent-curious operator *(Horizon 3, watching)*

Experimenting with AI agents against WordPress. Wants to allow it without letting an agent loose on a client's live store. Represents the P2 §3 opportunity. We instrument for Alex at Horizon 2 (attribution) and sell to them at Horizon 3 (policy).

---

## 4. Epics, user stories and acceptance criteria

Stories are scoped so each is independently shippable. Acceptance criteria are testable assertions, not descriptions.

### E1 — Safe update pipeline *(the table stake)*

**US-1.1** — *As Priya, I want to know before I click whether an update is risky, so I can decide whether to do it now or on Monday.*

Acceptance criteria:
- AC1 — Every pending update displays a risk level (Low / Elevated / High) and a one-sentence plain-language reason.
- AC2 — The reason cites at least one concrete factor: known-bad version combination, a major version bump, the component being on a critical path, a plugin with a history of regressions, or absence of prior data.
- AC3 — Where we have no basis for a judgment, the UI says so explicitly rather than defaulting to Low.
- AC4 — Risk assessment completes with no outbound network call. Feed data is used if already cached; its absence never blocks.

**US-1.2** — *As Priya, I want a restore point taken automatically before anything changes, so a bad update is an inconvenience rather than an incident.*

- AC1 — A restore point is created before any mutating operation, with no setting that disables it.
- AC2 — The restore point captures the files of affected components and any database rows the update's own routine touches.
- AC3 — If the restore point cannot be created, the update **does not proceed**, and the reason is shown.
- AC4 — Restore point creation on a typical site completes in under 30 seconds for a single plugin update.
- AC5 — Restore points are verified readable at creation time; an unreadable restore point is a failed restore point.

**US-1.3** — *As Priya, I want the update reverted automatically if the site breaks, without me being there.*

- AC1 — On verification failure (E2), the system restores from the restore point without human input.
- AC2 — Rollback completes or reports explicit failure. There is no silent partial state.
- AC3 — After rollback, the site is confirmed working by re-running the same verification.
- AC4 — If rollback itself fails, the system escalates immediately with specific manual recovery instructions naming the exact files and the restore point location.
- AC5 — A rolled-back component is marked and not retried automatically until the version changes.

**US-1.4** — *As Priya, I want updates to run on a schedule I set, so I stop doing this on Friday afternoons.*

- AC1 — Schedule configurable per site: manual, or automatic within a defined window.
- AC2 — Risk thresholds are configurable — e.g. auto-apply Low, hold Elevated and High for review.
- AC3 — Held updates are queued with their reason, never silently dropped.
- AC4 — A scheduled run interrupted mid-flight (timeout, deploy, crash) leaves the site in a consistent state and resumes or reverts on the next run.

### E2 — Revenue-path verification *(the differentiator)*

**US-2.1** — *As Dana, I want to know that checkout still works after a change — not that the pixels look the same.*

- AC1 — Verification executes a defined sequence against the live site: product page renders, add-to-cart succeeds, cart reflects the item, checkout page renders, checkout form fields and payment method options are present, and the AJAX fragments checkout depends on respond correctly.
- AC2 — Any PHP fatal error, uncaught exception, or 5xx encountered anywhere in the sequence fails verification immediately.
- AC3 — Verification runs without creating a real order or charging anything.
- AC4 — The result names the exact step that failed and includes the captured error.
- AC5 — Where verification could not run a step, it says so. "Passed" never covers an unrun step (P1 §3, value 6).

**US-2.2** — *As Priya, I want the site's other critical paths checked too, not just WooCommerce.*

- AC1 — A defined set of critical paths is checked: homepage, key landing pages, login, registration where enabled, search, and contact form rendering and submission handling.
- AC2 — The user can add their own URLs to the critical path set.
- AC3 — Sensible defaults are detected automatically on first run — no configuration required for the product to be useful.
- AC4 — Each check asserts something meaningful (expected element present, expected status, no error output) rather than merely a 200.

**US-2.3** — *As Dana, I want to be told when performance degrades badly, not just when things break.*

- AC1 — Response time for critical paths is recorded before and after each change.
- AC2 — A regression beyond a configurable threshold is reported.
- AC3 — Performance regression alone does **not** trigger automatic rollback in v1; it is reported for human decision. *(Rationale: measurement noise on shared hosting makes auto-rollback on timing unsafe.)*

**US-2.4** — *As a cautious user, I want to trust that verification will not itself damage my site.*

- AC1 — Verification performs no destructive operation and creates no persistent data beyond its own records.
- AC2 — Any cart or session state it creates is cleaned up, and its cleanup is verified.
- AC3 — Verification is identifiable in server logs and excludable from analytics.
- AC4 — Verification has a hard timeout; exceeding it is an explicit inconclusive result, never a pass.

### E3 — Change attribution *(Moat 2)*

**US-3.1** — *As Priya, I want to see everything that changed on this site, in order, so that "it broke on Tuesday" becomes answerable.*

- AC1 — A timeline records: plugin/theme installs, updates, activations and deactivations; core updates; option changes for a defined significant-option set; user and role changes; file modifications within the plugin and theme directories; and our own actions.
- AC2 — Each entry records what changed, when, and the actor (user, cron, WP-CLI, our automation, or unknown).
- AC3 — The timeline is filterable by time range, actor, and change type.
- AC4 — Recording overhead stays within the performance budget in §6.1.

**US-3.2** — *As Priya, I want to correlate a problem with what changed just before it.*

- AC1 — Selecting any point on the timeline shows all changes within a surrounding window.
- AC2 — Where a verification failure follows changes, the changes in the preceding window are surfaced as candidate causes, ordered by plausibility.
- AC3 — The product presents these as candidates, never as a definitive diagnosis.

### E4 — Impact-ranked findings *(Moat 3)*

**US-4.1** — *As Priya, I want a short list of what actually matters, not 400 findings.*

- AC1 — The default view shows at most 10 items, ordered by impact on this specific site.
- AC2 — Ranking accounts for: whether the affected component is on a critical path, whether the site is transactional, exploitability and severity of any vulnerability, and whether a safe fix exists.
- AC3 — Every item states its consequence in plain language before its technical detail.
- AC4 — The full list is available but is not the default.
- AC5 — Ranking works with AI disabled, using deterministic rules (P1 §6.3, rule 2).

### E5 — The Ledger *(Moat 4, and the commercial engine)*

**US-5.1** — *As Priya, I want a record I can send my client that shows what I did this month.*

- AC1 — Exports a report for any date range covering changes applied, risks assessed, verifications run and their outcomes, rollbacks, and issues resolved.
- AC2 — Export formats: PDF for clients, CSV/JSON for machines.
- AC3 — The report states what was **not** checked, as clearly as what was.
- AC4 — White-labelling (logo, name, colour) is available in the paid tier.

**US-5.2** — *As Marcus, I want the record to be defensible if a client disputes it.*

- AC1 — Entries are append-only with no in-product edit or selective delete path.
- AC2 — Entries are hash-chained so tampering is detectable (C2.6).
- AC3 — Export includes a verifiable integrity statement.
- AC4 — Retention is configurable, and expiry is itself a recorded ledger event.

### E6 — Notifications *(where competitors lose customers)*

**US-6.1** — *As Priya, I want to hear from this product only when it matters.*

- AC1 — Default configuration produces a notification only for: a rollback occurring, a verification failure, a High-risk item requiring a decision, or a failure of the product itself.
- AC2 — Routine successful activity produces **no** notification. A weekly digest is opt-in.
- AC3 — Notification volume per site is tracked as a product metric with a ceiling (P1 §3, value 2).
- AC4 — Every notification names a specific action the recipient can take.
- AC5 — Repeated identical conditions are grouped, never re-sent per occurrence.

---

## 5. Functional requirements

Numbered for traceability from Phase 4 onward. **M** = v1 must, **S** = should, **C** = could, **W** = won't (v1).

### FR-1 Change interception and queue
- FR-1.1 (M) Detect available plugin, theme, and core updates.
- FR-1.2 (M) Queue changes with state: pending, assessed, held, applying, verifying, succeeded, rolled-back, failed.
- FR-1.3 (M) Process the queue via background processing that survives request termination, with a resumable, idempotent state machine.
- FR-1.4 (M) Enforce a single in-flight mutating operation per site (locking).
- FR-1.5 (S) Accept manually initiated changes into the same pipeline.
- FR-1.6 (W) Intercept arbitrary third-party writes. *(Deferred: attribution observes them, E3; governing them is Horizon 3.)*

### FR-2 Risk assessment
- FR-2.1 (M) Assign a risk level to every queued change with a stated rationale.
- FR-2.2 (M) Operate fully offline using shipped heuristics.
- FR-2.3 (M) Incorporate cached vulnerability feed data when present.
- FR-2.4 (S) Incorporate a known-bad-combination dataset, delivered as **declarative data only** (C1.3).
- FR-2.5 (S) Incorporate the site's own history — a component that caused a rollback before scores higher.
- FR-2.6 (C) AI-assisted assessment as an optional enrichment with deterministic fallback.

### FR-3 Restore points
- FR-3.1 (M) Create a restore point scoped to affected files and database rows.
- FR-3.2 (M) Verify integrity at creation.
- FR-3.3 (M) Restore to the exact prior state, atomically where the platform allows and with explicit reporting where it does not.
- FR-3.4 (M) Abort the change if a restore point cannot be created.
- FR-3.5 (M) Enforce retention and disk quota; never fill the disk.
- FR-3.6 (S) Detect and use an existing backup plugin instead of duplicating storage.
- FR-3.7 (W) Full-site backup. *(P1 §10.7.)*

### FR-4 Verification
- FR-4.1 (M) Execute a critical-path check suite against the live site.
- FR-4.2 (M) Detect PHP fatal errors, uncaught exceptions, and 5xx responses during checks.
- FR-4.3 (M) WooCommerce path: product → cart → checkout render → fragments, with no order created.
- FR-4.4 (M) Auto-detect sensible default critical paths on activation.
- FR-4.5 (M) Report per-step results with explicit scope, including steps not run.
- FR-4.6 (M) Hard timeout; timeout yields inconclusive, never pass.
- FR-4.7 (S) Form rendering and submission-handler checks.
- FR-4.8 (S) Authenticated-path checks using a dedicated, minimally-privileged verification identity.
- FR-4.9 (S) Response-time capture and regression reporting.
- FR-4.10 (C) Visual comparison as a **supplementary** signal only, never the primary gate.
- FR-4.11 (W) Full synthetic payment transactions against live gateways.

### FR-5 Rollback
- FR-5.1 (M) Automatically restore on verification failure.
- FR-5.2 (M) Re-verify after restoring.
- FR-5.3 (M) Escalate with specific manual instructions if restore fails.
- FR-5.4 (M) Record every rollback in the ledger with cause.
- FR-5.5 (M) Suppress automatic retry of a rolled-back version.

### FR-6 Attribution timeline
- FR-6.1 (M) Record the change classes in E3/AC1.
- FR-6.2 (M) Attribute an actor to each entry.
- FR-6.3 (M) Filter by range, actor, type.
- FR-6.4 (S) Surface candidate causes for a failure window.
- FR-6.5 (S) Record Abilities API invocations as a change source. *(The agent-governance beachhead — P2 §8.3, step 2.)*

### FR-7 Findings and ranking
- FR-7.1 (M) Produce findings from a rule engine over declarative rules (C1.3).
- FR-7.2 (M) Rank by site-specific impact; default view capped at 10.
- FR-7.3 (M) Plain-language consequence before technical detail.
- FR-7.4 (M) Deterministic ranking with AI disabled.
- FR-7.5 (S) Rule packs as versioned, validated data.

### FR-8 Fix engine
- FR-8.1 (M) Apply fixes only as sequences of catalogue operations with validated parameters (C1.3, C2.3).
- FR-8.2 (M) Route every fix through the full pipeline: risk → restore point → apply → verify → rollback.
- FR-8.3 (M) Require explicit confirmation for any operation classified as high-risk, bound to that specific proposal (C2.3).
- FR-8.4 (S) Auto-apply low-risk fixes when the user enables it.
- FR-8.5 (M) Never apply a fix whose confidence is below threshold; surface as a manual recommendation with instructions.

### FR-9 Ledger
- FR-9.1 (M) Append-only, hash-chained, with actor, action, authorisation, outcome, verification result.
- FR-9.2 (M) Export PDF and CSV/JSON for any range.
- FR-9.3 (M) State scope and exclusions in every export.
- FR-9.4 (S) White-labelled reports (paid).
- FR-9.5 (M) Configurable retention; expiry recorded as an event.

### FR-10 Notifications
- FR-10.1 (M) Email delivery of the four default-notifiable events only.
- FR-10.2 (M) Grouping and suppression of repeats.
- FR-10.3 (M) Every notification carries a specific action.
- FR-10.4 (S) Opt-in weekly digest.
- FR-10.5 (C) Webhook / Slack delivery.

### FR-11 Administration and platform
- FR-11.1 (M) Custom capabilities per operation class (C2.2).
- FR-11.2 (M) REST API covering every engine operation (P1 §11.2 — this is the constraint that makes the cloud possible later).
- FR-11.3 (M) WP-CLI commands mirroring the REST surface.
- FR-11.4 (M) Telemetry off by default, opt-in with disclosure (C1.1).
- FR-11.5 (M) Documented uninstall behaviour honouring data-removal choice.
- FR-11.6 (S) Licensing and signed premium updates (C2.7).
- FR-11.7 (W) Multi-site fleet dashboard. *(Horizon 2 — §9.)*
- FR-11.8 (W) Hosted cloud service. *(§8.3.)*

---

## 6. Non-functional requirements

### 6.1 Performance budgets *(hard limits, tested — NFR failures block release)*
- NFR-1.1 Added page-load overhead on the front end: **< 5ms**, and zero database queries on uncached front-end requests.
- NFR-1.2 Attribution recording adds **< 2ms** to any admin request.
- NFR-1.3 No scanning, verification, or restore-point work in a user-facing request. All of it is background.
- NFR-1.4 Background work is chunked to complete within 20 seconds per batch and to resume safely.
- NFR-1.5 Peak memory for any background operation: **< 128MB**.
- NFR-1.6 Plugin database footprint stays under a documented ceiling per site with retention applied.

### 6.2 Compatibility
- NFR-2.1 PHP 8.2+ (per brief). Fail gracefully with a clear message below the minimum, never fatal.
- NFR-2.2 Latest stable WordPress and the two prior minor versions.
- NFR-2.3 Shared hosting is a first-class target: no shell access, no cron reliability, restrictive `open_basedir`, low memory limits, aggressive execution timeouts. **This is the hardest engineering constraint in the document** and drives FR-1.3 and NFR-1.4.
- NFR-2.4 Correct behaviour with object caching and page caching present.
- NFR-2.5 Multisite: functional and safe, with network operations separately gated (C2.2).
- NFR-2.6 WooCommerce current and one prior major version.

### 6.3 Reliability
- NFR-3.1 No operation leaves the site in an inconsistent state on interruption. Every mutating sequence is resumable or revertible.
- NFR-3.2 Full functionality with outbound network blocked, except features that inherently require it — which degrade with an explicit message, never silently (P1 §3, value 5).
- NFR-3.3 The product's own failure never breaks the site. All hooks defensive; a fatal in our code cannot white-screen the admin.
- NFR-3.4 Concurrency-safe under multiple simultaneous requests and overlapping cron.

### 6.4 Security
Per [Standing Constraints](constraints.md) C2 in full. Release-blocking subset: the triple gate on every entry point (C2.1), no `permission_callback` returning true (C2.1), no dynamic code execution (C2.3), prepared statements without exception (C2.3), secrets never logged (C2.4), SAST passing in CI (C2.9).

### 6.5 Accessibility
- NFR-5.1 WCAG 2.2 AA on our entire admin UI, tested, non-negotiable (P1 §4.3).
- NFR-5.2 Full keyboard operability; visible focus.
- NFR-5.3 Status never conveyed by colour alone — severity carries a text label and shape.
- NFR-5.4 Screen-reader announcement of asynchronous state changes.

### 6.6 Usability
- NFR-6.1 Useful with **zero configuration** after activation.
- NFR-6.2 Every finding and action states its consequence in plain language before technical detail.
- NFR-6.3 No dark patterns, no persistent upsell nags (C1.1, P1 §4.2).
- NFR-6.4 Dark mode and WordPress admin colour-scheme awareness.
- NFR-6.5 Every error message states what happened, what it means, and what to do.

### 6.7 Maintainability *(disproportionately important solo)*
- NFR-7.1 One responsibility per class (brief).
- NFR-7.2 Every engine independently testable without WordPress bootstrapped where feasible.
- NFR-7.3 Rules and fixes are data, so adding coverage requires no new code (C1.3).
- NFR-7.4 PSR-4, namespaced, Composer, WordPress Coding Standards enforced in CI.
- NFR-7.5 No feature ships without documentation, because documentation is cheaper than support (§1.3).

### 6.8 Internationalisation
- NFR-8.1 All strings translatable, correct text domain, no concatenation into sentences.
- NFR-8.2 RTL-safe layouts.

---

## 7. Feature priorities

### Tier 0 — Without these there is no product
Safe update pipeline (E1) · restore points and rollback (FR-3, FR-5) · critical-path verification including WooCommerce checkout (E2) · the ledger (E5) · quiet notifications (E6) · capabilities and REST/CLI surface (FR-11.1–11.3).

### Tier 1 — Without these there is no *differentiated* product
Attribution timeline (E3) · impact ranking (E4) · plain-language explanation everywhere · zero-configuration defaults.

### Tier 2 — Commercial viability
Licensing and signed updates · white-label reports · scheduling and thresholds · weekly digest.

### Tier 3 — Horizon 2
Fleet view · rule packs beyond updates (SEO, accessibility, performance) · Abilities API attribution · performance regression detection.

### Tier 4 — Horizon 3
Agent governance policy and approval · SSO/RBAC · cloud spine · third-party rule packs.

---

## 8. Explicitly out of scope for v1

Stated so the decision is not re-litigated under feature pressure.

**8.1 Everything in P1 §10** (not a chatbot, writing tool, page builder, vulnerability database, WAF, host, backup product, suite).

**8.2 Visual regression testing as the primary gate.** Competitors' approach, and the ceiling on their safety claim (P2 §9). Supplementary at most (FR-4.10).

**8.3 The cloud service.** A hosted service means uptime obligations, on-call, a security surface, and cost — none of which a part-time solo founder can carry. **But FR-11.2 and FR-11.3 are Tier 0 precisely so this stays cheap later.** If every engine is REST- and CLI-addressable from the first commit, the cloud is a thin client we can build when there is a team. If it isn't, the cloud is a rewrite. This is the single most important architectural decision in the document and it costs almost nothing to honour now.

**8.4 Real payment transactions.** Test-mode gateway complexity across dozens of gateways is a multi-month project on its own. FR-4.3's checkout-render-and-fragments check captures the large majority of real breakage at a fraction of the cost.

**8.5 The fleet dashboard.** Marcus is Horizon 2. Building for 120 sites before the single-site engine is proven is the classic mistake.

**8.6 Agent policy enforcement.** Horizon 3. We instrument attribution (FR-6.5) at Horizon 2 so the data asset accumulates before the market arrives (P2 §8.3).

---

## 9. Roadmap

Calibrated to 12–20 hours/week. Milestones are capability gates, not dates — if a gate slips, the next one slips rather than being compressed.

### M0 — Foundations *(~6–8 weeks)*
Repository, CI with WPCS and SAST, plugin skeleton, DI container, PSR-4 autoload, capability model, REST/CLI scaffolding, background-processing state machine, logging.
**Gate:** an empty plugin that activates cleanly on the compatibility matrix, has CI enforcing security gates, and can run a resumable background job on shared hosting.
*Rationale: this is unglamorous and non-negotiable. NFR-2.3 defeats naive implementations, and discovering that in month six is fatal.*

### M1 — The kernel *(~10–14 weeks)*
Restore points, transactional apply, rollback, and the ledger. No UI beyond a debug screen.
**Gate:** a plugin update can be applied and reverted, verifiably, on a site with an object cache, and the ledger proves it. Restore correctness is exercised by an integration suite including interruption scenarios.
*Rationale: this is the moat. If it isn't right, nothing above it matters.*

### M2 — Verification *(~8–12 weeks)*
Critical-path suite, auto-detected defaults, WooCommerce path, fatal-error detection, per-step scoped reporting.
**Gate:** a deliberately broken WooCommerce checkout is caught and rolled back automatically, unattended, and a passing screenshot diff on the same site demonstrably misses it. **That demo is the marketing asset.**

### M3 — Product *(~8–12 weeks)*
Risk assessment, scheduling and thresholds, the admin UI, notifications, ledger export.
**Gate:** a real site maintained by someone who is not the founder, for a month, with no support contact required.

### M4 — First revenue *(~6–10 weeks)*
Licensing, signed updates, white-label reports, documentation, sales page.
**Gate:** first paying customer, acquired without a personal conversation.

**Realistic elapsed time to M4: 10–14 months part-time.** Attribution (E3) and impact ranking (E4) land in M5–M6, after revenue, unless a design partner makes one urgent.

### 9.1 Design partners
Recruit 3–5 at M2, not earlier. Fewer than five, because each one costs support time that comes directly out of build time. Prefer one WooCommerce operator (Dana) among them — the differentiator needs a real store to be proven against.

---

## 10. KPIs

### 10.1 North Star
**Verified safe changes per month** (P1 §7.1). Unchanged.

### 10.2 Counter-metrics *(these keep the North Star honest)*
- **Escaped failures** — changes that passed verification but broke the site. **Target: zero. This is the existential metric** (P1 §6.4).
- **Rollback success rate** — target 100%. A failed rollback is a severity-1 incident.
- **False-positive rate** — verification failures on a healthy site. Erodes trust as fast as escapes.
- **Notifications per site per month** — a ceiling, not a floor (P1 §3, value 2).

### 10.3 Solo-specific operational metrics *(unique to this resourcing)*
- **Support contacts per 100 active sites per month.** The binding constraint on how large this can grow before it stops being viable part-time. Track from the first install. If this doesn't fall over time, growth is dangerous rather than good.
- **Time to first value** — activation to first useful output. Target under 10 minutes with zero configuration.
- **Share of support contacts that a documentation or UX fix would have prevented.** Every one of those is a permanent hour returned.

### 10.4 Business
- Free-to-paid conversion *(benchmarks unverified — P2 §1.2; do not model on assumed figures)*
- Net revenue retention — the primary business metric (P1 §7.2)
- Revenue per hour worked — the honest measure of whether this is worth doing part-time

### 10.5 Explicitly rejected
Active installs, issues found, AI interactions (P1 §7.1). Also rejected: **feature count**, which under solo capacity is a measure of debt.

---

## 11. Free / premium split

### 11.1 The split
Constrained by C1.4 — no trialware, and **safety is never the paywall** (P1 §3, value 4).

| Free | Paid |
|---|---|
| Safe update pipeline, single site | Multiple sites / fleet *(Horizon 2)* |
| Restore points and rollback | White-label and branded reports |
| Critical-path verification | Scheduling and automation thresholds |
| Basic ledger with limited retention | Extended retention and full export |
| Manual operation | Impact ranking and rule packs |

The free tier is genuinely and permanently useful for Priya with one site. Paid begins where the *business* value begins: scale, automation, and evidence.

### 11.2 Sequencing — the recommendation that matters most here

C1 commits us to shipping on WordPress.org. Under solo part-time resourcing, **the order is now a survival question, not a preference.**

A free plugin on the repository can reach thousands of installs quickly, and support load scales with installs regardless of revenue. A part-time solo founder with 5,000 free installs and no paid base has built a full-time unpaid support job.

**Recommendation: premium-first, repository later.**

1. **M4:** launch premium-only, direct. Small number of paying customers, high engagement, direct feedback, real revenue per support hour. This is precisely the WP Rocket model — the archetype recommended in P2 §6.4, which has no free tier and is the most respected product in its category.
2. **After** the support load per customer is measured and the documentation has absorbed the common questions, submit the free tier to the repository as a distribution channel.

C1's build-compliant-from-commit-one rule is unaffected. This is only about *when* we submit — and submitting later costs nothing while submitting early could cost the project.

---

## 12. Risks specific to this plan

| Risk | Severity | Mitigation |
|---|---|---|
| **Scope creep past solo capacity** | Critical | §8's out-of-scope list is a contract. New ideas go to a backlog, not the roadmap. |
| **The kernel is harder than estimated** | High | M1 is deliberately the longest milestone. If restore correctness isn't achieved there, stop and reassess rather than building UI on a weak kernel. |
| **An escaped failure destroys trust early** | Critical | Design partners at M2, not launch. Ship conservative defaults: hold more, auto-apply less. Better to under-automate at first. |
| **Shared hosting defeats background processing** | High | Proven at M0, before anything depends on it. |
| **WooCommerce verification proves too fragile** | High | It is the differentiator, so validate against real stores at M2. Fall back to a narrower, reliable check rather than a broad flaky one. |
| **Support load exceeds part-time capacity** | High | §10.3 metrics from day one; §11.2 sequencing; §1.3 design principle. |
| **Competitor ships functional verification first** | Medium | Likely eventually. Our defence is depth and the ledger, not the feature's existence. |
| **Founder burnout / stall** | High | Capability gates, not dates. A milestone slipping is expected; a milestone being compressed is the actual danger. |

---

## 13. Open questions for Phase 4

1. Background processing on hostile shared hosting: Action Scheduler, a custom loopback runner, or WP-Cron with a fallback chain? Decides FR-1.3 and NFR-2.3 — **the highest-risk technical decision in the product.**
2. Restore point storage: filesystem, database, or delegated to an existing backup plugin (FR-3.6)? Bears on quota, portability, and `open_basedir` constraints.
3. Verification execution: server-side HTTP against self (loopback), which many hosts block, or an external runner, which contradicts §8.3? A real conflict needing resolution.
4. Rule and operation schema versioning under C1.3 — how does a plugin reject data referencing operations it doesn't implement?
5. Admin UI stack: full React app, or server-rendered with targeted interactivity? React is in the brief; under solo capacity, the maintenance cost of a full SPA is a genuine consideration and NFR-6 does not require one.
6. Ledger storage and hash-chaining under WordPress's database constraints (Phase 5).
7. Licensing implementation compatible with C1.1's no-obfuscation rule, which disqualifies most off-the-shelf solutions.

---

*End of Phase 3.*
