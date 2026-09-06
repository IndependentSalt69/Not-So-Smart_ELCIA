# Section 14: AI Confidence Display Semantics for Human-Reported Incidents

## 1. Original Problem

In Section 14 (No-Incident Human Verification Workflow), when an aerial surveillance drone completes processing with zero AI detections, the video is routed to a human operator via `VideoVerification(PENDING_REVIEW)`.

If the operator reviews the footage and selects **"Report Undetected Hazard"**, a manual incident record was created with `confidence = 1.0` in the database. In the frontend Technical Details drawer, this resulted in:
```
AI Detection Confidence: 100.0%
```

This representation was semantically incorrect: the AI vision model (YOLOv8) detected zero hazards at this location/timestamp. Representing an undetected hazard as having "100% AI Detection Confidence" conveyed the false claim that the deep-learning model was 100% confident in the detection, when in reality the model missed it entirely.

---

## 2. Why 1.0 Was Semantically Incorrect

- **AI Detection Confidence** is a probabilistic score (0.0 – 1.0) produced by the object detection model (YOLOv8/SAM) measuring model certainty for bounding boxes/segmentation masks.
- **Human Verification / Confirmation** is a ground-truth operational judgment made by an authorized human operator during QA review.
- Setting `confidence = 1.0` conflated human certainty with algorithmic detection output, misleading operators and stakeholders about the model's true performance.
- Fabricating synthetic numbers (such as `0`, `0.5`, `-1`, or `1.0`) to denote "manual report" causes statistics and sorting to misbehave.

---

## 3. How AI Confidence Differs from Human Confirmation

| Concept | AI-Detected Incident | Human-Reported Incident |
| :--- | :--- | :--- |
| **Origin / Source** | Aerial drone computer vision (`AI_VISION`) | Human operator review (`HUMAN_REPORTED`) |
| **AI Detection Confidence** | Actual YOLO confidence score (e.g. `94%`, `0.94`) | `N/A` (null) |
| **Detection Source** | `AI VISION` | `HUMAN REPORTED` |
| **Severity Calculation** | Multi-factor sensor fusion model | Multi-factor risk assessment |
| **Reasoning Summary** | `"<Hazard> detected by aerial drone vision sensor."` | `"<Hazard> reported manually by human operator during aerial footage review."` |
| **Audit Trail** | Automatic ingestion timestamp & job ID | `Source: MANUAL_REVIEW (manual_override=true)` |

---

## 4. Final Representation

### A. Backend Representation
- **ORM Model (`src/db/models/incident.py`)**:
  - Exposes `@property def source(self) -> str` returning `"HUMAN_REPORTED"` for manual incidents (identified by `-M` tracking code prefix or `MANUAL_REVIEW` audit comments) and `"AI_VISION"` for automated AI detections.
- **API Schema (`src/schemas/incident.py`)**:
  - `IncidentBase` and `IncidentResponse` include `source: str = "AI_VISION" | "HUMAN_REPORTED"`.

### B. Frontend Representation
- **Incident Interface (`dashboard/client/src/types/incident.ts`)**:
  - `confidence: number | null` (preserves `0.0-1.0` for AI incidents; `null` for human-reported incidents).
  - `source?: 'AI_VISION' | 'HUMAN_REPORTED'`.
- **Mapping Service (`dashboard/client/src/services/incidentService.ts`)**:
  - `mapBackendIncidentToFrontend()` maps `confidence: null` and `source: 'HUMAN_REPORTED'` when `item.source === 'HUMAN_REPORTED'` or `item.incident_code.includes('-M')`.
  - Explanatory bullet points distinguish operator-reported findings from drone sensor detections.
- **Technical Details Drawer (`IncidentDetailDrawer.tsx`)**:
  - `AI DETECTION CONFIDENCE`: `N/A` for manual incidents, `XX.X%` for AI detections.
  - `DETECTION SOURCE`: `HUMAN REPORTED` vs `AI VISION`.
- **Incident Cards & Feeds (`IncidentCard.tsx`, `RecentAlertsFeed.tsx`)**:
  - Displays `HUMAN REPORTED` badge when `confidence === null`, avoiding `100%` or `NaN%`.

---

## 5. Migration Decision

### Audit Finding
1. The `incidents` table in PostgreSQL has:
   - `confidence FLOAT NOT NULL`
   - `CheckConstraint("confidence >= 0.0 AND confidence <= 1.0")`
2. Modifying database column constraints via Alembic migration on production/demo databases is unnecessary and risky because:
   - The manual incident tracking code format (`INC-<JOBID>-M<TS>`), audit trail history comment (`Source: MANUAL_REVIEW`), and API schema field `source` reliably identify human-reported incidents.
   - Mapping `confidence: null` at the API/frontend translation layer cleanly achieves the exact required semantics (`AI Detection Confidence: N/A`, `Detection Source: HUMAN REPORTED`) without schema alterations or data migrations.

**Decision**: **No database migration was created.**

---

## 6. Files Changed

1. `src/db/models/incident.py`: Added `@property def source(self) -> str`.
2. `src/schemas/incident.py`: Added `source: str = Field(default="AI_VISION", ...)` to `IncidentBase`.
3. `dashboard/client/src/types/incident.ts`: Updated `confidence: number | null` and added `source?: 'AI_VISION' | 'HUMAN_REPORTED'`.
4. `dashboard/client/src/services/incidentService.ts`: Updated `BackendIncidentItem` and `mapBackendIncidentToFrontend()`.
5. `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`: Updated Technical Details to show `AI Detection Confidence: N/A` and `Detection Source: HUMAN REPORTED`.
6. `dashboard/client/src/components/detail/SeverityExplainer.tsx`: Refined explainability header for human-reported incidents.
7. `dashboard/client/src/components/incidents/IncidentCard.tsx`: Updated list and grid views to render `HUMAN REPORTED` when `confidence === null`.
8. `dashboard/client/src/components/overview/RecentAlertsFeed.tsx`: Updated feed items to render `HUMAN REPORTED` when `confidence === null`.
9. `dashboard/client/src/components/incidents/IncidentQueueView.tsx`: Updated sort handling for null confidence.
10. `tests/repositories/test_verifications.py`: Added assertion verifying `incident.source == "HUMAN_REPORTED"`.
11. `tests/api/test_verifications.py`: Added assertion verifying `data["incident"]["source"] == "HUMAN_REPORTED"`.
12. `tests/api/test_api.py`: Verified genuine AI incident retains `source == "AI_VISION"` and numeric `confidence`.
13. `dashboard/client/src/__tests__/incidentService.test.ts`: Added unit tests for AI-detected and human-reported confidence mapping.

---

## 7. Test Results

- **Backend Pytest Suite (`pytest -q`)**: 127/127 tests passing.
- **Frontend Vitest Suite (`npm test`)**: 63/63 tests passing across 8 test suites.
- **TypeScript Typecheck (`npm run check`)**: 0 errors.
- **Frontend Production Build (`npm run build`)**: Succeeded cleanly.
