# Phase 6 — Scanner Framework

**Status:** Complete — awaiting review.
**Scope note:** the engine below is the framework for the whole product's lifetime. Only a small subset of rules ships in v0.1 — the read-only Checkout Monitor (Plan §3). The catalogue is written now so the engine is designed against real requirements rather than imagined ones, and so rule authoring later is data entry rather than design.
**Binding:** C1.3 — rules are declarative data interpreted by a shipped executor. Never code.

---

## 1. What a rule is

A rule is a **validated JSON document** describing a condition worth telling someone about. It contains no logic. It names a matcher that ships in the plugin, supplies parameters, and describes what the finding means.

This is C1.3 applied literally, and it buys three things beyond repository compliance:

1. Rules can be delivered by our server without ever delivering code.
2. Rules are testable as fixtures — a rule and a site state go in, a finding comes out.
3. Authoring a rule requires no PHP, so the catalogue can grow without the codebase growing.

### 1.1 Rule schema

```json
{
  "id": "SEC-009",
  "schema": 1,
  "pack": "core",
  "category": "security",
  "severity": "high",
  "title": "Debug mode is enabled on a live site",
  "description": "WP_DEBUG is on. PHP errors, warnings and file paths may be shown to visitors, which leaks server structure and looks broken.",
  "rationale": "Debug output is a reconnaissance aid and a trust problem. It belongs in staging.",
  "applies_when": [
    { "matcher": "environment_type", "params": { "is": "production" } }
  ],
  "detect": {
    "matcher": "constant_equals",
    "params": { "constant": "WP_DEBUG", "value": true }
  },
  "impact_weight": 65,
  "cost": "negligible",
  "cadence": "daily",
  "remediation": {
    "class": "guarded",
    "operation": "set_constant",
    "params": { "constant": "WP_DEBUG", "value": false },
    "risk": "low",
    "note": "Requires editing wp-config.php. Refused if the file is not writable."
  },
  "references": ["WordPress: Debugging in WordPress", "OWASP A05 Security Misconfiguration"],
  "future": "Detect debug output actually reaching the front end, rather than only the constant.",
  "introduced_in": "0.4.0"
}
```

**Validation is strict and refusal is loud.** A rule referencing an unknown matcher, an unknown operation, or a newer `schema` is **rejected and reported**, never silently skipped (P4 §14.1). Silent partial evaluation would let a stale plugin report "all clear" while ignoring half the catalogue — the exact failure a reliability product cannot have.

### 1.2 The ten required fields, mapped

The brief requires ten attributes per rule. They map as: **Rule ID** → `id` · **Category** → `category` · **Severity** → `severity` · **Description** → `description` + `rationale` · **Detection logic** → `detect` + `applies_when` · **Performance impact** → `cost` + `cadence` · **Can it auto-fix?** → `remediation.class` · **Risk** → `remediation.risk` · **References** → `references` · **Future improvements** → `future`.

In the catalogue (§7) these are presented as compact columns, with `future` given per category where the improvement is shared and per rule where it is specific.

---

## 2. Matcher registry

Matchers are the only executable part. Each is a small, individually tested class implementing:

```php
interface MatcherInterface {
    public function supports(): string;                    // matcher id
    public function cost(): Cost;                          // declared, enforced
    public function evaluate(array $params, SiteContext $ctx): MatchResult;
}
```

**Registry (v1 set):**

