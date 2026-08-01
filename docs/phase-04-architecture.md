# Phase 4 — Software Architecture

**Status:** Complete — awaiting review.
**Scope:** the v0.1 Checkout Monitor as the buildable target, with every seam for v0.2 (attribution) and v1.0 (safety kernel) designed in now so neither becomes a rewrite.
**Binding:** [Standing Constraints](constraints.md) C1 and C2. Sequencing per [The Recommended Plan](recommended-plan.md) §3.

---

## 1. Architectural principles

Five rules. Everything below follows from them, and each is enforceable rather than aspirational.

**A1 — WordPress is a dependency, not a foundation.**
Exactly one layer is permitted to call WordPress functions. Everything else talks to interfaces. This is what makes NFR-7.2 (testable without WordPress bootstrapped) real rather than a wish, and it is enforced in CI (§3.2).

**A2 — Read-only and mutating code are separate modules with a one-way door.**
The verification and observation modules have no capability to change the site, structurally — not by convention. v1.0's kernel depends on verification; verification never depends on the kernel.

**A3 — Behaviour ships in the plugin; only data arrives from outside.**
C1.3. Rules and fix plans are validated declarative documents interpreted by executors present in the source. There is no code path that executes downloaded content.

**A4 — Our failure must never become the site's failure.**
Every hook callback is wrapped. An exception in our code produces a logged error and a degraded feature, never a white screen (NFR-3.3).

**A5 — Every capability is reachable three ways: UI, REST, CLI.**
From the first commit (FR-11.2/11.3). This is what keeps the fleet view and any future cloud a thin client rather than a rewrite, and it makes the whole product testable without a browser.

---

## 2. Folder structure

```
buildwithguru/
├── buildwithguru.php              # Header + guard + bootstrap. No logic.
├── uninstall.php                  # Honours the data-removal setting.
├── composer.json
├── package.json                   # wp-scripts only
├── readme.txt                     # WordPress.org format (C1.5)
│
├── src/
│   ├── Plugin.php                 # Composition root. Wires providers, registers hooks.
│   │
│   ├── Support/                   # Pure PHP. No WordPress. No I/O.
│   │   ├── Guard.php              # A4 wrapper
│   │   ├── Clock.php              # ClockInterface + SystemClock (testable time)
│   │   ├── Hash.php               # Chain hashing for the ledger
│   │   ├── Redactor.php           # Secret scrubbing (C2.4)
│   │   └── Result.php             # Explicit success/failure type
│   │
│   ├── Platform/                  # THE ONLY LAYER ALLOWED TO CALL WORDPRESS
│   │   ├── Options.php            ├── Database.php        ├── Http.php
│   │   ├── Scheduler.php          ├── Filesystem.php      ├── Capabilities.php
│   │   ├── Cache.php              ├── Mailer.php          └── SiteContext.php
│   │
│   ├── Container/                 # Minimal DI container + ServiceProvider
│   │
│   ├── Verification/              # ── v0.1 core ──
│   │   ├── Suite/                 # SuiteRegistry, SuiteDefinition, Step
│   │   ├── Probe/                 # ProbeInterface, LoopbackHttpProbe,
│   │   │                          #   InternalDispatchProbe, ProbeSelector, Session
│   │   ├── Assertion/             # AssertionInterface + concrete assertions
│   │   ├── Detection/             # Auto-discovery of critical paths
│   │   ├── Runner.php             # Executes a suite, emits results
│   │   ├── Verifier.php           # ← the seam v1.0's kernel consumes
│   │   └── Result/                # SuiteResult, StepResult, Evidence
│   │
│   ├── Diagnostics/               # Fatal-error capture beacon (§5)
│   ├── Ledger/                    # Append-only hash-chained record
│   ├── Notifications/             # Transition detection, channels
│   ├── Entitlements/              # Feature gating (free/premium seam)
│   │
│   ├── Timeline/                  # ── v0.2, stub in v0.1 ──
│   ├── Rules/                     # ── Phase 6, schema defined in v0.1 ──
│   ├── Safety/                    # ── v1.0: restore points, transaction, rollback ──
│   ├── Remediation/               # ── v1.0: operation catalogue, executor ──
│   ├── Ai/                        # ── interface only; no implementation in v0.1 ──
│   ├── Licensing/                 # ── deferred; Entitlements is the seam ──
│   │
│   ├── Migrations/                # Numbered, idempotent schema migrations
│   │
│   ├── Http/Rest/                 # Controllers. Thin — no domain logic.
│   ├── Cli/                       # WP-CLI commands. Thin.
│   └── Admin/                     # Screens, assets, notices
│
├── assets/                        # src + built
├── templates/                     # PHP view templates
├── languages/
└── tests/
    ├── Unit/                      # No WordPress. Fast. The majority.
    ├── Integration/               # Real WordPress
    └── Fixtures/
```

