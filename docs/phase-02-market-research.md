# Phase 2 — Market Research

**Status:** Complete. Corrects Phase 1 in two places (§14).
**Research window:** July 2026. Live-source pass completed; two data points unverified (§1.2).

---

## 1. Method and provenance

### 1.1 Method

Ten competitors were required by the brief (Elementor, Wordfence, Rank Math, WP Rocket, ManageWP, MainWP, AI Engine, WPVivid, Solid Security, Patchstack). An eleventh — **WP Umbrella** — was added during research because it is the closest competitor to the Phase 1 concept and was missed in Phase 1 entirely.

For each: what they actually sell, why they won, where they are structurally weak, and what their weakness implies for us. The brief's instruction to focus on unmet needs rather than feature copying is followed — §11 is the output that matters, not the teardowns.

### 1.2 Provenance of figures — read this before quoting any number

Honesty about data quality matters more here than completeness, because a strategy built on invented numbers is worse than one built on none.

| Class | Figures | Confidence |
|---|---|---|
| **Verified in the live pass** | WordPress 7.0 AI infrastructure and release date; Kadence Security rebrand, pricing move and review backlash; WP Umbrella pricing and customer counts; Patchstack 2025 vulnerability statistics; Wordfence Response vs Premium pricing; ManageWP and MainWP pricing; the list of vendors shipping safe-update/rollback | High |
| **Order-of-magnitude, general knowledge** | Active-install counts for Elementor, Wordfence, Rank Math, WP Rocket, WPVivid, AI Engine | Approximate — directionally reliable, do not quote precisely |
| **Unverified — flagged** | Freemium conversion benchmarks; Elementor's financials | **Not established.** Both are Phase 12 inputs. Do not build pricing models on them without verification. |

The last two searches of the research pass hit the organisation's monthly spend limit, which is why §1.2's third row exists.

---

## 2. The market map

WordPress commercial plugins cluster into six positions. Understanding which position a competitor occupies explains their strategy better than their feature list.

| Position | Business model | Moat | Examples |
|---|---|---|---|
| **Distribution plays** | Free tier at massive scale → upsell | Install base | Elementor, Rank Math, Yoast |
| **Data plays** | Sell access to a curated dataset | The dataset | Patchstack, WPScan, Wordfence |
| **Craft plays** | One job, done better than anyone | Depth of edge cases | WP Rocket, Gravity Forms |
| **Fleet plays** | Per-site management at scale | Switching cost / workflow | ManageWP, MainWP, WP Umbrella |
| **Suite plays** | Bundle many jobs | Bundled pricing | Jetpack, StellarWP/Kadence |
| **Infrastructure plays** | Ship it with the hosting | Distribution + control | WP Engine, Kinsta, Cloudways |

Two conclusions immediately:

1. **The suite position is the observable loser.** Both major suite plays are in visible decline or disarray (§6.9). This is current, public evidence for Phase 1 §11.1's argument against breadth-first.
2. **Fleet plays have no moat and know it.** Which is why they're priced at the floor (§5). Any strategy whose primary value proposition is "manage N sites in one place" is entering a market with a $0–2 price ceiling.

---

## 3. The finding that reframes the strategy: WordPress 7.0

**WordPress 7.0 shipped on 20 May 2026 with AI agent infrastructure in core.**

Four new pieces:

- **Abilities API** — a registry through which plugins and core expose discrete, callable capabilities.
- **MCP Adapter** — exposes those abilities over Model Context Protocol, so external AI agents can discover and invoke them.
- **AI Client** — a provider-agnostic client so plugins can call models without bundling an SDK.
- **Connectors API** — standardised external-service connections.

WordPress.com granted agents write access in March 2026. Agents can already, in the field, install plugins, manage users, and edit WooCommerce products.

### 3.1 What safety exists around it

**Per-ability capability checks.** That is the whole of it.

There is no:

- policy layer (which agents may do what, on which sites, under what conditions)
- approval workflow (human-in-the-loop for consequential actions)
- pre-flight risk assessment
- restore point before agent action
- verification that the site still works afterwards
- rollback on failure
- audit ledger of what an agent did and why

Nobody has built any of it. I searched specifically for it.

### 3.2 Why this matters more than any competitor finding