| Group | Matchers |
|---|---|
| Configuration | `constant_equals` · `constant_defined` · `option_equals` · `option_missing` · `option_size_over` · `environment_type` |
| Filesystem | `file_exists` · `file_permissions` · `file_publicly_readable` · `dir_listing_enabled` · `core_checksum_mismatch` · `unexpected_php_in_uploads` |
| HTTP | `http_status` · `http_header_present` · `http_header_absent` · `response_contains` · `response_time_over` · `redirect_chain_over` · `tls_expiry_within` · `mixed_content_present` |
| Components | `plugin_active` · `plugin_version_below` · `plugin_abandoned` · `plugin_delisted` · `theme_active` · `component_vulnerable` (feed-backed) |
| Platform | `php_version_below` · `php_extension_missing` · `php_ini_below` · `wp_version_below` · `cron_event_missing` · `cron_overdue` · `loopback_blocked` · `disk_free_below` |
| Database | `table_engine_is` · `table_overhead_over` · `row_count_over` · `orphan_rows_over` · `autoload_size_over` |
| Users | `user_exists` · `role_count_over` · `user_inactive_since` |
| Content | `query_count_over` · `posts_matching` · `broken_links_over` · `media_missing` |
| DOM | `selector_absent` · `selector_count` · `heading_order_invalid` · `contrast_below` · `alt_text_missing` |
| DNS / mail | `dns_record_missing` · `dns_record_contains` · `mail_send_fails` |
| WooCommerce | `wc_setting_equals` · `wc_gateway_enabled_count` · `wc_gateway_in_test_mode` · `wc_zone_has_method` · `wc_page_valid` |

Adding a matcher is the only reason to write code for a new rule. Most new rules need none.

---

## 3. Evaluation pipeline

```
Trigger (schedule | manual | post-change)
   │
   ├─ 1. Load rule packs → validate → reject invalid loudly
   ├─ 2. Filter by entitlement (free packs vs premium packs)
   ├─ 3. Filter by cadence — is this rule due?
   ├─ 4. Filter by applies_when — is it relevant to this site?
   ├─ 5. Group by matcher, batch shared work (one page fetch serves many DOM rules)
   ├─ 6. Evaluate within the cost budget
   ├─ 7. Reconcile against open findings (§4)
   └─ 8. Rank by site impact (§5)
```

Step 5 is what keeps a large catalogue affordable: a hundred rules do not mean a hundred page loads. Matchers declare their inputs, and the engine fetches each distinct input once per scan and shares it.

### 3.1 Cost classes and cadence

Every rule declares a cost, and the engine enforces it — a matcher exceeding its declared class is a build failure, not a runtime surprise.

| Cost | Meaning | Default cadence |
|---|---|---|
| `negligible` | In-memory, options, constants | Every scan |
| `low` | A few queries or one cached HTTP request | Every scan |
| `medium` | Page fetch + parse, or a table scan | Daily |
| `high` | Crawl, full-table scan, external API | Weekly, off-peak |

Scans are chunked through Action Scheduler within NFR-1.4's 20-second batches. **No rule ever runs in a user-facing request** (NFR-1.3).

---

## 4. Findings and their lifecycle

*Resolves Phase 5 §11.2: findings need their own table, because muting requires state.*

### 4.1 `bwg_findings`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK |
| `rule_id` | `VARCHAR(32)` | |
| `fingerprint` | `CHAR(64)` | `sha256(rule_id + subject)` — identity across scans |
| `subject_type` / `subject_id` | `VARCHAR(50)` / `VARCHAR(191)` | The specific plugin, page, or option |
| `status` | `VARCHAR(20)` | `open` · `acknowledged` · `muted` · `resolved` |
| `severity` | `VARCHAR(20)` | Copied at detection; rules can change |
| `impact_score` | `SMALLINT UNSIGNED` | §5 |
| `first_seen_at` / `last_seen_at` / `resolved_at` | `DATETIME` | |
| `occurrences` | `INT UNSIGNED` | |
| `mute_until` | `DATETIME NULL` | |
| `mute_reason` | `VARCHAR(255) NULL` | |
| `evidence` | `LONGTEXT NULL` | JSON, capped per P5 §7.2 |

**Indexes:** PK · `UNIQUE (fingerprint)` · `KEY (status, impact_score)` · `KEY (rule_id, status)` · `KEY (last_seen_at)`.

### 4.2 Lifecycle rules