---

## 3. Module boundaries

### 3.1 The dependency graph

```
        Delivery   ( Http/Rest · Cli · Admin )
             │  may depend on everything below
             ▼
        Domain     ( Verification · Diagnostics · Ledger · Notifications ·
                     Entitlements · Timeline · Rules · Safety · Remediation · Ai )
             │  may depend only on Platform + Support
             ▼
        Platform   ( the only WordPress-aware layer )
             │
             ▼
        Support    ( pure PHP )
```

Additional rules **within** the domain layer:

| Rule | Reason |
|---|---|
| `Verification` must not depend on `Safety` or `Remediation` | A2 — the read-only core stays read-only, and v1.0 can be added without touching it |
| `Ai` must not depend on `Safety`, `Remediation`, or any mutating service | P1 §6.3 rule 1, made structural: AI *cannot* execute, it is not merely told not to |
| `Ledger` must not depend on any domain module | It records everything, so it must know nothing |
| Nothing may depend on `Delivery` | Controllers are leaves |

### 3.2 Enforcement

These rules are worth nothing if they live only in this document. Three CI gates:

1. **A static check failing the build on any WordPress function call outside `src/Platform/`** (with a small documented allowlist for the bootstrap file).
2. **A dependency-direction check** asserting the table above, by inspecting `use` statements.
3. **WPCS + SAST**, blocking, per C2.9.

The first two are roughly a day of work and they are what keep the architecture true in month nine when you are tired.

---

## 4. The verification engine

The heart of v0.1, and the component v1.0's kernel depends on for its rollback decision. Everything else in the product is scaffolding around this.

### 4.1 Model

```
SuiteDefinition          "WooCommerce checkout path"
  └── Step[]             ordered, stateful, share a Session
        ├── Probe        how the response is obtained
        └── Assertion[]  what must be true of it
```

Deliberately, `Step` is **ordered and stateful** — the cart populated in step 2 must exist in step 4. The `Session` object carries the cookie jar between steps. Most naive implementations of this treat steps as independent and then cannot test a flow at all.

### 4.2 Result model

Four outcomes, not two. This is the honesty requirement (P1 §3 value 6, FR-4.5) expressed in a type:

| Outcome | Meaning |
|---|---|
| `PASSED` | The assertion ran and held. |
| `FAILED` | The assertion ran and did not hold. |
| `SKIPPED` | Not applicable to this site (e.g. no WooCommerce). |
| `INCONCLUSIVE` | Could not be determined — timeout, probe unavailable, network error. |

`INCONCLUSIVE` never aggregates to a pass, and a suite containing one is reported as such rather than as green (FR-4.6). Every `StepResult` carries `Evidence`: status code, timing, matched/missing selectors, captured diagnostics, and the probe used.

### 4.3 Probes — and the loopback problem

The hardest practical problem in v0.1. We need real WordPress requests; many cheap hosts block a site from making HTTP requests to itself.

Two implementations behind `ProbeInterface`:

**`LoopbackHttpProbe`** — a real HTTP request via `Platform\Http` with a maintained cookie jar. Highest fidelity: it exercises the full stack including page caching, redirects, and the theme. Fails where loopback is blocked.

**`InternalDispatchProbe`** — dispatches in-process without leaving PHP. Covers REST routes (`rest_do_request`) and admin-ajax handlers directly, which is enough for WooCommerce's cart fragments and Store API. Cannot faithfully reproduce full front-end page rendering.

**`ProbeSelector`** runs a capability probe at activation and on a schedule, caches the verdict, and picks per step: loopback where available, internal dispatch where the step supports it, `INCONCLUSIVE` where neither can serve. **The UI states which probe was used** — a suite verified by internal dispatch covers less than one verified by loopback, and saying so is the brand (P1 §3, value 6).

*Week 3 spike 1 in the Recommended Plan exists to measure this on real budget hosting before the design is committed.*

### 4.4 Assertions

Small, composable, individually testable. The v0.1 set:

`StatusIs` · `StatusNotServerError` · `ElementPresent` (CSS selector) · `ElementAbsent` · `TextPresent` · `NoPhpErrorOutput` · `NoFatalCaptured` (reads the Diagnostics beacon) · `JsonPathExists` · `RespondedWithin` · `RedirectsTo`

Each returns pass/fail **plus** a human-readable explanation used verbatim in the UI — no separate copy layer to drift out of sync (NFR-6.5).

### 4.5 The WooCommerce checkout suite

The differentiator, per FR-4.3. Steps:

1. Shop or product page renders — `StatusIs(200)`, `NoFatalCaptured`
2. Add to cart — via Store API where available, else the classic form post
3. Cart reflects the item — `JsonPathExists(items[0])` or `ElementPresent(.cart-item)`
4. Checkout page renders — `StatusIs(200)`, `NoFatalCaptured`, `NoPhpErrorOutput`
5. Checkout form is present — billing fields, order review
6. **Payment methods are present** — the single highest-value assertion. A checkout that renders with no payment gateway is the classic silent revenue failure, and it passes every pixel test.
7. Cart fragments / Store API respond — `StatusNotServerError`
8. **Teardown** — destroy the verification session and cart

**No order is created and nothing is charged** (FR-4.3, US-2.4). The flow stops before order placement, which is where the cost/benefit turns sharply: real gateway transactions across dozens of gateways is a multi-month project (P3 §8.4), while steps 1–7 catch the large majority of real breakage.

### 4.6 Isolation and cleanup

- A dedicated verification identity — never a real customer session.
- Requests carry an identifiable User-Agent and header so they can be excluded from analytics and recognised in server logs (US-2.4/AC3).
- Teardown runs in a `finally`, and orphan cleanup runs on a schedule for sessions left by an interrupted run.
- Hard timeout per step and per suite; exceeding it yields `INCONCLUSIVE` (FR-4.6).
- A run lock ensures one verification per site at a time (FR-1.4).

### 4.7 The v1.0 seam

`Verifier` exposes one method:

```php
public function verify(SuiteSelection $selection, RunContext $context): SuiteResult;
```

v0.1 calls it on a schedule. v1.0's `Safety\ChangePipeline` calls the *same service* between apply and commit, and rolls back on anything other than a clean pass. The kernel is added **above** verification without modifying it — which is exactly why building verification first is not wasted work.

---

## 5. Diagnostics — capturing fatals during verification

A verification request that triggers a PHP fatal returns a 500 or a blank page. Without more, all we can report is "something broke," which is barely better than the competition. The mechanism that turns that into `"PHP fatal in some-plugin/gateway.php:214"` is the single highest-value piece of engineering in v0.1.

**The beacon:**

