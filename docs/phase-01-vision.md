# Phase 1 — Vision Document

**Product:** BuildWithGuru AI (name under review — see §5.5 and §11.3)
**Status:** Approved by founder. Two claims in this document were later corrected by Phase 2 research — see §14.
**Audience:** Founders, first engineering hires, first investor conversations.

---

## 1. What business are we actually in

Before mission or values, the question that decides everything downstream: what do we sell, and why would anyone pay?

Three candidate answers, and why two are dead:

**Candidate A — Detection.** "We find problems on your WordPress site." Dead. Detection is commoditised to zero. Vulnerability data is available from Patchstack and WPScan as a paid feed for a few dollars per site per month. Performance auditing is free from Google via PageSpeed Insights and Lighthouse. Accessibility rule engines are open source (axe-core). SEO auditing is a solved commodity with three free-tier incumbents. Anyone can build detection in a quarter; nobody can charge for it in year three.

**Candidate B — AI text generation.** "We write your content / fix your code with AI." Dead. Every model provider is racing the price to zero, every incumbent plugin has bolted on a generation feature, and the switching cost is one afternoon. There is no defensible position in being a thin wrapper on a frontier model — and by 2026 WordPress core ships its own AI client, which removes even the integration advantage.

**Candidate C — The gap between finding and fixing.** This is the business.

Every incumbent in the WordPress operations market stops at the same place. They tell you something is wrong. Then a human being — usually a freelancer at 11pm, or an agency's most junior technician on a Monday morning — has to decide whether the fix is safe, do it, and hope. The entire industry's answer to "will this break my client's site?" is *a staging site, a screenshot, and a person paying attention.*

The unmet need is not knowing. It is **acting safely and provably**:

> "We found a problem" → **[ this layer is empty ]** → "The problem is gone, nothing else broke, and here is the receipt."

Nobody in WordPress has built that layer as a product. That is what we build.

The one-sentence version, which should survive every rewrite of this document:

> **We do not sell information about your website. We sell changes to your website that are guaranteed not to break it.**

### 1.1 Why this is defensible when detection is not

Detection is a *lookup*. Safe change is a *system*: pre-flight risk assessment, restore points, transactional application, functional verification, automatic rollback, and an immutable record. Each component is individually unglamorous and collectively hard. More importantly, the system gets better with operational data — every change we apply across every site teaches us which changes are risky, on which stacks, in which combinations. That is a compounding asset. A vulnerability database is a subscription someone else sells us.

---

## 2. Mission

**Make changing a WordPress site safe.**

Long form:

> BuildWithGuru exists so that anyone responsible for a WordPress site — a freelancer with nine clients, an agency with four hundred, a store owner with one — can make necessary changes without fear. We assess risk before acting, act reversibly, verify that the site still works, and keep a permanent record of who changed what and why.

### 2.1 What "the feeling of hiring an experienced engineer" actually means

The founder's brief says the product should feel like hiring an experienced WordPress engineer. Decomposed into properties we can build and test, an experienced engineer:

| Property | Implication for the product |
|---|---|
| Knows what matters and what doesn't | Impact-ranked triage. Never a flat list of 400 findings. |
| Won't touch production without a way back | Restore point before every mutating action, always, no setting to disable. |
| Checks their work | Post-change functional verification, not just "did the page load." |
| Explains in plain language | Every finding and action has a human-readable rationale and a stated risk. |
| Says "I don't know" | Explicit confidence levels; refuses to auto-fix below a threshold. |
| Leaves a record | Immutable audit ledger; every change attributable. |
| Doesn't panic you at 3am | Alerts are earned, not generated. Silence is a feature. |

Note what is absent: "talks to you in a chat window." Chat is a *feature of the impression*, not the substance. We may build conversational surfaces; we do not lead with them.

---

## 3. Values

These are engineering constraints written as values. Each one has a test.

**1. Reversible by default.**
No mutating operation ships without a rollback path. If we can't undo it, we don't do it automatically — we surface it as a manual recommendation with instructions.
*Test:* every write path in the codebase has a corresponding restore path with an integration test that exercises it.

**2. Silence is a feature.**
A notification must earn its place. We would rather miss a low-severity issue than train the customer to ignore us. Alert fatigue is the incumbent industry's core product defect and our primary competitive opening.
*Test:* notification volume per site per month is a tracked product metric with a ceiling, not a floor.

