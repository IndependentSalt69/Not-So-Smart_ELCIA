# CivicPulse
### AI-Assisted Monsoon Civic Risk Intelligence & Response System

> **ELCIA Smart City Drone-AI Challenge 2026**  
> **Track:** Monsoon, Roads & Civic Infrastructure Intelligence

CivicPulse is an AI-assisted civic intelligence platform designed to convert road and aerial video into **evidence-backed, prioritized infrastructure incidents**.

The flagship use case is **waterlogging detection and prioritization**, with pothole detection as a secondary capability and drainage overflow as a future extension.

### Core Product Story

**Detection → Evidence → Severity → Priority → Action → Verification → Closure**

---

## Problem

During monsoon events, civic teams face difficulty continuously monitoring road and drainage conditions, determining which issues are most severe, and deciding which intervention should happen first.

CivicPulse aims to provide a visual intelligence layer that transforms road and aerial video into structured civic incidents that can be reviewed, prioritized and tracked through a maintenance workflow.

The initial problem context is **Electronics City**, with the architecture designed to generalize to other urban environments.

---

## Target Use Case

### Primary — Waterlogging

Waterlogging is the flagship capability because it enables:

- affected-area estimation
- temporal persistence analysis
- road obstruction assessment
- severity estimation
- operational prioritization
- evidence-backed alerts

### Secondary — Potholes

Pothole detection extends the system toward persistent road-surface maintenance.

### Future — Drainage Overflow

Drainage overflow/blockage detection can be incorporated where the available video provides sufficient visual evidence.

---

## System Architecture

