# CivicPulse — Safe Database Test / Demo Data Cleanup Utility

## Overview & Purpose
During development, CI runs, and Antigravity end-to-end integration tests, various test fixtures, mock records, and transient telemetry entries are written to the database. 

The `scripts/cleanup_test_data.py` CLI utility provides a safe, idempotent, non-destructive (by default) maintenance mechanism to inspect, categorize, and selectively clean up known test/demo data without affecting live operational incidents or altering the database schema.

> [!IMPORTANT]
> `scripts/reset_db.py` is destructive (wipes and drops tables) and remains untouched. In contrast, `scripts/cleanup_test_data.py` never truncates tables or resets sequences and enforces strict safety filters before any deletion.

---

## What Qualifies as Test / Demo Data (Category A)
A record is classified as `[TEST_DEMO]` and eligible for cleanup **only** if it matches one or more deterministic test/demo markers:

1. **Demo Incident Code Patterns**:
   - `INC-DEMO-*` (e.g. `INC-DEMO-001`, `INC-DEMO-002`, `INC-DEMO-003`)
   - `EC-DEMO-*`
   - `DEMO-*`
2. **Demo Descriptions & Recommendations**:
   - `recommended_action` containing `DEMO:` prefix
   - `detection_metadata` with `is_demo: true`
3. **Automated Test Job Markers**:
   - Job IDs containing known test run identifiers:
     - `fiveclass`, `idempotent`, `nullgps`, `missing`, `malformed`, `invalidcls`, `misev`
     - `noconf`, `badconf`, `e2econf`, `realdur`, `shortdur`, `nodur`, `deriveddur`
     - `test-job`, `e2e-test`, `mock-job`, `integration-test`, `sample-test`
4. **Automated Test Incident Code Suffixes**:
   - `*-TEST-*`, `*-E2E-*`, `*-FIVECLASS-*`, `*-E2ECONF-*`, `*-REALDUR-*`, `*-SHORTDUR-*`, `*-NULLGPS-*`, `*-MISEV-*`, etc.

---

## What Is Protected (Category B)
A record is classified as `[PROTECTED_LIVE]` and is **strictly preserved** if:
1. It corresponds to an active local operational video processing job in `outputs/jobs/<job_id>`.
2. It has an operational incident code matching live job directories (e.g., `INC-66faba48-...`, `INC-367501db-...`, `INC-49559b26-...`, `INC-eb3dc24f-...`).
3. It has no test or demo markers.

---

## Ambiguity Handling (Category C)
A record is classified as `[AMBIGUOUS]` if:
- It does not contain any known test/demo markers.
- It does not have an active local directory match in `outputs/jobs/` (e.g., historical run on another environment).

> [!CAUTION]
> **Safety Rule**: If a record cannot be positively proven to be test or demo data, it is categorized as `[AMBIGUOUS]`, reported in table listings, and **strictly skipped**. Never delete records based on timestamp or assumption.

---

## Relational Deletion Order
When deletion is confirmed, records are deleted inside an explicit database transaction in strict foreign-key order:

```
                  ┌─────────────────────────────────┐
                  │          1. Inspection          │
                  │   (Child of Incident & Evidence)│
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │          2. Assignment          │
                  │        (Child of Incident)      │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │   3. IncidentStatusHistory      │
                  │        (Child of Incident)      │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │          4. Detection           │
                  │        (Child of Incident)      │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │          5. Evidence            │
                  │        (Child of Incident)      │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │          6. Incident            │
                  │         (Parent Record)         │
                  └─────────────────────────────────┘
```

If any step fails, the entire transaction is rolled back immediately via `db.rollback()`.

---

## Filesystem Cleanup Rules
The utility optionally inspects associated on-disk evidence files when `--clean-files` is specified:
1. **Safety Constraints**:
   - Never deletes files outside `outputs/`.
   - Never deletes source code (`.py`), models (`.pt`, `.onnx`), configs (`.yaml`, `.json`), or logs.
   - Never deletes evidence referenced by `PROTECTED_LIVE` or `AMBIGUOUS` records.
   - Only deletes files matching `outputs/evidence/demo_*` or inside confirmed test job folders (e.g. `outputs/jobs/*-fiveclass-*/evidence/*`).
2. If safe file deletion cannot be proven, the DB record is cleaned and the file is preserved.

---

## CLI Usage Guide

### 1. Dry Run (Default Mode)
Inspects the database and prints candidate records and summary without modifying anything:
```bash
python scripts/cleanup_test_data.py
```

### 2. List-Only Mode
Prints full classification table of all records (`[TEST_DEMO]`, `[PROTECTED_LIVE]`, `[AMBIGUOUS]`):
```bash
python scripts/cleanup_test_data.py --list
```

### 3. Confirmed Deletion
Executes transactional cleanup of verified `[TEST_DEMO]` candidates (prompts for interactive `y/N` confirmation):
```bash
python scripts/cleanup_test_data.py --confirm
```
To bypass interactive confirmation in non-interactive scripts:
```bash
python scripts/cleanup_test_data.py --confirm -y
```

### 4. Targeted Cleanup
Filter cleanup by specific incident code or test job ID:
```bash
# Clean only a specific demo code
python scripts/cleanup_test_data.py --incident-code INC-DEMO-001 --confirm

# Clean only runs from a specific test suite
python scripts/cleanup_test_data.py --job-id e2econf --confirm

# Clean with specific marker keyword
python scripts/cleanup_test_data.py --marker fiveclass --confirm
```

### 5. Including Safe Filesystem Artifacts
```bash
python scripts/cleanup_test_data.py --confirm --clean-files
```

---

## Automated Test Suite
Unit and integration tests are located at `tests/scripts/test_cleanup_test_data.py` running against an isolated SQLite test database:

| Test Case | Description | Result |
|---|---|:---:|
| `test_dry_run_does_not_modify_db` | Inspects candidates without altering database | PASS |
| `test_clearly_marked_test_records_are_selected` | Verifies test prefixes, job markers, demo flags | PASS |
| `test_clearly_live_records_are_not_selected` | Verifies protected live records are skipped | PASS |
| `test_ambiguous_records_are_skipped` | Unmarked records default to skip | PASS |
| `test_relational_cascade_cleanup_succeeds` | Child-to-parent deletion succeeds | PASS |
| `test_transaction_rolls_back_on_failure` | DB transaction rolls back on simulated error | PASS |
| `test_unrelated_real_evidence_files_are_preserved` | Real files and shared evidence preserved | PASS |
| `test_idempotent_cleanup_rerun` | Rerunning cleanup on empty set is safe | PASS |
| `test_empty_candidate_set_performs_no_deletion` | Handles zero candidates gracefully | PASS |
| `test_targeted_filters` | `--incident-code`, `--job-id`, `--marker` filtering | PASS |