**3. Deterministic core, probabilistic edge.**
The engine that changes sites is deterministic and auditable. AI operates at the edges — prioritisation, explanation, classification — and never in the execution path.
*Test:* the fix engine has zero dependencies on any AI provider and its test suite passes with all AI features compiled out.

**4. The site is the customer's, not ours.**
No dark patterns, no upsell nags in the admin, no artificial degradation of the free tier's safety features. Safety is never the paywall.
*Test:* no code path where a licence state reduces the reliability of a change already in progress.

**5. Works when everything else is down.**
The plugin functions with the network unplugged, our servers offline, and the AI provider rate-limited. Degraded features, never degraded safety.
*Test:* full test suite runs with outbound network blocked.

**6. Honest about limits.**
We state what we did not check. "Verification passed" must mean something specific and we must say what it covers.
*Test:* every verification result carries an explicit scope statement in the UI and API.

**7. One responsibility per unit.**
Classes, modules, rules, screens. If a thing has two jobs, it becomes two things.
*Test:* code review gate; no class over a defined complexity budget without written justification.

---

## 4. Brand Identity

### 4.1 Personality

The brand is a **senior engineer who has been paged at 3am too many times to be dramatic about it.**

| We are | We are not |
|---|---|
| Calm | Alarmist |
| Precise | Vague |
| Plain-spoken | Jargon-heavy |
| Confident | Boastful |
| Restrained | Loud |
| Accountable | Deflecting |

### 4.2 Voice rules

- Numbers over adjectives. "Blocked 12 changes this month" beats "powerful protection."
- Never use fear as a primary motivator. The security industry's fear marketing is exhausted and it attracts the wrong customer — one who buys once, panics, and churns.
- Never claim what we can't verify. No "100% safe." No "AI-powered" as a virtue in itself.
- Admit failure fast and specifically. Our incident communications are a marketing asset.
- Avoid "guru," "ninja," "wizard," "magic." (Note the tension with the working name — §11.3.)

### 4.3 Visual direction (principles, not pixels — Phase 8 specifies)

- **Legibility over decoration.** This is an operations tool used under stress. Density and scannability beat whitespace-as-luxury.
- **Native but better.** Feels like it belongs in wp-admin, doesn't feel like it was built in 2011. We adopt WordPress admin conventions (colour scheme awareness, keyboard model, notice placement) and then exceed them in typography and information hierarchy.
- **Colour carries meaning, not brand.** Severity is the only thing allowed to be loud. Green/amber/red reserved exclusively for state. Brand colour never competes with a severity indicator.
- **Dark mode from day one**, because the people using this at 3am asked for it.
- **Accessibility is not a feature of the product, it is a property of the product.** WCAG 2.2 AA on our own UI, non-negotiable, tested. We cannot credibly sell accessibility auditing later from an inaccessible admin.

### 4.4 The promise

Three words that must be true of every release: **Calm. Reversible. Provable.**

---

## 5. Competitive Positioning

*Written to be name-portable — nothing here depends on the product being called BuildWithGuru.*

### 5.1 The category we are entering — and why it's the wrong one

The obvious categories are all traps:

| Category | Incumbent | Why we lose |
|---|---|---|
| Security | Wordfence, Patchstack | Data moat. Wordfence has a decade of attack telemetry from millions of sites. We cannot out-detect them and shouldn't try. |
| Performance | WP Rocket | Ten years of edge cases in cache invalidation. The long tail *is* the product. Entering costs three years to reach parity. |
| SEO | Rank Math, Yoast, AIOSEO | Three entrenched free tiers with enormous install bases. Distribution is the moat and it's taken. |
| Page building | Elementor | Ecosystem lock-in measured in millions of existing pages. Category is closed. |
| Backup | UpdraftPlus, WPVivid, BlogVault | Commoditised, and hosts give it away. |
| Maintenance dashboards | ManageWP, MainWP, WP Umbrella | Priced to near-zero. See Phase 2 §5. |

### 5.2 The category we create

**WordPress Site Reliability.**

Borrowed deliberately from SRE, because the discipline is the right one: the reliability of a system under change is an engineering problem with measurable objectives, not a matter of vigilance. WordPress has never had an SRE layer. It has had security scanners, backup plugins, and dashboards.

Positioning statement:

