import { Incident, IncidentType } from '@/types/incident';

// Realistic SVG inline frames for visual evidence and segmentation overlay
export const generateSvgFrame = (
  title: string,
  sub: string,
  isOverlay: boolean = false,
  typeOrIsWater: IncidentType | boolean = 'waterlogging'
) => {
  const type: IncidentType =
    typeof typeOrIsWater === 'boolean'
      ? typeOrIsWater
        ? 'waterlogging'
        : 'pothole'
      : typeOrIsWater;

  const bgColor = isOverlay ? '#0f172a' : '#1e293b';

  let strokeColor = '#3b82f6';
  let overlayColor = 'rgba(59, 130, 246, 0.45)';
  let label = 'AI SEGMENTATION: WATERLOGGING (82% CONFIDENCE)';
  let shapeSvg = `<path d="M 220 320 Q 400 300 580 340 Q 520 420 260 410 Z" fill="${isOverlay ? overlayColor : '#1e3a5f'}" stroke="${isOverlay ? strokeColor : '#2563eb'}" stroke-width="${isOverlay ? '3' : '1'}"/>`;

  if (type === 'drainage_overflow') {
    strokeColor = '#06b6d4';
    overlayColor = 'rgba(6, 182, 212, 0.45)';
    label = 'AI SEGMENTATION: DRAINAGE OVERFLOW (88% CONFIDENCE)';
    shapeSvg = `<path d="M 180 340 Q 320 260 460 330 T 700 360 L 680 430 L 160 430 Z" fill="${isOverlay ? overlayColor : '#164e63'}" stroke="${isOverlay ? strokeColor : '#0891b2'}" stroke-width="${isOverlay ? '3' : '1'}"/>`;
  } else if (type === 'damaged_footpath') {
    strokeColor = '#f97316';
    overlayColor = 'rgba(249, 115, 22, 0.45)';
    label = 'AI SEGMENTATION: DAMAGED FOOTPATH (91% CONFIDENCE)';
    shapeSvg = `<polygon points="120,440 280,260 340,260 220,440" fill="${isOverlay ? overlayColor : '#7c2d12'}" stroke="${isOverlay ? strokeColor : '#ea580c'}" stroke-width="${isOverlay ? '3' : '1'}"/>${isOverlay ? '<line x1="180" y1="360" x2="260" y2="340" stroke="#f97316" stroke-width="2.5" stroke-dasharray="4,3"/>' : ''}`;
  } else if (type === 'pothole') {
    strokeColor = '#ef4444';
    overlayColor = 'rgba(239, 68, 68, 0.45)';
    label = 'AI BOUNDING BOX: POTHOLE (94% CONFIDENCE)';
    shapeSvg = `<ellipse cx="420" cy="350" rx="90" ry="45" fill="${isOverlay ? overlayColor : '#0f172a'}" stroke="${isOverlay ? strokeColor : '#991b1b'}" stroke-width="${isOverlay ? '3' : '1'}"/>${isOverlay ? '<rect x="310" y="295" width="220" height="110" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4"/>' : ''}`;
  }

  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${bgColor}"/>
    <!-- Road Perspective -->
    <polygon points="100,450 700,450 450,150 350,150" fill="#334155"/>
    <line x1="400" y1="150" x2="400" y2="450" stroke="#f8fafc" stroke-width="4" stroke-dasharray="20,15"/>
    <line x1="320" y1="250" x2="480" y2="250" stroke="#475569" stroke-width="1"/>
    <!-- Buildings / Trees silhouette -->
    <rect x="50" y="100" width="80" height="150" fill="#1e293b"/>
    <rect x="670" y="80" width="90" height="170" fill="#1e293b"/>
    
    ${shapeSvg}

    ${isOverlay
      ? `<rect x="20" y="20" width="460" height="34" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="${strokeColor}" stroke-width="1.5"/>
         <text x="35" y="42" fill="#f8fafc" font-family="sans-serif" font-size="13" font-weight="bold">${label}</text>`
      : ''
    }

    <!-- Telemetry Overlay -->
    <rect x="20" y="390" width="760" height="40" rx="6" fill="rgba(15, 23, 42, 0.8)"/>
    <text x="35" y="415" fill="#94a3b8" font-family="monospace" font-size="13">CAM-04 | ALT: 45m | SPEED: 12m/s | GPS: ${title}</text>
    <text x="680" y="415" fill="#38bdf8" font-family="monospace" font-size="13">1080p 60FPS</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
};

