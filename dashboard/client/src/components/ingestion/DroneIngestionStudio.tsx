import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { incidentService } from '@/services/incidentService';
import { processingService } from '@/services/processingService';
import { inspectionService } from '@/services/inspectionService';
import { DroneTelemetry, ProcessJobStatusResponse } from '@/types/ingestion';
import { ZoneId } from '@/types/incident';
import { FlightInspectionRunDetailParsed } from '@/types/inspection';
import { getMediaBaseUrl } from '@/services/api';
import { ManualAnomalyModal } from '@/components/ingestion/ManualAnomalyModal';
import { verificationService } from '@/services/verificationService';
import { VerificationStatus } from '@/types/verification';
import {
  FlightInspectionCard,
  FlightInspectionResultsList,
  FlightRunHistoryDrawer,
} from '@/components/inspections';
import {
  AlertTriangle,
  Camera,
  Cpu,
  Download,
  FileCode,
  FileVideo,
  RefreshCw,
  UploadCloud,
  Video,
  XCircle,
} from 'lucide-react';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface DroneIngestionStudioProps {
  onIncidentPublished: (incidentId: string) => void;
}

export const DroneIngestionStudio: React.FC<DroneIngestionStudioProps> = ({
  onIncidentPublished,
}) => {
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');

  // Real ML Upload File States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isRealProcessing, setIsRealProcessing] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [realJobStatus, setRealJobStatus] = useState<ProcessJobStatusResponse | null>(null);
  const [realJobError, setRealJobError] = useState<string | null>(null);

  // Flight Inspection States
  const [flightInspection, setFlightInspection] = useState<FlightInspectionRunDetailParsed | null>(null);
  const [isFlightInspectionLoading, setIsFlightInspectionLoading] = useState<boolean>(false);
  const [flightInspectionError, setFlightInspectionError] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);

  // No-Incident Human Verification State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  // SRT Automatic Zone Detection State
  const [zoneDetection, setZoneDetection] = useState<{
    status: 'IDLE' | 'AUTO_DETECTED' | 'MULTI_ZONE' | 'NO_MATCH' | 'NO_GPS';
    message?: string;
    detectedZoneCode?: string | null;
    confidence?: number;
    breakdown?: { zone_id: string; code: string; name: string; count: number; percentage: number }[];
    isManualOverride: boolean;
  }>({
    status: 'IDLE',
    isManualOverride: false,
  });

  // Telemetry Configuration State
  const [telemetry, setTelemetry] = useState<DroneTelemetry>({
    droneId: 'DRONE-SWARM-01',
    cameraModel: '4K Aerial Sensor',
    altitudeMeters: 45,
    speedMps: 10,
    coordinates: { lat: 12.8452, lng: 77.6632 },
    zoneId: 'EC-01',
    locationDescription: 'Electronics City Phase 1 - Hosur Road Corridor',
    timestamp: new Date().toISOString(),
  });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  // Clean up polling interval
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current as any);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Load authoritative Flight Inspection detail from backend aggregation API
  const loadFlightInspection = async (jobId: string) => {
    try {
      setIsFlightInspectionLoading(true);
      setFlightInspectionError(null);
      const detail = await inspectionService.getFlightRunDetail(jobId);
      setFlightInspection(detail);
      if (detail.verification?.status) {
        setVerificationStatus(detail.verification.status);
      } else if (detail.summary.total_hazards === 0) {
        setVerificationStatus((detail.summary.status as VerificationStatus) || 'PENDING_REVIEW');
      }
    } catch (err: any) {
      console.error('Failed to load flight inspection details:', err);
      setFlightInspectionError(err.message || 'Failed to load flight inspection summary from server.');
    } finally {
      setIsFlightInspectionLoading(false);
    }
  };

  // Handle Video file upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['mp4', 'mov', 'avi'].includes(ext || '')) {
        toast.error(`Unsupported video format '.${ext}'. Allowed formats: .mp4, .mov, .avi`);
        return;
      }
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      setMediaType('video');
      setRealJobStatus(null);
      setRealJobError(null);
      setActiveJobId(null);
      setFlightInspection(null);
      setFlightInspectionError(null);
      setIsFlightInspectionLoading(false);
      toast.success(`Loaded video: ${file.name}`);
    }
  };

  // Handle SRT telemetry file upload with Auto-Zone Detection
  const handleSrtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'srt') {
        toast.error(`Unsupported telemetry format '.${ext}'. Allowed format: .srt`);
        return;
      }
      setSrtFile(file);
      toast.success(`Loaded telemetry: ${file.name}`);

      // Auto-detect zone from SRT telemetry
      try {
        const res = await processingService.detectZoneFromSrt(file);
        setZoneDetection({
          status: res.status,
          message: res.message,
          detectedZoneCode: res.detected_zone_code,
          confidence: res.confidence,
          breakdown: res.breakdown,
          isManualOverride: false,
        });

        if (res.detected_zone_code && ['EC-01', 'EC-02', 'EC-03', 'EC-04'].includes(res.detected_zone_code)) {
          setTelemetry((prev) => ({ ...prev, zoneId: res.detected_zone_code as ZoneId, customZoneName: undefined }));
          if (res.status === 'AUTO_DETECTED') {
            toast.success(`Zone ${res.detected_zone_code} auto-detected from SRT!`);
          } else if (res.status === 'MULTI_ZONE') {
            toast.info(`Multi-zone flight: Dominant zone ${res.detected_zone_code} auto-selected.`);
          }
        } else if (res.status === 'NO_MATCH') {
          setTelemetry((prev) => ({ ...prev, zoneId: 'OTHER' }));
          toast.warning('Flight path outside predefined zones (EC-01 to EC-04). "Other" zone selected. Please enter custom zone name.');
        }
      } catch (err: any) {
        console.warn('Zone detection error:', err);
      }
    }
  };

  // Trigger file dialogs
  const handleBrowseVideo = () => videoInputRef.current?.click();
  const handleBrowseSrt = () => srtInputRef.current?.click();

  // Run REAL ML Pipeline via FastAPI Backend
  const handleRunRealProcessing = async () => {
    if (!videoFile) {
      toast.error('Real ML processing requires a video file (.mp4, .mov, .avi).');
      return;
    }

    if (telemetry.zoneId === 'OTHER') {
      const trimmedCustom = telemetry.customZoneName?.trim();
      if (!trimmedCustom) {
        toast.error('Please enter a custom zone name when "Other" is selected.');
        return;
      }
      if (trimmedCustom.length > 128) {
        toast.error('Custom zone name cannot exceed 128 characters.');
        return;
      }
    }

    try {
      stopPolling();
      setIsRealProcessing(true);
      setRealJobError(null);
      setRealJobStatus(null);
      setFlightInspection(null);
      setFlightInspectionError(null);
      setIsFlightInspectionLoading(false);

      toast.info('Uploading drone footage and queuing ML processing job...');

      const initialRes = await processingService.submitProcessingJob(
        videoFile,
        srtFile,
        telemetry.zoneId,
        telemetry.droneId,
        telemetry.zoneId === 'OTHER' ? telemetry.customZoneName?.trim() : undefined
      );

      setActiveJobId(initialRes.job_id);
      setRealJobStatus({
        job_id: initialRes.job_id,
        status: 'QUEUED',
        progress_pct: 0,
        current_stage: 'Job queued for GPU execution',
        hazards_detected: 0,
        evidence_count: 0,
        created_at: initialRes.created_at,
        started_at: null,
        completed_at: null,
        error: null,
        results: null,
      });

      toast.success(`Job ${initialRes.job_id.slice(0, 8)} queued! Tracking live processing status...`);

      // Start 1000ms Polling Loop
      pollTimerRef.current = setInterval(async () => {
        try {
          const statusRes = await processingService.getJobStatus(initialRes.job_id);
          setRealJobStatus(statusRes);

          if (statusRes.status === 'COMPLETED') {
            stopPolling();
            setIsRealProcessing(false);

            // Update main visual display screen to show the backend annotated output MP4 video
            if (statusRes.results?.output_video_url) {
              const rawUrl = statusRes.results.output_video_url;
              const fullVideoUrl = rawUrl.startsWith('http')
                ? rawUrl
                : `${getMediaBaseUrl()}${rawUrl}`;

              setMediaType('video');
              setMediaPreviewUrl(fullVideoUrl);
            }

            const incidentsCreated = statusRes.results?.summary?.incidents_created ?? 0;
            if (incidentsCreated === 0) {
              const vStatus = (statusRes.results as any)?.verification_status as VerificationStatus || 'PENDING_REVIEW';
              setVerificationStatus(vStatus);
              toast.info('No anomalies detected by AI. Human verification required.', {
                description: 'Review the video footage and confirm clear or report undetected hazards.',
              });
            } else {
              toast.success(`Real ML Pipeline & Ingestion Complete!`, {
                description: `Detected hazards automatically ingested into PostgreSQL/PostGIS (${incidentsCreated} incidents created).`,
              });

              // Trigger live Incident Queue refresh
              incidentService.notifySubscribers();
            }

            // Fetch authoritative Flight Inspection detail from backend aggregation API
            await loadFlightInspection(initialRes.job_id);
          } else if (statusRes.status === 'FAILED') {
            stopPolling();
            setIsRealProcessing(false);
            const errDetail = statusRes.error || 'ML Processing job failed on backend.';
            setRealJobError(errDetail);
            toast.error(`Job Execution Failed: ${errDetail}`);
          }
        } catch (pollErr: any) {
          console.warn('Job polling error:', pollErr);
        }
      }, 1000);
    } catch (err: any) {
      setIsRealProcessing(false);
      const errMsg = err.message || 'Failed to submit processing job to backend.';
      setRealJobError(errMsg);
      toast.error(errMsg);
    }
  };

  // Human Verification Confirmation Handlers
  const handleConfirmNoAnomaly = async () => {
    const targetJobId = flightInspection?.summary.job_id || activeJobId;
    if (!targetJobId) return;
    try {
      setIsConfirmingClear(true);
      await verificationService.confirmClear(targetJobId, {
        notes: 'Flight reviewed and verified clear of civic hazards by command operator.',
      });
      setVerificationStatus('CONFIRMED_CLEAR');
      toast.success('Flight Verified Clear!', {
        description: 'Audit record persisted to database as True Negative.',
      });
      // Refresh flight inspection detail to reflect CONFIRMED_CLEAR state
      await loadFlightInspection(targetJobId);
    } catch (err: any) {
      console.error('Failed to confirm verification:', err);
      toast.error(err.message || 'Failed to confirm verification.');
    } finally {
      setIsConfirmingClear(false);
    }
  };

  const handleAnomalyCreated = async (incidentId: string) => {
    setVerificationStatus('ANOMALY_REPORTED');
    incidentService.notifySubscribers();
    const targetJobId = flightInspection?.summary.job_id || activeJobId;
    if (targetJobId) {
      await loadFlightInspection(targetJobId);
    }
    onIncidentPublished(incidentId);
  };

  // Historical Run Selection from Drawer
  const handleSelectHistoricalRun = async (jobId: string) => {
    setActiveJobId(jobId);
    setIsHistoryDrawerOpen(false);
    setRealJobError(null);
    await loadFlightInspection(jobId);
  };

  // Export GeoJSON / Report
  const handleExportJson = () => {
    if (!flightInspection && !realJobStatus?.results) return;
    const exportData = flightInspection
      ? flightInspection
      : realJobStatus?.results;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicPulse_AI_Processing_${activeJobId || flightInspection?.summary.job_id}.json`;
    a.click();
    toast.success('GeoJSON report downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="space-y-5 max-w-4xl">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              CivicPulse AI
            </h1>
            <p className="text-base sm:text-lg lg:text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              AI-powered aerial monitoring for civic hazard detection
            </p>
          </div>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            Upload drone video footage to detect and analyze waterlogging, potholes, open manholes, damaged footpaths, and drainage issues across urban corridors.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button
              type="button"
              onClick={handleBrowseVideo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base px-5 py-2.5 h-auto rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Upload & Analyze Video
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              data-testid="header-flight-history-btn"
              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-sm sm:text-base px-5 py-2.5 h-auto rounded-xl transition-colors cursor-pointer"
            >
              Flight History
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Uploader & Telemetry Controls */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-500" />
                <span>Upload Drone Clip & Flight Data</span>
              </h3>
              {videoFile && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Ready
                </span>
              )}
            </div>

            {/* Video File Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block">
                Primary Flight Video (.mp4 / .mov / .avi):
              </label>
              <input
                ref={videoInputRef}
                type="file"
                accept=".mp4,.mov,.avi,video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <div
                onClick={handleBrowseVideo}
                className={cn(
                  'p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center gap-3.5',
                  videoFile
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {videoFile ? videoFile.name : 'Click to select / drop drone video file'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {videoFile
                      ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Video loaded`
                      : 'Requires MP4, MOV, or AVI'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="shrink-0 text-xs h-8 border-zinc-300 dark:border-zinc-700"
                >
                  {videoFile ? 'Change' : 'Browse'}
                </Button>
              </div>
            </div>

            {/* SRT Telemetry File Dropzone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block">
                  DJI SRT Telemetry Subtitle (.srt):
                </label>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Auto-Detects Zone
                </span>
              </div>
              <input
                ref={srtInputRef}
                type="file"
                accept=".srt,text/plain"
                onChange={handleSrtUpload}
                className="hidden"
              />
              <div
                onClick={handleBrowseSrt}
                className={cn(
                  'p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center gap-3.5',
                  srtFile
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-400 dark:border-teal-700'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 hover:border-teal-500'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {srtFile ? srtFile.name : 'Optional: Load DJI SRT Telemetry File'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {srtFile
                      ? `${(srtFile.size / 1024).toFixed(1)} KB • Telemetry active`
                      : 'Extracts synchronized per-frame GPS & Altitude'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="shrink-0 text-xs h-8 border-zinc-300 dark:border-zinc-700"
                >
                  {srtFile ? 'Change' : 'Browse'}
                </Button>
              </div>
            </div>

            {/* Flight Metadata Configuration Form */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Operational Zone & Telemetry
              </h4>

              <div>
                <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Operational Surveillance Zone:
                </label>
                <Select
                  value={telemetry.zoneId}
                  onValueChange={(val: ZoneId) => {
                    setTelemetry({ ...telemetry, zoneId: val, customZoneName: val === 'OTHER' ? telemetry.customZoneName : undefined });
                    setZoneDetection((prev) => ({ ...prev, isManualOverride: true }));
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs xl:text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EC-01" className="text-xs xl:text-sm">EC-01: Phase 1 West / Hosur Arterial</SelectItem>
                    <SelectItem value="EC-02" className="text-xs xl:text-sm">EC-02: Phase 1 East Commercial Belt</SelectItem>
                    <SelectItem value="EC-03" className="text-xs xl:text-sm">EC-03: Phase 2 Tech Park Boulevard</SelectItem>
                    <SelectItem value="EC-04" className="text-xs xl:text-sm">EC-04: Main Junction Corridor & Flyover</SelectItem>
                    <SelectItem value="OTHER" className="text-xs xl:text-sm font-semibold text-emerald-600 dark:text-emerald-400">Other (Custom Zone)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {telemetry.zoneId === 'OTHER' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs xl:text-sm font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                    Custom Operational Zone Name <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    value={telemetry.customZoneName || ''}
                    onChange={(e) => setTelemetry({ ...telemetry, customZoneName: e.target.value.slice(0, 128) })}
                    placeholder="Enter custom zone name (e.g. Electronic City Phase 3 / Peripheral)"
                    maxLength={128}
                    required
                    className="h-10 rounded-xl text-xs xl:text-sm bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Required when Other is selected (max 128 characters).
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Road / Junction Description:
                </label>
                <Input
                  value={telemetry.locationDescription}
                  onChange={(e) => setTelemetry({ ...telemetry, locationDescription: e.target.value })}
                  placeholder="e.g. Hosur Road Flyover Underpass"
                  className="h-10 rounded-xl text-xs xl:text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Drone Swarm ID:
                  </label>
                  <Input
                    value={telemetry.droneId}
                    onChange={(e) => setTelemetry({ ...telemetry, droneId: e.target.value })}
                    className="h-10 rounded-xl text-xs xl:text-sm font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Flight Altitude (m):
                  </label>
                  <Input
                    type="number"
                    value={telemetry.altitudeMeters}
                    onChange={(e) => setTelemetry({ ...telemetry, altitudeMeters: Number(e.target.value) })}
                    className="h-10 rounded-xl text-xs xl:text-sm font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <Button
                onClick={handleRunRealProcessing}
                disabled={!videoFile || isRealProcessing}
                className={cn(
                  'w-full h-12 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer',
                  videoFile
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-emerald-500/25'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                )}
              >
                {isRealProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin text-white" />
                    <span>Analyzing Video...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5 mr-2 text-white" />
                    <span>ANALYZE VIDEO</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Feed Screen & Processing Results */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Visual Display Screen */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xl text-white flex flex-col">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-xs xl:text-sm font-bold text-zinc-200">
                  {realJobStatus?.status === 'COMPLETED' || flightInspection
                    ? 'PROCESSED ML OUTPUT (Annotated Track Video)'
                    : 'Raw Drone Sensor Feed Preview'}
                </span>
              </div>

              {realJobStatus?.status === 'COMPLETED' || flightInspection ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>PROCESSED ML OUTPUT</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 px-2.5 py-1 rounded-xl text-xs font-mono">
                  <span>RAW PREVIEW</span>
                </div>
              )}
            </div>

            {/* Screen Image / Video Preview */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {mediaPreviewUrl ? (
                mediaType === 'video' ? (
                  <video
                    key={mediaPreviewUrl}
                    src={mediaPreviewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={mediaPreviewUrl}
                    alt="Drone Feed"
                    className="w-full h-full object-contain select-none"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-300">No Drone Video Loaded</p>
                    <p className="text-xs text-zinc-500 max-w-xs">
                      Select or drop an aerial flight video (.mp4, .mov, .avi) to preview footage and run AI processing.
                    </p>
                  </div>
                </div>
              )}

              {/* In-Flight Telemetry Stamp Overlay */}
              <div className="absolute bottom-3 left-4 right-4 bg-black/75 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{telemetry.droneId}</span>
                  <span>•</span>
                  <span>ALT: {telemetry.altitudeMeters}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    GPS: {telemetry.coordinates.lat.toFixed(4)}°N, {telemetry.coordinates.lng.toFixed(4)}°E
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real ML Processing Status & Flight Inspection View */}
          {(realJobStatus || flightInspection || isFlightInspectionLoading || flightInspectionError) && (
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-lg space-y-4 animate-in fade-in">
              {realJobStatus && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          realJobStatus.status === 'QUEUED'
                            ? 'bg-amber-400 animate-pulse'
                            : realJobStatus.status === 'PROCESSING'
                            ? 'bg-emerald-400 animate-ping'
                            : realJobStatus.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                        )}
                      />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>
                            {realJobStatus.status === 'QUEUED'
                              ? 'Queued for GPU Execution'
                              : realJobStatus.status === 'PROCESSING'
                              ? 'Real AI Processing Pipeline Active'
                              : realJobStatus.status === 'COMPLETED'
                              ? 'Analysis & Database Ingestion Complete'
                              : 'Processing Failed'}
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            (Job: {realJobStatus.job_id.slice(0, 8)})
                          </span>
                        </div>
                        <p className="text-xs text-emerald-400 font-medium mt-0.5">
                          {realJobStatus.current_stage}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono text-zinc-400">Status</div>
                      <div
                        className={cn(
                          'text-xs font-bold px-2.5 py-0.5 rounded-full inline-block mt-0.5',
                          realJobStatus.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : realJobStatus.status === 'FAILED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        )}
                      >
                        {realJobStatus.status}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${realJobStatus.status === 'COMPLETED' ? 100 : Math.max(realJobStatus.progress_pct, 15)}%` }}
                      className={cn(
                        'h-full rounded-full transition-all duration-500 shadow-sm',
                        realJobStatus.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : realJobStatus.status === 'FAILED'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse'
                      )}
                    />
                  </div>
                </>
              )}

              {/* Real Job Summary & Flight Inspection Panel on Completion */}
              {(realJobStatus?.status === 'COMPLETED' || flightInspection || isFlightInspectionLoading || flightInspectionError) && (
                <div className="pt-3 border-t border-zinc-800 space-y-4">
                  {/* Loading State for Inspection Detail */}
                  {isFlightInspectionLoading && (
                    <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-3 animate-in fade-in">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                      <h4 className="text-sm font-bold text-white">Aggregating Flight Inspection Results...</h4>
                      <p className="text-xs text-zinc-400">Reconstructing flight inspection metrics and incident records from backend.</p>
                    </div>
                  )}

                  {/* Error State for Inspection Detail Retrieval */}
                  {flightInspectionError && !isFlightInspectionLoading && (
                    <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <span>Unable to Load Flight Inspection Details</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const targetId = flightInspection?.summary.job_id || activeJobId;
                            if (targetId) loadFlightInspection(targetId);
                          }}
                          className="text-xs h-8 px-3 border-amber-500/50 text-amber-300 hover:bg-amber-950/60 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          <span>Retry</span>
                        </Button>
                      </div>
                      <p className="text-xs text-zinc-300 font-mono bg-black/40 p-3 rounded-xl border border-amber-900/40">
                        {flightInspectionError}
                      </p>
                    </div>
                  )}

                  {/* Authoritative Flight Inspection Results */}
                  {flightInspection && !isFlightInspectionLoading && (
                    <div className="space-y-4 animate-in fade-in">
                      <FlightInspectionCard
                        summary={flightInspection.summary}
                        verification={flightInspection.verification}
                        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
                        onPlayVideo={(url) => {
                          setMediaType('video');
                          setMediaPreviewUrl(url);
                        }}
                        onConfirmClear={handleConfirmNoAnomaly}
                        onReportAnomaly={() => setIsManualModalOpen(true)}
                        isConfirmingClear={isConfirmingClear}
                      />

                      {flightInspection.incidents.length > 0 && (
                        <FlightInspectionResultsList
                          incidents={flightInspection.incidents}
                          onSelectIncident={(incident) => onIncidentPublished(incident.id)}
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportJson}
                      className="h-9 text-xs font-semibold rounded-xl border-zinc-700 text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span>Download Ingestion Summary</span>
                    </Button>
                    <span className="text-xs text-emerald-400 font-bold">
                      {(flightInspection?.summary.total_hazards ?? realJobStatus?.results?.summary?.incidents_created ?? 0) > 0
                        ? 'Incident Queue Refreshed Live ✓'
                        : 'Surveillance Mission Audited ✓'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real ML Processing Error Alert */}
          {realJobError && (
            <div className="p-5 rounded-3xl bg-red-950/40 border border-red-500/30 text-white shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <XCircle className="w-5 h-5" />
                <span>Backend ML Processing Error</span>
              </div>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-red-900/50">
                {realJobError}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Anomaly Reporting Modal */}
      <ManualAnomalyModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        jobId={flightInspection?.summary.job_id || activeJobId || ''}
        videoPlaybackTime={0}
        flightGpsPoint={null}
        zoneId={telemetry.zoneId}
        onAnomalyCreated={handleAnomalyCreated}
      />

      {/* Historical Flight Run History Drawer */}
      <FlightRunHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        activeJobId={flightInspection?.summary.job_id || activeJobId}
        onSelectRun={handleSelectHistoricalRun}
        zoneId={telemetry.zoneId}
      />
    </div>
  );
};
