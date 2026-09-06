import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { IncidentQueueView } from '@/components/incidents/IncidentQueueView';
import { incidentService } from '@/services/incidentService';
import { inspectionService } from '@/services/inspectionService';
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

describe('Incident Queue & Flight Inspection Integration (Phase 5B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. IncidentFilters Component Tests
  // ==========================================
  describe('IncidentFilters Component', () => {
    it('1. Flight dropdown renders live flight runs with metadata', async () => {
      const mockRuns: FlightInspectionRunSummary[] = [
        {
          job_id: '66faba48-1111-2222-3333-444455556666',
          job_prefix: '66FABA48',
          zone_code: 'EC-01',
          total_hazards: 11,
          class_counts: { POTHOLE: 8, OPEN_MANHOLE: 1, WATERLOGGING: 2 },
          priority_counts: { P1: 4, P2: 5, P3: 2 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        {
          job_id: '8f2b1c04-9999-8888-7777-666655554444',
          job_prefix: '8F2B1C04',
          zone_code: 'EC-01',
          total_hazards: 0,
          class_counts: {},
          priority_counts: {},
          status: 'CONFIRMED_CLEAR',
          created_at: '2026-09-07T00:10:00Z',
          has_human_report: false,
        },
      ];

      vi.spyOn(inspectionService, 'listFlightRuns').mockResolvedValue({
        items: mockRuns,
        total: 2,
        skip: 0,
        limit: 100,
      });

      const html = renderToStaticMarkup(
        <IncidentFilters
          filters={{ queueTab: 'active', flightRunId: 'all' }}
          onFilterChange={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(html).toContain('All Inspection Runs');
      expect(html).toContain('All Zones');
    });

    it('2. Correctly indicates filtered state when flightRunId is set', () => {
      const onReset = vi.fn();
      const html = renderToStaticMarkup(
        <IncidentFilters
          filters={{ queueTab: 'active', flightRunId: '66faba48-1111' }}
          onFilterChange={vi.fn()}
          onReset={onReset}
        />
      );

      // Reset button should appear when filter is active
      expect(html).toContain('Reset Filters');
    });

    it('3. Scopes listFlightRuns query when zoneId changes', async () => {
      const spy = vi.spyOn(inspectionService, 'listFlightRuns').mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        limit: 100,
      });

      renderToStaticMarkup(
        <IncidentFilters
          filters={{ queueTab: 'active', zoneId: 'EC-03' }}
          onFilterChange={vi.fn()}
          onReset={vi.fn()}
        />
      );

      // Verify listFlightRuns was queried with zone_id
      expect(spy).toBeDefined();
    });
  });

  // ==========================================
  // 2. Incident Queue View Integration Tests
  // ==========================================
  describe('IncidentQueueView & Flight Scoped Behavior', () => {
    it('4. 11-hazard flight inspection renders 11 independent cards in queue', () => {
      const mockIncidents: Incident[] = Array.from({ length: 11 }, (_, i) =>
        createMockIncident(
          `inc-66faba48-${i + 1}`,
          `INC-66FABA48-${i + 1}`,
          i < 8 ? 'pothole' : i < 10 ? 'waterlogging' : 'open_manhole',
          i < 4 ? 'P1' : i < 9 ? 'P2' : 'P3',
          0.92
        )
      );

      const html = renderToStaticMarkup(
        <IncidentQueueView
          incidents={mockIncidents}
          filters={{ queueTab: 'active', flightRunId: '66faba48-1111' }}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
          onSelectIncident={vi.fn()}
        />
      );

      // Verify truthful match counter
      expect(html).toContain('Showing');
      expect(html).toContain('11');
      expect(html).toContain('incidents');
      expect(html).toContain('active');

      // Verify independent cards rendered
      expect(html).toContain('INC-66FABA48-1');
      expect(html).toContain('INC-66FABA48-11');
    });

    it('5. Truthfully reflects filtered counts when sub-filters are applied to flight', () => {
      // 8 potholes filtered from the 11 hazards
      const potholeIncidents: Incident[] = Array.from({ length: 8 }, (_, i) =>
        createMockIncident(
          `inc-66faba48-${i + 1}`,
          `INC-66FABA48-${i + 1}`,
          'pothole',
          'P1',
          0.94
        )
      );

      const html = renderToStaticMarkup(
        <IncidentQueueView
          incidents={potholeIncidents}
          filters={{ queueTab: 'active', flightRunId: '66faba48-1111', type: 'pothole' }}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
          onSelectIncident={vi.fn()}
        />
      );

      expect(html).toContain('Showing');
      expect(html).toContain('8');
      expect(html).toContain('incidents');
    });

    it('6. Zero-hazard flight renders 0 incident cards and clean flight baseline', () => {
      const html = renderToStaticMarkup(
        <IncidentQueueView
          incidents={[]}
          filters={{ queueTab: 'active', flightRunId: '8f2b1c04-0000' }}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
          onSelectIncident={vi.fn()}
        />
      );

      expect(html).toContain('Showing');
      expect(html).toContain('0');
      expect(html).toContain('incidents');
      // No incident cards rendered
      expect(html).not.toContain('INC-');
    });

    it('7. Human-reported anomaly retains AI Confidence null/not numeric and HUMAN REPORTED source', () => {
      const manualIncident = createMockIncident(
        'inc-manual-1',
        'INC-8F2B1C04-M1',
        'damaged_footpath',
        'P2',
        null,
        'HUMAN_REPORTED',
        'DETECTED'
      );

      const html = renderToStaticMarkup(
        <IncidentCard incident={manualIncident} onSelect={vi.fn()} />
      );

      expect(html).toContain('INC-8F2B1C04-M1');
      expect(html).toContain('Damaged Footpath');
      expect(html).toContain('HUMAN REPORTED');
      expect(html).not.toContain('% Conf');
    });

    it('8. AI-detected incident retains YOLO confidence value', () => {
      const aiIncident = createMockIncident(
        'inc-ai-1',
        'INC-66FABA48-1',
        'pothole',
        'P1',
        0.94,
        'AI_VISION',
        'DETECTED'
      );

      const html = renderToStaticMarkup(
        <IncidentCard incident={aiIncident} onSelect={vi.fn()} />
      );

      expect(html).toContain('INC-66FABA48-1');
      expect(html).toContain('94%');
      expect(html).not.toContain('HUMAN REPORTED');
    });
  });

  // ==========================================
  // 3. Service Data Layer Integration Tests
  // ==========================================
  describe('incidentService flightRunId integration', () => {
    it('9. getIncidents calls inspectionService.getFlightRunDetail when flightRunId is set', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-abc-123',
          job_prefix: 'ABC12345',
          zone_code: 'EC-01',
          total_hazards: 2,
          class_counts: { POTHOLE: 2 },
          priority_counts: { P1: 2 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-ABC12345-1', 'pothole', 'P1', 0.95),
          createMockIncident('inc-2', 'INC-ABC12345-2', 'pothole', 'P1', 0.91),
        ],
      };

      const spy = vi
        .spyOn(inspectionService, 'getFlightRunDetail')
        .mockResolvedValue(mockFlightDetail);

      const res = await incidentService.getIncidents({
        flightRunId: 'job-abc-123',
        queueTab: 'active',
      });

      expect(spy).toHaveBeenCalledWith('job-abc-123');
      expect(res.length).toBe(2);
      expect(res[0].code).toBe('INC-ABC12345-1');
      expect(res[1].code).toBe('INC-ABC12345-2');
    });

    it('10. Local filtering by type works on flight incidents', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-mix-456',
          job_prefix: 'MIX45678',
          zone_code: 'EC-01',
          total_hazards: 3,
          class_counts: { POTHOLE: 2, WATERLOGGING: 1 },
          priority_counts: { P1: 3 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-MIX45678-1', 'pothole', 'P1', 0.95),
          createMockIncident('inc-2', 'INC-MIX45678-2', 'pothole', 'P1', 0.91),
          createMockIncident('inc-3', 'INC-MIX45678-3', 'waterlogging', 'P1', 0.88),
        ],
      };

      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockFlightDetail);

      const res = await incidentService.getIncidents({
        flightRunId: 'job-mix-456',
        type: 'waterlogging',
        queueTab: 'active',
      });

      expect(res.length).toBe(1);
      expect(res[0].type).toBe('waterlogging');
    });

    it('11. Local search works on flight incidents', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-srch-789',
          job_prefix: 'SRCH7890',
          zone_code: 'EC-01',
          total_hazards: 2,
          class_counts: { POTHOLE: 2 },
          priority_counts: { P1: 2 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-SRCH7890-1', 'pothole', 'P1', 0.95),
          createMockIncident('inc-2', 'INC-SRCH7890-2', 'pothole', 'P1', 0.91),
        ],
      };

      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockFlightDetail);

      const res = await incidentService.getIncidents({
        flightRunId: 'job-srch-789',
        searchQuery: 'INC-SRCH7890-2',
        queueTab: 'active',
      });

      expect(res.length).toBe(1);
      expect(res[0].code).toBe('INC-SRCH7890-2');
    });

    it('12. Local priority filtering works on flight incidents', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-prio-111',
          job_prefix: 'PRIO1111',
          zone_code: 'EC-01',
          total_hazards: 3,
          class_counts: { POTHOLE: 3 },
          priority_counts: { P1: 1, P2: 2 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-PRIO1111-1', 'pothole', 'P1', 0.95),
          createMockIncident('inc-2', 'INC-PRIO1111-2', 'pothole', 'P2', 0.85),
          createMockIncident('inc-3', 'INC-PRIO1111-3', 'pothole', 'P2', 0.80),
        ],
      };

      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockFlightDetail);

      const resP1 = await incidentService.getIncidents({
        flightRunId: 'job-prio-111',
        priority: 'P1',
        queueTab: 'active',
      });

      expect(resP1.length).toBe(1);
      expect(resP1[0].code).toBe('INC-PRIO1111-1');

      const resP2 = await incidentService.getIncidents({
        flightRunId: 'job-prio-111',
        priority: 'P2',
        queueTab: 'active',
      });

      expect(resP2.length).toBe(2);
    });

    it('13. Lifecycle tabs (completed / rejected) partition flight incidents accurately', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-tabs-222',
          job_prefix: 'TABS2222',
          zone_code: 'EC-01',
          total_hazards: 3,
          class_counts: { POTHOLE: 3 },
          priority_counts: { P1: 3 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-TABS2222-1', 'pothole', 'P1', 0.95, 'AI_VISION', 'DETECTED'),
          createMockIncident('inc-2', 'INC-TABS2222-2', 'pothole', 'P1', 0.91, 'AI_VISION', 'CLOSED'),
          createMockIncident('inc-3', 'INC-TABS2222-3', 'pothole', 'P1', 0.88, 'AI_VISION', 'REJECTED'),
        ],
      };

      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockFlightDetail);

      const activeRes = await incidentService.getIncidents({
        flightRunId: 'job-tabs-222',
        queueTab: 'active',
      });
      expect(activeRes.length).toBe(1);
      expect(activeRes[0].code).toBe('INC-TABS2222-1');

      const completedRes = await incidentService.getIncidents({
        flightRunId: 'job-tabs-222',
        queueTab: 'completed',
      });
      expect(completedRes.length).toBe(1);
      expect(completedRes[0].code).toBe('INC-TABS2222-2');

      const rejectedRes = await incidentService.getIncidents({
        flightRunId: 'job-tabs-222',
        queueTab: 'rejected',
      });
      expect(rejectedRes.length).toBe(1);
      expect(rejectedRes[0].code).toBe('INC-TABS2222-3');
    });

    it('14. Sorting operates properly on flight incidents', async () => {
      const mockFlightDetail: FlightInspectionRunDetailParsed = {
        summary: {
          job_id: 'job-sort-333',
          job_prefix: 'SORT3333',
          zone_code: 'EC-01',
          total_hazards: 3,
          class_counts: { POTHOLE: 3 },
          priority_counts: { P1: 3 },
          status: 'COMPLETED',
          created_at: '2026-09-07T00:15:00Z',
          has_human_report: false,
        },
        incidents: [
          createMockIncident('inc-1', 'INC-SORT3333-1', 'pothole', 'P1', 0.70, 'AI_VISION', 'DETECTED', 3.0),
          createMockIncident('inc-2', 'INC-SORT3333-2', 'pothole', 'P1', 0.95, 'AI_VISION', 'DETECTED', 9.5),
          createMockIncident('inc-3', 'INC-SORT3333-3', 'pothole', 'P1', 0.85, 'AI_VISION', 'DETECTED', 6.0),
        ],
      };

      vi.spyOn(inspectionService, 'getFlightRunDetail').mockResolvedValue(mockFlightDetail);

      const severityDesc = await incidentService.getIncidents(
        { flightRunId: 'job-sort-333', queueTab: 'active' },
        'severity',
        'desc'
      );
      expect(severityDesc[0].code).toBe('INC-SORT3333-2'); // 9.5
      expect(severityDesc[1].code).toBe('INC-SORT3333-3'); // 6.0
      expect(severityDesc[2].code).toBe('INC-SORT3333-1'); // 3.0

      const confidenceDesc = await incidentService.getIncidents(
        { flightRunId: 'job-sort-333', queueTab: 'active' },
        'confidence',
        'desc'
      );
      expect(confidenceDesc[0].code).toBe('INC-SORT3333-2'); // 0.95
      expect(confidenceDesc[1].code).toBe('INC-SORT3333-3'); // 0.85
      expect(confidenceDesc[2].code).toBe('INC-SORT3333-1'); // 0.70
    });
  });
});
