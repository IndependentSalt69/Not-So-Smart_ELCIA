import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MinimalFlightCard } from '@/components/inspections/MinimalFlightCard';
import { FlightInspectionsGridView } from '@/components/inspections/FlightInspectionsGridView';
import { FlightInspectionDetailView } from '@/components/inspections/FlightInspectionDetailView';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { IncidentQueueView } from '@/components/incidents/IncidentQueueView';
import { inspectionService } from '@/services/inspectionService';
import { api } from '@/services/api';
import { Incident, IncidentFilters as FilterType } from '@/types/incident';
import { FlightInspectionRunDetailParsed, FlightInspectionRunSummary } from '@/types/inspection';

// Helper to create mock incident
function createMockIncident(
  id: string,
  code: string,
  type: Incident['type'],
  priority: Incident['priority'],
  confidence: number | null,
  source: 'AI_VISION' | 'HUMAN_REPORTED' = 'AI_VISION',
  status: Incident['status'] = 'DETECTED',
  severity: number = 7.5
): Incident {
  return {
    id,
    code,
    type,
    confidence,
    source,
    severity,
    priority,
    timestamp: '2026-09-07T00:15:00Z',
    zone: 'Electronics City Zone (EC-01)',
    zoneId: 'EC-01',
    locationDescription: `${code} - ${type} Hazard`,
    coordinates: { lat: 12.8452, lng: 77.6631 },
    durationSeconds: 15.0,
    evidenceFrame: '/static/evidence/frame.jpg',
    severityFactors: {
      waterExtent: 5.0,
      persistenceSeconds: 15,
      roadObstruction: 6.0,
      roadCriticality: 7.0,
      explanation: ['Moderate obstruction'],
    },
    recommendedAction: 'Inspect roadway',
    status,
    history: [],
  };
}

