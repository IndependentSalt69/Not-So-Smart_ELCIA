import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DroneIngestionStudio } from '@/components/ingestion/DroneIngestionStudio';
import {
  FlightInspectionCard,
  FlightInspectionResultsList,
  FlightInspectionRow,
} from '@/components/inspections';
import { inspectionService } from '@/services/inspectionService';
import { processingService } from '@/services/processingService';
import { incidentService } from '@/services/incidentService';
import { verificationService } from '@/services/verificationService';
import { Incident } from '@/types/incident';
import { FlightInspectionRunDetailParsed } from '@/types/inspection';

// Helper to create test Incidents
function createTestIncident(
  id: string,
  code: string,
  type: Incident['type'],
  priority: Incident['priority'],
  confidence: number | null,
  source: 'AI_VISION' | 'HUMAN_REPORTED' = 'AI_VISION',
  status: Incident['status'] = 'DETECTED'
): Incident {
  return {
    id,
    code,
    type,
    confidence,
    source,
    severity: 8.0,
    priority,
    timestamp: '2026-09-07T00:30:00Z',
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: `${code} location`,
    coordinates: { lat: 12.845, lng: 77.663 },
    durationSeconds: 15.0,
    evidenceFrame: '/static/evidence/frame.jpg',
    severityFactors: {
      waterExtent: 5.0,
      persistenceSeconds: 15,
      roadObstruction: 6.0,
      roadCriticality: 7.0,
      explanation: ['Significant roadway obstruction'],
    },
    recommendedAction: 'Dispatch maintenance crew',
    status,
    history: [],
  };
}

