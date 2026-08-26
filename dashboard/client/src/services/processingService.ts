import { getBaseUrl, ApiError } from './api';
import { ProcessJobResponse, ProcessJobStatusResponse } from '@/types/ingestion';

export const processingService = {
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
