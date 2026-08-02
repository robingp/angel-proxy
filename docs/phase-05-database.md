# Phase 5 — Database Design

**Status:** Complete — awaiting review.
**Scope:** v0.1 tables specified for implementation; v0.2 and v1.0 tables specified for shape so no migration becomes destructive later.
**Resolves:** the five open questions in Phase 4 §16.

---

## 1. Design rules

**D1 — Custom tables only.** Nothing in this product belongs in post meta or the options table. Options are autoloaded on every request; a growing options row is a permanent, site-wide performance tax. Options hold settings and small state. Everything else gets a table (P4 §8.2).

**D2 — Append-only where the data is a record of fact.** Runs, steps, diagnostics, events and changes are history. History is inserted and eventually pruned; it is never updated in place. The one exception is a run row transitioning through its own lifecycle states, which is the run's *own* state, not a record of something else.

**D3 — Promote what you query, serialise what you display.** Any field that appears in a `WHERE`, `ORDER BY` or aggregate is a real column. Everything else lives in a JSON payload column. This is the compromise that keeps tables narrow without forcing a child table for every detail (resolves §7.2).

**D4 — Every indexed string column is `VARCHAR(191)` or shorter.** With `utf8mb4`, older MySQL caps an index key at 767 bytes — 191 characters. This bites people at migration time on real customer databases; designing around it costs nothing.

**D5 — No foreign key constraints.** WordPress uses MyISAM on some installs and InnoDB on others, and core itself declares no FKs. Referential integrity is enforced in the application layer and by cascading deletes in the prune job. Columns are still named and indexed as foreign keys.

**D6 — Bounded growth is a hard requirement.** NFR-1.6 states a ceiling. Every table has a retention policy *and* a row-count backstop (§8).

---

## 2. Entity relationship diagram

```
                        ┌──────────────────────┐
                        │      bwg_runs        │
                        │──────────────────────│
                        │ PK id                │
                        │ UQ uuid              │◄──────────────┐
                        │    suite_slug        │               │
                        │    status / outcome  │               │  matched by uuid,
                        │    started_at        │               │  not by id — the
                        └──────────┬───────────┘               │  beacon writes from
                                   │ 1                          │  a separate request
                                   │                            │  that only holds
                                   │ N                          │  the signed token
                        ┌──────────▼───────────┐               │
                        │    bwg_run_steps     │               │
                        │──────────────────────│               │
                        │ PK id                │      ┌────────┴─────────────┐
                        │ FK run_id            │      │   bwg_diagnostics    │
                        │    step_slug         │      │──────────────────────│
                        │    outcome           │      │ PK id                │
                        │    evidence (JSON)   │      │    run_uuid          │
                        │ FK diagnostic_id ────┼─────►│    step_slug         │
                        └──────────────────────┘   0..1│    type/message      │
                                                       │    file/line/trace   │
                                                       └──────────────────────┘

   ┌───────────────────────────────────────────────────────────────────────┐
   │                            bwg_events                                 │
   │  The ledger. Hash-chained, append-only. References subjects loosely   │
   │  by (subject_type, subject_id) so it never depends on another module. │
   │  PK id · UQ (segment, sequence) · prev_hash → hash                    │
   └───────────────────────────────────────────────────────────────────────┘
                       ▲ records events about everything

   ── v0.2 ────────────────────────────────────────────────────────────────
   ┌──────────────────────┐        correlation is temporal, not relational:
   │     bwg_changes      │        "changes where occurred_at BETWEEN
   │  what changed, when, │         (failure_time - window) AND failure_time"
   │  and who did it      │        — deliberately no FK to runs
   └──────────────────────┘

   ── v1.0 ────────────────────────────────────────────────────────────────
   ┌──────────────────────┐  1   N ┌──────────────────────┐
   │ bwg_restore_points   │◄───────│   bwg_operations     │
   │ scope, checksum,     │        │ plan_uuid, sequence, │
   │ verified_at, expires │        │ operation_id, params │
   └──────────────────────┘        └──────────────────────┘
```

**Relationship summary**

| From | To | Cardinality | Enforced by |
|---|---|---|---|
| `runs` | `run_steps` | 1 : N | application + cascade prune |
| `run_steps` | `diagnostics` | 0..1 | nullable `diagnostic_id` |
| `diagnostics` | `runs` | N : 1 | **by `uuid`, not `id`** — see §3.3 |
| `events` | anything | loose | `(subject_type, subject_id)`, never a FK |
| `changes` | `runs` | none | temporal correlation only |
| `operations` | `restore_points` | N : 1 | application |

