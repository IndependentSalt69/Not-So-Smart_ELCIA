import { getBaseUrl, ApiError } from './api';
import { ProcessJobResponse, ProcessJobStatusResponse, ZoneDetectionResponse } from '@/types/ingestion';

/**
 * Client-side mock/fallback GPS parser for SRT telemetry when offline or testing
 */
function parseSrtFallback(srtText: string): ZoneDetectionResponse {
  const points: { lat: number; lng: number }[] = [];
  const bracketRegex = /\[(?:latitude|lat):\s*([+-]?\d+(?:\.\d+)?)\s*\]\s*\[(?:longitude|long|lon):\s*([+-]?\d+(?:\.\d+)?)\s*\]/gi;
  let match: RegExpExecArray | null;
  while ((match = bracketRegex.exec(srtText)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ lat, lng });
    }
  }

  if (points.length === 0) {
    const gpsRegex = /GPS\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/gi;
    while ((match = gpsRegex.exec(srtText)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ lat, lng });
      }
    }
  }

  if (points.length === 0) {
    return {
      status: 'NO_GPS',
      detected_zone_id: null,
      detected_zone_code: null,
      detected_zone_name: null,
      confidence: 0.0,
      total_points: 0,
      matched_points: 0,
      breakdown: [],
      message: 'No valid GPS coordinates found in SRT file.',
    };
  }

  // Count points in mock zones
  const counts: Record<string, { code: string; name: string; count: number }> = {
    'EC-01': { code: 'EC-01', name: 'Phase 1 West / Hosur Arterial', count: 0 },
    'EC-02': { code: 'EC-02', name: 'Phase 1 East Commercial Belt', count: 0 },
    'EC-03': { code: 'EC-03', name: 'Phase 2 Tech Park Boulevard', count: 0 },
    'EC-04': { code: 'EC-04', name: 'Main Junction Corridor & Flyover', count: 0 },
  };

  let matched = 0;
  for (const pt of points) {
    if (pt.lng >= 77.658 && pt.lng <= 77.668 && pt.lat >= 12.840 && pt.lat <= 12.855) {
      counts['EC-01'].count++;
      matched++;
    } else if (pt.lng > 77.668 && pt.lng <= 77.678 && pt.lat >= 12.840 && pt.lat <= 12.855) {
      counts['EC-02'].count++;
      matched++;
    } else if (pt.lng >= 77.678 && pt.lng <= 77.690 && pt.lat >= 12.835 && pt.lat <= 12.850) {
      counts['EC-03'].count++;
      matched++;
    } else if (pt.lng >= 77.660 && pt.lng <= 77.675 && pt.lat >= 12.855 && pt.lat <= 12.868) {
      counts['EC-04'].count++;
      matched++;
    }
  }

  if (matched === 0) {
    return {
      status: 'NO_MATCH',
      detected_zone_id: null,
      detected_zone_code: null,
      detected_zone_name: null,
      confidence: 0.0,
      total_points: points.length,
      matched_points: 0,
      breakdown: [],
      message: `Processed ${points.length} GPS points. No matching surveillance zone found.`,
    };
  }

  const activeZones = Object.entries(counts)
    .filter(([_, z]) => z.count > 0)
    .map(([id, z]) => ({
      zone_id: id,
      code: z.code,
      name: z.name,
      count: z.count,
      percentage: Math.round((z.count / matched) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const top = activeZones[0];
  const confidence = Math.round((top.count / points.length) * 100) / 100;

  if (activeZones.length > 1) {
    return {
      status: 'MULTI_ZONE',
      detected_zone_id: top.zone_id,
      detected_zone_code: top.code,
      detected_zone_name: top.name,
      confidence,
      total_points: points.length,
      matched_points: matched,
      breakdown: activeZones,
      message: `Flight path spans ${activeZones.length} zones. Dominant zone is ${top.code} (${top.percentage}% of matched telemetry points).`,
    };
  }

  return {
    status: 'AUTO_DETECTED',
    detected_zone_id: top.zone_id,
    detected_zone_code: top.code,
    detected_zone_name: top.name,
    confidence,
    total_points: points.length,
    matched_points: matched,
    breakdown: activeZones,
    message: `Zone ${top.code} automatically detected from SRT telemetry (${matched}/${points.length} points match, ${Math.round(confidence * 100)}% confidence).`,
  };
}

export const processingService = {
  /**
   * Automatically detect surveillance zone from an uploaded DJI SRT file
   */
  async detectZoneFromSrt(srtFile: File): Promise<ZoneDetectionResponse> {
    try {
      const formData = new FormData();
      formData.append('srt', srtFile);

      const url = `${getBaseUrl()}/zones/detect`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Backend offline or error - fall back to client-side parsing
    }

    // Client-side fallback parsing
    try {
      const text = await srtFile.text();
      return parseSrtFallback(text);
    } catch {
      return {
        status: 'NO_GPS',
        detected_zone_id: null,
        detected_zone_code: null,
        detected_zone_name: null,
        confidence: 0.0,
        total_points: 0,
        matched_points: 0,
        breakdown: [],
        message: 'Could not read SRT file.',
      };
    }
  },

  /**
   * Submit a raw drone video and optional DJI SRT file to FastAPI real ML pipeline runner
   */
  async submitProcessingJob(
    videoFile: File,
    srtFile?: File | null,
    zoneId?: string,
    droneId?: string
  ): Promise<ProcessJobResponse> {
    const formData = new FormData();
    formData.append('video', videoFile);
    if (srtFile) {
      formData.append('srt', srtFile);
    }
    if (zoneId) {
      formData.append('zone_id', zoneId);
    }
    if (droneId) {
      formData.append('drone_id', droneId);
    }

    const url = `${getBaseUrl()}/process`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Note: Do not set Content-Type header so fetch automatically adds boundary
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        (typeof errorData === 'object' && errorData?.detail) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status, errorData);
    }

    return response.json();
  },

  /**
   * Poll ML processing job status by job UUID
   */
  async getJobStatus(jobId: string): Promise<ProcessJobStatusResponse> {
    const url = `${getBaseUrl()}/process/${jobId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        (typeof errorData === 'object' && errorData?.detail) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status, errorData);
    }

    return response.json();
  },
};

