import { describe, expect, it, vi } from 'vitest';
import { analyticsService } from '../services/analyticsService';
import { api } from '../services/api';

describe('Analytics Service', () => {
  it('maps analytics summary and typeDistribution correctly', async () => {
    // Mock API responses
    vi.spyOn(api, 'get').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/analytics/summary') {
        return {
          kpis: {
            total_active_incidents: 10,
            critical_p1_count: 3,
            high_p2_count: 4,
            routine_p3_count: 3,
            waterlogged_area_sqm: 150,
            pothole_clusters_count: 5,
            pending_verification_count: 2,
            mean_time_to_resolution_hours: 1.5,
          },
          status_distribution: [
            { status: 'DETECTED', count: 2 },
            { status: 'VERIFIED', count: 3 },
            { status: 'ASSIGNED', count: 2 },
            { status: 'IN_PROGRESS', count: 1 },
            { status: 'RE_INSPECTION', count: 1 },
            { status: 'CLOSED', count: 1 },
          ],
          priority_distribution: [
            { priority: 'P1', count: 3 },
            { priority: 'P2', count: 4 },
            { priority: 'P3', count: 3 },
          ],
        };
      }
      if (endpoint === '/analytics/trends') {
        return [
          {
            date: '2026-08-20',
            waterlogging: 12,
            potholes: 8,
            drainage_overflow: 4,
            damaged_footpath: 2,
            rainfall_mm: 25,
          },
          {
            date: '2026-08-21',
            waterlogging: 10,
            potholes: 5,
            drainage_overflow: 3,
            damaged_footpath: 3,
            rainfall_mm: 15,
          },
        ];
      }
      if (endpoint === '/analytics/zones') {
        return [
          {
            zone_id: 'EC-01',
            zone_code: 'EC-01',
            zone_name: 'Phase 1 West',
            active_incidents: 5,
            waterlogged_area_sqm: 80,
            p1_count: 2,
            p2_count: 2,
            p3_count: 1,
          },
        ];
      }
      return [];
    });

    const summary = await analyticsService.getAnalyticsSummary();

    expect(summary.kpis.totalActiveIncidents).toBe(10);
    expect(summary.statusDistribution.find((s) => s.status === 'New')?.count).toBe(2);
    expect(summary.statusDistribution.find((s) => s.status === 'Work in Progress')?.count).toBe(1);

    // Verify typeDistribution mapping for 4 canonical hazard types
    expect(summary.typeDistribution).toHaveLength(4);
    const waterlogging = summary.typeDistribution.find((t) => t.type === 'waterlogging');
    expect(waterlogging?.count).toBe(22); // 12 + 10

    const potholes = summary.typeDistribution.find((t) => t.type === 'pothole');
    expect(potholes?.count).toBe(13); // 8 + 5

    const drainage = summary.typeDistribution.find((t) => t.type === 'drainage_overflow');
    expect(drainage?.count).toBe(7); // 4 + 3

    const footpath = summary.typeDistribution.find((t) => t.type === 'damaged_footpath');
    expect(footpath?.count).toBe(5); // 2 + 3

    vi.restoreAllMocks();
  });
});