---

## 3. v0.1 tables

All tables take `$wpdb->get_charset_collate()` and the blog-scoped `$wpdb->prefix` (§6).

### 3.1 `bwg_runs`

One row per verification run.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | PK |
| `uuid` | `CHAR(36)` | External identifier used in REST, exports and the beacon |
| `suite_slug` | `VARCHAR(64)` | |
| `trigger` | `VARCHAR(20)` | `schedule` · `manual` · `rest` · `cli` · `pipeline` |
| `actor` | `VARCHAR(100)` | `user:12` · `cron` · `cli` · `system` |
| `probe` | `VARCHAR(20)` | `loopback` · `internal` · `mixed` — surfaced in the UI (P4 §4.3) |
| `status` | `VARCHAR(20)` | `queued` · `running` · `completed` · `failed` · `timed_out` · `abandoned` |
| `outcome` | `VARCHAR(20) NULL` | `passed` · `failed` · `inconclusive` · `skipped`; null while running |
| `started_at` | `DATETIME` | |
| `finished_at` | `DATETIME NULL` | |
| `duration_ms` | `INT UNSIGNED NULL` | |
| `steps_total` / `steps_passed` / `steps_failed` / `steps_inconclusive` | `SMALLINT UNSIGNED` | Denormalised counts — the dashboard never aggregates at read time |
| `failed_step_slug` | `VARCHAR(64) NULL` | Promoted so the one screen renders from a single row |
| `summary` | `VARCHAR(255) NULL` | The human sentence shown verbatim in the UI |
| `resume_state` | `TEXT NULL` | Serialised runner position for FR-1.3 resumability |
| `created_at` | `DATETIME` | |

**Indexes**

```
PRIMARY KEY (id)
UNIQUE KEY uuid (uuid)
KEY started (started_at)
KEY outcome_started (outcome, started_at)
KEY status (status)                -- the resumable-runner sweep for stalled runs
```

The denormalised counts and `failed_step_slug` exist for one reason: the product's main screen must render from a single indexed row read (NFR-1.1). Recomputing from `run_steps` on every dashboard load is the kind of decision that feels clean and performs badly.

### 3.2 `bwg_run_steps`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK |
| `run_id` | `BIGINT UNSIGNED` | |
| `step_slug` | `VARCHAR(64)` | |
| `position` | `SMALLINT UNSIGNED` | Execution order |
| `outcome` | `VARCHAR(20)` | The four outcomes (P4 §4.2) |
| `probe` | `VARCHAR(20)` | |
| `http_status` | `SMALLINT UNSIGNED NULL` | |
| `duration_ms` | `INT UNSIGNED NULL` | |
| `explanation` | `VARCHAR(500)` | Produced by the assertion, shown verbatim (P4 §4.4) |
| `evidence` | `LONGTEXT NULL` | JSON — see §7.2 |
| `evidence_truncated` | `TINYINT(1)` | Honesty flag when the cap was hit |
| `diagnostic_id` | `BIGINT UNSIGNED NULL` | |
| `created_at` | `DATETIME` | |

**Indexes**

```
PRIMARY KEY (id)
KEY run_position (run_id, position)
KEY outcome (outcome)
```

### 3.3 `bwg_diagnostics`

Written by the beacon (P4 §5) from **a different request** than the one running the suite. That request holds only the signed token, so it cannot know `run_id` — it writes `run_uuid`. This is why `runs.uuid` exists.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK |
| `run_uuid` | `CHAR(36)` | |
| `step_slug` | `VARCHAR(64)` | |
| `type` | `VARCHAR(30)` | `fatal` · `parse` · `compile` · `exception` · `core_handler` |
| `message` | `TEXT` | |
| `file` | `VARCHAR(191)` | D4 |
| `line` | `INT UNSIGNED` | |
| `trace` | `LONGTEXT NULL` | Often unavailable in a shutdown handler |
| `component_type` | `VARCHAR(20) NULL` | `plugin` · `theme` · `core` · `unknown` |
| `component_slug` | `VARCHAR(191) NULL` | Resolved from the file path — this is what makes the message actionable |
| `captured_at` | `DATETIME` | |

**Indexes**

```
PRIMARY KEY (id)
KEY run_step (run_uuid, step_slug)
KEY captured (captured_at)
KEY component (component_slug, captured_at)
```

