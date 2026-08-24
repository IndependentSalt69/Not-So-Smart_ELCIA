# CivicPulse Incident Queue Evidence Thumbnails Architecture

**Document Date:** August 24, 2026  
**System Area:** Incident Queue UI & Media Thumbnail Caching Integration  

---

## 1. Source of Evidence

Evidence assets displayed on the CivicPulse dashboard originate from the automated drone hazard detection and tracking pipeline (`HazardVideoPipeline` in `src/detection/video_tracker.py`).

1. During drone video inference, cropped high-resolution bounding box frames and hazard scene captures are written to `outputs/evidence/*.jpg`.
2. Detections and associated evidence metadata are persisted in the PostgreSQL/PostGIS database (`evidence` table).
3. The FastAPI backend exposes these files at `/static/evidence/{filename}`.

---

## 2. Primary Evidence Selection

For any given incident, multiple evidence records may exist (e.g. initial frame, peak severity frame, post-patch inspection). When rendering thumbnail cards in the queue:

1. The service queries `/api/v1/incidents/{id}/evidence`.
2. It prioritizes the asset where `is_primary === true`.
3. If no asset has `is_primary` explicitly flagged, it selects the first available asset (`assets[0]`).
4. If the incident has no associated evidence assets, it returns `null` to trigger the synthetic SVG fallback.

---

## 3. Media URL Mapping

Relative file paths stored in the database are transformed into browser-accessible URLs by `getEvidenceMediaUrl`:

```text
Database: outputs/evidence/hazard_3_LOW.jpg
                │
                ▼ (getEvidenceMediaUrl)
Frontend: http://127.0.0.1:8000/static/evidence/hazard_3_LOW.jpg
```

If the database contains an absolute remote URL (e.g., `https://s3.amazonaws.com/...`), `getEvidenceMediaUrl` passes it through directly, ensuring full compatibility with future cloud object storage migrations.

---

## 4. Request & Caching Strategy (Zero Request Storms)

To maintain responsive UI performance when managing up to 100+ incidents in the queue, evidence retrieval follows a multi-tier caching and deduplication strategy:

```text
IncidentCard Render
        │
        ▼
Is incident.mediaUrl set? ──► YES ──► Use mediaUrl immediately
        │ NO
        ▼
Is incidentId in primaryEvidenceCache? ──► YES ──► Return cached URL / null
        │ NO
        ▼
Is request already in pendingEvidencePromises? ──► YES ──► Attach to active Promise
        │ NO
        ▼
Issue GET /api/v1/incidents/{id}/evidence
        │
        ├──► On Success: Cache mediaUrl in primaryEvidenceCache
        └──► On 404/Empty: Cache null in primaryEvidenceCache
```

### Performance Highlights:
- **Zero Request Storms**: Sorting, filtering, searching, or toggling between Grid and List view hits the in-memory cache directly.
- **Batch Preloading**: `IncidentQueueView` automatically preloads the visible slice of cards (top 24) in parallel batches.
- **Lazy Loading**: `<img>` elements declare `loading="lazy"` to defer off-screen network decoding until scrolled into viewport.

---

## 5. Fallback Behavior

1. **Missing / Unseeded Evidence**: If an incident has no evidence records in the database, `IncidentCard` renders the high-contrast synthetic SVG visualization (`incident.evidenceFrame`).
2. **Network / 404 Load Errors**: If an evidence image fails to load over HTTP, the `onError` event triggers `imageError = true`, immediately switching to the SVG frame without flickering or entering infinite retry loops.
3. **Visual Distinction**: Cards with successfully loaded ML captures display a subtle green `"Live Capture"` badge, clearly signaling real drone surveillance data to operators.
