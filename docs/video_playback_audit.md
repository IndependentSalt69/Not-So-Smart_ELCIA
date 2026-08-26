# Video Playback Audit Report — CivicPulse Dashboard

**Document Version**: 1.0.0  
**Audit Date**: August 26, 2026  
**Scope**: Inspection of all video elements, video stream controls, Play buttons, and backend video URL bindings across `DroneIngestionStudio.tsx`, `EvidenceViewer.tsx`, `IncidentDetailDrawer.tsx`, and `incidentService.ts`.

---

## 1. Inventory of Video & Playback Surfaces

### Surface 1: "START REAL ML PROCESSING" Button (Left Column Action Control)
- **Owning Component**: [`DroneIngestionStudio.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx#L530-L551)
- **UI Control**: `<Button onClick={handleRunRealProcessing} ...>` containing `<Play className="w-5 h-5 mr-2 fill-white" /> <span>START REAL ML PROCESSING (FastAPI Backend)</span>`
- **URL/Source**: N/A. Accepts user-selected `videoFile` (`File`) and `srtFile` (`File`).
- **Real Backend URL?**: No media URL. Calls `processingService.submitProcessingJob(...)` via HTTP `POST /api/v1/process`.
- **Tied to Completed Processing Job?**: No — it initiates new job creation.
- **Browser Loadable?**: N/A (HTTP API trigger button).
- **Connected to `<video>` Element?**: **NO**. Despite displaying a `<Play>` icon, this button submits an async processing job to FastAPI; it does not invoke HTML5 `<video>.play()` or set video sources.

---

### Surface 2: Main Visual Display Screen (`<video>` Preview Canvas)
- **Owning Component**: [`DroneIngestionStudio.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx#L598-L603)
- **UI Control**: `<video src={mediaPreviewUrl} controls className="w-full h-full object-contain" />`
- **URL/Source**: `mediaPreviewUrl` state variable (populated via `URL.createObjectURL(videoFile)` on upload or preset `sampleVideoUrl`).
- **Real Backend URL?**: **NO**. Uses a local browser blob URL (`blob:http://...`) for raw uploaded input video or static preset file.
- **Tied to Completed Processing Job?**: **NO**. When job status becomes `COMPLETED`, `handleRunRealProcessing` does **not** update `mediaPreviewUrl` to `statusRes.results.output_video_url` nor update `mediaType` to `'video'`.
- **Browser Loadable?**: Yes (loads the raw input video file).
- **Connected to `<video>` Element?**: Uses native HTML5 controls for the raw input video. It is **not** connected to the "START REAL ML PROCESSING" Play button and does not display the backend's annotated output video (`annotated_output.mp4`).

---

### Surface 3: Processed Flight Video Card (`<video>` in Job Summary Panel)
- **Owning Component**: [`DroneIngestionStudio.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx#L768-L785)
- **UI Control**: `<video src={realJobStatus.results.output_video_url.startsWith('http') ? ... : `${getMediaBaseUrl()}${realJobStatus.results.output_video_url}`} controls playsInline onError={() => setVideoLoadError(true)} />`
- **URL/Source**: `realJobStatus.results.output_video_url` (`/static/jobs/<job_id>/annotated_output.mp4`).
- **Real Backend URL?**: **YES** (`http://127.0.0.1:8000/static/jobs/<job_id>/annotated_output.mp4`).
- **Tied to Completed Processing Job?**: **YES**. Renders under completed job summary panel when `realJobStatus.status === 'COMPLETED'`.
- **Browser Loadable?**: **YES**. `GET /static/jobs/<job_id>/annotated_output.mp4` returns HTTP 200 `video/mp4` (284 MB).
- **Connected to `<video>` Element?**: Uses native HTML5 browser controls (`controls` attribute). It is **not** connected to any outside Play button.

---

### Surface 4: Sensor Video Stream (`<video>` & Play Button in EvidenceViewer)
- **Owning Component**: [`EvidenceViewer.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/detail/EvidenceViewer.tsx#L228-L237)
- **UI Control**:
  - Tab Switcher: `<button onClick={() => setViewMode('video')}>Video Stream</button>`
  - Stepper Control: `<Button onClick={handleTogglePlay}>{isPlaying ? <Pause /> : <Play />} Play</Button>`
  - Video Player: `{incident.evidenceClip ? <video ref={videoRef} src={incident.evidenceClip} ... /> : <img src={activeImage} />}`
- **URL/Source**: `incident.evidenceClip` (`string | undefined`).
- **Real Backend URL?**: **NO**. `mapBackendIncidentToFrontend` in `incidentService.ts` maps database fields (`id`, `incident_code`, `confidence`, `severity_score`) from PostgreSQL into `Incident` objects, but does **not** populate `evidenceClip`.
- **Tied to Completed Processing Job?**: **NO**. `evidenceClip` remains `undefined` for all incidents.
- **Browser Loadable?**: Because `incident.evidenceClip` is `undefined`, `<video>` is not rendered; `<img src={activeImage} />` is rendered instead.
- **Connected to `<video>` Element?**: **NO**. Clicking "Play" in `EvidenceViewer` invokes `handleTogglePlay()`, which toggles `isPlaying` to run a `setInterval` stepping a simulated frame counter (`currentFrame` 0..120) over the static image. It does not call `video.play()`.

---

## 2. Analysis of the User-Reported Issue

### Why No Video Plays When Clicking "Play"
1. **Visual & Behavioral Ambiguity**: The primary action button in `DroneIngestionStudio.tsx` is styled with a prominent `<Play>` icon and labeled **"START REAL ML PROCESSING"**. Users perceive a button with a Play icon as a video playback control. When clicked, it submits an asynchronous job to FastAPI rather than initiating video playback.
2. **Main Preview Canvas Unupdated**: When the Python ML pipeline finishes processing and job status transitions to `COMPLETED`, the top main screen preview canvas (`Main Visual Display Screen`) remains set to `mediaPreviewUrl` (the raw input file blob or preset image). It is never updated to `statusRes.results.output_video_url`.
3. **Detail Drawer Disconnect**: In `EvidenceViewer.tsx` (the Incident Detail drawer), clicking "Video Stream" or the "Play" stepper button fails to play video because `incident.evidenceClip` is `undefined` on backend incident models, causing fallback to a static JPEG frame with a simulated frame counter tick.

---

## 3. Recommended Minimal Fix

### Files Requiring Modification:
1. `dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`
2. `dashboard/client/src/services/incidentService.ts` (Optional enhancement for Incident Detail drawer)

### Minimal Fix Plan:
1. **Update `DroneIngestionStudio.tsx` on Job Completion**:
   In `handleRunRealProcessing()`, when `statusRes.status === 'COMPLETED'`:
   ```typescript
   if (statusRes.results?.output_video_url) {
     const fullVideoUrl = statusRes.results.output_video_url.startsWith('http')
       ? statusRes.results.output_video_url
       : `${getMediaBaseUrl()}${statusRes.results.output_video_url}`;
     setMediaType('video');
     setMediaPreviewUrl(fullVideoUrl);
   }
   ```
   This automatically loads and displays the backend's completed annotated output MP4 video (`annotated_output.mp4`) directly inside the main visual display screen upon completion!

2. **Map Job Output Video to Incident Evidence (Optional Detail View Enhancement)**:
   In `incidentService.ts`, when constructing or fetching incidents, assign `evidenceClip: getEvidenceMediaUrl(job_output_video_url)` so opening an incident in `EvidenceViewer.tsx` displays the annotated video when switching to "Video Stream" mode.

---

## 4. Concise Root Cause

> **Root Cause**: In `DroneIngestionStudio.tsx`, the main screen canvas preview state (`mediaPreviewUrl` / `mediaType`) was never updated to point to `statusRes.results.output_video_url` upon job completion, while the "START REAL ML PROCESSING" button (styled with a Play icon) triggered asynchronous job submission rather than HTML5 video playback.

---

## 5. Final Resolution & Verification Results

### Resolution Applied (Phase 11F)
1. **`DroneIngestionStudio.tsx` Main Screen Video Swap**:
   - In `handleRunRealProcessing()`, upon `statusRes.status === 'COMPLETED'`, resolved `fullVideoUrl = `${getMediaBaseUrl()}${statusRes.results.output_video_url}`` and called `setMediaType('video')` and `setMediaPreviewUrl(fullVideoUrl)`.
   - The main display screen now seamlessly transitions from displaying the uploaded raw video to rendering the backend's completed annotated output MP4 video (`/static/jobs/<job_id>/annotated_output.mp4`).
   - Added `key={mediaPreviewUrl}` and `playsInline` to the `<video>` element to force clean re-initialization when switching video sources.
   - Added a `PROCESSED ML OUTPUT` badge to the top screen toolbar when job status is `COMPLETED`.
2. **Button Icon Clarity**:
   - Replaced `<Play>` icon on the `START REAL ML PROCESSING (FastAPI Backend)` button with `<Cpu>` to eliminate visual confusion between starting background ML processing vs playing a video.
3. **Incident Detail Video Stream**:
   - Confirmed that backend database models (`Incident`, `Detection`, `Evidence`) do not store job video links or clip URLs. Per strict requirements, database schemas were left unmodified, real JPEG image evidence remains 100% operational in `EvidenceViewer.tsx`, and Incident Detail Video Stream is documented as a limitation.

### Files Modified:
- [`dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx)
- [`docs/frontend_backend_integration_log.md`](file:///d:/Civicpulse/docs/frontend_backend_integration_log.md)
- [`docs/video_playback_audit.md`](file:///d:/Civicpulse/docs/video_playback_audit.md)

---

## 6. Phase 11G: Incident Detail Real Video Stream Resolution

### Objective & Architecture
Derived job-scoped annotated video MP4 URLs from existing evidence file paths without modifying database schemas or backend models.

### Job ID Extraction & Video URL Derivation
- Real evidence assets created by job ingestion contain file paths formatted as:
  `outputs/jobs/<job_id>/evidence/<filename>` (e.g. `outputs/jobs/d98e8f4f-45ed-4663-8cf7-44d7f56f95ab/evidence/hazard_1_CRITICAL.jpg`).
- Helper function `getIncidentVideoUrlFromEvidencePath(filePath)` in `incidentService.ts`:
  1. Extracts `<job_id>` from `outputs/jobs/<job_id>/...` (normalizing both `/` and `\` slashes).
  2. Constructs `${origin}/static/jobs/${jobId}/annotated_output.mp4`.
  3. Returns `null` for legacy evidence paths (`outputs/evidence/<filename>`) without job IDs.
  4. Returns valid HTTP/HTTPS URLs pointing to `annotated_output.mp4`.

### UI Integration in `EvidenceViewer.tsx`
- **Frame Tab (`viewMode === 'image'`)**: Continues rendering high-resolution real JPEG evidence image (`<img src={activeImage} />`).
- **Video Stream Tab (`viewMode === 'video'`)**:
  - If `derivedVideoUrl` exists and `!videoLoadError`: Renders HTML5 `<video ref={videoRef} src={derivedVideoUrl} controls playsInline />` loaded directly from `/static/jobs/<job_id>/annotated_output.mp4`.
  - If `!derivedVideoUrl` or `videoLoadError`: Renders a clean card stating `"Processed Flight Video Unavailable for this incident"` without falling back to a static JPEG.
- **Play / Pause Control Button**: Connected `handleTogglePlay()` directly to `videoRef.current.play()` and `videoRef.current.pause()`, synchronized with HTML5 video `onPlay`, `onPause`, and `onEnded` event listeners.

### Files Modified in Phase 11G:
- [`dashboard/client/src/types/incident.ts`](file:///d:/Civicpulse/dashboard/client/src/types/incident.ts) (Added `videoUrl?: string | null` to `EvidenceAsset`)
- [`dashboard/client/src/services/incidentService.ts`](file:///d:/Civicpulse/dashboard/client/src/services/incidentService.ts) (Added `getIncidentVideoUrlFromEvidencePath` helper and populated `videoUrl` in `getIncidentEvidence()`)
- [`dashboard/client/src/components/detail/EvidenceViewer.tsx`](file:///d:/Civicpulse/dashboard/client/src/components/detail/EvidenceViewer.tsx) (Wired real HTML5 `<video>` player, play/pause controls, and unavailable error card)

### Verification:
- **TypeScript Check (`npm run check`)**: **0 errors** (100% clean).
- **Pytest Suite (`pytest -v`)**: **64 / 64 passed (100%) in 6.81s**.
- **Real Job `f692bcc0-93ff-4141-8136-25c8e5c9b638` Verification**:
  - Evidence Path: `outputs/jobs/f692bcc0-93ff-4141-8136-25c8e5c9b638/evidence/hazard_1_LOW.jpg`
  - Derived Video URL: `http://127.0.0.1:8000/static/jobs/f692bcc0-93ff-4141-8136-25c8e5c9b638/annotated_output.mp4`
  - HTTP Status: **200 OK** (`Content-Type: video/mp4`, `13,876,625` bytes).
  - Browser Player: Renders `<video src="http://127.0.0.1:8000/static/jobs/f692bcc0-93ff-4141-8136-25c8e5c9b638/annotated_output.mp4" controls playsInline />` directly inside EvidenceViewer.