1. The runner generates a `run_id` and, per step, a token: `run_id.step_id.HMAC(secret, run_id|step_id|expiry)`.
2. The probe sends it as a request header.
3. Our plugin hooks early and checks for the header. Validation is HMAC with `hash_equals`, a short expiry, and a rate limit.
4. On a valid beacon it installs `set_error_handler`, `set_exception_handler` and `register_shutdown_function` — **observation only, no behaviour change**.
5. The shutdown handler inspects `error_get_last()` for `E_ERROR`, `E_PARSE`, `E_COMPILE_ERROR`, `E_CORE_ERROR`, and writes a minimal record (run, step, type, message, file, line, trace where available) via a single prepared insert. It must assume the process is dying: no autoloading, no object graph, no allocation beyond the essentials.
6. It also detects WordPress's own `WP_Fatal_Error_Handler` output, since core may intercept first.
7. The runner reads the record after the response and attaches it as `Evidence`.

**Security** (C2): the beacon is signed and time-limited, so it cannot be triggered by an outsider; it grants no capability and changes no behaviour; it is rate-limited; and the secret lives under the C2.4 secrets rules.

**Known limitation, to be stated in the UI:** a fatal occurring during plugin *loading*, before our early hook runs, cannot be captured in-process. Detection falls back to response-shape analysis. A must-use plugin companion would close this and is deliberately deferred — mu-plugin installation is intrusive and a poor fit for a free-tier first impression.

---

## 6. Service layer and dependency injection

**A minimal in-house container**, roughly 150 lines: bindings, singletons, constructor autowiring via reflection, and `ServiceProvider` classes per module.

*Why not an off-the-shelf container:* C2.7 requires a justification per dependency and a minimal footprint. A container is the one piece of infrastructure where the WordPress environment (no shared autoloader guarantees, plugin conflicts over vendored libraries) makes owning ~150 lines cheaper than owning a dependency forever. Composer is still used for dev tooling and any genuinely substantial runtime dependency.

Everything is constructor-injected. No service locator, no static access, no globals — those are what make the WordPress plugin ecosystem untestable, and NFR-7.2 forbids them here.

`Plugin::boot()` is the composition root: it builds the container, registers providers, and registers hooks. It contains no domain logic.

---

## 7. Background processing and the queue

**Decision: Action Scheduler.** Resolves P3 §13.1, the highest-risk technical decision, at near-zero cost.

Rationale: it is battle-tested against precisely the hostile conditions in NFR-2.3 — no real cron, aggressive timeouts, low memory — and on WooCommerce sites, which are v0.1's entire market, **it is already installed and already running.** Writing our own runner costs a month and produces something worse.

`Platform\Scheduler` wraps it behind an interface, so the dependency is one file deep and a replacement is possible without touching domain code.

**Rules for all background work:**

- Every job is **idempotent** — it may run twice (NFR-3.4).
- Every job is **resumable** — a run is a state machine persisted after each step, so a timeout mid-suite resumes rather than restarting (FR-1.3).
- Batches are chunked to finish inside 20 seconds and under 128MB (NFR-1.4/1.5).
- Nothing scans, verifies, or writes restore points in a user-facing request (NFR-1.3).
- Where Action Scheduler is absent and cannot be bundled, degrade to WP-Cron with an explicit in-UI warning about reliability — never silently.

**Run state machine:** `queued → running → (step loop) → completed | failed | timed_out | abandoned`. Persisted transitions are what make FR-1.3 true rather than hopeful.

---

## 8. Database

Full detail is Phase 5. The shape and the rules:

### 8.1 Tables

**v0.1** — `bwg_runs` (one row per verification run) · `bwg_run_steps` (per step, with evidence) · `bwg_diagnostics` (beacon captures) · `bwg_events` (the ledger, append-only, hash-chained).

**v0.2** adds `bwg_changes` (the attribution timeline).
**v1.0** adds `bwg_restore_points` and `bwg_operations`.

### 8.2 Rules