That gap list is, item for item, the kernel Phase 1 §6.2 already specifies. The Safety Engine, Change Attribution, and the Ledger are precisely what agent governance requires. Phase 1 designed the right machine and pointed it at a field that turned out to be crowded (§4); this is the same machine pointed at a position with **no incumbent at all**, created three months ago by a platform shift in core.

Three properties make it strategically rare:

1. **No incumbent.** Not "a weak incumbent." None.
2. **Hosts are structurally badly placed to take it.** Host tooling operates on infrastructure — files, databases, containers, snapshots. Agent governance lives inside the WordPress permission and hook layer, because that is where abilities are registered and invoked. A host can snapshot a container; it cannot see that an agent called `update_user_role` and decide whether policy permits it. See §7.2.
3. **The timing is early but not speculative.** Core shipped it. The write access is live. The question is adoption rate, not whether it happens.

### 3.3 The honest counter-argument

This may be three months too early. Enterprise-grade governance sells when there is something painful to govern, and in July 2026 most agencies may not yet be letting agents touch client sites. Building governance-first for a market that arrives in 2027 burns the runway of a revenue-funded team.

That is a real risk and §8.3 addresses it with sequencing rather than by ignoring it.

---

## 4. The Phase 1 wedge is already occupied

Phase 1 §11.1 asserted the change-safety wedge was unclaimed. It is not.

**Six products ship pre-flighted updates with automatic rollback today:**

| Vendor | Type | Notes |
|---|---|---|
| **WP Umbrella** | Plugin/SaaS | Safe updates with visual-regression testing and auto-rollback since October 2024 |
| **WP Engine** | Host | Smart/automated plugin updates with visual comparison |
| **Cloudways** | Host | Safe-update tooling with pre/post comparison |
| **Flywheel** | Host | Equivalent |
| **Staq** | Host | Equivalent |
| **WP Upgrader** | Tool | Equivalent |

Four of the six are hosting companies. The risk Phase 1 §6.4 named as our largest — "a host ships it" — **has already materialised for this exact feature.**

### 4.1 What this does and does not invalidate

**Invalidated:** the claim of an empty field, and any go-to-market that leads with "we make updates safe" as though it were novel. It is now table stakes with free distribution attached.

**Not invalidated:** the engine. Every one of these six implementations shares the same ceiling (§9): their verification is a screenshot diff. They can tell you the pixels moved. They cannot tell you the checkout broke. And none of them attribute change, rank by impact, or produce a defensible record.

The correct reading: safe updates are the **price of entry**, not the differentiator. We must build them because a product in this category without them is not credible — and we must not sell on them.

---

## 5. The price ceiling, and why it forecloses the obvious business model

### 5.1 What per-site management actually costs today

| Product | Price |
|---|---|
| **WP Umbrella** | €1.99 / site / month, all-inclusive |
| **ManageWP** | Free core; roughly $1.50 / site / month at 100 sites with add-ons |
| **MainWP** | $599 lifetime, unlimited sites |
| **Host-bundled** | $0 marginal |

"Maintenance dashboard" is commoditised to **$0–2 per site per month.** A lifetime-unlimited option exists at $599. There is no room in this market, and it is the market Phase 1 §8 P6 correctly identified as a table stake.

If our business model is per-site tooling fees, our revenue ceiling is set by WP Umbrella's willingness to charge €1.99 — and they have 5,000+ agencies of scale advantage.

### 5.2 The contrasting data point that shows the way out

**Wordfence charges roughly $149/year for Premium and $1,250/year for Response.**

Same software. What the extra ~$1,100 buys is **accountability**: a response-time commitment and someone on the hook when it goes wrong. The market pays 8x for the same code plus a promise.

### 5.3 The gap that defines our pricing

Agencies charge their clients on the order of **$150 per site per month** for maintenance, while paying **$2 per site per month** for the tooling that does it.

The margin is enormous and it is not in the tooling budget. It is in the *labour and liability* budget — the hours a technician spends and the risk the agency absorbs when a site breaks.

### 5.4 Strategic conclusion: sell into the liability budget

We must not be priced as tooling. Three implications:

1. **Price against the labour we remove and the liability we absorb**, not against per-site dashboards. A product that provably prevents one outage per quarter is worth a fraction of the outage, not a fraction of a dashboard subscription.
2. **The Ledger is the pricing mechanism** (Phase 1 §6.2, Moat 4). It converts our output from a tool the agency buys into evidence the agency sells and bills against. Evidence commands a different price than a dashboard.
3. **Accountability tiers are legitimate and expected** — the Wordfence data proves the market accepts them. Guarantees, response commitments, and eventually indemnity-shaped offerings are the premium ladder. Not more features.

This is a material change from any pricing assumption implied by Phase 1, and it is decision §13.2.

---

## 6. Competitor teardowns

*Install figures marked (~) are order-of-magnitude general knowledge, per §1.2.*

### 6.1 Elementor — the distribution play
**What they sell:** visual page building; the platform beneath it. (~10M+ active installs.) Financials unverified (§1.2).
**Why they won:** free tier at enormous scale, an add-on ecosystem that made third parties invested in their survival, and a template/kit economy that made the switching cost measured in existing pages.
**Weaknesses:** performance reputation (DOM weight, CSS bloat); a bloated core driven by feature-parity competition; painful major-version migrations; the ecosystem is now also a support liability.
**Implication for us:** the ecosystem lesson is the one to take — third parties who profit from your existence defend your position. Elementor is also a *change source* we must attribute and verify, never rebuild. Their performance reputation is a live example of what breadth-first does to a core product (Phase 1 §11.1).

### 6.2 Wordfence — the data play with an accountability ladder
**What they sell:** firewall, malware scanning, vulnerability intelligence. (~4M+ installs.) Premium ~$149/yr; Response ~$1,250/yr.
**Why they won:** a decade of attack telemetry from millions of sites — a genuine data moat — plus first-mover credibility and a respected research team.
**Weaknesses:** heavy resource footprint (the scanner is a known performance complaint); noisy alerting; a UI that shows its age; detection-first architecture with almost nothing in the remediation layer beyond blocking.
**Implication for us:** do not compete on detection — the moat is real and unassailable. **Do** copy the accountability ladder (§5.2). Their alert noise is our acquisition lever (Phase 1 §8 P4).

### 6.3 Rank Math — the distribution play executed fast
**What they sell:** SEO. (~3M+ installs.)
**Why they won:** aggressive feature velocity against a slower incumbent, generous free tier, and a UI that made a technical job feel manageable.
**Weaknesses:** feature sprawl; a settings surface that overwhelms; the "score" gamification produces busywork rather than outcomes.
**Implication for us:** the negative lesson is the important one. Their score-and-checklist model is exactly the flat-list, findings-maximising design that Phase 1 §7.1 rejects as a North Star. SEO is a later rule pack for us, never a wedge — the free-tier distribution moat here is taken.

### 6.4 WP Rocket — the craft play, and the model to emulate
**What they sell:** caching and front-end optimisation. Premium only, no free tier. (~a few million installs.)
**Why they won:** they do **one job**, with sane defaults that work on activation, and a decade of accumulated edge cases in cache invalidation. Reputation is their marketing.
**Weaknesses:** narrow by design; premium-only limits distribution; commoditisation pressure from hosts bundling caching.
**Implication for us:** **this is the archetype for us.** One job, done to a standard nobody matches, sold at a real price without a free tier as a crutch. It is also the direct counter-example to the brief's thirteen-domain ambition: WP Rocket is still just caching in 2026 and is the most respected product in its category.

### 6.5 ManageWP — the fleet play, commoditised
**What they sell:** multi-site management. Free core; ~$1.50/site/month at scale with add-ons.
**Why they won:** first credible mover; the free tier made it default for freelancers; acquired by GoDaddy, which secured distribution.
**Weaknesses:** post-acquisition stagnation; per-add-on pricing that gets fiddly; fundamentally a *dashboard* — it surfaces and executes, it does not judge. No pre-flight, no functional verification, no attribution.
**Implication for us:** proof that the fleet position has no moat (§5.1). Also proof of what happens to a product whose value is "convenient access": it gets acquired and coasts.

