# BuildWithGuru AI — Company & Product Documentation

The design record for the product. Each phase is a standalone document, detailed enough that a senior engineer who has never spoken to us could build from it.

> **Name under review.** See Phase 1 §11.3 and §12.3. All positioning is written to be name-portable.

---

## Standing constraints — read before any phase

**[Standing Constraints](constraints.md)** binds every phase from 3 onward. Two constraints, both by founder decision:

- **C1** — the plugin must be publishable on WordPress.org and pass review
- **C2** — the plugin must meet an advanced security standard, beyond ordinary plugin hygiene

The one with the largest architectural consequence is **C1.3**: rules and fixes are declarative data interpreted by an executor that ships in the plugin. They are never remotely-delivered code. This is a repository rule, a supply-chain defence, and the same principle Phase 1 §6.3 already applies to AI — applied uniformly.

---

## Phase tracker

| Phase | Document | Status |
|---|---|---|
| — | [Standing Constraints](constraints.md) | 🔒 Binding on all phases |
| — | [**The Recommended Plan**](recommended-plan.md) | ⭐ **Start here.** Amends the P3 §9 roadmap |
| — | [Product Naming](naming.md) | 🔤 Research + rejected candidates |
| — | [Name — Final (PDF)](Moorkeep-Name-Final.pdf) | ⚠️ Recommends Moorkeep — **superseded**, see [naming.md §9](naming.md) |
| — | [Brand Decision (PDF)](Moorkeep-Brand-Decision.pdf) | 🔤 Domain strategy and the .io warning |
| — | [Brand Name Shortlist (PDF)](BuildWithGuru-Brand-Names.pdf) | 🔤 The wider 8-name shortlist |
| — | [Roadmap PDF](BuildWithGuru-Roadmap.pdf) | 📄 Plain-language summary for non-technical readers |
| 1 | [Vision](phase-01-vision.md) | ✅ Approved — corrected by Phase 2 (see Phase 1 §14) |
| 2 | [Market Research](phase-02-market-research.md) | ✅ Complete |
| 3 | [Product Requirements Document](phase-03-prd.md) | ✅ Complete — awaiting review |
| 4 | [Software Architecture](phase-04-architecture.md) | ✅ Complete — awaiting review |
| 5 | [Database Design](phase-05-database.md) | ✅ Complete — awaiting review |
| 6 | [Scanner Framework](phase-06-scanner.md) — 153 rules | ✅ Complete — awaiting review |
| 7 | [Fix Engine](phase-07-fix-engine.md) | ✅ Complete — awaiting review |
| 8 | Admin UI | ⬜ Not started |
| 9 | Security | ⬜ Not started |
| 10 | Testing Strategy | ⬜ Not started |
| 11 | Deployment | ⬜ Not started |
| 12 | Business | ⬜ Not started |

---

## The product in four sentences

We sell changes to a WordPress site that are guaranteed not to break it — not information about the site.

Every change, whoever proposes it (a technician, an updater, a cron job, a CI pipeline, or an AI agent), passes through one kernel: risk assessment, restore point, transactional application, functional verification of the site's revenue paths, automatic rollback on failure, and an immutable record.

AI helps us decide and explain. It never touches the site.

The five-year destination is to be the layer through which all changes to a WordPress site pass.

---

## Load-bearing decisions made so far

