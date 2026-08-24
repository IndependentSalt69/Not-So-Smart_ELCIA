import { Incident, IncidentType, PriorityLevel, ZoneId } from '@/types/incident';
import { DroneTelemetry, InferenceResult, SampleFootagePreset } from '@/types/ingestion';
import { incidentService } from './incidentService';

// Helper to generate simulated SVG overlay frame for uploaded or preset media
const generateInferenceOverlaySvg = (
  type: IncidentType | 'clear',
  confidence: number,
  telemetry: DroneTelemetry
) => {
  const isWater = type === 'waterlogging';
  const isPothole = type === 'pothole';
  const isDrainage = type === 'drainage_overflow';
  const isFootpath = type === 'damaged_footpath';

  let strokeColor = '#10b981';
  let fillColor = 'none';
  let label = 'YOLOv8: ROAD SURFACE CLEAR (0 HAZARDS DETECTED)';

  if (isWater) {
    strokeColor = '#3b82f6';
    fillColor = 'rgba(59, 130, 246, 0.45)';
    label = `YOLOv8 + SAM: WATERLOGGING (${Math.round(confidence * 100)}% CONFIDENCE)`;
  } else if (isDrainage) {
    strokeColor = '#06b6d4';
    fillColor = 'rgba(6, 182, 212, 0.45)';
    label = `YOLOv8 + SAM: DRAINAGE OVERFLOW (${Math.round(confidence * 100)}% CONFIDENCE)`;
  } else if (isFootpath) {
    strokeColor = '#f97316';
    fillColor = 'rgba(249, 115, 22, 0.45)';
    label = `YOLOv8: DAMAGED FOOTPATH (${Math.round(confidence * 100)}% CONFIDENCE)`;
  } else if (isPothole) {
    strokeColor = '#ef4444';
    fillColor = 'rgba(239, 68, 68, 0.45)';
    label = `YOLOv8: DEEP CRATER POTHOLE (${Math.round(confidence * 100)}% CONFIDENCE)`;
  }

  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#0f172a"/>
    <!-- Road Surface Geometry -->
    <polygon points="80,450 720,450 460,140 340,140" fill="#1e293b"/>
    <line x1="400" y1="140" x2="400" y2="450" stroke="#f8fafc" stroke-width="4" stroke-dasharray="20,15"/>
    
    ${isWater
      ? `<!-- Segmented Water Surface -->
           <path d="M 200 310 Q 400 280 600 330 Q 540 430 240 420 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3.5"/>
           <rect x="180" y="270" width="440" height="170" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6,4"/>`
      : isDrainage
        ? `<!-- Drainage Overflow Surface -->
           <path d="M 180 340 Q 320 260 460 330 T 700 360 L 680 430 L 160 430 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3.5"/>
           <rect x="160" y="280" width="540" height="150" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6,4"/>`
      : isFootpath
        ? `<!-- Damaged Footpath Bounding Box -->
           <polygon points="120,440 280,260 340,260 220,440" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3.5"/>
           <rect x="110" y="250" width="240" height="195" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6,4"/>`
      : isPothole
        ? `<!-- Pothole Bounding Box & Crater -->
           <ellipse cx="430" cy="340" rx="95" ry="48" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3.5"/>
           <rect x="310" y="280" width="240" height="120" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6,4"/>`
        : `<!-- Clear Green Scan Grid -->
           <line x1="80" y1="300" x2="720" y2="300" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>
           <line x1="120" y1="380" x2="680" y2="380" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>`
    }

    <!-- AI Bounding Box Label -->
    <rect x="25" y="25" width="460" height="34" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="${strokeColor}" stroke-width="1.5"/>
    <text x="40" y="47" fill="#f8fafc" font-family="sans-serif" font-size="13" font-weight="bold">${label}</text>

    <!-- Telemetry Stamp -->
    <rect x="25" y="395" width="750" height="38" rx="6" fill="rgba(15, 23, 42, 0.85)"/>
    <text x="40" y="419" fill="#94a3b8" font-family="monospace" font-size="12">DRONE: ${telemetry.droneId} | ALT: ${telemetry.altitudeMeters}m | ZONE: ${telemetry.zoneId} | GPS: ${telemetry.coordinates.lat.toFixed(4)}N, ${telemetry.coordinates.lng.toFixed(4)}E</text>
    <text x="690" y="419" fill="#38bdf8" font-family="monospace" font-size="12">AI v8.4.1</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
};

