/**
 * Service for Flight Inspection Run aggregation APIs (TODO #4).
 * Interacts with FastAPI backend `/api/v1/process/runs`.
 */

import { api, getMediaBaseUrl } from './api';
import {
  FlightInspectionRunSummary,
  FlightInspectionRunListResponse,
  FlightInspectionRunDetail,
  FlightInspectionRunDetailParsed,
} from '@/types/inspection';
import { mapBackendIncidentToFrontend } from './incidentService';

export const inspectionService = {
  /**
   * List flight inspection runs with optional zone filtering and pagination
   */
  async listFlightRuns(params?: {
    zone_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<FlightInspectionRunListResponse> {
    const rawRes = await api.get<FlightInspectionRunListResponse>('/process/runs', params);
    const items = (rawRes.items || []).map((item) => {
      let videoUrl = item.annotated_video_url;
      if (videoUrl && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
        const cleanPath = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
        videoUrl = `${getMediaBaseUrl()}${cleanPath}`;
      }
      return {
        ...item,
        annotated_video_url: videoUrl,
      };
    });
    return {
      ...rawRes,
      items,
    };
  },

  /**
   * Get flight inspection run details by job ID or prefix
   */
  async getFlightRunDetail(jobId: string): Promise<FlightInspectionRunDetailParsed> {
    const rawDetail = await api.get<FlightInspectionRunDetail>(`/process/runs/${jobId}`);

    // Map each backend incident record to frontend Incident model
    const incidents = (rawDetail.incidents || []).map(mapBackendIncidentToFrontend);

    // Resolve full annotated_video_url with media origin if relative
    let videoUrl = rawDetail.summary.annotated_video_url;
    if (videoUrl && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      const cleanPath = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
      videoUrl = `${getMediaBaseUrl()}${cleanPath}`;
    }

    return {
      summary: {
        ...rawDetail.summary,
        annotated_video_url: videoUrl,
      },
      incidents,
      verification: rawDetail.verification || null,
    };
  },
};