- **Custom tables, not post meta or options.** These are append-only, high-volume and query-shaped; the options table in particular is loaded on every request and is the wrong home for anything that grows. Options hold settings only.
- Every table carries created-at and an index supporting its dominant query — which is almost always "most recent N for this site."
- Retention is enforced by a scheduled prune, and expiry is itself a ledger event (FR-9.5).
- All access via `Platform\Database`; prepared statements without exception; table and column names never interpolated from input (C2.3).

### 8.3 Migrations

Numbered, idempotent migration classes with a schema version in options. On load, if the stored version is behind, migrations are **scheduled**, not run inline — a slow migration must never land in a user's request. Every migration is forward-only and tested against a populated fixture database.

---

## 9. Caching

`Platform\Cache` wraps transients and the object cache in one interface with a `remember(key, ttl, callable)` helper and a dedicated cache group so a flush is scoped to us.

**What is cached:** probe capability verdicts, critical-path detection results, entitlement state, expensive site introspection.

**What is never cached:** verification results. They are timestamped facts and they live in tables. A cached "checkout is fine" is precisely the lie this product exists to prevent.

Correct behaviour under external page and object caching is NFR-2.4, and it cuts both ways: our probes must be able to request an uncached response where it matters, or a passing check could be reading a page cached before the change.

---

## 10. Logging and error handling

### 10.1 Logging

A minimal PSR-3-shaped `LoggerInterface` with `DbLogger` and `NullLogger`. Every record passes through `Support\Redactor` before storage — secrets never reach the log (C2.4), and the redactor has a test asserting that known secret patterns do not survive it. Level is configurable, default warning-and-above, with bounded retention.

### 10.2 Error handling — A4 in practice

```php
add_action('some_hook', fn(...$a) => Guard::run(fn() => $service->handle(...$a)));
```

`Guard::run()` catches `Throwable`, logs it with context, and returns a safe default. **No exception from our code escapes into a WordPress hook.**

Three further protections:

- **Safe mode.** Repeated fatals attributed to our plugin disable non-essential subsystems and surface a clear admin notice, leaving the site fully functional. A reliability product that takes a site down has failed at the only thing it claims.
- **Degrade, never disappear.** A feature that cannot run says why (NFR-3.2, NFR-6.5). No silent no-ops.
- **User-facing errors state what happened, what it means, and what to do.** Enforced at review; every message is UI copy, not a stack trace.

---

## 11. REST API