- **Findings are reconciled, not recreated.** A rule matching the same subject updates `last_seen_at` and increments `occurrences`. It does not create a second row, and it does not re-notify (FR-10.2).
- **Disappearance means resolved.** A finding not matched in a scan where its rule ran becomes `resolved`. If its rule did not run, it is left alone — absence of evidence is not evidence of absence, and conflating the two would produce false "fixed!" reports.
- **Muting is first-class and time-boxed.** `mute_until` with a reason, because permanent mutes silently rot. Recurrence after a mute expires is a fresh notification.
- **Resolution is a ledger event.** So the monthly report can say what was fixed, which is the product's commercial output (FR-9.2).
- **Retention** follows P5 §8: resolved findings age out; open findings never do.

---

## 5. Impact ranking

Moat 3 (P1 §6.2). Severity alone is what produces the 400-item lists this product exists to replace: a missing alt tag on a 404 page and a dead checkout are not both "medium."

```
impact_score = base_weight(rule)
             × critical_path_multiplier   (1.0 … 3.0)
             × transactional_multiplier   (1.0 … 2.0)
             × traffic_multiplier         (0.5 … 1.5)
             × exploitability_multiplier  (1.0 … 2.5, security rules only)
             × confidence                 (0.5 … 1.0)
```

| Factor | Source |
|---|---|
| Critical path | Is the affected component or URL in the verified critical-path set? |
| Transactional | Does the site take money? A WooCommerce store weights revenue-path rules far higher |
| Traffic | Relative page traffic where available; neutral when unknown |
| Exploitability | Feed data: is it actively exploited, is a patch available (P2 §6.10) |
| Confidence | How certain the detection is — inference scores lower than direct observation |

**Deterministic by default** (FR-7.4, P1 §6.3 rule 2). The ranker is a `RankerInterface` whose default binding computes the formula above. An AI-backed ranker is an alternative binding and nothing else changes.

The default view shows **ten items** (FR-7.2). The rest exist but are not the default.

---

## 6. Auto-fix classification

Feeds Phase 7. Every rule declares one of three classes:

| Class | Meaning | Gate |
|---|---|---|
| `none` | No safe automated fix exists. Surfaced as a recommendation with instructions. | — |
| `guarded` | Fixable, but consequential. Requires explicit confirmation bound to that specific proposal (C2.3). | Confirmation token |
| `safe` | Reversible, low blast radius, no configuration judgement. May be auto-applied when the user enables it (FR-8.4). | User opt-in |

**The rule that governs the classification:** a fix is only `safe` if reverting it restores the exact prior state and it cannot change how the site behaves for a visitor. Deleting expired transients is `safe`. Changing a security header is `guarded` — it can break an embed. Editing `wp-config.php` is `guarded` at best. Anything touching content is `none`.

Every fix, at every class, runs through the full pipeline: risk → restore point → apply → verify → roll back on failure (FR-8.2). **The class controls who confirms, never whether safety applies** (Plan §7.5).

---

## 7. The rule catalogue

**153 rules across 12 categories.**

Column key — **Sev**: Critical/High/Medium/Low/Info · **Cost**: N(egligible)/L(ow)/M(edium)/H(igh) · **Fix**: none/guarded/safe · **Risk**: risk of applying the fix, not of the issue.

### 7.1 Revenue path — WooCommerce (`WC`) · 18 rules

