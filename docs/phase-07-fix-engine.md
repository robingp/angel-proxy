# Phase 7 — Fix Engine

**Status:** Complete — awaiting review.
**Scope:** v1.0. Nothing in this document ships in v0.1 or v0.2 — those releases are read-only by design (Plan §3). It is specified now because the seams it needs must exist in the v0.1 code, and because designing mutation under deadline is how sites get destroyed.
**Binding:** C1.3 (behaviour ships in the plugin) · C2.3 (the fix engine is a privileged subsystem) · Plan §7.5 (the free tier never mutates; anyone who gets mutation gets the full safety kernel with it).

---

## 1. Doctrine

Seven invariants. Every one is a release blocker, not a preference. If a proposed feature conflicts with one of these, the feature loses.

**I1 — Nothing runs that did not ship.** Every action is an operation from a fixed catalogue compiled into the plugin. A plan selects operations and supplies validated parameters. There is no path that accepts a callable, a file path, a SQL fragment, a shell string, or PHP source from outside (C1.3, C2.3).

**I2 — No mutation without a verified restore point.** If the restore point cannot be created *and read back*, the change does not proceed (FR-3.4). There is no setting that disables this.

**I3 — Nothing is destroyed. Things are quarantined.** No operation deletes user data or files outright. Deletion means moving to a quarantine store with a manifest and a restore path. Actual removal happens on retention expiry, long after anyone would have noticed.

**I4 — Every change is verified, and verification is the gate.** The pipeline commits only on a clean verification. This is why v0.1 builds the verifier first: the kernel is a consumer of something already proven in production.

**I5 — The confirmation is bound to the proposal.** A confirmation token authorises *one specific plan against one specific site state*. It cannot be replayed against a different plan or a changed site (C2.3).

**I6 — Nothing consequential happens invisibly.** Every proposal, confirmation, operation, verification and outcome is a ledger entry, hash-chained, before-and-after (P5 §3.4).

**I7 — When we cannot be sure, we do less.** Inconclusive is not success. Low confidence means we recommend rather than act (FR-8.5).

---

## 2. The operation catalogue

The complete set of things the product can ever do to a site. Adding to this list is a code change, a security review, and a release — deliberately.

Each operation declares: parameter schema · default class · reversibility · **postcondition** (§7) · blast radius.

| Operation | Class | Reversible | Blast radius |
|---|---|---|---|
| `update_component` (plugin/theme/core) | guarded | via restore point | component → site |
| `rollback_component` | guarded | yes | component |
| `activate_component` | guarded | yes | site |
| `deactivate_component` | guarded | yes | site |
| `set_option` | guarded | yes (prior value captured) | varies |
| `delete_option` | guarded | yes (quarantined) | varies |
| `set_constant` (wp-config) | guarded | yes (file backed up) | site |
| `write_config_directive` (.htaccess / nginx include) | guarded | yes (file backed up) | site |
| `set_file_permissions` | guarded | yes (prior mode captured) | file |
| `quarantine_file` | guarded | yes | file |
| `restore_quarantined_file` | safe | yes | file |
| `purge_expired_transients` | safe | no (derived data) | none |
| `optimize_tables` | safe | no (no data change) | none |
| `delete_orphan_rows` | guarded | yes (rows quarantined) | database |
| `set_user_role` | guarded | yes | user |
| `disable_user` | guarded | yes | user |
| `regenerate_salts` | guarded | yes (prior captured) | **all sessions logged out** |
| `set_cron_schedule` | guarded | yes | site |
| `publish_missed_scheduled_post` | safe | yes (revert to `future`) | content |
| `create_page` | guarded | yes (trashed, not deleted) | content |
| `set_wc_setting` | guarded | yes | store |

**Notes that matter:**

- **`regenerate_salts` logs every user out.** It is correct after a compromise and hostile at 10am on a Monday. Its confirmation copy must say so in plain words, and it is never `safe`.
- **`optimize_tables` is `safe` only because it changes no data.** It still takes a restore point, because I2 has no exceptions.
- **`update_component` is the highest-risk operation in the catalogue** and gets §4's full treatment.

---

## 3. Plans

A **plan** is validated declarative data: an ordered list of `{operation_id, params}` plus metadata.

```json
{
  "plan_uuid": "…",
  "origin": { "type": "finding", "rule_id": "SEC-010", "finding_id": 4821 },
  "operations": [
    { "operation": "quarantine_file", "params": { "path": "wp-content/debug.log" } },
    { "operation": "write_config_directive",
      "params": { "target": "htaccess", "directive": "deny_debug_log" } }
  ],
  "class": "guarded",
  "estimated_blast_radius": "site",
  "requires_restore_point": true,
  "verify": { "suites": ["critical_paths"], "postconditions": "all" }
}
```