> For the people responsible when a WordPress site breaks, BuildWithGuru is the reliability layer that makes every change to the site safe, verified, and accountable — so that maintenance stops being a risk you absorb and becomes a process you can prove.

### 5.3 What we are adjacent to, not competing with

Deliberate non-competition is strategy, not modesty. We integrate rather than rebuild:

- **Vulnerability intelligence** (Patchstack, WPScan) — we consume the feed. Never build the database.
- **Backup** (UpdraftPlus, BlogVault, hosts) — we create restore points and can drive existing backup tools. Our restore points are change-scoped and fast, not a competitor to full-site archival.
- **Hosting** (WP Engine, Kinsta, Cloudways) — potential channel, and structurally limited in the layer we occupy (Phase 2 §7.2).
- **Security plugins** — a firewall answers a different question than "is this change safe."

### 5.4 Positioning against the four archetypes we *do* displace

1. **The alerting tool** ("here are 400 issues"). We displace it by ranking and acting. Their metric is issues found; ours is issues resolved.
2. **The manual dashboard** ("here are your 40 sites, click update"). We displace it by making the click safe and unnecessary.
3. **The staging-site ritual** (clone, update, eyeball, push). We displace it by automating the judgment, not just the cloning.
4. **The human retainer's uncosted risk** (the agency absorbing breakage for free). We displace it by turning absorbed risk into a billable, provable service.

### 5.5 Name-portability note

Section 5 and the entire positioning above hold under any product name. This is intentional: see §11.3 for why the working name should be reviewed before we spend on brand assets, and §12.3 for the decision required.

---

## 6. Unique Selling Proposition

### 6.1 The USP

> **It doesn't just find problems. It fixes them — safely, automatically, and provably.**

The three qualifiers carry the weight. Competitors can claim the verb. None can claim all three adverbs.

### 6.2 The four moats

A USP without a moat is a tagline. Four defensible assets, in order of how hard they are to copy:

**Moat 1 — The Safety Engine.**
A deterministic system that, for any proposed change: assesses risk from a knowledge base of known-bad combinations, creates a scoped restore point, applies the change transactionally, runs functional verification against the site's actual revenue and conversion paths, and rolls back automatically on failure — with the whole sequence recorded.
*Why it's hard:* correctness under partial failure. Every naive implementation is a footgun. The value is in the thousand edge cases: what if the DB write succeeds and the file write fails; what if the site has an object cache; what if verification itself times out; what if two changes are in flight. This is where the engineering years go, and it is why a competitor cannot ship it in a sprint.

**Moat 2 — Change Attribution.**
A complete timeline of every change to the site — plugin updates, option writes, file modifications, user actions, cron events, automation, and AI or agent actions — such that any regression can be traced to a cause. "The site got slow on Tuesday" becomes "these four things changed on Tuesday; this one is the cause."
*Why it's hard:* comprehensive capture requires hooking WordPress at many layers without measurable overhead. Also: it's a data product. Its value grows with retention, so it deepens the longer a customer stays. That's the switching cost.

**Moat 3 — Impact-Ranked Triage.**
Findings ordered by consequence to *this* site, not by generic severity. A missing alt tag on a 404 page and a broken checkout are not both "medium." Ranking requires understanding which pages earn money, which templates are shared, and what actually gets traffic.
*Why it's hard:* requires site-specific context (analytics, WooCommerce data, template relationships) plus judgment. This is the one place AI genuinely earns its seat, and the one place incumbents' flat-list architectures cannot be retrofitted.

**Moat 4 — The Ledger.**
An immutable, exportable, signed record of everything we did and everything we verified. Turns our output into a deliverable the customer can bill against, hand to a client, or produce for an auditor.
*Why it's hard:* it's not technically hard at all. It's a *business model* moat. It converts our software from a tool the agency buys into evidence the agency sells. That changes what we can charge (Phase 2 §5.4) and it's invisible to a competitor thinking in features.

### 6.3 AI's place, made architecturally binding

The founder's brief is emphatic: the AI is not the product. To make that survive contact with a roadmap, four hard rules — all of them enforceable in code review, all of them repeated as Phase 4 constraints:

1. **No AI output is ever executed.** AI may propose, classify, rank, and explain. Every action taken against a site is a deterministic, pre-audited operation from a known catalogue. The AI selects from the catalogue; it never authors the operation.
2. **Every AI decision has a deterministic fallback.** If the provider is down, rate-limited, or returns garbage, the product still works — with a rules-based ranking instead of a learned one.
3. **AI is never on the availability critical path.** No AI call blocks a scan, a fix, a rollback, or a page load.
4. **AI usage is always visible and attributable.** The customer can see which decisions involved AI and what it said.

This buys a claim no competitor with an AI-first architecture can make:

> **AI helps us think. It never touches your site.**

That sentence is a moat in the enterprise and agency segments, where "we let an AI edit client sites" is unsellable.

### 6.4 Risks to the USP

- **A host ships it.** The largest risk. Hosts have distribution and infrastructure. Mitigation in §6.5 and Phase 2 §7.2.
- **An incumbent bolts on rollback.** Likely, and shallow. Their architectures are detection-first; retrofitting transactional change and functional verification is a rewrite. Our answer is depth of verification, not presence of the feature.
- **Core absorbs it.** WordPress core adding rollback primitives would help us more than hurt us — we'd build on them.
- **We over-promise.** The single fastest way to destroy this brand is one widely-shared incident where our "safe" change destroyed a site and our rollback failed. This is an existential engineering-quality risk, not a marketing risk.

### 6.5 Why the AI-agent shift matters to positioning

*(Filed in the approved draft as a medium-term risk. Phase 2 concluded this was the wrong reading and it is in fact the primary opportunity — see §14.2.)*

As AI agents gain write access to WordPress sites, someone will have to govern what they're allowed to do. The governance layer — policy, approval, pre-flight, restore point, verification, rollback, audit — is the same kernel described in §6.2. If agent write access becomes normal, our product becomes infrastructure rather than a tool.

---

## 7. Business Goals

### 7.1 North Star metric

**Verified safe changes per month.**

The number of changes applied to customer sites that were pre-flighted, executed, verified, and either confirmed good or automatically rolled back.

Why this one:

- It only increases when we deliver the actual value.
- It is impossible to inflate without doing the work.
- It aligns engineering, product, and marketing on the same number.
- It scales with both customer count and depth of adoption.

Metrics explicitly rejected:

| Rejected | Why |
|---|---|
| Active installs | Measures distribution, not value. Optimising it produces a bloated free tier. |
| Issues found | **Actively perverse.** It rewards the alert noise we are positioning against. A product that maximises findings is the product we're displacing. |
| MRR (as North Star) | It's the scoreboard, not the steering wheel. Lags the thing we control. |
| AI interactions | Measures a feature we've declared is not the product. |

Supporting counter-metric, to keep the North Star honest: **rollback rate** and **post-verification incident rate**. High volume with rising incidents is failure, not growth.

### 7.2 Goals by horizon

Deliberately expressed as capability and evidence milestones, not revenue fantasy, because revenue targets set before a single customer interview are theatre.

**Horizon 1 — Prove the core (months 0–6)**
- Safety Engine handles the update pipeline end-to-end on a defined stack matrix.
- Functional verification covers the revenue path (checkout, forms, login) — not just pixels.
- Change timeline captures the full set of mutation sources.
- 20 design-partner sites in production, real breakages caught, zero unrecovered failures.
- Evidence goal: a documented incident where we prevented a real outage, with the ledger as proof.

**Horizon 2 — Prove the business (months 6–18)**
- Paid tier live with licensing, fleet view, and white-label reporting.
- Sold into the liability budget, not the tooling budget (Phase 2 §5.4).
- Retention over acquisition: net revenue retention is the primary business metric.
- Evidence goal: agencies renewing and citing the ledger in their own client billing.

**Horizon 3 — Prove the platform (months 18–36)**
- Rule packs from third parties; the engine is a platform others extend.
- Agent governance shipped as a first-class surface.
- Enterprise: SSO, RBAC, exportable compliance evidence.

### 7.3 Constraints assumed

Stated so they can be corrected: very small team (1–3 people), no outside capital, revenue-funded, long time horizon. If any of these are wrong, §7.2 changes materially. See §12.6.

---

## 8. Customer Pain Points

Ranked by *pain × frequency × willingness to pay*. Each is a hypothesis with a stated test, because a vision document that asserts customer pain without validation is the most common way products die.