*The differentiator. These are the rules no competitor's screenshot diff can express.*

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| WC-001 | Critical | No payment gateway enabled | `wc_gateway_enabled_count` = 0 | N | none | — |
| WC-002 | Critical | Gateway enabled but missing credentials | `wc_setting_equals` on required keys | N | none | — |
| WC-003 | Critical | Checkout page missing or unpublished | `wc_page_valid(checkout)` | N | guarded | med |
| WC-004 | High | Cart page missing or unpublished | `wc_page_valid(cart)` | N | guarded | med |
| WC-005 | Critical | Checkout block/shortcode absent from checkout page | `selector_absent` on checkout render | M | none | — |
| WC-006 | Critical | Add to cart fails | Verification step outcome | M | none | — |
| WC-007 | High | Cart fragments endpoint erroring | `http_status` on fragments | L | none | — |
| WC-008 | Critical | Store API returning 5xx | `http_status` ≥ 500 | L | none | — |
| WC-009 | High | Tax enabled with no rates defined | `wc_setting_equals` + rate count | N | none | — |
| WC-010 | High | No shipping method in the store's base zone | `wc_zone_has_method` | N | none | — |
| WC-011 | Critical | Order emails failing to send | `mail_send_fails` | L | none | — |
| WC-012 | Medium | Stock inconsistency (negative stock) | `posts_matching` on stock meta | M | none | — |
| WC-013 | Medium | Terms page required but not set | `wc_setting_equals` | N | guarded | low |
| WC-014 | Medium | Currency or decimal configuration invalid | `wc_setting_equals` | N | none | — |
| WC-015 | Low | Checkout or cart page indexable by search engines | `response_contains` robots meta | L | safe | low |
| WC-016 | High | HPOS enabled with unsynchronised legacy orders | `wc_setting_equals` + row compare | M | none | — |
| WC-017 | High | Guest checkout and registration both disabled | `wc_setting_equals` ×2 | N | guarded | med |
| WC-018 | **Critical** | **Payment gateway in test/sandbox mode on a live site** | `wc_gateway_in_test_mode` | N | guarded | high |

*Future (category): extend to subscription renewals, multi-currency, and per-gateway health beyond enablement. WC-018 is the single highest-value rule in the catalogue — a store silently taking no real money is the most expensive undetected failure in WordPress commerce.*

### 7.2 Availability and errors (`AV`) · 12 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| AV-001 | Critical | PHP fatal on the homepage | Diagnostics beacon | M | none | — |
| AV-002 | Critical | PHP fatal on a critical path | Diagnostics beacon | M | none | — |
| AV-003 | Critical | 5xx on a critical path | `http_status` | L | none | — |
| AV-004 | Critical | Blank response with 200 status | `response_contains` length 0 | L | none | — |
| AV-005 | Critical | Site stuck in maintenance mode | `file_exists(.maintenance)` + age | N | guarded | low |
| AV-006 | Critical | Database connection errors | `response_contains` + log scan | L | none | — |
| AV-007 | High | Redirect loop on a critical path | `redirect_chain_over` | L | none | — |
| AV-008 | High | TLS certificate expiring within 14 days | `tls_expiry_within` | L | none | — |
| AV-009 | Critical | TLS certificate invalid or hostname mismatch | TLS handshake | L | none | — |
| AV-010 | Medium | Mixed content on HTTPS pages | `mixed_content_present` | M | guarded | med |
| AV-011 | Critical | robots.txt blocks the entire site | `response_contains` | L | guarded | med |
| AV-012 | High | Differential 5xx served to crawler user agents | `http_status` with UA variation | M | none | — |

*Future: synthetic checks from multiple geographies; distinguishing host-level from application-level outages.*

### 7.3 Updates and versions (`UP`) · 13 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| UP-001 | Critical | Plugin with a known vulnerability | `component_vulnerable` (feed) | L | guarded | med |
| UP-002 | Critical | Theme with a known vulnerability | `component_vulnerable` | L | guarded | med |
| UP-003 | Critical | Core with a known vulnerability | `component_vulnerable` | L | guarded | high |
| UP-004 | Medium | Plugin abandoned — no release in 24 months | `plugin_abandoned` | L | none | — |
| UP-005 | **High** | **Plugin removed from the repository** | `plugin_delisted` | L | none | — |
| UP-006 | Medium | Major version update available | `plugin_version_below` | N | guarded | med |
| UP-007 | Low | Minor or patch update available | `plugin_version_below` | N | guarded | low |
| UP-008 | High | WordPress security release available | `wp_version_below` | N | guarded | med |
| UP-009 | High | PHP version end-of-life | `php_version_below` | N | none | — |
| UP-010 | High | PHP version below a component's requirement | `php_version_below` | N | none | — |
| UP-011 | Medium | Automatic updates disabled entirely | `constant_equals` | N | guarded | low |
| UP-012 | High | Update previously rolled back, not retried | Ledger query | N | none | — |
| UP-013 | Low | Plugin untested against the current WordPress version | Repository metadata | L | none | — |

