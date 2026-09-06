import { api } from '@/services/api';
import {
  VideoVerification,
  VideoVerificationListResponse,
  ConfirmClearPayload,
  ReportAnomalyPayload,
  ReportAnomalyResponse,
} from '@/types/verification';

export const verificationService = {
  /**
   * Fetch a single video verification record by UUID or Job ID
   */
  async getVerification(idOrJobId: string): Promise<VideoVerification> {
    return api.get<VideoVerification>(`/verifications/${idOrJobId}`);
  },

  /**
   * List video verifications with optional filtering
   */
  async listVerifications(params?: {
    status?: string;
    zone_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<VideoVerificationListResponse> {
    return api.get<VideoVerificationListResponse>('/verifications', params);
  },

  /**
   * Confirm that no anomalies exist in the flight footage (True Negative)
   */
  async confirmClear(
    idOrJobId: string,
    payload: ConfirmClearPayload = {}
  ): Promise<VideoVerification> {
    return api.post<VideoVerification>(`/verifications/${idOrJobId}/confirm-clear`, payload);
  },

  /**
   * Report an undetected anomaly from the flight footage (creates genuine Incident)
   */
  async reportAnomaly(
    idOrJobId: string,
    payload: ReportAnomalyPayload
  ): Promise<ReportAnomalyResponse> {
    return api.post<ReportAnomalyResponse>(`/verifications/${idOrJobId}/report-anomaly`, payload);
  },
};