**P1 — "I don't know if this update will break the site."**
*Who:* everyone, most acutely freelancers and agencies.
*Current coping:* staging clone, manual eyeball, or simply crossing fingers. Or — most commonly — disabling auto-updates entirely, which trades an availability risk for a security risk.
*Money attached:* yes. Breakage costs billable hours and client trust.
*Test:* do prospects report update-caused incidents in the last 90 days, and can they quantify the cost?

**P2 — "Something broke and I have no idea what changed."**
*Who:* anyone maintaining a site they didn't build alone.
*Current coping:* guesswork, bisecting by deactivating plugins on production.
*Money attached:* yes — this is billed as emergency work at premium rates, which means the agency has a pricing incentive we must respect rather than ignore.
*Test:* time-to-diagnosis on the last three incidents.

**P3 — "I can't keep up with vulnerabilities."**
*Who:* everyone; existential for agencies with client liability.
*Current coping:* a security plugin that alerts, and hope.
*Money attached:* yes, and it's insurance-shaped — high willingness to pay for accountability, low for information.
*Test:* how many sites are currently running a known-vulnerable component, and does the prospect know the number?

**P4 — "I'm drowning in notifications I can't act on."**
*Who:* anyone running more than ten sites.
*Current coping:* email filters. Ignoring the tool.
*Money attached:* indirectly — it's the churn driver for incumbents, so it's an acquisition lever for us.
*Test:* ask to see their inbox rules.

**P5 — "I can't prove to the client that I did anything."**
*Who:* agencies and freelancers on retainer.
*Current coping:* manually assembled monthly PDF reports, or nothing.
*Money attached:* directly. This is retainer-justification, i.e. revenue defence.
*Test:* what do they send clients monthly, and how long does producing it take?

**P6 — "Managing N sites means N logins."**
*Who:* agencies.
*Money attached:* yes, but commoditised to near-zero by existing dashboards. This is a *table stake*, not a wedge.

**P7 — "I don't know which of these 400 findings matters."**
*Who:* anyone who has run an audit tool.
*Money attached:* weakly on its own; strongly as a multiplier on P1–P3.

**P8 — (emerging) "I can't let an AI agent near a client site."**
*Who:* early-adopter agencies, and everyone eventually.
*Money attached:* unproven. This is the timing question — see Phase 2 §12.

### 8.1 The pain we are *not* solving

- "I need content written." Commoditised, and off-mission.
- "I need a page builder." Category closed.
- "I need cheaper hosting." Not our business.
- "I need more traffic." SEO is a later rule pack, never the wedge.

---

## 9. Future Vision

### 9.1 The five-year statement, precisely defined

The founder's brief: "the operating system for managing WordPress websites." Kept — with a definition that makes it buildable rather than a euphemism for "thirteen products in one plugin" (§11.1).

An operating system does four things. It **schedules** work, **mediates** access to resources, **isolates** failures, and **provides interfaces** that applications build on. It does not implement the applications.

So, precisely:

> In five years, BuildWithGuru is the layer through which all changes to a WordPress site pass. It schedules them, decides whether they're permitted, isolates their failures, verifies their effects, records them — and exposes an interface so that anyone (us, third parties, or AI agents) can propose changes safely.

**We build the kernel and the interfaces. We do not build thirteen products.**

Under that definition, the founder's domain list becomes rule packs and change providers on a common engine — some ours, most not:

| Domain | Our role |
|---|---|
| Security | Consume vulnerability feeds; own the *remediation* pipeline. |
| Performance | Own regression detection under change; not a caching engine. |
| SEO | Rule pack; regression detection on ranking-relevant changes. |
| Accessibility | Rule pack on open-source engines; own the safe-fix path. |
| WooCommerce | Highest-value verification target: the revenue path. |
| Elementor / builders | Change source to attribute and verify; never rebuild. |
| Backups | Restore points; integrate with existing backup tools. |
| Reports | The Ledger, productised. Ours, and core to monetisation. |
| Content / analytics | Signals feeding impact ranking. Not products. |
| Monitoring | Verification's continuous form. Ours. |
| AI automation | The governed proposer. Ours, and governed by the kernel. |

### 9.2 The three-act structure

**Act 1 — The tool.** We are the thing you install to stop being scared of updates. Value is immediate and local. Single-site and small-fleet users.