*Future: exploitability-weighted prioritisation using Patchstack's five-hour-median data (P2 §6.10); virtual-patch status for the 46% disclosed without a fix.*
*Note: UP-005 is under-served by every competitor and is a strong churn signal — a delisted plugin is often delisted for a security reason with no announcement.*

### 7.4 Security hardening (`SEC`) · 24 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| SEC-001 | Medium | User named `admin` exists | `user_exists` | N | none | — |
| SEC-002 | Medium | Theme and plugin file editing enabled | `constant_equals` | N | guarded | low |
| SEC-003 | Medium | Directory listing enabled | `dir_listing_enabled` | L | guarded | low |
| SEC-004 | Medium | XML-RPC reachable | `http_status` | L | guarded | med |
| SEC-005 | Medium | REST API exposes user enumeration | `http_status` on users route | L | guarded | med |
| SEC-006 | Low | Author archives enable enumeration | `http_status` redirect probe | L | guarded | med |
| SEC-007 | **Critical** | `wp-config.php` world-readable | `file_permissions` | N | guarded | med |
| SEC-008 | **Critical** | Uploads directory executes PHP | `unexpected_php_in_uploads` + probe | M | guarded | med |
| SEC-009 | High | Debug mode enabled on production | `constant_equals` | N | guarded | low |
| SEC-010 | **Critical** | `debug.log` publicly accessible | `file_publicly_readable` | L | safe | low |
| SEC-011 | Low | Default `wp_` table prefix | `SiteContext` | N | none | — |
| SEC-012 | High | Security keys and salts missing or default | `constant_defined` | N | guarded | med |
| SEC-013 | Medium | Unusually many administrator accounts | `role_count_over` | N | none | — |
| SEC-014 | Medium | Administrator inactive for 12+ months | `user_inactive_since` | L | none | — |
| SEC-015 | High | No rate limiting on the login endpoint | Probe behaviour | M | none | — |
| SEC-016 | High | Site reachable over plain HTTP | `http_status` | L | guarded | med |
| SEC-017 | Medium | Missing security headers (HSTS, XCTO, XFO, CSP) | `http_header_absent` | L | guarded | med |
| SEC-018 | **Critical** | Backup archives exposed in the web root | `file_publicly_readable` | M | guarded | low |
| SEC-019 | **Critical** | `.git` or `.svn` directory publicly served | `http_status` | L | guarded | low |
| SEC-020 | **Critical** | Unexpected PHP files in the uploads directory | `unexpected_php_in_uploads` | M | none | — |
| SEC-021 | **Critical** | Core file checksum mismatch | `core_checksum_mismatch` | H | guarded | high |
| SEC-022 | High | Unrecognised scheduled cron event | `cron_event_missing` inverse | N | none | — |
| SEC-023 | High | Administrator account created unexpectedly | Timeline correlation (v0.2) | N | none | — |
| SEC-024 | Medium | Component installed with no update source | Component metadata | L | none | — |

*Future: file-integrity baselining beyond core; correlating SEC-020/021/023 into a single "possible compromise" finding rather than three separate ones — a compromised site should produce one alarming sentence, not a checklist.*