export const SAMPLE_PRESETS: SampleFootagePreset[] = [
  {
    id: 'preset-water-1',
    title: 'Hosur Road Flyover Underpass (Arterial Inundation)',
    type: 'waterlogging',
    description: 'Autonomous drone capture showing severe 340m² water ponding blocking 2 arterial lanes.',
    thumbnailUrl: generateInferenceOverlaySvg('waterlogging', 0.96, {
      droneId: 'DRONE-SWARM-ALPHA-1',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 45,
      speedMps: 10,
      zoneId: 'EC-01',
      locationDescription: 'Hosur Road Flyover Underpass towards Electronic City Gate 1',
      coordinates: { lat: 12.8452, lng: 77.6631 },
      timestamp: new Date().toISOString(),
    }),
    mediaUrl: generateInferenceOverlaySvg('waterlogging', 0.96, {
      droneId: 'DRONE-SWARM-ALPHA-1',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 45,
      speedMps: 10,
      zoneId: 'EC-01',
      locationDescription: 'Hosur Road Flyover Underpass towards Electronic City Gate 1',
      coordinates: { lat: 12.8452, lng: 77.6631 },
      timestamp: new Date().toISOString(),
    }),
    mediaType: 'image',
    defaultTelemetry: {
      droneId: 'DRONE-SWARM-ALPHA-1',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 45,
      speedMps: 10,
      zoneId: 'EC-01',
      locationDescription: 'Hosur Road Flyover Underpass towards Electronic City Gate 1',
      coordinates: { lat: 12.8452, lng: 77.6631 },
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 'preset-pothole-1',
    title: 'Velankani Drive Transit Corridor (Deep Crater)',
    type: 'pothole',
    description: 'High-resolution scan of an 18cm deep asphalt collapse posing two-wheeler hazard.',
    thumbnailUrl: generateInferenceOverlaySvg('pothole', 0.94, {
      droneId: 'DRONE-SWARM-BETA-2',
      cameraModel: 'Thermal & RGB Dual Cam',
      altitudeMeters: 30,
      speedMps: 8,
      zoneId: 'EC-03',
      locationDescription: 'Velankani Drive intersection near Infosys Gate 6',
      coordinates: { lat: 12.8385, lng: 77.6745 },
      timestamp: new Date().toISOString(),
    }),
    mediaUrl: generateInferenceOverlaySvg('pothole', 0.94, {
      droneId: 'DRONE-SWARM-BETA-2',
      cameraModel: 'Thermal & RGB Dual Cam',
      altitudeMeters: 30,
      speedMps: 8,
      zoneId: 'EC-03',
      locationDescription: 'Velankani Drive intersection near Infosys Gate 6',
      coordinates: { lat: 12.8385, lng: 77.6745 },
      timestamp: new Date().toISOString(),
    }),
    mediaType: 'image',
    defaultTelemetry: {
      droneId: 'DRONE-SWARM-BETA-2',
      cameraModel: 'Thermal & RGB Dual Cam',
      altitudeMeters: 30,
      speedMps: 8,
      zoneId: 'EC-03',
      locationDescription: 'Velankani Drive intersection near Infosys Gate 6',
      coordinates: { lat: 12.8385, lng: 77.6745 },
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 'preset-drainage-1',
    title: 'Toll Plaza Sump Drain (Stormwater Overflow)',
    type: 'drainage_overflow',
    description: 'Aerial telemetry identifying blocked culvert and active municipal drain backflow.',
    thumbnailUrl: generateInferenceOverlaySvg('drainage_overflow', 0.91, {
      droneId: 'DRONE-SWARM-DELTA-4',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 35,
      speedMps: 9,
      zoneId: 'EC-01',
      locationDescription: 'Electronic City Toll Plaza Drainage Sump 4',
      coordinates: { lat: 12.849, lng: 77.668 },
      timestamp: new Date().toISOString(),
    }),
    mediaUrl: generateInferenceOverlaySvg('drainage_overflow', 0.91, {
      droneId: 'DRONE-SWARM-DELTA-4',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 35,
      speedMps: 9,
      zoneId: 'EC-01',
      locationDescription: 'Electronic City Toll Plaza Drainage Sump 4',
      coordinates: { lat: 12.849, lng: 77.668 },
      timestamp: new Date().toISOString(),
    }),
    mediaType: 'image',
    defaultTelemetry: {
      droneId: 'DRONE-SWARM-DELTA-4',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 35,
      speedMps: 9,
      zoneId: 'EC-01',
      locationDescription: 'Electronic City Toll Plaza Drainage Sump 4',
      coordinates: { lat: 12.849, lng: 77.668 },
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 'preset-footpath-1',
    title: 'Infosys Avenue Walkway (Severe Slab Collapse)',
    type: 'damaged_footpath',
    description: 'Drone LiDAR and RGB scan of fractured pedestrian pavers creating severe tripping hazard.',
    thumbnailUrl: generateInferenceOverlaySvg('damaged_footpath', 0.89, {
      droneId: 'DRONE-SWARM-EPSILON-5',
      cameraModel: 'High-Res Photogrammetry',
      altitudeMeters: 25,
      speedMps: 6,
      zoneId: 'EC-03',
      locationDescription: 'Infosys Avenue Pedestrian Walkway Corridor',
      coordinates: { lat: 12.836, lng: 77.679 },
      timestamp: new Date().toISOString(),
    }),
    mediaUrl: generateInferenceOverlaySvg('damaged_footpath', 0.89, {
      droneId: 'DRONE-SWARM-EPSILON-5',
      cameraModel: 'High-Res Photogrammetry',
      altitudeMeters: 25,
      speedMps: 6,
      zoneId: 'EC-03',
      locationDescription: 'Infosys Avenue Pedestrian Walkway Corridor',
      coordinates: { lat: 12.836, lng: 77.679 },
      timestamp: new Date().toISOString(),
    }),
    mediaType: 'image',
    defaultTelemetry: {
      droneId: 'DRONE-SWARM-EPSILON-5',
      cameraModel: 'High-Res Photogrammetry',
      altitudeMeters: 25,
      speedMps: 6,
      zoneId: 'EC-03',
      locationDescription: 'Infosys Avenue Pedestrian Walkway Corridor',
      coordinates: { lat: 12.836, lng: 77.679 },
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 'preset-clear-1',
    title: 'Phase 1 Neeladri Road (Clear Surface Baseline)',
    type: 'clear',
    description: 'Clear asphalt baseline inspection with zero hazards detected.',
    thumbnailUrl: generateInferenceOverlaySvg('clear', 0.99, {
      droneId: 'DRONE-SWARM-GAMMA-3',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 50,
      speedMps: 14,
      zoneId: 'EC-02',
      locationDescription: 'Neeladri Road Main Commercial Strip',
      coordinates: { lat: 12.8465, lng: 77.671 },
      timestamp: new Date().toISOString(),
    }),
    mediaUrl: generateInferenceOverlaySvg('clear', 0.99, {
      droneId: 'DRONE-SWARM-GAMMA-3',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 50,
      speedMps: 14,
      zoneId: 'EC-02',
      locationDescription: 'Neeladri Road Main Commercial Strip',
      coordinates: { lat: 12.8465, lng: 77.671 },
      timestamp: new Date().toISOString(),
    }),
    mediaType: 'image',
    defaultTelemetry: {
      droneId: 'DRONE-SWARM-GAMMA-3',
      cameraModel: 'Sony Alpha 4K Aerial',
      altitudeMeters: 50,
      speedMps: 14,
      zoneId: 'EC-02',
      locationDescription: 'Neeladri Road Main Commercial Strip',
      coordinates: { lat: 12.8465, lng: 77.671 },
      timestamp: new Date().toISOString(),
    },
  },
];

export const inferenceService = {
  /**
   * Get built-in sample footage presets for demo/judging
   */
  getSamplePresets(): SampleFootagePreset[] {
    return SAMPLE_PRESETS;
  },

  /**
   * Run the multi-stage AI drone vision inference pipeline
   */
  async analyzeMedia(options: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    telemetry: DroneTelemetry;
    onProgress?: (stageName: string, progress: number) => void;
    presetType?: IncidentType | 'clear';
  }): Promise<InferenceResult> {
    const { mediaUrl, mediaType, telemetry, onProgress, presetType = 'waterlogging' } = options;

    const stages = [
      { name: '1. Frame Normalization & Telemetry Stamp', duration: 300, progress: 20 },
      { name: '2. YOLOv8 Tensor Object Detection', duration: 400, progress: 45 },
      { name: '3. SAM Segment Anything Masking', duration: 450, progress: 70 },
      { name: '4. Temporal Persistence Verification', duration: 350, progress: 85 },
      { name: '5. 4-Vector Severity & Priority Computation', duration: 300, progress: 100 },
    ];

    const startTime = Date.now();

    for (const stage of stages) {
      if (onProgress) {
        onProgress(stage.name, stage.progress);
      }
      await new Promise((resolve) => setTimeout(resolve, stage.duration));
    }

    // Determine results based on preset or simulated inference
    const isWater = presetType === 'waterlogging';
    const isPothole = presetType === 'pothole';
    const isDrainage = presetType === 'drainage_overflow';
    const isFootpath = presetType === 'damaged_footpath';

    const confidence = isWater ? 0.95 : isPothole ? 0.93 : isDrainage ? 0.91 : isFootpath ? 0.89 : 0.98;
    const severity = isWater ? 8.8 : isPothole ? 8.4 : isDrainage ? 7.6 : isFootpath ? 6.2 : 1.2;
    const priority: PriorityLevel = isWater || isPothole ? 'P1' : isDrainage ? 'P2' : isFootpath ? 'P2' : 'P3';

    const overlaySvg = generateInferenceOverlaySvg(presetType, confidence, telemetry);

    const generatedId = `EC-${Math.floor(1000 + Math.random() * 9000)}`;

    const result: InferenceResult = {
      id: generatedId,
      type: presetType,
      confidence,
      severity,
      priority,
      waterAreaSqm: isWater ? 380 : isDrainage ? 160 : undefined,
      potholeDepthCm: isPothole ? 18 : undefined,
      boundingBoxes: [
        {
          id: 'box-1',
          label: presetType,
          confidence,
          x: 25,
          y: 40,
          width: 55,
          height: 40,
        },
      ],
      originalMediaUrl: mediaUrl,
      overlayMediaUrl: overlaySvg,
      mediaType,
      telemetry,
      severityFactors: {
        waterExtent: isWater ? 8.8 : isDrainage ? 7.2 : isPothole ? 2.0 : 0.5,
        waterExtentLabel: isWater
          ? '78% arterial roadway submerged (~380 m²)'
          : isDrainage
            ? 'Drainage backflow covering sidewalk and curb (~160 m²)'
            : isPothole
              ? 'Submerged crater'
              : 'Dry clear asphalt',
        persistenceSeconds: isWater ? 180 : isDrainage ? 210 : isPothole ? 240 : 10,
        roadObstruction: isWater ? 9.0 : isDrainage ? 7.5 : isPothole ? 8.8 : isFootpath ? 6.8 : 0.5,
        roadObstructionLabel: isWater
          ? 'Dual lane vehicular blockage'
          : isDrainage
            ? 'Single lane and drainage inlet blockage'
            : isPothole
              ? 'Severe pothole forcing vehicle swerving'
              : isFootpath
                ? 'Pedestrian sidewalk impassable'
                : 'Zero traffic obstruction',
        roadCriticality: telemetry.zoneId === 'EC-01' ? 9.2 : 8.5,
        roadCriticalityLabel: `${telemetry.zoneId} — ${telemetry.locationDescription}`,
        explanation: isWater
          ? [
              'AI segmentation confirmed standing water depth exceeding 15cm across 380m².',
              'High traffic arterial junction connecting Phase 1 & Hosur Highway.',
              'Immediate sump pump de-watering deployment recommended.',
            ]
          : isDrainage
            ? [
                'Municipal drainage culvert blockage detected with active surface regurgitation.',
                'Immediate jetting machine dispatch required to clear blocked silt.',
              ]
            : isFootpath
              ? [
                  'Pedestrian paver collapse and missing curb stones identified.',
                  'Safety hazard for foot traffic and tech park commuters.',
                  'Masonry restoration team notified.',
                ]
              : isPothole
                ? [
                    'Deep asphalt structural collapse with sharp edge failure.',
                    'Immediate hazard for high-speed two-wheelers and shuttle buses.',
                    'Cold-mix bitumen patch dispatch required.',
                  ]
                : ['No structural or flooding hazards detected across scanned frame.'],
      },
      recommendedAction: isWater
        ? 'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates'
        : isDrainage
          ? 'Dispatch high-pressure drain jetting team & clear storm culvert obstruction'
          : isFootpath
            ? 'Dispatch civil masonry repair crew & install temporary pedestrian safety barriers'
            : isPothole
              ? 'Deploy Cold-Mix Bitumen Patching & Place High-Visibility Hazard Barricades'
              : 'No mitigation required — Baseline verified clear',
      analysisDurationMs: Date.now() - startTime,
    };

    return result;
  },

  /**
   * Convert inference result directly into a live Incident and publish to Operations Queue
   */
  async publishAsIncident(result: InferenceResult): Promise<Incident> {
    if (result.type === 'clear') {
      throw new Error('Cannot publish a clear road baseline as an active incident.');
    }

    const newIncident: Incident = {
      id: result.id,
      type: result.type as IncidentType,
      confidence: result.confidence,
      severity: result.severity,
      priority: result.priority,
      timestamp: new Date().toISOString(),
      zone: `${result.telemetry.zoneId} - ${result.telemetry.locationDescription}`,
      zoneId: result.telemetry.zoneId,
      locationDescription: result.telemetry.locationDescription,
      coordinates: result.telemetry.coordinates,
      durationSeconds: result.severityFactors.persistenceSeconds,
      evidenceFrame: result.originalMediaUrl,
      evidenceOverlay: result.overlayMediaUrl,
      severityFactors: result.severityFactors,
      recommendedAction: result.recommendedAction,
      status: 'DETECTED',
      history: [
        {
          status: 'DETECTED',
          timestamp: new Date().toISOString(),
          actor: `Drone Vision Studio (${result.telemetry.droneId})`,
          notes: `Published from live AI inference. Confidence: ${Math.round(result.confidence * 100)}%, Priority: ${result.priority}`,
        },
      ],
    };

    const saved = await incidentService.createIncident(newIncident);
    return saved;
  },
};