The insert must survive a dying process: a single prepared statement, no autoloading, no object graph, minimal allocation. Component resolution happens **later**, when the runner reads the row — never in the shutdown handler.

### 3.4 `bwg_events` — the ledger

Moat 4, a compliance artefact, and the premium hook. Append-only and hash-chained (C2.6).

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK |
| `segment` | `INT UNSIGNED` | Chain segment — increments on a detected discontinuity (§7.1) |
| `sequence` | `BIGINT UNSIGNED` | Monotonic within a segment |
| `occurred_at` | `DATETIME(3)` | Millisecond precision so ordering is unambiguous |
| `type` | `VARCHAR(50)` | `verification.failed` · `verification.recovered` · `run.completed` · `settings.changed` · `retention.pruned` · `chain.discontinuity` |
| `severity` | `VARCHAR(20)` | `info` · `warning` · `critical` |
| `actor` | `VARCHAR(100)` | Who or what caused it |
| `subject_type` | `VARCHAR(50) NULL` | Loose reference — the ledger depends on no module (P4 §3.1) |
| `subject_id` | `VARCHAR(64) NULL` | |
| `summary` | `VARCHAR(255)` | Human sentence; exports read this |
| `payload` | `LONGTEXT NULL` | JSON, redacted (C2.4), capped |
| `prev_hash` | `CHAR(64)` | |
| `hash` | `CHAR(64)` | |
| `retain_forever` | `TINYINT(1)` | Survives pruning — see §8.3 |

**Indexes**

```
PRIMARY KEY (id)
UNIQUE KEY chain (segment, sequence)
KEY occurred (occurred_at)
KEY type_occurred (type, occurred_at)
```

**Hash definition.** `hash = sha256(canonical(prev_hash, segment, sequence, occurred_at, type, actor, subject_type, subject_id, summary, payload))`, where `canonical()` is a deterministic serialisation: keys sorted, no floats, explicit null encoding, UTF-8, no whitespace. Determinism is the whole property — a serialiser that reorders keys silently destroys verifiability, so `canonical()` gets its own unit tests with frozen fixtures.

There is no application path that updates or deletes an event except the retention prune (§8.3).

---

## 4. v0.2 table — `bwg_changes`

Specified now so the v0.2 migration is purely additive.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK |
| `occurred_at` | `DATETIME(3)` | |
| `source` | `VARCHAR(30)` | `plugin_update` · `theme_update` · `core_update` · `activation` · `deactivation` · `option` · `user` · `file` · `ability` |
| `actor` | `VARCHAR(100)` | `user:12` · `cron` · `cli` · `automation` · `agent:<id>` · `unknown` |
| `component_type` | `VARCHAR(20) NULL` | |
| `component_slug` | `VARCHAR(191) NULL` | |
| `from_version` / `to_version` | `VARCHAR(32) NULL` | |
| `detail` | `LONGTEXT NULL` | JSON |
| `detected_by` | `VARCHAR(30)` | `hook` · `scan` · `filesystem` |

**Indexes**

```
PRIMARY KEY (id)
KEY occurred (occurred_at)
KEY component_occurred (component_slug, occurred_at)
KEY source_occurred (source, occurred_at)
KEY actor_occurred (actor, occurred_at)
```

The `ability` source and `agent:<id>` actor are the agent-governance beachhead (P2 §8.3, FR-6.5) — costing one enum value now, and making us the only product that can show what an agent did.

**Correlation is temporal, not relational.** The defining query is *"everything that changed in the window before this failure"* — served entirely by `KEY occurred`. A foreign key to `runs` would be wrong: the causal change usually happened before the run that detected it, and often has no run at all.

---

## 5. v1.0 tables

Shape only; Phase 7 specifies semantics.

**`bwg_restore_points`** — `id` · `uuid` · `created_at` · `scope` (JSON: components, paths, tables) · `storage_driver` · `storage_ref` · `size_bytes` · `checksum` · `verified_at` (FR-3.2 — an unverified restore point is not a restore point) · `status` · `expires_at`.
Indexes: PK · UQ `uuid` · `KEY (status, expires_at)` · `KEY (created_at)`.

**`bwg_operations`** — `id` · `plan_uuid` · `sequence` · `operation_id` (from the fixed catalogue, C1.3) · `params` (JSON, validated) · `status` · `started_at` · `finished_at` · `result` (JSON) · `restore_point_id`.
Indexes: PK · `KEY (plan_uuid, sequence)` · `KEY (status)`.