### 7.5 Performance (`PERF`) · 18 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| PERF-001 | Medium | No page caching detected | Header analysis | L | none | — |
| PERF-002 | Medium | No object cache on a query-heavy site | `query_count_over` + backend check | L | none | — |
| PERF-003 | High | Autoloaded options exceed threshold | `autoload_size_over` | N | guarded | med |
| PERF-004 | Medium | Excessive queries on the homepage | `query_count_over` | M | none | — |
| PERF-005 | Medium | Slow time to first byte on a critical path | `response_time_over` | L | none | — |
| PERF-006 | Low | Large unoptimised images | `media_missing` variant + size | H | none | — |
| PERF-007 | Low | Images without lazy loading | `selector_count` | M | none | — |
| PERF-008 | Medium | No compression (gzip/brotli) | `http_header_absent` | L | none | — |
| PERF-009 | Low | Excessive render-blocking resources | `selector_count` | M | none | — |
| PERF-010 | Low | Many plugins loading assets site-wide | Asset attribution | M | none | — |
| PERF-011 | Low | Database tables carrying high overhead | `table_overhead_over` | M | safe | low |
| PERF-012 | Low | Expired transients accumulating | `row_count_over` | L | safe | low |
| PERF-013 | Low | Post revisions unbounded | `row_count_over` | L | guarded | med |
| PERF-014 | Medium | `wp_options` oversized | `row_count_over` | L | none | — |
| PERF-015 | Medium | External HTTP requests during page render | Request tracing | M | none | — |
| PERF-016 | Low | Heartbeat firing too frequently | `option_equals` | N | safe | low |
| PERF-017 | Info | Static assets served without a CDN | Header analysis | L | none | — |
| PERF-018 | High | WP-Cron overdue or not running | `cron_overdue` | N | guarded | low |

*Future: correlate regressions with the change timeline so performance findings name a cause rather than a symptom (US-2.3, FR-6.4). Absolute performance advice is commoditised; performance **regression attribution** is not.*

### 7.6 SEO (`SEO`) · 15 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| SEO-001 | **Critical** | Search engine visibility disabled | `option_equals(blog_public,0)` | N | guarded | low |
| SEO-002 | Medium | Missing title tags | `selector_absent` | M | none | — |
| SEO-003 | Low | Duplicate title tags | Crawl comparison | H | none | — |
| SEO-004 | Low | Missing meta descriptions | `selector_absent` | M | none | — |
| SEO-005 | Medium | XML sitemap missing or erroring | `http_status` | L | none | — |
| SEO-006 | High | `noindex` on an important page | `response_contains` | M | guarded | med |
| SEO-007 | Medium | Broken internal links | `broken_links_over` | H | none | — |
| SEO-008 | Low | Broken outbound links | `broken_links_over` | H | none | — |
| SEO-009 | Low | Redirect chains | `redirect_chain_over` | M | none | — |
| SEO-010 | Low | Missing canonical tags | `selector_absent` | M | none | — |
| SEO-011 | Low | Missing or duplicated H1 | `selector_count` | M | none | — |
| SEO-012 | Info | Thin content pages | `posts_matching` | M | none | — |
| SEO-013 | Medium | Product pages without structured data | `selector_absent` | M | none | — |
| SEO-014 | Info | Orphan pages with no internal links | Crawl graph | H | none | — |
| SEO-015 | Medium | Canonical pointing to a non-HTTPS URL | `response_contains` | M | guarded | low |

*Future: SEO is a later rule pack, never a wedge (P1 §11.1) — Rank Math and Yoast own this distribution. SEO-001 stays in the core pack because it is catastrophic, trivially detected, and routinely shipped by accident from staging.*

### 7.7 Accessibility (`A11Y`) · 12 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| A11Y-001 | Medium | Images missing alt text | `alt_text_missing` | M | none | — |
| A11Y-002 | Medium | Insufficient colour contrast | `contrast_below` | M | none | — |
| A11Y-003 | High | Form inputs without labels | `selector_absent` | M | none | — |
| A11Y-004 | Low | No skip-to-content link | `selector_absent` | M | none | — |
| A11Y-005 | Medium | Invalid heading hierarchy | `heading_order_invalid` | M | none | — |
| A11Y-006 | Low | Non-descriptive link text | `posts_matching` on DOM | M | none | — |
| A11Y-007 | Medium | Missing `lang` attribute | `selector_absent` | L | safe | low |
| A11Y-008 | High | Buttons without accessible names | `selector_absent` | M | none | — |
| A11Y-009 | Medium | Invalid ARIA usage | DOM analysis | M | none | — |
| A11Y-010 | Medium | Focus indicator suppressed | CSS analysis | M | none | — |
| A11Y-011 | Medium | Autoplaying media | `selector_count` | M | none | — |
| A11Y-012 | Low | Data tables without headers | `selector_absent` | M | none | — |