**Act 2 — The system of record.** The change ledger becomes the authoritative history of the site. Switching cost stops being the feature set and becomes the data. Agencies standardise on us because the record is what they sell.

**Act 3 — The control plane.** Anything that wants to change a WordPress site — plugin updater, agency technician, CI pipeline, AI agent — goes through our interface because that's where policy, verification, and accountability live. At that point we are infrastructure, and infrastructure gets acquired or endures.

### 9.3 What would have to be true

Honest preconditions, so we can detect failure early:

- Act 1 requires that update-caused breakage is common enough to be worth preventing. **Unverified.** See §13.1 — this is the single most important thing Phase 2 must test.
- Act 2 requires customers to stay long enough for the ledger to matter. Retention is therefore the business, and churn is the existential metric.
- Act 3 requires that programmatic change to WordPress sites becomes normal. The AI-agent trend is the bet; if it stalls, we remain an excellent Act 2 company, which is a good outcome, not a failure.

---

## 10. Explicit Non-Goals

Written down so that future feature pressure meets a documented decision rather than a fresh debate.

1. **Not a chatbot.** No conversational interface as the primary surface.
2. **Not an AI writing tool.** No content generation as a headline feature, ever.
3. **Not a page builder, form builder, or CRM.**
4. **Not a vulnerability database.** We consume; we do not curate.
5. **Not a WAF / firewall.** Different question, different product, brutal false-positive economics.
6. **Not a host.** No infrastructure ambitions.
7. **Not a full-site backup product.** Restore points are scoped to changes.
8. **Not a bundle/suite.** The suite play (Jetpack, iThemes/StellarWP) is a documented failure mode — bloat, unfocused roadmap, and a support surface that eats the company. Phase 2 §6 provides current evidence.
9. **Not free-forever-everything.** Safety is never the paywall (§3, value 4), but fleet, reporting, and automation are legitimately paid.
10. **Not enterprise-first.** Enterprise requirements (SSO, RBAC, audit export) are Horizon 3. Building for them at Horizon 1 kills velocity.

---

## 11. Where I disagree with the brief

The founder asked to be challenged. Three disagreements, all inside Phase 1's blast radius.

### 11.1 "Manage every aspect of your website" is the failure mode, not the vision

The brief lists thirteen domains for one plugin, and separately demands the product be "fast, reliable, minimal, no bloat." Those requirements are in direct conflict, and the conflict has been resolved empirically before:

- **Jetpack** ran this experiment. The result is the most-complained-about plugin in the ecosystem, criticised for exactly the properties this brief forbids.
- **iThemes / StellarWP** ran it. Result: the security product has been renamed three times in five years and, as of May 2026, is no longer sold standalone (Phase 2 §6).

Meanwhile every product on the founder's own excellence list owned exactly one job for years, then expanded through *ecosystem*, not by fattening the core: Elementor was a page builder before it was a platform. Rank Math was SEO. WP Rocket is still, in 2026, just caching, and is the most respected product in its category.

**The pattern is: win one job completely, then let the ecosystem extend you.**

I have kept the five-year ambition fully intact and reframed it as a destination reached through a wedge (§9.1). The recommended wedge is **change safety**, because:

- It is the top-ranked pain with money attached (§8, P1/P2).
- It appeared unclaimed. *(This was wrong — see §14.1.)*
- Building it first makes every later domain cheap: SEO, accessibility, and performance all become rule packs on the same engine, and every one of them needs the same safe-fix pipeline. Building breadth first means building thirteen shallow products and then discovering none of them can act safely.

### 11.2 "Plugin-first, cloud optional" gives your highest-paying customer the worst product

An agency with forty sites will not log into forty dashboards. The customers who pay the most need exactly the thing the brief makes optional. But cloud-first is a company inside the company — infrastructure, uptime obligations, security surface, and cost that a revenue-funded team of three cannot carry at Horizon 1.

**Proposed resolution: local brain, thin spine.**

- The **plugin** is complete and self-sufficient. Every engine — scan, pre-flight, fix, verify, rollback, ledger — runs locally and works with the network unplugged.
- The **cloud** aggregates already-computed results and holds only what must be central: licence state, vulnerability feed distribution, fleet view, cross-site reporting, and notification fan-out. It never computes what the plugin can compute.