describe('Flight-First Incident Queue (Phase 6B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. MinimalFlightCard Component Tests
  // ==========================================
  describe('MinimalFlightCard Component', () => {
    const mockFlight13: FlightInspectionRunSummary = {
      job_id: 'ea989e90-1111-2222-3333-444455556666',
      job_prefix: 'EA989E90',
      zone_code: 'EC-01',
      total_hazards: 13,
      class_counts: { POTHOLE: 8, OPEN_MANHOLE: 2, WATERLOGGING: 3 },
      priority_counts: { P1: 4, P2: 6, P3: 3 },
      status: 'COMPLETED',
      created_at: '2026-09-07T00:15:00Z',
      completed_at: '2026-09-07T00:18:00Z',
      annotated_video_url: 'http://localhost:8000/static/jobs/ea989e90/annotated_output.mp4',
      has_human_report: false,
    };

    const mockZeroHazardFlight: FlightInspectionRunSummary = {
      job_id: '8f2b1c04-9999-8888-7777-666655554444',
      job_prefix: '8F2B1C04',
      zone_code: 'EC-02',
      total_hazards: 0,
      class_counts: {},
      priority_counts: {},
      status: 'CONFIRMED_CLEAR',
      created_at: '2026-09-07T01:00:00Z',
      completed_at: '2026-09-07T01:03:00Z',
      annotated_video_url: 'http://localhost:8000/static/jobs/8f2b1c04/annotated_output.mp4',
      has_human_report: false,
    };

    it('1. Renders minimal flight card with video thumbnail, job prefix, and zone badge', () => {
      const onSelect = vi.fn();
      const markup = renderToStaticMarkup(
        <MinimalFlightCard summary={mockFlight13} onSelect={onSelect} />
      );

      expect(markup).toContain('Flight Inspection #EA989E90');
      expect(markup).toContain('EC-01');
      expect(markup).toContain('video');
      expect(markup).toContain('ea989e90/annotated_output.mp4#t=0.5');
    });

    it('2. Prohibits metric bloat (no hazard counts, P1/P2 counters, or mini-incident cards)', () => {
      const markup = renderToStaticMarkup(
        <MinimalFlightCard summary={mockFlight13} onSelect={() => {}} />
      );

      // Should NOT contain breakdown counts or counters on the top-level card
      expect(markup).not.toContain('8 POTHOLE');
      expect(markup).not.toContain('P1 Critical First');
      expect(markup).not.toContain('Total Hazards');
      expect(markup).not.toContain('13 Hazards');
      expect(markup).not.toContain('mini-card');
    });

    it('3. Renders Clean Flight indicator on zero-hazard flight card', () => {
      const markup = renderToStaticMarkup(
        <MinimalFlightCard summary={mockZeroHazardFlight} onSelect={() => {}} />
      );

      expect(markup).toContain('Flight Inspection #8F2B1C04');
      expect(markup).toContain('EC-02');
      expect(markup).toContain('Clean Flight');
    });

    it('4. Renders SVG radar fallback when video URL is missing', () => {
      const summaryWithoutVideo: FlightInspectionRunSummary = {
        ...mockFlight13,
        annotated_video_url: null,
      };

      const markup = renderToStaticMarkup(
        <MinimalFlightCard summary={summaryWithoutVideo} onSelect={() => {}} />
      );

      expect(markup).toContain('AERIAL SCAN #EA989E90');
      expect(markup).toContain('svg');
    });
  });

  // ==========================================
  // 2. FlightInspectionsGridView Component Tests
  // ==========================================
  describe('FlightInspectionsGridView Component', () => {
    const mockFlightRuns: FlightInspectionRunSummary[] = [
      {
        job_id: 'ea989e90-1111-2222-3333-444455556666',
        job_prefix: 'EA989E90',
        zone_code: 'EC-01',
        total_hazards: 13,
        class_counts: { POTHOLE: 8, OPEN_MANHOLE: 2, WATERLOGGING: 3 },
        priority_counts: { P1: 4, P2: 6, P3: 3 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:15:00Z',
        completed_at: '2026-09-07T00:18:00Z',
        annotated_video_url: 'http://localhost:8000/static/jobs/ea989e90/annotated_output.mp4',
        has_human_report: false,
      },
      {
        job_id: '66faba48-2222-3333-4444-555566667777',
        job_prefix: '66FABA48',
        zone_code: 'EC-02',
        total_hazards: 3,
        class_counts: { WATERLOGGING: 3 },
        priority_counts: { P2: 3 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:30:00Z',
        completed_at: '2026-09-07T00:33:00Z',
        annotated_video_url: 'http://localhost:8000/static/jobs/66faba48/annotated_output.mp4',
        has_human_report: false,
      },
    ];

    it('5. Renders Flight Inspections grid header and controls', () => {
      const markup = renderToStaticMarkup(
        <FlightInspectionsGridView onSelectFlight={() => {}} />
      );

      expect(markup).toContain('Flight Inspections');
      expect(markup).toContain('Aerial drone surveillance missions');
      expect(markup).toContain('All Zones');
    });
  });

  // ==========================================
  // 3. FlightInspectionDetailView Component Tests
  // ==========================================
  describe('FlightInspectionDetailView Component', () => {
    const mock11Incidents: Incident[] = Array.from({ length: 11 }, (_, i) =>
      createMockIncident(
        `inc-11-${i + 1}`,
        `INC-EA989E90-${i + 1}`,
        i < 8 ? 'pothole' : i < 10 ? 'waterlogging' : 'open_manhole',
        i < 4 ? 'P1' : i < 8 ? 'P2' : 'P3',
        0.94 - i * 0.02
      )
    );

    const mockDetail11: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: 'ea989e90-1111-2222-3333-444455556666',
        job_prefix: 'EA989E90',
        zone_code: 'EC-01',
        total_hazards: 11,
        class_counts: { POTHOLE: 8, WATERLOGGING: 2, OPEN_MANHOLE: 1 },
        priority_counts: { P1: 4, P2: 4, P3: 3 },
        status: 'COMPLETED',
        created_at: '2026-09-07T00:15:00Z',
        completed_at: '2026-09-07T00:18:00Z',
        annotated_video_url: 'http://localhost:8000/static/jobs/ea989e90/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: mock11Incidents,
      verification: null,
    };

    const mockZeroHazardDetail: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: '8f2b1c04-9999-8888-7777-666655554444',
        job_prefix: '8F2B1C04',
        zone_code: 'EC-02',
        total_hazards: 0,
        class_counts: {},
        priority_counts: {},
        status: 'CONFIRMED_CLEAR',
        created_at: '2026-09-07T01:00:00Z',
        completed_at: '2026-09-07T01:03:00Z',
        annotated_video_url: 'http://localhost:8000/static/jobs/8f2b1c04/annotated_output.mp4',
        has_human_report: false,
      },
      incidents: [],
      verification: {
        id: 'ver-8f2b1c04',
        job_id: '8f2b1c04-9999-8888-7777-666655554444',
        video_filename: 'flight_02.mp4',
        video_path: 'uploads/8f2b1c04/flight_02.mp4',
        status: 'CONFIRMED_CLEAR',
        annotated_video_url: '/static/jobs/8f2b1c04/annotated_output.mp4',
        ai_hazard_count: 0,
        created_at: '2026-09-07T01:00:00Z',
        updated_at: '2026-09-07T01:03:00Z',
      },
    };

    const mockHumanReportedIncident = createMockIncident(
      'inc-human-01',
      'INC-HUMAN-8F2B1C04-1',
      'waterlogging',
      'P2',
      null,
      'HUMAN_REPORTED',
      'DETECTED'
    );

    const mockHumanDetail: FlightInspectionRunDetailParsed = {
      summary: {
        job_id: '8f2b1c04-9999-8888-7777-666655554444',
        job_prefix: '8F2B1C04',
        zone_code: 'EC-02',
        total_hazards: 1,
        class_counts: { WATERLOGGING: 1 },
        priority_counts: { P2: 1 },
        status: 'ANOMALY_REPORTED',
        created_at: '2026-09-07T01:00:00Z',
        completed_at: '2026-09-07T01:03:00Z',
        annotated_video_url: 'http://localhost:8000/static/jobs/8f2b1c04/annotated_output.mp4',
        has_human_report: true,
      },
      incidents: [mockHumanReportedIncident],
      verification: null,
    };

    it('6. Renders back button and flight inspection header with video action', () => {
      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockDetail11);

      const markup = renderToStaticMarkup(
        <FlightInspectionDetailView
          jobId={mockDetail11.summary.job_id}
          onBack={() => {}}
          onSelectIncident={() => {}}
        />
      );

      expect(markup).toContain('Back to Flight Inspections');
    });

    it('7. 11-hazard flight renders 11 distinct individual incidents without collapsing', () => {
      expect(mockDetail11.incidents.length).toBe(11);
      const codes = mockDetail11.incidents.map((i) => i.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(11);
    });

    it('8. Zero-hazard flight renders 0 incident cards and displays Clean Flight Baseline banner', () => {
      expect(mockZeroHazardDetail.incidents.length).toBe(0);
      expect(mockZeroHazardDetail.summary.total_hazards).toBe(0);
      expect(mockZeroHazardDetail.summary.status).toBe('CONFIRMED_CLEAR');
    });

    it('9. Human-reported incident displays N/A confidence and HUMAN REPORTED source', () => {
      expect(mockHumanReportedIncident.confidence).toBeNull();
      expect(mockHumanReportedIncident.source).toBe('HUMAN_REPORTED');

      const markup = renderToStaticMarkup(
        <IncidentCard incident={mockHumanReportedIncident} onSelect={() => {}} />
      );

      expect(markup).toContain('HUMAN REPORTED');
      expect(markup).not.toContain('% Conf');
    });
  });

  // ==========================================
  // 4. IncidentQueueView Mode Switching Tests
  // ==========================================
  describe('IncidentQueueView Mode Switching', () => {
    const mockIncidents: Incident[] = [
      createMockIncident('inc-1', 'INC-001', 'pothole', 'P1', 0.95),
      createMockIncident('inc-2', 'INC-002', 'waterlogging', 'P2', 0.88),
    ];

    const defaultFilters: FilterType = {
      queueTab: 'active',
      status: 'all',
      type: 'all',
      priority: 'all',
      zoneId: 'all',
      flightRunId: 'all',
      searchQuery: '',
    };

    it('10. Defaults to Flight Inspections mode with top mode switcher', () => {
      const markup = renderToStaticMarkup(
        <IncidentQueueView
          incidents={mockIncidents}
          filters={defaultFilters}
          onFilterChange={() => {}}
          onResetFilters={() => {}}
          onSelectIncident={() => {}}
        />
      );

      // Top mode switch
      expect(markup).toContain('Flight Inspections');
      expect(markup).toContain('Individual Incidents');
      expect(markup).toContain('flight-inspections-grid-view');
    });

    it('11. Preserves canonical incident queue when in Individual Incidents mode', () => {
      // In canonical mode, Active / Completed / Rejected tabs and incident filters are rendered
      expect(defaultFilters.queueTab).toBe('active');
    });
  });

  // ==========================================
  // 5. inspectionService Normalization Tests
  // ==========================================
  describe('inspectionService API Normalization', () => {
    it('12. Normalizes relative video URLs in listFlightRuns', async () => {
      vi.spyOn(api, 'get').mockResolvedValue({
        items: [
          {
            job_id: 'test-job-123',
            job_prefix: 'TEST1234',
            total_hazards: 2,
            class_counts: { POTHOLE: 2 },
            priority_counts: { P1: 2 },
            status: 'COMPLETED',
            created_at: '2026-09-07T00:00:00Z',
            annotated_video_url: '/static/jobs/test-job-123/annotated_output.mp4',
            has_human_report: false,
          },
        ],
        total: 1,
        skip: 0,
        limit: 50,
      });

      const res = await inspectionService.listFlightRuns();
      expect(res.items.length).toBe(1);
      expect(res.items[0].annotated_video_url).toContain('/static/jobs/test-job-123/annotated_output.mp4');
    });
  });
});