*Future: built on open-source engines (axe-core) rather than reimplemented (P1 §9.1). Almost nothing here is auto-fixable — accessibility fixes require understanding intent, and a plugin that guesses alt text produces worse outcomes than an empty attribute. Saying so is more credible than claiming otherwise.*

### 7.8 Database health (`DB`) · 9 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| DB-001 | Low | Orphaned post meta | `orphan_rows_over` | M | safe | low |
| DB-002 | Low | Orphaned term relationships | `orphan_rows_over` | M | safe | low |
| DB-003 | Low | Spam and trashed comments accumulating | `row_count_over` | L | guarded | low |
| DB-004 | Low | High table overhead | `table_overhead_over` | M | safe | low |
| DB-005 | Medium | Large meta tables missing useful indexes | Index inspection | M | guarded | med |
| DB-006 | Medium | Tables using MyISAM | `table_engine_is` | N | guarded | high |
| DB-007 | Medium | Inconsistent charset across tables | Schema inspection | L | none | — |
| DB-008 | Low | Orphaned options from removed plugins | `orphan_rows_over` | M | guarded | med |
| DB-009 | Info | Anomalous database growth | Trend over history | L | none | — |

*Future: DB-009 becomes far stronger with timeline correlation — growth is only interesting when attributed to a cause.*

### 7.9 Environment and configuration (`ENV`) · 12 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| ENV-001 | Medium | PHP memory limit too low | `php_ini_below` | N | none | — |
| ENV-002 | Medium | `max_execution_time` too low | `php_ini_below` | N | none | — |
| ENV-003 | High | Required PHP extension missing | `php_extension_missing` | N | none | — |
| ENV-004 | High | WP-Cron disabled with no system cron | `constant_equals` + `cron_overdue` | N | none | — |
| ENV-005 | **High** | **Loopback requests blocked** | `loopback_blocked` | L | none | — |
| ENV-006 | High | Required directory not writable | `file_permissions` | N | none | — |
| ENV-007 | High | Disk space low | `disk_free_below` | N | none | — |
| ENV-008 | Low | Timezone misconfigured | `option_equals` | N | safe | low |
| ENV-009 | Medium | Permalinks set to plain | `option_equals` | N | guarded | med |
| ENV-010 | Medium | Object cache backend unreachable | Backend ping | L | none | — |
| ENV-011 | Low | OPcache disabled | `php_extension_missing` | N | none | — |
| ENV-012 | Medium | Site URL and home URL inconsistent | `option_equals` | N | none | — |

*ENV-005 is self-referential in the best way: it is the condition that limits our own verification fidelity (P4 §4.3), so we detect and disclose it rather than silently degrading.*

### 7.10 Content integrity (`CNT`) · 8 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| CNT-001 | Medium | Broken images — media file missing | `media_missing` | H | none | — |
| CNT-002 | Info | Posts without featured images | `posts_matching` | M | none | — |
| CNT-003 | Low | Published pages with no content | `posts_matching` | M | none | — |
| CNT-004 | Medium | Menu items linking to draft content | Menu inspection | L | none | — |
| CNT-005 | Medium | Menu items linking to deleted content | Menu inspection | L | guarded | low |
| CNT-006 | Info | Duplicate page content | Content hashing | H | none | — |
| CNT-007 | Info | Orphaned media not attached anywhere | `orphan_rows_over` | M | none | — |
| CNT-008 | **High** | **Scheduled post failed to publish** | `posts_matching` on missed schedule | L | safe | low |

*CNT-008 is a common, invisible WordPress failure — a missed cron leaves a post stuck in `future` indefinitely with no notice anywhere.*

### 7.11 Email deliverability (`MAIL`) · 6 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| MAIL-001 | **Critical** | `wp_mail()` failing | `mail_send_fails` | L | none | — |
| MAIL-002 | High | No SPF record | `dns_record_missing` | L | none | — |
| MAIL-003 | Medium | No DKIM record | `dns_record_missing` | L | none | — |
| MAIL-004 | Medium | No DMARC record | `dns_record_missing` | L | none | — |
| MAIL-005 | Medium | From-address domain does not match the site | `option_equals` + DNS | L | guarded | med |
| MAIL-006 | High | Configured SMTP transport failing | Transport probe | L | none | — |