### 6.6 MainWP — the self-hosted fleet play
**What they sell:** self-hosted multi-site management. $599 lifetime, unlimited.
**Why they won:** self-hosted appeals to privacy- and control-conscious agencies; open-source ethos; lifetime pricing.
**Weaknesses:** lifetime pricing is a structural revenue problem (no renewal base to fund development); dated UX; self-hosting shifts the reliability burden onto the customer, which is a poor fit for a product whose value is reliability.
**Implication for us:** never sell lifetime licences for a product with ongoing operational cost. It caps the company's ability to fund the very depth that is our moat.

### 6.7 AI Engine — the cautionary tale
**What they sell:** AI features for WordPress — chatbots, content generation, assistants. (~100k+ installs.)
**Why it matters:** it is the closest thing to "an AI plugin for WordPress," and it demonstrates the ceiling of that category. It is a capable, well-regarded plugin in a position with no defence: every capability it offers is being absorbed by model providers, by competitors, and now by WordPress core itself via the AI Client and MCP Adapter (§3).
**Weaknesses:** thin-wrapper economics; value migrates to whoever owns the model or the distribution; no compounding data asset.
**Implication for us:** direct vindication of Phase 1 §1 Candidate B and §6.3. Being an AI plugin is not a business. Core shipping an AI client removes even the integration advantage. Our AI must be a component of a system with its own moat — never the product.

### 6.8 WPVivid — the commoditised utility
**What they sell:** backup, migration, staging. (~500k+ installs.)
**Why they won:** a genuinely generous free tier including migration, which is the painful bit.
**Weaknesses:** competing against free — hosts bundle backups, and so do the fleet tools; restore is the hard part and is where utility backup products are weakest; no differentiation beyond price.
**Implication for us:** confirms Phase 1 §10.7 — do not build a full-site backup product. Restore points scoped to a change are a different and better-defended thing. And note where the weakness is: *restore*, not backup. Our engine lives or dies on restore correctness.

### 6.9 Solid Security → Kadence Security — the suite play failing in public
**Current state, verified:** rebranded from Solid Security to **Kadence Security in May 2026** as part of a Liquid Web brand consolidation. This is the **third rename in five years** (iThemes Security → Solid Security → Kadence Security). It is **no longer sold standalone**. Price moved from roughly **$99 to roughly $299/year** as part of bundling. There are **285 one-star reviews** and a support thread titled *"Nonsense Rebrand."* StellarWP-era patches end **April 2027**. Install base ~700k.
**What went wrong:** ownership churn, repeated identity resets that destroyed accumulated brand equity, forced bundling that tripled the effective price for single-product customers, and a security product whose Pro vulnerability patching is now sourced from **Patchstack** — i.e. the differentiator is rented.
**Implication for us, three ways:**
1. **A dated displacement window on a 700k install base.** Patches end April 2027; the customers are annoyed and publicly saying so. That is a migration opportunity with a calendar attached.
2. **Public, current evidence for Phase 1 §11.1's anti-bundling argument** — and for §11.3's naming argument, since this is a company that has now paid the rename cost three times.
3. **Confirmation of the rent-vs-build call:** even a dedicated security vendor licenses its vulnerability data. Phase 1 §5.3 was right to consume rather than build.

### 6.10 Patchstack — the data play we should partner with
**What they sell:** vulnerability intelligence and virtual patching, roughly $5/site/month territory.
**Why they won:** they built the dataset, then made it a platform — Kadence Security Pro and WP Umbrella both consume it. They monetise being upstream of everyone.
**Their 2025 data, verified:**

| Metric | 2025 |
|---|---|
| New vulnerabilities disclosed | 11,334 (+42% YoY) |
| Share in plugins | 91% |
| Median time to first exploitation | **5 hours** |
| Exploited within 6 hours | 20% |
| **Disclosed with no patch available** | **46%** |

**Implication for us — two conclusions, both important:**

1. **The automation case is now empirical.** A five-hour median to exploitation defeats human patch cadence mathematically. No agency, however diligent, patches 40 sites within five hours of disclosure. This is the strongest available argument for automated, verified remediation, and it comes from a third party.
2. **"Just update fast" fails 46% of the time.** Nearly half of disclosures have no patch at disclosure — which is precisely why virtual patching is Patchstack's moat. **Partner; never build.** Do not construct a moat someone will rent us for ~$5/site.