The executor **refuses** a plan referencing an operation it does not implement, a parameter failing schema validation, or a class it cannot satisfy. Refusal is reported, never silently downgraded (the same rule as P6 §1.1).

Plans are generated three ways: from a finding's `remediation` block (P6 §1.1), from the update queue, or by a user action in the UI. **AI may propose a plan; it may never author an operation** — it selects from the catalogue, and the result goes through identical validation (P1 §6.3, structurally enforced by P4 §14.4).

---

## 4. The change pipeline

```
  PROPOSED
     │  risk assessment (FR-2), impact, blast radius, dry run
     ▼
  AWAITING CONFIRMATION ──── (safe class + user opt-in → skipped)
     │  confirmation token bound to plan hash + site state hash
     ▼
  PREPARING
     │  acquire lock · create restore point · VERIFY RESTORE POINT READABLE
     │  ── failure here ⇒ ABORT, nothing touched ──
     ▼
  ═══ POINT OF NO RETURN ═══
     │
  APPLYING
     │  operations in order, each recorded before and after
     │  ── operation failure ⇒ ROLLING BACK ──
     ▼
  VERIFYING
     │  1. operation postconditions   2. critical-path suite (Verifier)
     ▼
  ┌─────────────┬──────────────────┬─────────────────┐
  PASSED      FAILED           INCONCLUSIVE
     │             │                  │
  COMMITTED   ROLLING BACK      policy matrix §6.3
     │             │
     │        ┌────┴────┐
     │   ROLLED_BACK  ROLLBACK_FAILED ← the worst case, §6.4
     ▼
  release lock · ledger · notify only if something happened (FR-10.1)
```

The **point of no return** is the boundary that makes interruption recoverable. Before it, an interrupted run is abandoned and nothing was touched. After it, an interrupted run must be resolved — rolled forward or restored — never left ambiguous (§8).

---

## 5. Restore points

### 5.1 Scoping

Full-site backup is explicitly not our product (P1 §10.7). Restore points are **scoped to what the change can touch**, which makes them fast enough to take before every operation.

| Change touches | Captured |
|---|---|
| Component files | Full copy of the component directory |
| Component-owned tables | Schema **and** data for tables the component owns |
| Shared tables (`options`, `posts`, `postmeta`) | Only the specific rows named by the operation, captured before and after |
| Config files (`wp-config.php`, `.htaccess`) | Full file copy |

### 5.2 The honest limit

**A plugin update that runs a destructive database migration cannot be perfectly reverted, and we must say so rather than imply otherwise.**

Files revert reliably. Component-owned tables revert reliably, schema included. What cannot be guaranteed is a migration that rewrites or drops data in *shared* tables, because we cannot know in advance which rows a third party's migration will touch without instrumenting every query — which is not affordable at NFR-1.1's budget.

The design consequences:

1. Updates are classified by whether the component declares or historically runs migrations. Those that do are **never** `safe` class and their confirmation copy states the limit explicitly.
2. The restore point records its own **coverage**, and the UI states it: *"Files and this plugin's own tables can be restored. Changes this update makes to posts or options may not be fully reversible."*
3. Where the risk is high and a full backup plugin is present, we **delegate** — FR-3.6 exists for exactly this case. Using an existing backup is better than pretending our scoped capture is equivalent.

This is P1 §3 value 6 applied to the most consequential feature in the product. Overstating restore coverage is the single most dangerous thing this documentation could do.

### 5.3 Integrity and lifecycle

Verified readable at creation (I2, FR-3.2) with a checksum recorded. Stored outside the web root where possible, otherwise protected and randomised (C2.8). Retained per P5 §8.1, **except** that a restore point involved in a failed rollback is exempt from retention and never auto-deleted. Disk quota is enforced by refusing the change, never by exceeding the quota (FR-3.5).

---

## 6. Rollback

### 6.1 Triggers

Verification fails · an operation fails mid-plan · a postcondition fails · an interrupted run past the point of no return cannot be rolled forward · the user asks.

### 6.2 Procedure

1. Halt. Do not attempt to "fix forward."
2. Restore in **reverse operation order** — the inverse of application, so partial states unwind correctly.
3. **Re-verify** (FR-5.2). A rollback that isn't verified is a hope.
4. Record the outcome and the cause in the ledger (FR-5.4).
5. Mark the component/version as rolled back and **suppress automatic retry until the version changes** (FR-5.5).

### 6.3 The inconclusive policy — a genuine trade-off

Verification returning `INCONCLUSIVE` (P4 §4.2) is a real decision point, and neither answer is universally right. Rolling back a security patch because a flaky host timed out leaves a site vulnerable; keeping an unverified change contradicts the whole promise.