export const INITIAL_MOCK_INCIDENTS: Incident[] = [
  {
    id: 'EC-0142',
    type: 'waterlogging',
    confidence: 0.94,
    severity: 8.7,
    priority: 'P1',
    timestamp: '2026-08-20T00:35:12.000Z',
    zone: 'Phase 1 - Hosur Arterial Junction',
    zoneId: 'EC-01',
    locationDescription: 'Hosur Road Flyover underpass towards Electronic City Gate 1',
    coordinates: { lat: 12.8452, lng: 77.6631 },
    durationSeconds: 184,
    evidenceFrame: generateSvgFrame('12.8452N, 77.6631E', 'EC-0142 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8452N, 77.6631E', 'EC-0142 Overlay', true, true),
    evidenceClip: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    severityFactors: {
      waterExtent: 8.5,
      waterExtentLabel: '78% arterial lane coverage (~340 m²)',
      persistenceSeconds: 184,
      roadObstruction: 9.0,
      roadObstructionLabel: 'High dual-lane blockage forcing diversion',
      roadCriticality: 9.2,
      roadCriticalityLabel: 'Primary arterial junction connecting Phase 1 & Hosur Highway',
      explanation: [
        'Water pooling exceeds 15cm average depth across primary vehicular lanes.',
        'Continuous temporal persistence confirmed over 3 consecutive drone scans (>180s).',
        'Directly impairs emergency bus corridor and tech park employee transit routes.',
      ],
    },
    recommendedAction: 'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates',
    owner: 'Drainage Operations Team A',
    status: 'DETECTED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:35:12.000Z',
        actor: 'Drone Swarm AI Alpha (Sensor Fusion)',
        notes: 'Autonomous detection triggered on threshold: Water area > 250m², Depth estimate > 12cm',
      },
    ],
  },
  {
    id: 'EC-0145',
    type: 'waterlogging',
    confidence: 0.91,
    severity: 8.2,
    priority: 'P1',
    timestamp: '2026-08-20T00:20:00.000Z',
    zone: 'Phase 1 - Toll Plaza Entry Corridor',
    zoneId: 'EC-01',
    locationDescription: 'Electronic City Toll Plaza Inbound Express Lane',
    coordinates: { lat: 12.851, lng: 77.6595 },
    durationSeconds: 310,
    evidenceFrame: generateSvgFrame('12.8510N, 77.6595E', 'EC-0145 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8510N, 77.6595E', 'EC-0145 Overlay', true, true),
    severityFactors: {
      waterExtent: 8.0,
      waterExtentLabel: '65% toll approach lane coverage (~280 m²)',
      persistenceSeconds: 310,
      roadObstruction: 8.8,
      roadObstructionLabel: 'Complete blockage of Lanes 3 & 4',
      roadCriticality: 9.5,
      roadCriticalityLabel: 'High-density toll gateway entry',
      explanation: [
        'Runoff from elevated highway collecting at toll booth approach.',
        'Vehicular deceleration causing 400m tailback.',
        'Immediate drainage pump intervention recommended.',
      ],
    },
    recommendedAction: 'Deploy Quick-Response Drainage Unit & Divert Inbound Traffic to Lanes 1 & 2',
    owner: 'Emergency Pump Unit 2',
    status: 'VERIFIED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:15:00.000Z',
        actor: 'Drone Swarm AI Beta',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-20T00:20:00.000Z',
        actor: 'Operator Sharma (Command Center)',
        notes: 'Confirmed severe runoff accumulation at toll plaza.',
      },
    ],
  },
  {
    id: 'EC-0148',
    type: 'pothole',
    confidence: 0.96,
    severity: 8.9,
    priority: 'P1',
    timestamp: '2026-08-20T00:10:00.000Z',
    zone: 'Phase 2 - Tech Park Central Boulevard',
    zoneId: 'EC-03',
    locationDescription: 'Near Infosys Gate 6 / Velankani Drive intersection',
    coordinates: { lat: 12.8385, lng: 77.6745 },
    durationSeconds: 450,
    evidenceFrame: generateSvgFrame('12.8385N, 77.6745E', 'EC-0148 Original Frame', false, false),
    evidenceOverlay: generateSvgFrame('12.8385N, 77.6745E', 'EC-0148 Overlay', true, false),
    severityFactors: {
      waterExtent: 2.0,
      waterExtentLabel: 'Submerged crater within light puddling',
      persistenceSeconds: 450,
      roadObstruction: 9.2,
      roadObstructionLabel: 'Deep structural asphalt collapse (approx 18cm depth, 1.4m width)',
      roadCriticality: 9.0,
      roadCriticalityLabel: 'High speed corporate shuttle corridor',
      explanation: [
        'Severe deep crater with sharp exposed aggregate edges.',
        'High risk of two-wheeler vehicle loss of control during rainfall.',
        'Submerged edge makes pothole invisible to drivers under low visibility.',
      ],
    },
    recommendedAction: 'Deploy Cold-Mix Bitumen Patching & Place High-Visibility Hazard Barricades',
    owner: 'Road Surface Maintenance Team B',
    status: 'ASSIGNED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:00:00.000Z',
        actor: 'Drone Swarm AI Gamma',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-20T00:05:00.000Z',
        actor: 'Operator Patel',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-20T00:10:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
        notes: 'Dispatched Crew B with instant asphalt rapid cure compound.',
      },
    ],
  },
  {
    id: 'EC-0150',
    type: 'waterlogging',
    confidence: 0.88,
    severity: 6.8,
    priority: 'P2',
    timestamp: '2026-08-19T23:50:00.000Z',
    zone: 'Phase 1 - West IT Corridor',
    zoneId: 'EC-01',
    locationDescription: 'Wipro Avenue connecting to Neeladri Road',
    coordinates: { lat: 12.842, lng: 77.661 },
    durationSeconds: 120,
    evidenceFrame: generateSvgFrame('12.8420N, 77.6610E', 'EC-0150 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8420N, 77.6610E', 'EC-0150 Overlay', true, true),
    severityFactors: {
      waterExtent: 6.5,
      waterExtentLabel: '45% single lane shoulder accumulation (~160 m²)',
      persistenceSeconds: 120,
      roadObstruction: 6.0,
      roadObstructionLabel: 'Shoulder lane restricted, center lane passable',
      roadCriticality: 7.5,
      roadCriticalityLabel: 'Secondary connector road',
      explanation: [
        'Water pooling along curb due to leaf debris clogging curb inlets.',
        'Traffic slowing down but flowing steadily.',
      ],
    },
    recommendedAction: 'Clear curb inlet grates & sweep silt runoff',
    owner: 'Drainage Operations Team C',
    status: 'IN_PROGRESS',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T23:30:00.000Z',
        actor: 'Drone Swarm AI Alpha',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-19T23:35:00.000Z',
        actor: 'Operator Sharma',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-19T23:40:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: '2026-08-19T23:50:00.000Z',
        actor: 'Drainage Crew Leader Ravi',
        notes: 'Crew on site clearing debris grates with motorized suction.',
      },
    ],
  },
  {
    id: 'EC-0152',
    type: 'pothole',
    confidence: 0.89,
    severity: 6.4,
    priority: 'P2',
    timestamp: '2026-08-19T23:15:00.000Z',
    zone: 'Phase 2 - North Industrial Sector',
    zoneId: 'EC-03',
    locationDescription: 'Bettadasanapura Link Road near HP Campus',
    coordinates: { lat: 12.8495, lng: 77.678 },
    durationSeconds: 260,
    evidenceFrame: generateSvgFrame('12.8495N, 77.6780E', 'EC-0152 Original Frame', false, false),
    evidenceOverlay: generateSvgFrame('12.8495N, 77.6780E', 'EC-0152 Overlay', true, false),
    severityFactors: {
      waterExtent: 3.0,
      waterExtentLabel: 'Minor standing water in wheel ruts',
      persistenceSeconds: 260,
      roadObstruction: 6.8,
      roadObstructionLabel: 'Cluster of 3 potholes across left lane',
      roadCriticality: 6.5,
      roadCriticalityLabel: 'Industrial logistics corridor',
      explanation: [
        'Multiple surface depressions caused by heavy cargo trucks.',
        'Requires asphalt patching to prevent further crater expansion.',
      ],
    },
    recommendedAction: 'Asphalt compaction and edge sealing',
    owner: 'Road Surface Maintenance Team A',
    status: 'RE_INSPECTION',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T22:00:00.000Z',
        actor: 'Drone Swarm AI Beta',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-19T22:15:00.000Z',
        actor: 'Operator Patel',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-19T22:30:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: '2026-08-19T22:45:00.000Z',
        actor: 'Road Crew A',
      },
      {
        status: 'RE_INSPECTION',
        timestamp: '2026-08-19T23:15:00.000Z',
        actor: 'Road Crew A',
        notes: 'Cold patch applied and compacted. Queued for drone confirmation.',
      },
    ],
  },
  {
    id: 'EC-0155',
    type: 'waterlogging',
    confidence: 0.95,
    severity: 4.2,
    priority: 'P3',
    timestamp: '2026-08-19T22:40:00.000Z',
    zone: 'Phase 1 - East Commercial Belt',
    zoneId: 'EC-02',
    locationDescription: 'Cyber Park Service Lane adjacent to Metro Pillar 142',
    coordinates: { lat: 12.8465, lng: 77.671 },
    durationSeconds: 95,
    evidenceFrame: generateSvgFrame('12.8465N, 77.6710E', 'EC-0155 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8465N, 77.6710E', 'EC-0155 Overlay', true, true),
    severityFactors: {
      waterExtent: 4.0,
      waterExtentLabel: '20% service road edge accumulation (~60 m²)',
      persistenceSeconds: 95,
      roadObstruction: 3.5,
      roadObstructionLabel: 'Pedestrian walkway dampened, roadway clear',
      roadCriticality: 4.5,
      roadCriticalityLabel: 'Low speed internal service road',
      explanation: [
        'Shallow puddle (<5cm depth) on service lane shoulder.',
        'No impediment to vehicular flow.',
      ],
    },
    recommendedAction: 'Inspect storm drain connection at next routine cycle',
    owner: 'Drainage Routine Crew',
    status: 'CLOSED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T21:00:00.000Z',
        actor: 'Drone Swarm AI Alpha',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-19T21:10:00.000Z',
        actor: 'Operator Sharma',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-19T21:20:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: '2026-08-19T21:40:00.000Z',
        actor: 'Drainage Routine Crew',
      },
      {
        status: 'RE_INSPECTION',
        timestamp: '2026-08-19T22:15:00.000Z',
        actor: 'Drone Swarm AI Alpha',
      },
      {
        status: 'CLOSED',
        timestamp: '2026-08-19T22:40:00.000Z',
        actor: 'System Autonomous Supervisor',
        notes: 'Verification flight confirmed 0mm standing water.',
      },
    ],
  },
  {
    id: 'EC-0158',
    type: 'waterlogging',
    confidence: 0.72,
    severity: 3.1,
    priority: 'P3',
    timestamp: '2026-08-19T22:10:00.000Z',
    zone: 'Main Junction Corridor',
    zoneId: 'EC-04',
    locationDescription: 'Under tree canopy near Siemens campus entrance',
    coordinates: { lat: 12.8415, lng: 77.6675 },
    durationSeconds: 40,
    evidenceFrame: generateSvgFrame('12.8415N, 77.6675E', 'EC-0158 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8415N, 77.6675E', 'EC-0158 Overlay', true, true),
    severityFactors: {
      waterExtent: 2.5,
      waterExtentLabel: 'Specular glare from wet asphalt (<20 m²)',
      persistenceSeconds: 40,
      roadObstruction: 2.0,
      roadObstructionLabel: 'No traffic obstruction',
      roadCriticality: 5.0,
      roadCriticalityLabel: 'Campus feeder road',
      explanation: [
        'AI detected optical reflection from street lighting on damp tarmac.',
        'Operator classified as non-hazardous false alert.',
      ],
    },
    recommendedAction: 'No action required — False positive reflection',
    status: 'REJECTED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T22:05:00.000Z',
        actor: 'Drone Swarm AI Gamma',
      },
      {
        status: 'REJECTED',
        timestamp: '2026-08-19T22:10:00.000Z',
        actor: 'Operator Patel',
        notes: 'False positive: wet surface reflection, not standing water.',
      },
    ],
  },
  {
    id: 'EC-0160',
    type: 'pothole',
    confidence: 0.92,
    severity: 7.6,
    priority: 'P2',
    timestamp: '2026-08-20T00:25:00.000Z',
    zone: 'Main Junction Corridor',
    zoneId: 'EC-04',
    locationDescription: 'Electronics City Main Intersection Bus Bay',
    coordinates: { lat: 12.8438, lng: 77.6652 },
    durationSeconds: 190,
    evidenceFrame: generateSvgFrame('12.8438N, 77.6652E', 'EC-0160 Original Frame', false, false),
    evidenceOverlay: generateSvgFrame('12.8438N, 77.6652E', 'EC-0160 Overlay', true, false),
    severityFactors: {
      waterExtent: 3.5,
      waterExtentLabel: 'Pothole filled with rainwater',
      persistenceSeconds: 190,
      roadObstruction: 7.8,
      roadObstructionLabel: 'Buses swerving into main lane to avoid pothole',
      roadCriticality: 8.5,
      roadCriticalityLabel: 'Main transit bus bay',
      explanation: [
        'Submerged pothole directly in bus deceleration path.',
        'High repeated axle load accelerating road degradation.',
      ],
    },
    recommendedAction: 'Rapid asphalt patch and heavy load seal',
    owner: 'Road Surface Maintenance Team B',
    status: 'DETECTED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:25:00.000Z',
        actor: 'Drone Swarm AI Alpha',
      },
    ],
  },
  {
    id: 'EC-0163',
    type: 'waterlogging',
    confidence: 0.93,
    severity: 7.9,
    priority: 'P2',
    timestamp: '2026-08-20T00:30:00.000Z',
    zone: 'Phase 2 - Tech Park Central Boulevard',
    zoneId: 'EC-03',
    locationDescription: 'TCS - Tech Mahindra Link Road Culvert',
    coordinates: { lat: 12.836, lng: 77.6815 },
    durationSeconds: 210,
    evidenceFrame: generateSvgFrame('12.8360N, 77.6815E', 'EC-0163 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8360N, 77.6815E', 'EC-0163 Overlay', true, true),
    severityFactors: {
      waterExtent: 7.5,
      waterExtentLabel: '50% road coverage due to culvert overflow (~210 m²)',
      persistenceSeconds: 210,
      roadObstruction: 8.0,
      roadObstructionLabel: 'Slow single file traffic pass',
      roadCriticality: 7.8,
      roadCriticalityLabel: 'Major Phase 2 tech corridor',
      explanation: [
        'Stormwater culvert silt accumulation causing back-pressure overflow.',
        'Water depth measured at 11cm at lowest grade point.',
      ],
    },
    recommendedAction: 'Desilt culvert mouth and clear drainage outflow channel',
    owner: 'Drainage Operations Team B',
    status: 'VERIFIED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:22:00.000Z',
        actor: 'Drone Swarm AI Beta',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-20T00:30:00.000Z',
        actor: 'Operator Sharma',
      },
    ],
  },
  {
    id: 'EC-0166',
    type: 'pothole',
    confidence: 0.85,
    severity: 4.8,
    priority: 'P3',
    timestamp: '2026-08-19T21:15:00.000Z',
    zone: 'Phase 1 - East Commercial Belt',
    zoneId: 'EC-02',
    locationDescription: 'Behind Infosys Campus towards Doddathogur Road',
    coordinates: { lat: 12.848, lng: 77.673 },
    durationSeconds: 150,
    evidenceFrame: generateSvgFrame('12.8480N, 77.6730E', 'EC-0166 Original Frame', false, false),
    evidenceOverlay: generateSvgFrame('12.8480N, 77.6730E', 'EC-0166 Overlay', true, false),
    severityFactors: {
      waterExtent: 1.0,
      waterExtentLabel: 'Dry crater edge',
      persistenceSeconds: 150,
      roadObstruction: 4.5,
      roadObstructionLabel: 'Minor shallow depression (4cm depth)',
      roadCriticality: 4.8,
      roadCriticalityLabel: 'Residential access route',
      explanation: [
        'Shallow surface wear, low accident hazard at current vehicular speeds.',
      ],
    },
    recommendedAction: 'Queue for scheduled weekend road resurfacing',
    owner: 'Road Surface Maintenance Team C',
    status: 'IN_PROGRESS',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T20:00:00.000Z',
        actor: 'Drone Swarm AI Gamma',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-19T20:20:00.000Z',
        actor: 'Operator Patel',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-19T20:45:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: '2026-08-19T21:15:00.000Z',
        actor: 'Road Surface Crew C',
      },
    ],
  },
  {
    id: 'EC-0170',
    type: 'waterlogging',
    confidence: 0.96,
    severity: 9.1,
    priority: 'P1',
    timestamp: '2026-08-20T00:38:00.000Z',
    zone: 'Phase 2 - North Industrial Sector',
    zoneId: 'EC-03',
    locationDescription: 'Heliodata Underpass at Electronics City Phase 2 East Gate',
    coordinates: { lat: 12.853, lng: 77.682 },
    durationSeconds: 240,
    evidenceFrame: generateSvgFrame('12.8530N, 77.6820E', 'EC-0170 Original Frame', false, true),
    evidenceOverlay: generateSvgFrame('12.8530N, 77.6820E', 'EC-0170 Overlay', true, true),
    severityFactors: {
      waterExtent: 9.2,
      waterExtentLabel: '85% underpass basin submerged (~480 m²)',
      persistenceSeconds: 240,
      roadObstruction: 9.5,
      roadObstructionLabel: 'Full underpass closure, vehicles stalled',
      roadCriticality: 8.8,
      roadCriticalityLabel: 'Key connector underpass for Phase 2 logistics',
      explanation: [
        'Extreme low-elevation basin filling rapidly (>22cm depth).',
        'Automatic pump station failure detected on sensor node #12.',
        'Urgent emergency dispatch required.',
      ],
    },
    recommendedAction: 'Emergency dispatch: 2x 100HP Diesel Trash Pumps + Traffic Police Barricading',
    owner: 'Emergency Pump Unit 1',
    status: 'DETECTED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-20T00:38:00.000Z',
        actor: 'Drone Swarm AI Alpha',
        notes: 'Critical alert: Underpass basin depth exceedance alarm triggered.',
      },
    ],
  },
  {
    id: 'EC-0172',
    type: 'pothole',
    confidence: 0.87,
    severity: 5.2,
    priority: 'P3',
    timestamp: '2026-08-19T19:40:00.000Z',
    zone: 'Phase 1 - West IT Corridor',
    zoneId: 'EC-01',
    locationDescription: 'Otis Circle near Infosys Gate 1',
    coordinates: { lat: 12.8405, lng: 77.662 },
    durationSeconds: 110,
    evidenceFrame: generateSvgFrame('12.8405N, 77.6620E', 'EC-0172 Original Frame', false, false),
    evidenceOverlay: generateSvgFrame('12.8405N, 77.6620E', 'EC-0172 Overlay', true, false),
    severityFactors: {
      waterExtent: 2.0,
      waterExtentLabel: 'Slight standing water',
      persistenceSeconds: 110,
      roadObstruction: 5.0,
      roadObstructionLabel: 'Roundabout edge depression',
      roadCriticality: 6.0,
      roadCriticalityLabel: 'Roundabout feeder',
      explanation: [
        'Minor road fraying near roundabout curb.',
      ],
    },
    recommendedAction: 'Cold mix leveling patch',
    owner: 'Road Surface Maintenance Team A',
    status: 'CLOSED',
    history: [
      {
        status: 'DETECTED',
        timestamp: '2026-08-19T18:00:00.000Z',
        actor: 'Drone Swarm AI Beta',
      },
      {
        status: 'VERIFIED',
        timestamp: '2026-08-19T18:20:00.000Z',
        actor: 'Operator Sharma',
      },
      {
        status: 'ASSIGNED',
        timestamp: '2026-08-19T18:40:00.000Z',
        actor: 'Dispatcher ELCIA Ops',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: '2026-08-19T19:00:00.000Z',
        actor: 'Road Surface Team A',
      },
      {
        status: 'RE_INSPECTION',
        timestamp: '2026-08-19T19:25:00.000Z',
        actor: 'Drone Swarm AI Alpha',
      },
      {
        status: 'CLOSED',
        timestamp: '2026-08-19T19:40:00.000Z',
        actor: 'System Autonomous Supervisor',
        notes: 'Post-repair flyover scan verified smooth asphalt patch.',
      },
    ],
  },
];