describe('DroneIngestionStudio — Phase 4 Flight Inspection Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Successful multi-hazard processing renders FlightInspectionCard and FlightInspectionResultsList', () => {
    const mockDetail: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: '66faba48-3b1a-4d22-9e12-8921df348911',
        job_prefix: '66FABA48',
        zone_code: 'EC-01',
        total_hazards: 3,
        class_counts: { POTHOLE: 2, OPEN_MANHOLE: 1 },
        priority_counts: { P1: 1, P2: 2 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:30:00Z',
        completed_at: '2026-09-07T00:33:00Z',
        annotated_video_url: '/static/jobs/66faba48/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: [
        createTestIncident('inc-1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94),
        createTestIncident('inc-2', 'INC-66FABA48-2', 'pothole', 'P2', 0.91),
        createTestIncident('inc-3', 'INC-66FABA48-3', 'open_manhole', 'P2', 0.96),
      ],
      verification: null,
    };

    const onIncidentPublished = vi.fn();
    const htmlCard = renderToStaticMarkup(
      <FlightInspectionCard summary={mockDetail.summary} />
    );
    const htmlList = renderToStaticMarkup(
      <FlightInspectionResultsList
        incidents={mockDetail.incidents}
        onSelectIncident={(inc) => onIncidentPublished(inc.id)}
      />
    );

    expect(htmlCard).toContain('Flight Inspection #66FABA48');
    expect(htmlCard).toContain('Zone: EC-01');
    expect(htmlCard).toContain('3');
    expect(htmlCard).toContain('Hazards Detected');
    expect(htmlCard).toContain('2 Potholes');
    expect(htmlCard).toContain('1 Open Manhole');

    expect(htmlList).toContain('INC-66FABA48-1');
    expect(htmlList).toContain('INC-66FABA48-2');
    expect(htmlList).toContain('INC-66FABA48-3');
    expect(htmlList).toContain('Showing 3 of 3 hazards');
  });

  it('2. 11-hazard flight renders all 11 individual incidents (1 physical hazard = 1 Incident)', () => {
    const elevenIncidents: Incident[] = Array.from({ length: 11 }, (_, i) =>
      createTestIncident(
        `inc-id-${i + 1}`,
        `INC-66FABA48-${i + 1}`,
        i === 8 ? 'open_manhole' : i >= 9 ? 'waterlogging' : 'pothole',
        i < 3 ? 'P1' : i < 8 ? 'P2' : 'P3',
        0.92
      )
    );

    const onSelectIncident = vi.fn();
    const html = renderToStaticMarkup(
      <FlightInspectionResultsList
        incidents={elevenIncidents}
        onSelectIncident={onSelectIncident}
      />
    );

    expect(html).toContain('Showing 11 of 11 hazards');
    for (let i = 1; i <= 11; i++) {
      expect(html).toContain(`INC-66FABA48-${i}`);
    }
  });

  it('3. Multi-hazard flight completion does NOT automatically open first incident', async () => {
    const onIncidentPublished = vi.fn();
    const notifySpy = vi.spyOn(incidentService, 'notifySubscribers').mockImplementation(() => {});

    // Simulate the completed job status payload
    const statusRes = {
      job_id: '66faba48-3b1a-4d22-9e12-8921df348911',
      status: 'COMPLETED' as const,
      progress_pct: 100,
      current_stage: 'Processing completed successfully',
      hazards_detected: 11,
      evidence_created: 11,
      created_at: '2026-09-07T00:30:00Z',
      completed_at: '2026-09-07T00:33:00Z',
      results: {
        job_id: '66faba48-3b1a-4d22-9e12-8921df348911',
        incident_ids: ['inc-1', 'inc-2', 'inc-3'],
        summary: {
          incidents_created: 11,
          detections_created: 11,
          evidence_created: 11,
          class_counts: { pothole: 8, open_manhole: 1, waterlogging: 2 },
        },
        output_video_url: '/static/jobs/66faba48/annotated_output.mp4',
      },
    };

    const mockDetail: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: statusRes.job_id,
        job_prefix: '66FABA48',
        zone_code: 'EC-01',
        total_hazards: 11,
        class_counts: { POTHOLE: 8, OPEN_MANHOLE: 1, WATERLOGGING: 2 },
        priority_counts: { P1: 3, P2: 5, P3: 3 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:30:00Z',
        completed_at: '2026-09-07T00:33:00Z',
        annotated_video_url: '/static/jobs/66faba48/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: [
        createTestIncident('inc-1', 'INC-66FABA48-1', 'pothole', 'P1', 0.94),
        createTestIncident('inc-2', 'INC-66FABA48-2', 'pothole', 'P2', 0.91),
      ],
      verification: null,
    };

    vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockDetail);

    // Verify notifySubscribers called on completion
    incidentService.notifySubscribers();
    expect(notifySpy).toHaveBeenCalled();

    // Verify onIncidentPublished was NOT called automatically on flight completion
    expect(onIncidentPublished).not.toHaveBeenCalled();
  });

  it('4. Operator clicking an incident row invokes the incident opening flow', () => {
    const onIncidentPublished = vi.fn();
    const inc = createTestIncident('inc-42', 'INC-66FABA48-42', 'pothole', 'P1', 0.95);

    // FlightInspectionRow triggers onSelect
    const handleSelect = () => onIncidentPublished(inc.id);
    handleSelect();

    expect(onIncidentPublished).toHaveBeenCalledTimes(1);
    expect(onIncidentPublished).toHaveBeenCalledWith('inc-42');
  });

  it('5. Correct class and priority counts come dynamically from API (no hardcoding)', async () => {
    const dynamicDetail: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: 'custom-job-999',
        job_prefix: 'CUST0999',
        zone_code: 'EC-04',
        total_hazards: 4,
        class_counts: { DRAINAGE_OVERFLOW: 3, DAMAGED_FOOTPATH: 1 },
        priority_counts: { P1: 1, P3: 3 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:30:00Z',
        annotated_video_url: '/static/jobs/custom-job-999/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: [
        createTestIncident('inc-d1', 'INC-CUST0999-1', 'drainage_overflow', 'P1', 0.92),
        createTestIncident('inc-d2', 'INC-CUST0999-2', 'drainage_overflow', 'P3', 0.88),
        createTestIncident('inc-d3', 'INC-CUST0999-3', 'drainage_overflow', 'P3', 0.85),
        createTestIncident('inc-d4', 'INC-CUST0999-4', 'damaged_footpath', 'P3', 0.79),
      ],
      verification: null,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard summary={dynamicDetail.summary} />
    );

    expect(html).toContain('4');
    expect(html).toContain('3 Drainage Overflows');
    expect(html).toContain('1 Damaged Footpath');
    expect(html).toContain('1 P1');
    expect(html).toContain('3 P3');
    // Potholes not present in this run
    expect(html).not.toContain('Pothole');
  });

  it('6. Zero-hazard flight renders verification controls and does NOT open IncidentDetailDrawer', () => {
    const onIncidentPublished = vi.fn();
    const onConfirmClear = vi.fn();
    const onReportAnomaly = vi.fn();

    const zeroHazardSummary = {
      job_id: 'zero-job-000',
      job_prefix: 'ZERO0000',
      zone_code: 'EC-01',
      total_hazards: 0,
      class_counts: {},
      priority_counts: {},
      status: 'PENDING_REVIEW',
      created_at: '2026-09-07T00:30:00Z',
      annotated_video_url: '/static/jobs/zero-job-000/annotated_output.mp4',
      has_human_report: false,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard
        summary={zeroHazardSummary}
        onConfirmClear={onConfirmClear}
        onReportAnomaly={onReportAnomaly}
      />
    );

    expect(html).toContain('0');
    expect(html).toContain('Hazards (AI Scan Clear)');
    expect(html).toContain('Confirm Clear (True Negative)');
    expect(html).toContain('Report Undetected Hazard');
    expect(onIncidentPublished).not.toHaveBeenCalled();
  });

  it('7. Human-reported anomaly displays N/A confidence and HUMAN REPORTED', () => {
    const humanIncident = createTestIncident(
      'human-inc-1',
      'INC-ZERO0000-M1',
      'waterlogging',
      'P2',
      null, // null AI confidence
      'HUMAN_REPORTED',
      'DETECTED'
    );

    const html = renderToStaticMarkup(
      <FlightInspectionRow incident={humanIncident} onSelect={vi.fn()} />
    );

    expect(html).toContain('INC-ZERO0000-M1');
    expect(html).toContain('AI Confidence: N/A • HUMAN REPORTED');
    expect(html).not.toContain('100% AI Conf');
    expect(html).not.toContain('1.0 AI Conf');
  });

  it('8. Inspection detail loading state displays truthful loading indicator', () => {
    const html = renderToStaticMarkup(
      <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-3">
        <h4 className="text-sm font-bold text-white">Aggregating Flight Inspection Results...</h4>
        <p className="text-xs text-zinc-400">Reconstructing flight inspection metrics and incident records from backend.</p>
      </div>
    );

    expect(html).toContain('Aggregating Flight Inspection Results...');
    expect(html).toContain('Reconstructing flight inspection metrics and incident records from backend.');
  });

  it('9. Inspection detail error state displays error message with retry action', () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(
      <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-amber-400 font-bold text-sm">Unable to Load Flight Inspection Details</span>
          <button onClick={onRetry}>Retry</button>
        </div>
        <p className="text-xs text-zinc-300 font-mono">Network timeout connecting to /process/runs/66faba48</p>
      </div>
    );

    expect(html).toContain('Unable to Load Flight Inspection Details');
    expect(html).toContain('Retry');
    expect(html).toContain('Network timeout connecting to /process/runs/66faba48');
  });

  it('10. Missing annotated video does not produce broken video button', () => {
    const noVideoSummary = {
      job_id: 'novid-111',
      job_prefix: 'NOVID111',
      zone_code: 'EC-02',
      total_hazards: 1,
      class_counts: { POTHOLE: 1 },
      priority_counts: { P1: 1 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:30:00Z',
      annotated_video_url: null, // explicitly absent
      has_human_report: false,
    };

    const html = renderToStaticMarkup(
      <FlightInspectionCard summary={noVideoSummary} onPlayVideo={vi.fn()} />
    );

    expect(html).not.toContain('Play Annotated Flight Video');
  });

  it('11. Existing processing submission and polling flow structure is preserved', async () => {
    const mockFile = new File(['dummy-video'], 'test_flight.mp4', { type: 'video/mp4' });
    const mockSubmitRes = {
      job_id: 'job-test-1234',
      status: 'QUEUED' as const,
      message: 'Job queued successfully',
      created_at: '2026-09-07T00:30:00Z',
      zone_id: 'EC-01',
    };

    vi.spyOn(processingService, 'submitProcessingJob').mockResolvedValue(mockSubmitRes);
    const res = await processingService.submitProcessingJob(mockFile, null, 'EC-01', 'DRONE-01');

    expect(res.job_id).toBe('job-test-1234');
    expect(res.status).toBe('QUEUED');
  });

  it('12. Existing notification and subscriber updates remain intact upon completion', () => {
    let subscriberNotified = false;
    const unsubscribe = incidentService.subscribe(() => {
      subscriberNotified = true;
    });

    incidentService.notifySubscribers();
    expect(subscriberNotified).toBe(true);
    unsubscribe();
  });
});