**Policy matrix, configurable, with these defaults:**

| Change type | Trigger | Default on inconclusive |
|---|---|---|
| Routine update | automatic | **Roll back.** Safety over convenience. |
| Security update | automatic | **Keep, alert loudly, retry verification.** A vulnerable site is the worse outcome. |
| Any change | user-initiated | **Keep, alert, offer one-click rollback.** A person is present to decide. |
| Any change | 3rd consecutive inconclusive | **Stop automating** and require manual review — repeated inconclusiveness is an environment problem, not a change problem. |

Whichever way it resolves, the ledger and UI say *inconclusive*, never *passed*.

### 6.4 When rollback itself fails

The worst case, and the one that determines whether this product deserves to exist.

1. **Never retry blindly.** A failing restore repeated is a failing restore repeated.
2. **Escalate immediately** with specific instructions: the exact files, the restore point location, and a copy-paste WP-CLI command (FR-5.3). Not "an error occurred."
3. **Preserve everything.** The restore point is exempted from retention; the quarantine is untouched.
4. **Produce a recovery bundle** — a downloadable archive of the restore point plus a manifest of what was attempted, so a human or a host's support team can finish the job without our software.
5. **Enter safe mode** (P4 §10.2): stop all automation on this site immediately.
6. **Escaped-failure metric** (P3 §10.2) increments. Target is zero and this is the existential number.

### 6.5 Circuit breakers

Automation stops itself before a pattern becomes an incident:

- **N rollbacks within a window** on one site → automation paused, user notified.
- **A rule producing rollbacks across many sites** → that rule's remediation is disabled globally by feed flag. A bad fix shipped as data must be revocable as data.
- **Rate limit** on automated changes per site per day, so a misconfiguration cannot cascade.

---

## 7. Verification of the fix itself

*Resolves P6 §9.4.* Two layers, both required — this is the answer to "did it work" versus "did anything else break."

**Layer 1 — Operation postconditions.** Every operation declares a machine-checkable assertion of its own effect, expressed as a P6 matcher so there is one assertion vocabulary:

| Operation | Postcondition |
|---|---|
| `set_option` | `option_equals` the new value |
| `write_config_directive` | `http_header_present` / directive effective, not merely written |
| `quarantine_file` | `file_publicly_readable` now false **and** the file present in quarantine |
| `update_component` | installed version matches target **and** the component is active if it was before |
| `set_file_permissions` | mode matches |

A postcondition that fails means the fix did not do what it claimed, and triggers rollback even if the site still works. Writing a directive that a server ignores is a *silent* failure, and silent failures are what this product exists to eliminate.

**Layer 2 — Site verification.** The standard critical-path suite via `Verifier::verify()` (P4 §4.7) — did we break anything else. Plus, for a fix originating from a finding, **re-evaluating that rule**: the finding should now be resolved. If it isn't, we did not fix it.

---

## 8. Concurrency and interruption

**One mutating operation per site, ever** (FR-1.4). A lock with an owner, a TTL, and a heartbeat while a run is active.

**Stale lock recovery:** a lock whose heartbeat has stopped is claimed by a recovery job, which does not resume the abandoned run — it *resolves* it (below).

**Interrupted runs** — timeout, deploy, PHP crash — are detected by a sweep over runs in `applying` or `verifying` past their expected duration:

| Interrupted at | Resolution |
|---|---|
| Before the point of no return | Abandon. Nothing was touched. |
| During `APPLYING` | Restore from the restore point. Operations are individually recorded, so the executor knows exactly how far it got. |
| During `VERIFYING` | Re-run verification. Deterministic and side-effect free, so it is always safe to repeat. |

Every operation is **idempotent** (NFR-3.4) — a resumed plan re-executing one operation must be harmless.

---

## 9. Confirmation

### 9.1 Classes

Per P6 §6: `none` (recommendation only) · `guarded` (explicit confirmation) · `safe` (auto-applicable when the user has opted in). **The class controls who confirms, never whether safety applies** — every class runs the full pipeline.

### 9.2 The token (C2.3)

```
token = HMAC(secret, plan_hash | site_state_hash | user_id | expiry)
```

Bound to the plan **and** to the site state observed when the proposal was made. If either changed — a plugin updated, another admin acted — the token is invalid and the proposal is re-computed. This defeats replay and it defeats the more realistic failure: confirming a plan that was accurate an hour ago and is now wrong. Short expiry, single use, constant-time comparison.

### 9.3 Confirmation copy — per rule, not generic

*Resolves P6 §9.3: yes, and it is not optional.* The confirmation dialog is where a fix engine earns or loses trust, and generic wording ("Are you sure?") teaches people to click through. Every `guarded` remediation carries:

```json
"confirm": {
  "what": "Move debug.log into quarantine and block direct access to it.",
  "consequence": "Anyone with the URL can currently read your error log. After this, they cannot.",
  "side_effects": "Plugins writing to this path will create a new file. Existing entries are preserved in quarantine for 30 days.",
  "reversible": true,
  "blast_radius": "site"
}
```

Plus, always, a **dry run**: the exact diff of what will change — files, option values before and after, config lines — shown before confirmation. Nobody should have to trust a description when they can be shown the change.

---

## 10. Audit trail

Every stage writes to the hash-chained ledger (P5 §3.4). A complete change produces:

| Event | Records |
|---|---|
| `fix.proposed` | plan, origin finding, risk, blast radius, dry-run summary |
| `fix.confirmed` | actor, token id, site state hash |
| `restore_point.created` | uuid, scope, **coverage limits** (§5.2), checksum |
| `fix.operation.applied` | operation, params, before → after |
| `fix.verified` | postcondition results, suite outcome, probe used |
| `fix.committed` / `fix.rolled_back` / `fix.rollback_failed` | outcome, cause, duration |
| `finding.resolved` | closes the loop back to the rule |

This chain is the Ledger's commercial output (Moat 4) — the monthly report saying *"we found this, we fixed it this way, we proved it worked, and here is the evidence"* is what the agency bills against (P3 §1.2). Every field above exists because a client might ask.

Payloads are redacted (C2.4) and capped (P5 §7.2).

---

## 11. Failure modes

The table that matters most. Each row is a required integration test (§12).

| # | Failure | Behaviour |
|---|---|---|
| 1 | Restore point cannot be created | Abort before touching anything. Report why. |
| 2 | Restore point unreadable at creation | Abort. Treat as failure 1. |
| 3 | Disk fills during restore-point creation | Abort, clean up the partial, refuse the change (FR-3.5). |
| 4 | Operation fails mid-plan | Roll back in reverse order, re-verify. |
| 5 | Postcondition fails, site healthy | Roll back. The fix silently didn't work. |
| 6 | Verification fails | Roll back, re-verify, notify. |
| 7 | Verification inconclusive | Policy matrix §6.3. |
| 8 | Timeout during apply | Recovery sweep restores (§8). |
| 9 | Site fatals mid-apply | Diagnostics beacon captures; restore; report the component. |
| 10 | **Rollback fails** | §6.4 in full: escalate, preserve, recovery bundle, safe mode. |
| 11 | Two changes race | Impossible by lock; the second waits or is refused. |
| 12 | Confirmation replayed | Token invalid — plan or state hash differs. |
| 13 | Plan references an unknown operation | Refused and reported (stale plugin, newer feed). |
| 14 | Component update runs a destructive migration | Coverage limits disclosed up front (§5.2); delegate to a full backup where available. |
| 15 | Repeated inconclusive verification | Automation halts after three (§6.3). |
| 16 | A remediation causes rollbacks across many sites | Feed-level kill switch (§6.5). |

---

## 12. Testing requirements

Stricter than the rest of the product, because this is the only subsystem that can destroy a customer's business.

- **Every row of §11 is an automated integration test.** Not a manual checklist.
- **Fault injection is mandatory:** kill the process mid-apply, fill the disk, make the filesystem read-only mid-operation, return 500 from verification, corrupt a restore point. If it is not tested under failure, it is not tested.
- **Restore fidelity tests:** apply, roll back, assert byte-identical files and row-identical tables.
- **Idempotency tests:** every operation applied twice equals applied once.
- **Concurrency tests:** parallel plans on one site never interleave.
- **The catalogue is fully covered:** no operation ships without postcondition, rollback and failure tests.
- **A destructive-migration fixture** — a deliberately hostile plugin update — proving the coverage-limit disclosure is accurate rather than aspirational.

No fix-engine code reaches a customer without an independent security review (C2.9) and the third-party audit.

---

## 13. Open questions for Phase 8

1. **How is coverage limitation (§5.2) shown without either terrifying people or being ignored?** This is a UI problem with real consequences — the honest disclosure must be readable, not a wall of caveats people learn to skip.
2. **What does the dry-run diff look like** for a plugin update, where the honest answer is "1,400 files change"? A file list is useless; something is needed that conveys risk instead of volume.
3. **Should `safe`-class auto-apply be opt-in per rule, per category, or one global switch?** Per rule is most honest and most tedious; one switch is most used and least considered.
4. **How does the rollback-failed escalation reach someone who is not looking at wp-admin?** Email is table stakes; that state may warrant every channel configured.

---

*End of Phase 7.*