---

## 6. Multisite strategy — resolves §16.4

**Decision: per-site tables via `$wpdb->prefix`.**

`$wpdb->prefix` is already blog-scoped (`wp_2_bwg_runs`), so this follows WordPress's own convention. Three reasons it beats a shared table with a `site_id` column:

1. **Security by construction.** C2.2 requires that a site administrator cannot reach another site's data. With separate tables that is enforced by the table boundary — not by a `WHERE site_id = ?` clause that one forgotten query turns into a cross-tenant leak.
2. **Deletion is free.** Removing a site drops its tables. A shared table needs a cleanup routine that will eventually be wrong.
3. **Simpler queries and better index locality**, since the dominant query is always single-site.

**Accepted cost:** network-wide reporting must iterate sites. That's acceptable — network dashboards are Horizon 2+, and iteration at that scale is a background job, not a page load.

Network-activated installs run migrations per site, batched through Action Scheduler rather than in one request (§7 covers the mechanism).

---

## 7. Resolved design questions

### 7.1 Hash chain vs. database restore — §16.1

A backup restore rewinds the ledger, and naive verification would report tampering. The honest design starts by naming the threat model precisely.

**What hash chaining actually defends against:** *selective* modification — someone deleting or editing an inconvenient entry while leaving the rest. That is the realistic threat, and the chain detects it reliably: the successor's `prev_hash` stops matching.

**What it cannot defend against:** an actor with full write access rewriting the entire chain. No in-database scheme can, because any anchor stored in the database is restored along with it.

**The design:**

- The chain head (`segment`, `sequence`, `hash`) is mirrored to a **file anchor** outside the database, under uploads. Filesystem and database are usually restored independently, so a database-only rollback is detectable.
- On boot, the table head is compared with the anchor. If the table is behind, that is a **discontinuity**, not tampering: increment `segment`, write a `chain.discontinuity` event recording the expected and found heads, and continue. Segment 2 begins.
- Exports state, plainly: *"Verified continuous from sequence N. A database restore was detected on <date>; entries before that point are in an earlier chain segment."*
- Verification is a read-only operation available via CLI and REST, reporting per segment.
- Where no anchor exists (fresh install, unwritable uploads), exports say the chain is verified **from** the earliest available sequence, and claim nothing more.

This is the C2.4 precedent applied again: state what the mechanism does and does not cover, rather than implying a guarantee we cannot make.

### 7.2 Evidence storage — §16.2

**JSON in `LONGTEXT`, with promoted columns for anything queried** (D3).

Evidence is read when a human opens a specific step. It is never filtered, sorted or aggregated on. A child table would multiply row counts by a large factor to serve a query that does not exist, and a native `JSON` column is not safely assumable across the MySQL and MariaDB versions WordPress supports.

`http_status`, `duration_ms`, `outcome` and `probe` are promoted to real columns because they *are* queried.

**Capped at 64KB** with `evidence_truncated` set when the cap bites. Captured HTML is stored as targeted extracts — the matched or missing region — never a whole page. An uncapped evidence column is the single most likely cause of a table that eats a customer's disk.

### 7.3 Retention defaults — §16.3

Both mechanisms, with different jobs: **age is the policy, row count is the safety valve.** Age alone fails on a site verifying every five minutes; row count alone produces retention that varies by site and cannot be described in a sentence.

See §8.

### 7.4 The dominant query — §16.5

*"Most recent N runs with their steps."* Never a join.

```
1)  SELECT … FROM bwg_runs ORDER BY started_at DESC LIMIT 20        -- KEY started
2)  SELECT … FROM bwg_run_steps WHERE run_id IN (…) ORDER BY run_id, position
                                                                    -- KEY run_position
```

Two indexed queries, hydrated in PHP. A `LEFT JOIN` with `LIMIT` is the classic trap here — the limit applies to joined rows, so it either returns the wrong number of runs or forces a subquery that degrades as the table grows.

The main screen does not even reach step 2: it renders from one `bwg_runs` row, which is what §3.1's denormalised columns are for.

---

## 8. Retention policy

### 8.1 Defaults