*Email failure is the most under-monitored revenue-affecting failure in WooCommerce: orders complete, money is taken, and nobody is told. It pairs directly with WC-011.*

### 7.12 Privacy and compliance (`PRIV`) · 6 rules

| ID | Sev | Title | Detection | Cost | Fix | Risk |
|---|---|---|---|---|---|---|
| PRIV-001 | Medium | No privacy policy page set | `option_missing` | N | guarded | low |
| PRIV-002 | Medium | Third-party trackers with no consent mechanism | Script inventory | M | none | — |
| PRIV-003 | High | Analytics loading before consent | Script order analysis | M | none | — |
| PRIV-004 | Medium | Personal data export/erase not functional | Endpoint probe | L | none | — |
| PRIV-005 | Low | Undeclared third-party scripts | Script inventory | M | none | — |
| PRIV-006 | Low | Comment form stores IP without notice | `option_equals` + DOM | L | none | — |

*Future: jurisdiction awareness. We report observable facts and never render legal opinions — a plugin claiming to make a site "GDPR compliant" is making a promise it cannot keep.*

---

## 8. Coverage summary

| Category | Rules | Critical | Auto-fixable (`safe`) | Guarded | None |
|---|---|---|---|---|---|
| WooCommerce | 18 | 7 | 1 | 4 | 13 |
| Availability | 12 | 6 | 0 | 4 | 8 |
| Updates | 13 | 3 | 0 | 7 | 6 |
| Security | 24 | 6 | 1 | 12 | 11 |
| Performance | 18 | 0 | 3 | 3 | 12 |
| SEO | 15 | 1 | 0 | 4 | 11 |
| Accessibility | 12 | 0 | 1 | 0 | 11 |
| Database | 9 | 0 | 3 | 4 | 2 |
| Environment | 12 | 0 | 1 | 2 | 9 |
| Content | 8 | 0 | 1 | 1 | 6 |
| Email | 6 | 1 | 0 | 1 | 5 |
| Privacy | 6 | 0 | 0 | 1 | 5 |
| **Total** | **153** | **24** | **11** | **43** | **99** |

**Only 11 rules are auto-fixable, and 99 have no automated fix at all.** That ratio is deliberate and it is the honest one. A product claiming to auto-fix most of a catalogue this size is either overstating or dangerous, and the market is full of both. Our claim is narrower and defensible: *what we fix, we fix safely, verifiably, and reversibly.*

### 8.1 Shipping order

| Release | Packs |
|---|---|
| **v0.1** | WooCommerce revenue path (verification-backed subset) · Availability |
| **v0.2** | Updates · Environment · the timeline that makes correlation possible |
| **v1.0** | Security · Database · Email — the first packs with meaningful auto-fix |
| **Later** | Performance · SEO · Accessibility · Content · Privacy, as premium rule packs |

---

## 9. Open questions for Phase 7

1. **Where do rule definitions live?** *(Carried from P5 §11.1.)* Recommendation: shipped JSON files in the plugin, validated at load and cached — matching C1.3's "behaviour ships in the plugin." A database table is only warranted if rules become user-editable, which is not in scope.
2. Should a rule be able to declare a **dependency on another rule's outcome** (e.g. suppress SEC-020 when SEC-021 already fired)? It would enable the "one alarming sentence, not a checklist" behaviour in §7.4's future note, at the cost of ordering complexity in the engine.
3. Do `guarded` fixes need a **per-rule confirmation copy** field, so the confirmation dialog states the specific consequence rather than generic wording? Likely yes — this is where a fix engine earns or loses trust.
4. How does a fix **verify itself** beyond the standard critical-path suite? A security-header fix should assert the header now present, not merely that the site still loads.

---

*End of Phase 6.*
