# Standing Constraints

Non-negotiable constraints that bind **every** subsequent phase. Unlike the phase documents, this is not a point-in-time analysis — it is a checklist that Phases 3–12 must each satisfy, and a design review may reject work that violates it.

Two constraints are recorded here, both added by founder decision after Phase 2:

- **C1 — The plugin must be publishable on WordPress.org and pass review.**
- **C2 — The plugin must meet an advanced security standard, beyond ordinary plugin hygiene.**

They are related. Half of what the repository review team rejects is a security problem, and the constraint that most shapes our architecture (C1.3, no remotely-delivered executable code) is a supply-chain security rule.

---

## C1 — WordPress.org publishability

### C1.0 What this decides

This resolves **Phase 1 §12.5** (free tier on WordPress.org — yes or no) as **yes**. My Phase 1 recommendation was "yes eventually, but not at Horizon 1," on the grounds that shipping before the engine is hardened converts our worst failures into permanent public one-star reviews. The founder's decision overrides the timing caution.

I still think **submitting late is right, but building compliant from the first commit is essential** — and those aren't in conflict. Retrofitting compliance is expensive; delaying submission is free. So:

> **Build to repository rules from commit one. Submit when the engine is hardened.**

Every constraint below applies to the codebase immediately, regardless of when we submit.

### C1.1 The rules that actually shape our architecture

The repository's guidelines are a numbered list that must be re-read verbatim at submission time — the text changes and my summary is not authoritative. These are the ones with real architectural consequences for *this* product:

| Rule | What it means for us |
|---|---|
| **GPL-compatible licensing** | Every Composer dependency and bundled asset must be GPLv2-or-later compatible. This is a **vendor-selection gate in Phase 4**, not a packaging step. One incompatible library discovered late means replacing it. |
| **No obfuscated code** | Source must be human-readable. No encoders, no minified-only PHP. Rules out most off-the-shelf licensing/DRM libraries, which are typically obfuscated. Phase 11 must design licensing accordingly. |
| **No remotely-delivered executable code** | **The single most important constraint in this document. See C1.3.** |
| **SaaS is permitted** | Our "thin spine" cloud (Phase 1 §11.2) is explicitly allowed. Plugins backed by external services are fine — with disclosure. This de-risks the whole cloud strategy. |
| **No tracking without consent** | Telemetry is opt-in, off by default, with a plain-language explanation of exactly what is transmitted. Applies to our own analytics *and* to anything sent to an AI provider. |
| **No trialware** | The free version must be permanently and genuinely functional. Time-limited functionality is disallowed. This happens to match our own value — *safety is never the paywall* (Phase 1 §3, value 4). |
| **No dashboard hijacking** | Upsells are permitted but constrained: no persistent nags, no full-screen takeovers, no interference with unrelated admin screens. Aligns with our brand rule against dark patterns (Phase 1 §4.2). |
| **Use bundled WordPress libraries** | No shipping our own copy of jQuery, React, or any library core already provides. **Phase 4 constraint:** build against `wp-scripts` and the `@wordpress/*` packages registered by core rather than bundling our own React runtime. |
| **Clean, sensibly-named distribution** | No `.git`, no build tooling, no `node_modules`, no dev dependencies in the shipped artefact. Requires a real build pipeline producing a distribution zip distinct from the repo (Phase 11). |
| **Trademark respect** | The plugin slug, name, and readme cannot imply endorsement or misuse marks — including "WordPress" and "Woo". Compounds the Phase 1 §11.3 naming concern; clearance covers this too. |

### C1.3 The load-bearing one: no remotely-delivered executable code

The repository forbids plugins from fetching and executing code from external systems. For most plugins this is a formality. For us it is a fork in the architecture, because two features naturally want to violate it:

1. **Rule packs.** Phase 1 §9.1 makes SEO, accessibility, and performance into "rule packs on a common engine." The lazy implementation ships rules as PHP downloaded from our server. **Not permitted, and not acceptable even for the premium build.**
2. **Fix definitions.** The fix engine (Phase 7) applies remediations. The lazy implementation downloads a remediation script and runs it.

**Required design, binding on Phases 4, 6 and 7:**

> **Rules and fixes are declarative data interpreted by an executor that ships in the plugin. They are never code.**

A rule is a data structure — matchers, thresholds, references, severity, an ordered list of operations drawn from a fixed catalogue. A fix is a sequence of catalogue operations with parameters. The plugin contains the interpreter and the catalogue; the server may deliver new *data*, never new *behaviour*.

**This constraint makes the product better, not worse.** It is the same design Phase 1 §6.3 already demands of AI ("the AI selects from the catalogue; it never authors the operation"). Applying it uniformly to remote content means:

- Every operation that can ever run against a customer site is present in the shipped, auditable, reviewable source.
- The blast radius of a compromise of our own servers is bounded — an attacker who owns our rule CDN can send bad *parameters*, not arbitrary code. Combined with signature verification (C2.7) and the fix engine's own confirmation gates, that is a genuinely defensible supply-chain posture.
- Rule packs become testable fixtures rather than deployable code.