### 6.11 WP Umbrella — the competitor Phase 1 missed
**Verified:** €1.99/site/month all-inclusive. 5,000+ agencies, 70,000+ sites. Safe updates with visual-regression testing and automatic rollback (since October 2024). PHP error monitoring with stack traces. Uptime and performance monitoring. Vulnerability monitoring via Patchstack. White-label client reporting. They also ship a Claude plugin.

That is most of the Phase 1 pillar list, shipped, at €1.99.

**Why they're strong:** correct wedge, aggressive price, agency-native features (white-label reports, per-site billing), and PHP error monitoring with stack traces — which is genuinely the best error-visibility story in the market.

**Where they are beatable:**

- **Verification is visual.** Screenshot diffs. See §9 — this is the ceiling on their entire safety claim.
- **No change attribution.** They detect that a site broke; they do not maintain a causal timeline of everything that changed. Phase 1 Moat 2 is open.
- **No impact ranking.** Findings are not ordered by consequence to the specific site.
- **Priced as tooling, not liability.** €1.99 anchors them in the commodity budget (§5.4). Moving up-market from €1.99 is very hard; it is much easier to enter above them than to climb from below.
- **No governance layer.** Nothing addressing §3.
- **Reports are activity summaries, not evidence.** A list of what was updated, not a defensible record of what was verified.

**Implication:** they are the benchmark for table stakes and the proof that the fleet+safety combination sells. They are not the reason to abandon the concept; they are the reason to enter above them on verification depth, attribution, and accountability rather than below them on price.

---

## 7. Structural analysis: who can occupy our layer

### 7.1 The four-way contest

| Contender | Advantage | Structural limit in our layer |
|---|---|---|
| **Hosts** | Distribution, infrastructure, $0 marginal cost | Operate below WordPress. Cannot see plugin-layer semantics, abilities, capabilities, or business logic. Also cannot serve multi-host agencies — the highest-value segment. |
| **Fleet tools** | Agency relationships, install base | Priced into the floor; architected as dashboards; retrofitting a transactional engine is a rewrite. |
| **Security vendors** | Data, trust, budget access | Detection-first architecture; remediation is a cultural and architectural leap; they rent their patch data already. |
| **Core / Automattic** | Ultimate distribution | Core moves slowly and conservatively on anything that mutates sites; will ship primitives, not policy. Primitives help us. |

### 7.2 Why hosts cannot take agent governance

This is the load-bearing structural argument for the revised strategy, so it is worth being precise.

A host's control surface is the container, the filesystem, and the database. Their safety primitive is the snapshot. That is genuinely powerful for *infrastructure* failure.

Agent governance is not an infrastructure problem. When an agent invokes an ability — say, changing a user's role, or editing a product's price — the questions that matter are:

- Which agent is this, and what is it permitted to do on this site?
- Does this action require human approval under the site's policy?
- What is the blast radius *in application terms* (this is a WooCommerce price on a live product, not "a database row")?
- Did the site's revenue path still work afterwards?
- What is the auditable record of the decision?

None of that is visible from the container. All of it is visible from inside WordPress, at the hook and capability layer, which is exactly where a plugin lives. A host can restore a snapshot after the damage; it cannot arbitrate the action before it.

Additionally: agencies are multi-host by nature. A host-bundled solution is structurally incapable of serving a fleet spread across five hosts, which describes most agencies.

**Conclusion:** the plugin layer is the correct and defensible home for this product. Phase 1 §11.2's "local brain" instinct was right, for a better reason than Phase 1 gave.

---

## 8. Revised strategy recommendation

### 8.1 The revision

Phase 1's kernel is unchanged. The wedge changes:

| | Phase 1 | Revised |
|---|---|---|
| **Wedge** | Make updates safe | **Govern every change to the site** — human, automation, or AI agent |
| **Rationale** | Unclaimed pain | Updates are one change source among several; the *governance layer* is the unclaimed position (§3, §7.2) |
| **Sold on (now)** | Safe updates | Update pipeline **+ revenue-path verification** (pain that exists today, §9) |
| **Led with (as demand arrives)** | — | **Agent governance** (§3) |
| **Priced as** | (unstated) | **Liability and labour**, never per-site tooling (§5.4) |

### 8.2 Why this is stronger than both alternatives

