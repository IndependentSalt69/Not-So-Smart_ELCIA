import { describe, expect, it, vi } from 'vitest';
import { verificationService } from '../services/verificationService';
import { api } from '../services/api';
import { VideoVerification, ReportAnomalyResponse } from '../types/verification';

describe('Verification Service', () => {
  it('fetches a single video verification by id or job id', async () => {
    const mockRecord: VideoVerification = {
      id: 'v-123',
      job_id: 'job-abc',
      status: 'PENDING_REVIEW',
      video_path: '/media/flights/test.mp4',
      srt_path: '/media/flights/test.srt',
      flight_metadata: { duration_seconds: 120, total_frames: 3600 },
      zone_id: 'zone-1',
      zone_code: 'EC-01',
      drone_id: 'DRONE-ALPHA',
      created_at: '2026-09-07T10:00:00Z',
    };

    vi.spyOn(api, 'get').mockResolvedValueOnce(mockRecord);

    const result = await verificationService.getVerification('job-abc');
    expect(api.get).toHaveBeenCalledWith('/verifications/job-abc');
    expect(result.id).toBe('v-123');
    expect(result.status).toBe('PENDING_REVIEW');
    expect(result.zone_code).toBe('EC-01');
  });

  it('lists video verifications with filter parameters', async () => {
    const mockList = {
      items: [
        {
          id: 'v-1',
          job_id: 'job-1',
          status: 'CONFIRMED_CLEAR' as const,
          created_at: '2026-09-07T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    };

    vi.spyOn(api, 'get').mockResolvedValueOnce(mockList);

    const result = await verificationService.listVerifications({
      status: 'CONFIRMED_CLEAR',
      zone_id: 'zone-1',
    });

    expect(api.get).toHaveBeenCalledWith('/verifications', {
      status: 'CONFIRMED_CLEAR',
      zone_id: 'zone-1',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe('CONFIRMED_CLEAR');
  });

  it('confirms verification as clear (True Negative)', async () => {
    const mockResponse: VideoVerification = {
      id: 'v-123',
      job_id: 'job-abc',
      status: 'CONFIRMED_CLEAR',
      reviewed_by: 'MANUAL_OPERATOR',
      reviewed_at: '2026-09-07T10:30:00Z',
      notes: 'No civic hazards detected upon video review',
      created_at: '2026-09-07T10:00:00Z',
    };

    vi.spyOn(api, 'post').mockResolvedValueOnce(mockResponse);

    const result = await verificationService.confirmClear('job-abc', {
      notes: 'No civic hazards detected upon video review',
    });

    expect(api.post).toHaveBeenCalledWith('/verifications/job-abc/confirm-clear', {
      notes: 'No civic hazards detected upon video review',
    });
    expect(result.status).toBe('CONFIRMED_CLEAR');
    expect(result.reviewed_by).toBe('MANUAL_OPERATOR');
  });

  it('reports an anomaly and creates a genuine incident', async () => {
    const mockAnomalyResponse: ReportAnomalyResponse = {
      verification: {
        id: 'v-123',
        job_id: 'job-abc',
        status: 'ANOMALY_REPORTED',
        reviewed_by: 'OPERATOR_42',
        reviewed_at: '2026-09-07T10:35:00Z',
        created_incident_id: 'inc-999',
        created_at: '2026-09-07T10:00:00Z',
      },
      incident_id: 'inc-999',
      incident_number: 'INC-20260907-0099',
      hazard_type: 'POTHOLE',
      priority: 'P1',
      severity: 8.5,
      status: 'VERIFIED',
      message: 'Manual incident created successfully from undetected anomaly',
    };

    vi.spyOn(api, 'post').mockResolvedValueOnce(mockAnomalyResponse);

    const payload = {
      hazard_type: 'POTHOLE' as const,
      severity: 8.5,
      priority: 'P1' as const,
      description: 'Severe structural pothole missed in shadow area',
      latitude: 12.8399,
      longitude: 77.6775,
      location_address: 'Opposite Phase 1 Toll Gate',
      timestamp_seconds: 45.2,
      frame_number: 1356,
      reviewer_name: 'OPERATOR_42',
    };

    const result = await verificationService.reportAnomaly('job-abc', payload);

    expect(api.post).toHaveBeenCalledWith('/verifications/job-abc/report-anomaly', payload);
    expect(result.incident_id).toBe('inc-999');
    expect(result.verification.status).toBe('ANOMALY_REPORTED');
    expect(result.verification.created_incident_id).toBe('inc-999');
  });
});