Phase 6 must therefore specify a **rule schema**, and Phase 7 an **operation catalogue** — both versioned, both with strict validation of incoming data, both rejecting anything referencing an operation the installed version doesn't know.

### C1.4 Free vs premium split under these rules

The repository hosts the free plugin only. Premium is distributed by us. Both must respect C1.3 — an obfuscated or remote-code premium build would be a security liability even though no reviewer would see it.

Constraints on the split:

- The free plugin must stand alone and be useful indefinitely (no trialware).
- Premium is an add-on plugin or a licensed feature layer, updated via our own update server with **signed** packages (C2.7).
- No feature that degrades *safety* may be premium-gated. Fleet management, reporting, automation, and accountability tiers are legitimately paid (Phase 2 §5.4).

### C1.5 Submission readiness checklist

Owned by Phase 11, listed here so it isn't discovered late.

- [ ] Re-read the current repository guidelines verbatim and diff against this document
- [ ] Full dependency licence audit; SBOM produced
- [ ] `readme.txt` in the repository's format, with accurate, non-deceptive claims
- [ ] All external-service usage disclosed in `readme.txt` and in-product, with links to terms and privacy policy — this covers our cloud, the vulnerability feed, **and every AI provider**
- [ ] Telemetry off by default, opt-in with plain-language disclosure
- [ ] No dev artefacts in the distribution zip
- [ ] Slug and name cleared for trademark (ties to Phase 1 §11.3)
- [ ] Internal security review complete (C2.9) — *before* submission, not after
- [ ] Uninstall behaviour correct and documented; data removal honoured
- [ ] Tested against the minimum supported WordPress and PHP versions declared in the header

---

## C2 — Advanced security standard

### C2.0 Why the bar is higher for us than for an ordinary plugin

Three multipliers, and they compound:

1. **We are a high-privilege subsystem by design.** The product modifies files, writes to the database, installs and updates plugins, and creates and restores restore points. A vulnerability in an ordinary plugin leaks data. A vulnerability in ours is **remote code execution on every site that installed it.**
2. **We will be scrutinised specifically because of what we claim.** Patchstack disclosed 11,334 vulnerabilities in 2025, 91% of them in plugins (Phase 2 §6.10). Researchers deliberately target security and maintenance plugins because the payoff is highest. We will be looked at harder than a contact form.
3. **A single CVE is brand-ending for this product.** We are selling reliability and accountability. "The plugin that keeps your site safe had a critical vulnerability" is not a bad quarter — it is the end of the positioning. This is the existential engineering-quality risk already named in Phase 1 §6.4.

So security is not a Phase 9 deliverable that gets bolted on. Phase 9 will *document* the model; the constraints below apply from the first commit.

### C2.1 The triple gate — every entry point, no exceptions

Every request that can read sensitive data or change state passes three checks, in this order, with no path that skips one:

1. **Authentication and capability** — a specific custom capability, checked explicitly. Never `is_admin()` (it is not an authorisation function), never `current_user_can('manage_options')` as a catch-all.
2. **Intent** — nonce for admin-post and AJAX; for REST, a mandatory `permission_callback` that is **never** `__return_true`.
3. **Input validation** — validate against an explicit schema, then sanitize. Reject unknown fields rather than ignoring them.

Then, on the way out: **escape at the point of output**, late, always.

*Enforcement:* a static-analysis rule in CI that fails the build on any `register_rest_route` without a real `permission_callback`, and a code review gate on every new entry point.

### C2.2 Capability model — least privilege, custom capabilities

- Define **custom capabilities** per operation class (e.g. view findings, run a scan, apply a low-risk fix, apply a high-risk fix, restore, manage policy, manage licence). Do not overload core capabilities.
- The right to *see* a problem is separate from the right to *fix* it. An agency's junior technician can triage without being able to mutate production.
- **Default deny.** A new operation is unavailable until a capability is explicitly granted to a role.
- Multisite: network-level operations gated separately; a site administrator must not be able to affect other sites in the network.
- This capability model is also the foundation of the agent-governance policy layer (Phase 2 §3) — the same gate that stops an under-privileged human stops an over-eager agent. Design it once, correctly.

### C2.3 The fix engine as a privileged subsystem

The highest-risk component in the product. Treated as its own trust boundary:

- The executor accepts **only** catalogue operations with validated parameters (C1.3). No path accepts a callable, a file path, a SQL fragment, or a shell string from any external source.
- No dynamic PHP execution anywhere: no `eval`, no variable functions on unvalidated input, no `unserialize` of untrusted data (use JSON), no `create_function`.
- File operations go through `WP_Filesystem`, with canonicalised paths validated to be inside an allowed root. Explicit traversal defence; archive extraction validates every entry path and rejects symlinks.
- Database writes use `$wpdb->prepare` without exception. Table and column names are never interpolated from input — only from a fixed allowlist.
- Destructive operations require an explicit confirmation token bound to the specific proposed change, so a stolen nonce cannot be replayed against a different action.
- Every operation is idempotent or explicitly guarded against concurrent execution (a lock), because two overlapping fixes are a corruption scenario.