Against Phase 1's wedge: it does not require us to win a feature six vendors already ship, four of them free with hosting.

Against a governance-only strategy: it does not require the 2027 market to exist before we have revenue.

The engine is identical either way. Updates are simply the first change source we govern, and the one with a customer who already feels the pain. Every subsequent change source — a technician's edit, a cron job, a CI deploy, an AI agent — is a new *provider* into the same kernel, not a new product.

### 8.3 Sequencing that de-risks the timing question (§3.3)

1. **Now → month 6.** Build the kernel. Ship the update pipeline (table stakes) *plus* revenue-path functional verification (the differentiator that exists today, §9). Build change attribution because it costs little extra once the hooks are in place and it is Moat 2.
2. **Month 6 → 12.** Ship the Ledger as a billable artefact; move pricing into the liability budget. Instrument the Abilities API as a *change source* in the timeline — cheap, and it makes us the only product that can show what agents did. This is governance's beachhead disguised as an attribution feature.
3. **Month 12+.** Ship policy and approval workflow as demand appears. By then we have the engine, the record, and the customers.

The elegance of this sequence: **step 2 requires almost no extra work and produces the governance data asset before the governance market arrives.** If agents take off, we are already the system of record. If they don't, we have shipped an attribution feature that stands on its own.

---

## 9. The verification gap — where the money actually is

Every safe-update implementation in the market (§4) verifies with **screenshot comparison.**

What a screenshot diff cannot see:

- Checkout completing
- Payment gateway responding
- Tax and shipping calculating correctly
- Order confirmation emails sending
- Forms submitting and delivering
- Login and registration working
- Search returning results
- Any performance regression whatsoever
- Any error that occurs after the page paints
- Anything behind authentication
- Anything in a multi-step flow

What a screenshot diff *does* do reliably: **false-positive on every carousel, slider, cookie banner, ad slot, "N items in stock" counter, and randomised testimonial on the internet.**

The consequence is stark and easy to state to a customer:

> **A WooCommerce checkout can fail completely while every pixel test passes.**

I searched specifically for functional revenue-path verification on WordPress — synthetic transaction testing, form-delivery verification, authenticated-flow checks — and found none in this market.

### 9.1 Why this is the right differentiator to sell now

- It is a real, present pain with no vendor addressing it.
- It attaches directly to money, which makes it priceable under §5.4. "Your checkout is verified working after every change" is a revenue-protection claim, not a tooling feature.
- It is hard to copy — it requires understanding the site's business logic, not just rendering it. That is depth, which is the WP Rocket moat pattern (§6.4).
- It makes WooCommerce stores the highest-value segment, which aligns with Phase 1 §9.1.

**Recommendation:** revenue-path functional verification is the v1 headline differentiator, with the update pipeline as the credible table-stakes wrapper around it.

---

## 10. Market gaps — the unmet needs

Consolidated. Each is a gap no current vendor fills, with the evidence and our fit.

| # | Unmet need | Evidence | Our fit |
|---|---|---|---|
| **G1** | Functional verification of revenue paths after change | §9 — nobody does it | Direct. v1 headline. |
| **G2** | Governance of AI agent actions | §3 — core shipped the capability, nobody shipped the safety | Direct. Same kernel. The 2027 position. |
| **G3** | Causal change attribution across all sources | §6.11 — even the best competitor only detects failure, never causes | Direct. Moat 2. |
| **G4** | Impact ranking against the specific site | §6.3, §6.2 — all incumbents ship flat severity lists | Direct. Moat 3. |
| **G5** | Evidence a customer can bill and audit against | §6.11 — reports are activity summaries | Direct. Moat 4, and the pricing mechanism. |
| **G6** | Accountability tiers in maintenance tooling | §5.2 — proven in security, absent in maintenance | Direct. The premium ladder. |
| **G7** | Remediation for the 46% of vulnerabilities with no patch | §6.10 | **Partial — partner.** Patchstack owns this. Consume it. |
| **G8** | Displacement path for orphaned Kadence Security users | §6.9 — patches end April 2027 | Opportunistic. A dated GTM campaign, not a product decision. |

### 10.1 Gaps we should deliberately not fill