This is not a compromise, it's an architectural constraint with a hard implication for Phase 4: **every engine must be REST- and CLI-addressable from the first commit.** If the local product is fully driveable by API from day one, the cloud is a thin client we can build later without a rewrite. If it isn't, the cloud becomes a rewrite. This is cheap now and expensive in eighteen months.

### 11.3 The name has three concrete problems

Stated as a flag, not a refusal — the name is used throughout this document.

1. **"AI" in the name sets the exact expectation the brief says is wrong.** The brief insists the AI is not the product; the name announces that it is. It also dates the product — "AI" in a 2026 product name will read like "2.0" or "cloud" did.
2. **"Guru" fights the brand.** §4.2 bans "guru/ninja/wizard" from our voice because they signal low-credibility marketing in a category where we are selling engineering credibility to engineers. The name shouldn't violate our own voice guide. It also carries a cultural-appropriation cost that is a live issue in Western software branding.
3. **Trademark crowding.** "Guru" is heavily used in software and services classes. Clearance should happen *before* we spend on brand assets, domains, or a launch — not after.

Naming criteria if revised: pronounceable and spellable on a support call; no technology-of-the-moment terms; clearable in relevant trademark classes; domain obtainable; suggests reliability or accountability rather than cleverness; survives the product growing beyond its wedge.

**Recommendation:** commission a trademark clearance search now regardless of the naming decision. It is cheap, slow, and irreversible if skipped.

---

## 12. Decisions required before Phase 2

Each with my recommendation.

**12.1 Wedge-first or breadth-first?**
*Recommendation:* wedge-first on change safety. Changes the PRD and the architecture. See §11.1.

**12.2 Accept "local brain, thin spine"?**
*Recommendation:* yes. Changes Phases 4 and 5. See §11.2.

**12.3 Is the name open to revision?**
*Recommendation:* yes, and run clearance immediately either way. See §11.3.

**12.4 Is the v1 headline the update pipeline or the change timeline?**
Both ship in Horizon 1; one leads the marketing and gets the polish budget.
*Recommendation:* the update pipeline. It attaches to a pain the customer already feels and already pays for (P1). The timeline is the deeper moat but it's a "you'll appreciate this later" product — hard to sell cold.

**12.5 Free tier on WordPress.org — yes or no?**
The biggest go-to-market fork. The repository is the ecosystem's distribution channel, and its guidelines constrain what free code may do (notably around external services and bundled binaries).
*Recommendation:* yes, eventually, with a genuinely useful free tier that never paywalls safety — but not at Horizon 1. Shipping to the repository before the engine is hardened converts our worst engineering failures into public one-star reviews on a permanent record.

**12.6 Team size, budget, timeline.**
Assumed in §7.3: 1–3 people, no outside capital, revenue-funded, long horizon. If wrong, the roadmap and goals change materially.

---

## 13. Open questions for Phase 2

**13.1 The load-bearing empirical question.** The entire wedge rests on a claim I have not verified: *that updates cause a large share of WordPress breakages.* Phase 2 must test it. If the answer is "a small fraction," we change direction then — cheaply — rather than after Phase 4.

**13.2** Who, if anyone, already occupies the change-safety position? Hosts in particular.

**13.3** What is the real price ceiling for per-site maintenance tooling, and what do agencies charge their own clients for the same job?

**13.4** Is vulnerability data licensable on terms that make building it unnecessary?

**13.5** What is the actual state of AI agent write access to WordPress, and are agencies permitting it yet?

**13.6** What does the incumbent churn evidence say about alert fatigue as an acquisition lever?

---

## 14. Corrections issued by Phase 2

Recorded here so this document is not read in isolation.

**14.1 §11.1's claim that the change-safety wedge is unclaimed was wrong.** Six products ship pre-flighted updates with visual-regression testing and automatic rollback, four of them hosts. The strategic conclusion (wedge-first, change safety as the engine) survives; the claim of an empty field does not. Phase 2 §4 and §8 revise the wedge to *governing every change to the site* and identify the genuinely empty position. See Phase 2 §14.1.

**14.2 §6.5 filed AI-agent governance as a medium-term risk. It is the primary opportunity.** WordPress 7.0 shipped agent infrastructure into core with no policy, approval, pre-flight, verification, rollback, or audit layer around it. That is the kernel this document already specifies, pointed at a position with no incumbent. See Phase 2 §3.

---

*End of Phase 1.*