### C2.4 Secrets management

WordPress provides no secure secret store, so this needs a deliberate strategy rather than "put it in an option."

- **Preference order:** `wp-config.php` constants or environment variables first; encrypted option as the fallback for keys entered through the UI.
- Fallback encryption derives from the site's own salts (`AUTH_KEY` etc.), with a documented, honest statement of the threat model it does and does not cover — an attacker with filesystem read access has the salts. Do not overstate this.
- Secrets are **never** logged, never included in error output, never sent in support bundles, and redacted in the audit ledger.
- Support/debug exports run through an explicit redaction pass with a test that asserts known secret patterns do not survive it.
- Licence keys, vulnerability-feed credentials, and AI provider keys all fall under this.

### C2.5 Data sent off-site

Every outbound transmission is enumerated, disclosed, minimised, and — where it isn't strictly necessary for a requested operation — opt-in.

- **AI providers get the least possible.** Prefer metadata and structural descriptions over content. Never send database contents, customer PII, or credentials. This must be specified per-call in Phase 4, not left to implementers.
- Our own cloud receives already-computed results (Phase 1 §11.2), not raw site data.
- TLS with certificate verification, always. No path that disables verification, not even behind a debug flag.
- A documented data-flow inventory maintained as part of Phase 9, because C1.5 requires disclosing it and GDPR/CCPA obligations follow from it.

### C2.6 Audit ledger integrity

The Ledger is Moat 4 (Phase 1 §6.2) and a compliance artefact, so its integrity is a security property:

- Append-only; no in-product path to edit or selectively delete entries.
- Tamper-evident — each entry chained to the previous by hash, so removal or alteration is detectable.
- Records the actor (human, automation, or agent), the authorisation used, the action, the outcome, and the verification result.
- Retention and export defined in Phase 5.

### C2.7 Supply chain

We are a supply-chain risk to our customers, and our own dependencies are a supply-chain risk to us.

- Composer dependencies pinned with a committed lock file; automated vulnerability scanning of dependencies in CI.
- Minimal dependency footprint. Every dependency needs a justification; unmaintained packages are disqualifying.
- **Premium update packages are cryptographically signed, and the plugin verifies the signature before installing.** Our update server is a high-value target; an unsigned update channel to sites that trusted us is the worst plausible incident.
- Release builds are reproducible and produced by CI, not from a developer's laptop.
- Publishing credentials protected by hardware-backed MFA; the account that can push to WordPress.org is a crown jewel.

### C2.8 Hardening our own footprint

- No direct file access: every PHP file guards on `ABSPATH`.
- No sensitive data in files reachable over HTTP; log and cache files outside the web root where possible, otherwise protected and randomised.
- Rate limiting and lockout on our REST endpoints, especially anything that triggers work.
- No verbose errors in production; stack traces go to the log, never to the response.
- Uninstall removes what it should and preserves what the user asked to keep, without leaving orphaned privileged data.

### C2.9 Process

- **SAST in CI, blocking:** WordPress Coding Standards with the security sniffs, plus static analysis with taint tracking. A failing security check fails the build.
- **Threat model maintained, not written once** — Phase 9 produces it; it is revisited whenever a new trust boundary appears.
- **Independent third-party security audit before 1.0 ships**, and again before any major expansion of the fix engine's privileges. Budget for it now.
- **Published vulnerability disclosure policy** and a monitored security contact from day one. `security.txt` on the website. Consider a bug bounty once revenue supports it.
- **A rehearsed incident response plan**, including how we ship an emergency patch and how we notify. Phase 1 §4.2 commits us to admitting failure fast and specifically; that requires a plan written before it's needed.
- **Security is a review gate.** Any PR touching an entry point, the fix engine, secrets, or the ledger requires explicit security review sign-off.

---

## How these constraints interact with the phases

| Phase | Obligation |
|---|---|
| 3 — PRD | Free/premium split respects C1.4; non-functional requirements incorporate C2 |
| 4 — Architecture | Rule/fix interpreter design (C1.3); dependency licence gate (C1.1); entry-point pattern enforcing C2.1; secrets strategy C2.4 |
| 5 — Database | Ledger integrity and retention (C2.6) |
| 6 — Scanner | Rules as validated declarative data, never code (C1.3) |
| 7 — Fix Engine | Operation catalogue; privileged-subsystem rules (C2.3) |
| 8 — Admin UI | Capability-aware UI (C2.2); no dashboard hijacking (C1.1); consent flows for telemetry and AI |
| 9 — Security | Formal threat model; documents and extends all of C2 |
| 10 — Testing | Security tests are part of the suite; SAST gates in CI (C2.9) |
| 11 — Deployment | Signed premium updates (C2.7); clean distribution build; submission checklist C1.5 |
| 12 — Business | Disclosure obligations; audit and bug bounty budget |