- Vulnerability data curation (G7's underlying dataset) — rent it.
- Full-site backup — commoditised, and hosts give it away.
- Firewall / WAF — different question, brutal false-positive economics.
- Content generation — §6.7 is the cautionary tale.

---

## 11. What the research cannot answer

Seven questions no published source resolves. They require customer contact, and they should shape the first twenty conversations.

1. **Are agencies actually letting AI agents touch client sites yet?** *This is the most important question in the document.* It decides whether G2 is a 2026 or a 2028 business, and therefore whether §8.3's sequencing is right or too slow.
2. **What proportion of real breakages are update-caused?** Phase 1 §13.1's load-bearing claim. The live pass found no credible dataset. It must be answered by asking practitioners about their last three incidents. *(Status: still unverified. This is a gap in Phase 2, not a resolved question.)*
3. **What does an outage actually cost an agency** — in hours, in client goodwill, in churn? Needed to price against liability (§5.4).
4. **Would an agency pay materially more for verified-and-guaranteed than for automated?** The Wordfence ladder (§5.2) suggests yes; it is not proven in this segment.
5. **Do agencies want the Ledger?** Would they show it to clients, bill against it, put it in a contract?
6. **What is the real trigger for churning off an incumbent** — noise, price, an incident, or a rebrand?
7. **How many sites does the median target customer run,** and is the buying unit the site, the fleet, or the outcome?

---

## 12. Assumptions carried forward that remain unverified

Stated plainly so they are not mistaken for findings:

- Update-caused breakage frequency (§11.2).
- Freemium conversion economics (§1.2) — affects the WordPress.org decision.
- Elementor's financials (§1.2) — a Phase 12 benchmark only.
- That agencies will accept a plugin-layer product over host-bundled tooling. §7.2 argues it structurally; no customer has confirmed it.

---

## 13. Decisions required before Phase 3

**13.1 Accept the wedge revision** — from "make updates safe" to "govern every change," with revenue-path verification as the v1 headline and agent governance as the 2027 position? **Blocks Phase 3.** *Recommendation: accept (§8).*

**13.2 Accept the pricing-category shift** — price against liability and labour, not per-site tooling? **Blocks Phase 3**, because it determines the tier structure the PRD must specify. *Recommendation: accept (§5.4).*

**13.3 Confirm the partner-don't-build call on vulnerability data.** *Recommendation: partner with Patchstack (§6.10).*

**13.4 Commission the trademark clearance search now** — cheap, slow, and irreversible if skipped, whatever the naming decision is. *Recommendation: do it this week (Phase 1 §11.3).*

**13.5 Authorise customer discovery on §11's seven questions** before Phase 3 is finalised, or accept that the PRD is built on the four unverified assumptions in §12. *Recommendation: twenty conversations, and let Phase 3 be revised by them.*

**13.6 Decide whether to pursue the Kadence displacement window** (April 2027) as a GTM campaign. Not urgent, but it has a calendar. *Recommendation: note it for Phase 12; do not let it shape the product.*

---

## 14. Corrections to Phase 1

**14.1 "Nobody acts on findings; they only alert" — wrong.**
Six products ship pre-flighted updates with visual-regression testing and automatic rollback, four of them hosting companies (§4). The risk Phase 1 named as largest has already materialised for this feature. The engine and the kernel survive; the claim of an empty field does not. Wedge revised in §8.

**14.2 The closest competitor was missed entirely.**
WP Umbrella — €1.99/site/month, 5,000+ agencies, 70,000+ sites, safe updates with rollback, PHP error monitoring with stack traces, vulnerability monitoring, white-label reports, and a Claude plugin (§6.11). Most of the Phase 1 pillar list, already shipped. They are beatable on verification depth, attribution, impact ranking, and price position — not on presence.

**14.3 Agent governance was filed as a medium-term risk. It is the primary opportunity.**
Phase 1 §6.5 treated the AI-agent shift defensively. WordPress 7.0 shipped agent infrastructure into core in May 2026 with per-ability capability checks as the only safety mechanism — no policy, approval, pre-flight, restore point, verification, rollback, or audit layer (§3). That gap is item-for-item the kernel Phase 1 already designed, in a position with no incumbent, on a three-month-old platform shift. It should have been the headline.

---

*End of Phase 2.*