| Data | Free | Premium | Rationale |
|---|---|---|---|
| Runs + steps | 7 days | 90 days, configurable | Recent history answers "is it working"; long history is a paid product |
| Diagnostics | 7 days | 90 days | Tied to the steps they explain |
| Ledger events | 30 days | 12 months, configurable | The Ledger is the moat — depth is exactly what premium sells (Plan §7.4) |
| Changes (v0.2) | — | 12 months | Premium feature |
| Restore points (v1.0) | — | 30 days or quota, whichever first | Storage-bound, not time-bound |

### 8.2 Backstops

Independent of age, per table:

- A **row-count ceiling** enforced on each prune (oldest first).
- A **total footprint ceiling** satisfying NFR-1.6, checked by the prune job and surfaced in the environment report.
- Restore points additionally respect a **disk quota**, and FR-3.5's rule stands: the product never fills the disk. If the quota is reached, the change is refused rather than the quota exceeded.

### 8.3 Mechanism, and the recursion problem

Pruning runs as a scheduled Action Scheduler job, in bounded batches, oldest-first, deleting steps and diagnostics with their parent run in the same batch.

FR-9.5 requires that expiry is itself a ledger event — which, applied naively, means pruning writes events that later need pruning, forever.

**Resolution:** each prune writes **one summary event** — `retention.pruned`, recording counts and the cut-off date — and that event carries `retain_forever = 1`. Summary events are exempt from pruning and are tiny and bounded (one per prune run). The ledger therefore retains a complete, permanent account of what was removed and when, without retaining the removed rows.

### 8.4 Uninstall

`uninstall.php` honours the data-removal setting (FR-11.5). Default is **retain** — silently destroying a customer's audit history on deactivation would be indefensible for a product whose value is the record. Removal is explicit, confirmed, and states exactly what will be deleted.

---

## 9. Migration strategy

### 9.1 Mechanism

Numbered, forward-only migration classes (`M001CreateRuns`, `M002CreateRunSteps`, …) with a `bwg_schema_version` option.

- On load, if the stored version is behind the code version, migration is **scheduled**, never run inline. A slow `ALTER` in a customer's page request is unacceptable (NFR-1.3).
- While migrating, a flag puts dependent features into a degraded state with a clear notice, so nothing reads a half-migrated table.
- `dbDelta()` for table creation; **explicit `ALTER` statements for changes** — `dbDelta` is quirky about index and column modifications and silently does the wrong thing often enough not to trust it beyond creation.
- Every migration is **idempotent** — it may run twice (NFR-3.4). Existence is checked before creating.
- Large data migrations are chunked across Action Scheduler batches with resumable position.
- Charset and collation always from `$wpdb->get_charset_collate()`.

### 9.2 Forward-only

No down migrations. A rollback in production means restoring data, not reversing DDL, and maintaining reverse migrations that are never exercised produces false confidence. Version compatibility is handled by making changes additive.

### 9.3 Additive-first rule

New columns are added nullable or with defaults; columns are deprecated before removal, with removal at least one minor version later. This is what makes the v0.2 and v1.0 tables in §4 and §5 free to add: they are new tables, not alterations.

### 9.4 Testing

Every migration runs in CI against a **populated** fixture database, not an empty one — migrations that pass on empty tables and fail on real data are the standard failure. The suite asserts row preservation, index presence, and idempotency by running each migration twice.

---

## 10. Sizing

Rough per-row footprint, for a site verifying every 15 minutes (96 runs/day, ~8 steps each):

| Table | Rows/day | Approx/row | Approx/day |
|---|---|---|---|
| `bwg_runs` | 96 | ~0.5 KB | ~50 KB |
| `bwg_run_steps` | ~770 | ~1–2 KB | ~1.2 MB |
| `bwg_diagnostics` | ~0 (healthy) | ~2 KB | negligible |
| `bwg_events` | ~2–5 | ~0.5 KB | ~2 KB |

At the free 7-day retention: **under 10 MB**. At premium 90-day: **~110 MB**, dominated by step evidence — which is exactly why §7.2 caps evidence and stores extracts rather than pages.

A healthy site generates almost no diagnostics. A badly broken one generates many, which is when the row-count backstop earns its place.

---

## 11. Open questions for Phase 6

1. Where do rule *definitions* live — shipped files parsed at runtime, or a table populated on install? Files are simpler and match C1.3's "behaviour ships in the plugin"; a table helps only if rules become user-editable.
2. Do rule *findings* need their own table, or are they derived from runs? Bears on whether a finding has a lifecycle (acknowledged, muted, resolved) — and muting almost certainly requires state.
3. Retention interaction between findings and the runs that produced them.

---

*End of Phase 5.*