Namespace `bwg/v1`. Controllers are thin — validate, delegate, serialise. No domain logic.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/status` | Current verification state — the one screen's data |
| `GET` | `/suites` | Available suites and their applicability |
| `GET` | `/runs` | Paginated run history |
| `GET` | `/runs/{id}` | A run with full step results and evidence |
| `POST` | `/runs` | Trigger a verification run |
| `GET` | `/events` | Ledger entries, filterable |
| `POST` | `/export` | Generate a ledger export |
| `GET`/`PATCH` | `/settings` | Read and update settings |
| `GET` | `/diagnostics/environment` | Probe capability, scheduler health, versions |

**Security on every route** (C2.1): a real `permission_callback` mapped to a specific custom capability — **never** `__return_true`, enforced by a CI check — plus a declared `args` schema with validation and sanitisation callbacks, rejecting unknown fields. Write routes are rate-limited (C2.8).

---

## 12. WP-CLI

Mirrors REST one-to-one (A5), because it makes the product scriptable, supports agencies, and makes integration testing possible without a browser.

```
wp bwg status                      # current state, exit code reflects health
wp bwg verify [--suite=<slug>]     # run now, stream results
wp bwg runs list|get <id>
wp bwg events list [--since=]
wp bwg export --from= --to= --format=json|csv
wp bwg doctor                      # environment + probe capability report
```

`wp bwg status` returning a non-zero exit code when verification is failing makes the product usable in a deploy pipeline — a small detail that matters to the developer segment.

---

## 13. Hooks and filters

Prefix `bwg/`. Every extension point is documented, versioned, and covered by a test — an undocumented hook is a support ticket waiting to happen.

**Actions:** `bwg/run/started` · `bwg/run/completed` · `bwg/step/completed` · `bwg/verification/failed` · `bwg/verification/recovered` · `bwg/ledger/recorded`

**Filters:** `bwg/suites` (register suites) · `bwg/assertions` (register assertion types) · `bwg/probes` · `bwg/critical_paths` (adjust auto-detected paths) · `bwg/notification/should_send` · `bwg/notification/message` · `bwg/retention/days`

This is the ecosystem seam from P1 §6.1 — third parties extending us is how the later rule packs arrive without us building thirteen products.

---

## 14. Modules designed now, built later

Designing the interfaces now costs little and prevents the rewrite.

### 14.1 Rules / scanner engine *(Phase 6)*
`RuleDefinition` is **validated declarative data** (C1.3): id, category, severity, matcher specification, references, remediation reference. A `MatcherRegistry` maps matcher types to shipped implementations. Incoming rule data referencing an unknown matcher or an unimplemented version is **rejected**, not skipped — silent partial evaluation is worse than refusal. In v0.1 the schema exists and the engine is a stub; the verification suites are the only rules.

### 14.2 Remediation / fix engine *(Phase 7, v1.0)*
`OperationInterface` with a fixed `OperationCatalogue`. A `Plan` is an ordered list of catalogue operation IDs plus validated parameters — never code, never a callable, never a path or SQL fragment from outside (C2.3). The executor refuses any plan referencing an operation it does not implement.

### 14.3 Safety kernel *(v1.0)*
`RestorePoint`, `ChangeTransaction`, `RollbackService`, and `ChangePipeline` orchestrating: assess → restore point → apply → **`Verifier::verify()`** → commit or roll back. Consumes verification; verification never knows it exists (A2).

### 14.4 AI provider layer
`AiProviderInterface` defined in v0.1; **no implementation ships.** The default binding is a null object.

The three architectural rules from P1 §6.3, made structural rather than promised:

1. Consumers depend on `RankerInterface`, whose default binding is `DeterministicRanker`. An AI-backed ranker is an alternative binding, so removing AI entirely changes nothing but a container binding (P1 §6.3 rule 2).
2. The `Ai` module may not depend on any mutating module — CI-enforced (§3.2). AI **cannot** execute; it is not merely instructed not to (rule 1).
3. No AI call sits on a synchronous path. All AI work is queued and its absence is never blocking (rule 3).

### 14.5 Entitlements and licensing
`Entitlements` answers `has(Feature $f): bool`. In v0.1 it returns true for the free feature set and false for the rest — no licence check, no network call. Later, a licence populates it. Free-first means this is a capability check today and a licensing integration later, with no restructuring.

Licence verification, when built: a signed token verified against a public key embedded in the plugin, with a grace period on network failure. No obfuscation (C1.1). Signed update packages (C2.7) matter more than licence enforcement.

---

## 15. What v0.1 actually builds

| Build now | Design only |
|---|---|
| Support, Platform, Container | Rules engine (schema only) |
| Verification (suites, probes, assertions, runner) | Remediation |
| Diagnostics beacon | Safety kernel |
| Ledger | AI providers |
| Notifications (email, transition-based) | Licensing |
| Entitlements (static) | Timeline (v0.2) |
| Migrations, REST, CLI, Admin (one screen) | |

---

## 16. Open questions for Phase 5

1. Ledger hash-chaining under a database that may be restored from backup — a restore rewinds the chain. Detect and record the discontinuity rather than treating it as tampering?
2. Evidence payload storage: JSON column, serialised blob, or a child table? Bears on query patterns and on the retention prune.
3. Retention defaults per tier, and whether free-tier limits are row-count or age-based.
4. Multisite table strategy — per-site tables or a shared table with a site column (NFR-2.5, C2.2).
5. Index design for the dominant query, "most recent N runs with their steps," without a join that degrades at scale.

---

*End of Phase 4.*