| Decision | Where | Summary |
|---|---|---|
| Category | P1 §5.2 | Create "WordPress Site Reliability" rather than enter security / SEO / performance |
| Wedge | P2 §8 | Govern every change to the site. Sell now on update pipeline + revenue-path verification; lead with agent governance as demand arrives |
| Differentiator | P2 §9 | Functional verification of revenue paths — nobody in the market does it |
| North Star | P1 §7.1 | Verified safe changes per month. *Not* installs, *not* issues found |
| AI's role | P1 §6.3 | Judgment and explanation only; never executed, always with a deterministic fallback, never on the availability critical path |
| Architecture shape | P1 §11.2 | Local brain, thin spine. Every engine REST- and CLI-addressable from the first commit |
| Pricing category | P2 §5.4 | Price against liability and labour, not per-site tooling |
| Build vs rent | P2 §6.10 | Consume vulnerability data (Patchstack). Never build the dataset |
| Scope discipline | P1 §10 | Ten explicit non-goals, including: not a chatbot, not a writing tool, not a WAF, not a backup product, not a suite |
| WordPress.org | C1 | Ship a free plugin to the repository and pass review. Build compliant from commit one; submit once the engine is hardened. Resolves P1 §12.5 |
| Rules & fixes | C1.3 | Declarative data interpreted by a shipped executor — never remotely-delivered code |
| Security bar | C2 | Advanced standard: triple gate on every entry point, custom least-privilege capabilities, fix engine as a privileged subsystem, signed premium updates, third-party audit before 1.0 |
| Resourcing | P3 §1 | Solo founder, part-time (12–20 hrs/week). Roadmap uses capability gates, not dates |
| Liability pricing, precisely | P3 §1.2 | We sell liability *evidence* (the Ledger), not liability *assumption* (SLAs, indemnity). The latter needs people |
| v1 scope | P3 §2 | One change source (plugin/theme updates), one differentiator (revenue-path verification) |
| Build order | Plan §3 | Read-only first. v0.1 Checkout Monitor → v0.2 attribution → v1.0 safety kernel. Never ship mutation as the first production code |
| Go to market | Plan §7 | **Free first, premium later.** Distribution-play pattern. Staged rollout with a pre-agreed support-load threshold that halts growth |
| The paywall line | Plan §7.5 | The free tier never modifies the site. Anyone who gets the mutation pipeline gets the full safety kernel with it — rollback is never an upgrade |
| UI stack | Plan §5.4 | Server-rendered with interactivity islands, not a React SPA — overrules the brief on maintenance-cost grounds |

---

## Open decisions

Resolved: P2 §13.1 (wedge revision, accepted) · P2 §13.2 (liability pricing, accepted — read with P3 §1.2) · P1 §12.5 (WordPress.org, yes — see C1.0) · P1 §12.6 (resourcing: solo, part-time).

Still open:

- **P2 §13.3** — confirm partner-don't-build on vulnerability data
- **P2 §13.4** — commission trademark clearance (cheap, slow, irreversible if skipped)
- **P2 §13.5** — authorise customer discovery on the seven questions in P2 §11
- **P1 §12.3** — name: recommendation is now **Keelsure** on `keelsure.com` (alternate: Vouchkeep). **Moorkeep withdrawn** — the founder typed "morekeep" in practice and `morekeep.com` is owned by a third party, so the misspelling can never be reclaimed. See [naming.md §9](naming.md). Also withdrawn: Keelvane, Cairnvane (vane/vain/vein). Do not use `.io`.
- **P3 §13** — seven technical decisions for Phase 4, of which background processing on shared hosting is the highest-risk

---

## Unverified assumptions

Tracked deliberately. A strategy is only as good as its awareness of what it hasn't checked. Full list in Phase 2 §12.

1. **What share of real breakages are update-caused?** (P1 §13.1, P2 §11.2) — still unverified; the load-bearing empirical claim under the original wedge.
2. **Are agencies letting AI agents touch client sites yet?** (P2 §11.1) — decides whether agent governance is a 2026 or 2028 business.
3. Freemium conversion economics (P2 §1.2) — affects the WordPress.org decision.
4. Whether agencies prefer a plugin-layer product to host-bundled tooling (P2 §7.2, argued structurally, unconfirmed by customers).

---

## Working rules for this documentation set

1. **One phase at a time.** Finish, hand over for review, wait. No automatic continuation.
2. **Corrections are recorded, not silently applied.** When a later phase invalidates an earlier claim, the earlier document gets a correction section and the later document states what changed and why. See Phase 1 §14 and Phase 2 §14.
3. **Every number carries its provenance.** Verified, approximate, or unverified — labelled. See Phase 2 §1.2.
4. **Assumptions are written down as assumptions**, with the test that would confirm or kill them.
5. **Disagreement is documented, not smoothed over.** Where the founder's brief and the analysis conflict, both positions and the trade-off are stated (Phase 1 §11).
6. **Commit early.** These documents live in git. An uncommitted document does not exist — the Phase 1 and Phase 2 drafts were lost once to prove it.
