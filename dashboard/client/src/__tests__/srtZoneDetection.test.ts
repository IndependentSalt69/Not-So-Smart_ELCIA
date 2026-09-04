import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processingService } from '../services/processingService';

describe('SRT Automatic Surveillance Zone Detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly auto-detects EC-01 from SRT telemetry with valid coordinates', async () => {
    const srtContent = `1
00:00:01,000 --> 00:00:02,000
[latitude: 12.8450] [longitude: 77.6630] [altitude: 45.2]

2
00:00:02,000 --> 00:00:03,000
[latitude: 12.8460] [longitude: 77.6640] [altitude: 45.5]

3
00:00:03,000 --> 00:00:04,000
[latitude: 12.8470] [longitude: 77.6650] [altitude: 45.8]`;

    const srtFile = new File([srtContent], 'flight_ec01.srt', { type: 'text/plain' });

    // Mock network failure so fallback client-side parser is tested deterministically
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const result = await processingService.detectZoneFromSrt(srtFile);

    expect(result.status).toBe('AUTO_DETECTED');
    expect(result.detected_zone_code).toBe('EC-01');
    expect(result.matched_points).toBe(3);
    expect(result.total_points).toBe(3);
    expect(result.confidence).toBe(1.0);
  });

  it('correctly detects dominant zone when flight spans MULTI_ZONE', async () => {
    const srtContent = `1
00:00:01,000 --> 00:00:02,000
[latitude: 12.8450] [longitude: 77.6630] [altitude: 45.2]

2
00:00:02,000 --> 00:00:03,000
[latitude: 12.8460] [longitude: 77.6640] [altitude: 45.5]

3
00:00:03,000 --> 00:00:04,000
[latitude: 12.8450] [longitude: 77.6720] [altitude: 46.0]`;

    const srtFile = new File([srtContent], 'flight_multi.srt', { type: 'text/plain' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const result = await processingService.detectZoneFromSrt(srtFile);

    expect(result.status).toBe('MULTI_ZONE');
    expect(result.detected_zone_code).toBe('EC-01');
    expect(result.matched_points).toBe(3);
    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown[0].code).toBe('EC-01');
    expect(result.breakdown[0].count).toBe(2);
    expect(result.breakdown[1].code).toBe('EC-02');
    expect(result.breakdown[1].count).toBe(1);
  });

  it('returns NO_MATCH when telemetry coordinates are outside all zones', async () => {
    const srtContent = `1
00:00:01,000 --> 00:00:02,000
[latitude: 13.0827] [longitude: 80.2707] [altitude: 50.0]`;

    const srtFile = new File([srtContent], 'flight_outside.srt', { type: 'text/plain' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const result = await processingService.detectZoneFromSrt(srtFile);

    expect(result.status).toBe('NO_MATCH');
    expect(result.detected_zone_code).toBeNull();
    expect(result.matched_points).toBe(0);
    expect(result.total_points).toBe(1);
  });

  it('returns NO_GPS when SRT contains no GPS coordinates', async () => {
    const srtContent = `1
00:00:01,000 --> 00:00:02,000
Camera ISO: 100 Shutter: 1/500 F-Stop: 2.8

2
00:00:02,000 --> 00:00:03,000
Camera ISO: 100 Shutter: 1/500 F-Stop: 2.8`;

    const srtFile = new File([srtContent], 'flight_nogps.srt', { type: 'text/plain' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const result = await processingService.detectZoneFromSrt(srtFile);

    expect(result.status).toBe('NO_GPS');
    expect(result.detected_zone_code).toBeNull();
    expect(result.total_points).toBe(0);
  });

  it('uses backend API response when available', async () => {
    const mockApiResponse = {
      status: 'AUTO_DETECTED',
      detected_zone_id: 'zone-12345',
      detected_zone_code: 'EC-03',
      detected_zone_name: 'Phase 2 Tech Park Boulevard',
      confidence: 0.95,
      total_points: 20,
      matched_points: 19,
      breakdown: [{ zone_id: 'zone-12345', code: 'EC-03', name: 'Phase 2 Tech Park Boulevard', count: 19, percentage: 95.0 }],
      message: 'Zone EC-03 automatically detected from SRT telemetry.',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const srtFile = new File(['mock content'], 'flight.srt', { type: 'text/plain' });
    const result = await processingService.detectZoneFromSrt(srtFile);

    expect(result.status).toBe('AUTO_DETECTED');
    expect(result.detected_zone_code).toBe('EC-03');
    expect(result.detected_zone_id).toBe('zone-12345');
    expect(result.confidence).toBe(0.95);
  });

  it('submits zone_id to processing endpoint when provided', async () => {
    let capturedFormData: FormData | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedFormData = init?.body as FormData;
      return {
        ok: true,
        json: async () => ({
          job_id: 'job-xyz-123',
          status: 'QUEUED',
          message: 'Job submitted',
          created_at: new Date().toISOString(),
        }),
      } as Response;
    });

    const videoFile = new File(['fake video'], 'drone_flight.mp4', { type: 'video/mp4' });
    const srtFile = new File(['fake srt'], 'flight.srt', { type: 'text/plain' });

    const res = await processingService.submitProcessingJob(videoFile, srtFile, 'EC-02', 'DRONE-01');

    expect(res.job_id).toBe('job-xyz-123');
    expect(capturedFormData).not.toBeNull();
    expect(capturedFormData!.get('zone_id')).toBe('EC-02');
    expect(capturedFormData!.get('drone_id')).toBe('DRONE-01');
  });
});
