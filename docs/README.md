# BuildWithGuru AI — Company & Product Documentation

The design record for the product. Each phase is a standalone document, detailed enough that a senior engineer who has never spoken to us could build from it.

> **Name under review.** See Phase 1 §11.3 and §12.3. All positioning is written to be name-portable.

---

## Phase tracker

| Phase | Document | Status |
|---|---|---|
| 1 | [Vision](phase-01-vision.md) | ✅ Approved — corrected by Phase 2 (see Phase 1 §14) |
| 2 | [Market Research](phase-02-market-research.md) | ✅ Complete — awaiting review |
| 3 | Product Requirements Document | ⬜ Blocked on decisions 13.1 and 13.2 |
| 4 | Software Architecture | ⬜ Not started |
| 5 | Database Design | ⬜ Not started |
| 6 | Scanner Framework (100+ rules) | ⬜ Not started |
| 7 | Fix Engine | ⬜ Not started |
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

---

## Open decisions blocking progress

Phase 3 cannot be finalised until 13.1 and 13.2 are answered.

- **P2 §13.1** — accept the wedge revision?
- **P2 §13.2** — accept the pricing-category shift?
- **P2 §13.3** — confirm partner-don't-build on vulnerability data
- **P2 §13.4** — commission trademark clearance (cheap, slow, irreversible if skipped)
- **P2 §13.5** — authorise customer discovery on the seven questions in P2 §11
- **P1 §12.3–12.6** — naming, WordPress.org free tier, v1 headline, team/budget/timeline

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