```text
                ROAD / AERIAL VIDEO
                        │
                        ▼
                  FRAME SAMPLING
                        │
                        ▼
              AI DETECTION / SEGMENTATION
                        │
                        ▼
               TEMPORAL ASSOCIATION
                        │
                        ▼
                  INCIDENT ENGINE
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
      EVIDENCE       SEVERITY       CONTEXT
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  PRIORITY ENGINE
                        │
                        ▼
                 OPERATOR DASHBOARD
                        │
                        ▼
                 ALERT / ASSIGNMENT
                        │
                        ▼
                  CIVIC ACTION
                        │
                        ▼
                   RE-INSPECTION
                        │
                        ▼
                      CLOSED
AI Pipeline
1. Video Ingestion

The system is designed to accept:

road-level video
elevated/aerial-style video
monsoon-condition footage
challenge-provided sample data
locally captured footage
permitted public datasets/videos

The system does not assume precise GPS metadata when it is unavailable.

2. Waterlogging Detection

Waterlogging is treated primarily as a segmentation problem to estimate:

affected water region
approximate road coverage
spatial extent
persistence across frames
3. Pothole Detection

Potholes are treated as an object-detection problem providing:

class
confidence
bounding region
timestamp
source/context
4. Temporal Intelligence

Repeated frame-level detections are aggregated into incidents to:

suppress duplicates
estimate persistence
identify event start/end
generate representative evidence
Frame 1 ──┐
Frame 2 ──┤
Frame 3 ──┤──► ONE CIVIC INCIDENT
Frame 4 ──┤
Frame 5 ──┘
Incident Intelligence

Each detected event is converted into a structured incident.

{
  "incident_id": "EC-001",
  "type": "waterlogging",
  "confidence": 0.94,
  "severity": 8.7,
  "priority": "P1",
  "timestamp": "00:02:14",
  "zone": "EC-04",
  "duration_seconds": 182,
  "evidence": "evidence/EC-001.jpg",
  "recommended_action": "drainage_inspection",
  "owner": "Drainage Operations",
  "status": "VERIFIED"
}

The schema is expected to evolve as the dataset and operational requirements are validated.

Severity vs Priority

CivicPulse separates three concepts:

Confidence
How certain is the model that the event exists?

Severity
How serious is the observed physical condition?

Priority
How urgently should the civic team respond?

Initial severity factors
Water Extent
     +
Persistence
     +
Road Obstruction
     +
Road Criticality
     ↓
Severity Score

Priority then combines severity with operational context to produce configurable:

P1 — Critical
P2 — High
P3 — Routine

The weights and thresholds will be calibrated using validation data.

Evidence-Backed Alerts

Every important incident should contain enough information for an operator to verify it.

Expected incident information includes:

event class
model confidence
severity
priority
timestamp
source/zone
evidence frame
short video clip
persistence
recommended action
owner
workflow status

The goal is to move beyond:

"Waterlogging detected."

toward:

"Waterlogging detected here, at this time, with this evidence, at this severity, with this operational priority and this recommended response."

Operator Workflow
DETECTED
   ↓
VERIFIED
   ↓
ASSIGNED
   ↓
IN PROGRESS
   ↓
RE-INSPECTION
   ↓
CLOSED

The system is intended to create a closed loop from visual detection to verified resolution.

Dashboard

The planned dashboard will provide:

incident map
active incident queue
priority counts
recent detections
zone/type/status filters
visual evidence
severity
priority
recommended action
owner
workflow status

A representative incident card:

┌───────────────────────────────┐
│ WATERLOGGING                  │
│ Severity: 8.7 / 10           │
│ Priority: P1                  │
│ Confidence: 94%              │
│ Zone: EC-04                   │
│                               │
│ [ Evidence Frame / Clip ]     │
│                               │
│ Action: Drainage Inspection   │
│ Owner: Drainage Operations    │
│ Status: ASSIGNED              │
└───────────────────────────────┘
Human-in-the-Loop

CivicPulse is an AI-assisted decision-support system, not an autonomous civic authority.

AI provides:

detection
evidence
confidence
severity estimate
priority recommendation
suggested action

Operators retain control over:

verification
priority modification
ownership
status
rejection/closure

Low-confidence or high-impact incidents can require explicit human verification.

Testing & Validation

Testing will cover:

heavy rain
wet-road reflections
low-light conditions
partial occlusion
vehicle obstruction
low-contrast waterlogging
partially submerged potholes
varying camera viewpoints
Model metrics
Precision
Recall
F1
mAP / segmentation metrics where applicable
Incident metrics
incident-level recall
false alerts/hour
missed incidents
duplicate-incident rate
detection-to-alert latency
evidence completeness

Special attention will be given to false positives such as wet-road reflections and false negatives such as waterlogging hidden behind vehicles.

Technology Stack
Layer	Proposed Technology
Computer Vision	Lightweight detection/segmentation model
Tracking	ByteTrack / BoT-SORT or equivalent
Backend	FastAPI
Database	PostgreSQL / PostGIS
Dashboard	React
Mapping	Leaflet / MapLibre
Language	Python
Evaluation	Python
Deployment	Local GPU → edge-ready optimization

Final model and framework choices will be validated after dataset inspection.

Reproducibility

The eventual repository will provide:

installation instructions
dependency specification
model configuration
sample input
inference instructions
evaluation scripts
example outputs
architecture documentation

Target end-to-end usage:

python run.py --input sample.mp4

Expected outputs:

outputs/
├── annotated_video.mp4
├── incidents.json
└── evidence/
    ├── EC-001.jpg
    └── EC-002.jpg
Project Status

Proposal / Pre-Build Stage

Current focus:

problem definition
system architecture
AI pipeline design
severity/priority framework
evaluation strategy
implementation planning

Planned next stages:

 Dataset reconnaissance
 Data preprocessing
 Waterlogging baseline
 Pothole baseline
 Temporal association
 Incident generation
 Severity scoring
 Priority engine
 Evidence generation
 Dashboard
 API
 Evaluation
 End-to-end demo
 Edge optimization
Roadmap

Phase 1 — Dataset & Baseline
Understand available videos, labels, viewpoints and quality.

Phase 2 — Detection
Build the initial waterlogging and pothole models.

Phase 3 — Temporal Intelligence
Convert frame-level detections into persistent incidents.

Phase 4 — Civic Intelligence
Add severity, priority, evidence and context.

Phase 5 — Operations
Build dashboard, assignment and closure workflow.

Phase 6 — Validation
Evaluate on unseen clips and challenging conditions.

Phase 7 — Demonstration
Package the complete pipeline into a reproducible prototype.

Risks & Limitations
Rain & Reflections

Wet surfaces can resemble waterlogged regions.

Mitigation: temporal persistence, contextual logic and confidence thresholds.

Occlusion

Vehicles and pedestrians may hide affected regions.

Mitigation: multi-frame association and evidence review.

Geolocation

Sample videos may lack precise GPS metadata.

Mitigation: use source/zone identifiers rather than fabricating coordinates.

Domain Shift

Performance may vary across camera height, weather, lighting and road design.

Mitigation: validate on unseen viewpoints and maintain a retraining workflow.

AI Uncertainty

Model confidence does not automatically represent civic severity.

Mitigation: explicitly separate confidence, severity and operational priority.

Project Principles
Detect Early

Identify visible infrastructure risks before they become larger operational problems.

Prove With Evidence

Important alerts should contain visual and contextual evidence.

Prioritize Intelligently

Severity alone should not determine operational priority.

Keep Humans in the Loop

AI assists civic teams; it does not replace operational judgment.

Close the Loop

Support assignment, action, re-inspection and closure.

Core Product Story

OBSERVE → UNDERSTAND → PRIORITIZE → ACT → VERIFY

CivicPulse transforms visual observations into actionable civic intelligence.

ELCIA Smart City Drone-AI Challenge

Challenge: ELCIA Smart City Drone-AI Challenge 2026
Track: Monsoon, Roads & Civic Infrastructure Intelligence
Context: Electronics City