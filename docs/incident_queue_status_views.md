# Incident Queue Status Views — Technical Specification (Phase 11B)

**Status:** Completed & Verified  
**Date:** August 25, 2026  
**Component:** CivicPulse Incident Command Center  

---

## 1. Overview & Operational Goals

The CivicPulse Incident Queue provides three operational tabs to segregate active emergency response from closed archives and rejected false alarms:

1. **Active** (`active`): Live municipal incidents requiring surveillance monitoring, triage verification, dispatch assignment, or field repair.
2. **Completed** (`completed`): Historical verified incident resolutions and permanent remediation audit records.
3. **Rejected** (`rejected`): Audited false-positive detections and dismissed alerts.

The default operational view is **Active**.

---

## 2. Status Classification State Machine

| Queue View Tab | Canonical Statuses Included | Description |
| :--- | :--- | :--- |
| **Active** | `DETECTED`, `VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `RE_INSPECTION` | Actionable incidents undergoing triage, dispatch, on-site work, or drone re-inspection. |
| **Completed** | `CLOSED` | Confirmed resolved municipal incidents. All evidence, inspections, and audit histories are preserved. |
| **Rejected** | `REJECTED` | Dismissed false positives / invalid sensor detections. Audit logs and reasoning are retained. |

---

## 3. Dynamic Count Calculation Strategy

Tab badges dynamically reflect backend totals derived from PostgreSQL without client-side hardcoding:

- **Single Query Aggregation**:
  The frontend queries `GET /api/v1/analytics/summary`, which executes a database-level `GROUP BY status` aggregation:
  - $\text{Active Count} = \sum_{\text{status} \notin \{\text{CLOSED}, \text{REJECTED}\}} \text{count}(\text{status})$
  - $\text{Completed Count} = \text{count}(\text{CLOSED})$
  - $\text{Rejected Count} = \text{count}(\text{REJECTED})$
- **Real-Time Synchronization**:
  Whenever an incident status mutation occurs (`verifyIncident`, `rejectIncident`, `assignIncident`, `updateStatus`), or when the WebSocket/polling listener fires, `getQueueTabCounts()` refreshes alongside `getIncidents()`.

---

## 4. Backend Query & Server-Side Filtering Contract

The FastAPI backend endpoint `GET /api/v1/incidents/` natively supports single status or comma-separated status lists:

- **Active Tab Request**:
  `GET /api/v1/incidents/?status=DETECTED,VERIFIED,ASSIGNED,IN_PROGRESS,RE_INSPECTION`
- **Completed Tab Request**:
  `GET /api/v1/incidents/?status=CLOSED`
- **Rejected Tab Request**:
  `GET /api/v1/incidents/?status=REJECTED`

### Validation:
- Comma-separated status tokens are parsed into canonical `IncidentStatus` enum members.
- Invalid tokens return `422 Unprocessable Content` with valid enum choices.
- The response returns `{ items: [...], total: N, skip: 0, limit: 100 }`.

---

## 5. UI & Component Architecture

1. **Sliding Segmented Control**:
   - Compact glider pill with Lucide icons (`<Activity />`, `<CheckCircle2 />`, `<XCircle />`) and dynamic count badges.
   - Preserves dark mode and typography scale.
2. **Context-Aware Header & Empty States**:
   - `Active`: Shows active queue title and surveillance triage instructions.
   - `Completed`: Shows archive title and resolution history instructions.
   - `Rejected`: Shows false-positive log title and audit review instructions.
3. **Filter Compatibility**:
   - Secondary filters (hazard type, priority, zone, search query, sorting) operate within each operational view.
   - Resetting filters resets secondary filters while preserving the user's active tab selection (`filters.queueTab`).
4. **Card Reusability**:
   - The same `<IncidentCard />` component renders across all three views, displaying real ML evidence thumbnails, live capture indicators, and type badges.
5. **Drawer Readability**:
   - Completed and rejected incidents remain accessible with full telemetry, evidence frames, detection overlays, assignment history, field inspection logs, and audit trails.
   - Non-actionable buttons (e.g. Verify/Assign on Closed incidents) are cleanly disabled or omitted.

---

## 6. Golden E2E Incident Verification

- **Incident UUID**: `6a54986c-e522-4b5b-bcfc-cf5ca6b3a061` (`INC-AI-2178`)
- **Lifecycle Progression**: `DETECTED` $\rightarrow$ `VERIFIED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RE_INSPECTION` $\rightarrow$ `CLOSED`
- **Verification Result**:
  - Appears in **Completed** view.
  - Does NOT appear in **Active** view.
  - Full evidence, inspection record, and 5-step status history remain readable.

---

## 7. Verification Test Suite

- **Automated Verification Script (`dashboard/scratch/verify_phase_11b_queue_views.ts`)**:
  - `[PASS]` Initial backend tab count retrieval
  - `[PASS]` Server-side active multi-status query validation
  - `[PASS]` Server-side completed status query validation
  - `[PASS]` Server-side rejected status query validation
  - `[PASS]` Golden incident `6a54986c-e522-4b5b-bcfc-cf5ca6b3a061` verified in COMPLETED
  - `[PASS]` Dynamic closure transition (Active $\rightarrow$ Completed)
  - `[PASS]` Dynamic rejection transition (Active $\rightarrow$ Rejected)
  - `[PASS]` Multi-hazard class filtering across status tabs
- **TypeScript Static Verification**: `npm run check` $\rightarrow$ **0 errors (100% clean)**.
- **Python Backend Test Suite**: `python -m pytest -v` $\rightarrow$ **44 / 44 passed (100%)**.

---

## 8. Loading State & Request Lifecycle

### Controls & Refetch Triggers
- **Main Queue Skeletons (`loading`)**: Skeletons are displayed ONLY during an in-flight network request triggered by explicit parameter changes (switching active queue tabs, changing hazard type/priority/zone filters, updating search queries, or initial mount).
- **Background Subscriber Updates (`isSilent = true`)**: State listener triggers (such as operator status updates, verification, or assignment mutations) run silent background refetches. These update incident data and tab counts without setting `loading = true` or tearing down rendered UI cards.
- **Evidence Media Resolution Separation**: Thumbnail preloading (`preloadPrimaryEvidence`) uses an independent asynchronous cache (`primaryEvidenceCache` and `pendingEvidencePromises`). Evidence resolution resolves image URLs per card without mutating `incidentsState`, triggering subscriber listeners, or toggling the queue's `loading` state.
- **Stale Request & Race Condition Protection**: `useIncidents` tracks an incremental `fetchIdRef`. Out-of-order API responses resulting from rapid tab clicks are safely discarded, ensuring only the latest requested view's data is applied.

