import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { inferenceService, SAMPLE_PRESETS } from '@/services/inferenceService';
import { incidentService } from '@/services/incidentService';
import { processingService } from '@/services/processingService';
import { DroneTelemetry, InferenceResult, ProcessJobStatusResponse, SampleFootagePreset } from '@/types/ingestion';
import { ZoneId } from '@/types/incident';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  Cpu,
  Download,
  Droplets,
  FileCode,
  FileVideo,
  Footprints,
  ImageIcon,
  Play,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Waves,
  Zap,
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
  const [selectedPreset, setSelectedPreset] = useState<SampleFootagePreset | null>(SAMPLE_PRESETS[0]);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>(SAMPLE_PRESETS[0].mediaUrl);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  // Real ML Upload File States (Phase 11D)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isRealProcessing, setIsRealProcessing] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [realJobStatus, setRealJobStatus] = useState<ProcessJobStatusResponse | null>(null);
  const [realJobError, setRealJobError] = useState<string | null>(null);

  // Telemetry Configuration State
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(SAMPLE_PRESETS[0].defaultTelemetry);

  // Simulated inference execution states (for fallback demo presets)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

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

  // Handle Preset selection
  const handleSelectPreset = (preset: SampleFootagePreset) => {
    setSelectedPreset(preset);
    setVideoFile(null);
    setSrtFile(null);
    setMediaPreviewUrl(preset.mediaUrl);
    setMediaType(preset.mediaType);
    setTelemetry(preset.defaultTelemetry);
    setInferenceResult(null);
    setRealJobStatus(null);
    setRealJobError(null);
    setActiveJobId(null);
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
      setSelectedPreset(null);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      setMediaType('video');
      setInferenceResult(null);
      setRealJobStatus(null);
      setRealJobError(null);
      setActiveJobId(null);
      toast.success(`Loaded video: ${file.name}`);
    }
  };

  // Handle SRT telemetry file upload
  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'srt') {
        toast.error(`Unsupported telemetry format '.${ext}'. Allowed format: .srt`);
        return;
      }
      setSrtFile(file);
      toast.success(`Loaded telemetry: ${file.name}`);
    }
  };

  // Trigger file dialogs
  const handleBrowseVideo = () => videoInputRef.current?.click();
  const handleBrowseSrt = () => srtInputRef.current?.click();

  // Run REAL ML Pipeline via FastAPI Backend (Phase 11D)
  const handleRunRealProcessing = async () => {
    if (!videoFile) {
      toast.error('Real ML processing requires a video file (.mp4, .mov, .avi).');
      return;
    }

    try {
      stopPolling();
      setIsRealProcessing(true);
      setRealJobError(null);
      setRealJobStatus(null);
      setInferenceResult(null);

      toast.info('Uploading drone footage and queuing ML processing job...');

      const initialRes = await processingService.submitProcessingJob(
        videoFile,
        srtFile,
        telemetry.zoneId,
        telemetry.droneId
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

      toast.success(`Job ${initialRes.job_id.slice(0, 8)} queued! Starting real-time status polling...`);

      // Start 1000ms Polling Loop
      pollTimerRef.current = setInterval(async () => {
        try {
          const statusRes = await processingService.getJobStatus(initialRes.job_id);
          setRealJobStatus(statusRes);

          if (statusRes.status === 'COMPLETED') {
            stopPolling();
            setIsRealProcessing(false);

            const incidentsCreated = statusRes.results?.summary?.incidents_created ?? 0;
            toast.success(`Real ML Pipeline & Ingestion Complete!`, {
              description: `Detected hazards automatically ingested into PostgreSQL/PostGIS (${incidentsCreated} incidents created).`,
            });

            // Trigger live Incident Queue refresh
            incidentService.notifySubscribers();

            if (statusRes.results?.incident_ids?.length) {
              onIncidentPublished(statusRes.results.incident_ids[0]);
            }
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

  // Run Simulated AI Inference (Fallback for Demo Presets)
  const handleRunDemoInference = async () => {
    try {
      setIsAnalyzing(true);
      setInferenceResult(null);
      setAnalysisProgress(0);

      const presetType = selectedPreset?.type || 'waterlogging';

      const result = await inferenceService.analyzeMedia({
        mediaUrl: mediaPreviewUrl,
        mediaType,
        telemetry,
        presetType,
        onProgress: (stage, progress) => {
          setCurrentStage(stage);
          setAnalysisProgress(progress);
        },
      });

      setInferenceResult(result);
      toast.success('Simulated Demo Vision AI Complete!', {
        description: `Detection: ${result.type.toUpperCase()} • Priority: ${result.priority}`,
      });
    } catch (err: any) {
      toast.error(err.message || 'Demo Inference failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Publish Demo Incident to Operations Queue
  const handlePublishIncident = async () => {
    if (!inferenceResult) return;
    try {
      setIsPublishing(true);
      const incident = await inferenceService.publishAsIncident(inferenceResult);
      toast.success(`Incident ${incident.id} Published to Live Operations Queue!`, {
        description: 'Operators can now triage, verify, and dispatch crews.',
      });
      onIncidentPublished(incident.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish incident');
    } finally {
      setIsPublishing(false);
    }
  };

  // Export GeoJSON / Report
  const handleExportJson = () => {
    if (!inferenceResult && !realJobStatus?.results) return;
    const exportData = realJobStatus?.results
      ? realJobStatus.results
      : inferenceResult;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicPulse_AI_Processing_${activeJobId || inferenceResult?.id}.json`;
    a.click();
    toast.success('GeoJSON report downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-zinc-900 to-emerald-950/70 text-white p-6 sm:p-8 xl:p-10 shadow-md border border-zinc-800/80">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs xl:text-sm font-semibold">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>YOLOv8 + MiDaS Pipeline • Real ML Ingestion Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-white">
              Drone Vision AI Ingestion & Inference Studio
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
              Feed raw aerial drone video clips and optional DJI SRT flight telemetry into our PyTorch backend ML pipeline. The engine processes frames with YOLOv8 & MiDaS depth estimation, normalizes hazard severity, and ingests detected incidents directly into PostgreSQL/PostGIS.
            </p>
          </div>

          <div className="flex items-center gap-3.5 shrink-0 bg-white/10 backdrop-blur-md p-4 xl:p-5 rounded-2xl border border-white/15">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">FastAPI Pipeline</div>
              <div className="text-lg xl:text-xl font-black text-white">YOLOv8 + MiDaS</div>
              <div className="text-xs text-emerald-300 font-bold">PostgreSQL / PostGIS Auto-Ingest</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Fast-Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs xl:text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Quick-Select Sample Drone Feeds (Demo Presets / Fallback)
          </h3>
          <span className="text-xs text-zinc-500 font-medium">Or upload custom drone video + SRT telemetry below for Real ML Processing</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3.5">
          {SAMPLE_PRESETS.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id && !videoFile;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative shadow-xs',
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base',
                    preset.type === 'waterlogging'
                      ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-600'
                      : preset.type === 'drainage_overflow'
                      ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600'
                      : preset.type === 'damaged_footpath'
                      ? 'bg-orange-100 dark:bg-orange-900/60 text-orange-600'
                      : preset.type === 'pothole'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600'
                  )}
                >
                  {preset.type === 'waterlogging' ? (
                    <Droplets className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  ) : preset.type === 'drainage_overflow' ? (
                    <Waves className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  ) : preset.type === 'damaged_footpath' ? (
                    <Footprints className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  ) : preset.type === 'pothole' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {preset.title}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 font-medium">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Flight Telemetry Config */}
        <div className="lg:col-span-5 space-y-5">
          {/* File Upload Box */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm xl:text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <UploadCloud className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                <span>Upload Custom Drone Footage & Telemetry</span>
              </h3>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,.mp4,.mov,.avi"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <input
              ref={srtInputRef}
              type="file"
              accept=".srt"
              onChange={handleSrtUpload}
              className="hidden"
            />

            {/* Video File Picker Surface */}
            <div
              onClick={handleBrowseVideo}
              className={cn(
                'border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all space-y-2 group',
                videoFile
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/20'
              )}
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                <FileVideo className="w-5 h-5" />
              </div>
              <div className="text-xs xl:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {videoFile ? videoFile.name : 'Select Drone Video File (.mp4, .mov, .avi)'}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {videoFile ? `Size: ${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Required for Real ML Pipeline Execution'}
              </p>
            </div>

            {/* Optional SRT Telemetry Picker Surface */}
            <div
              onClick={handleBrowseSrt}
              className={cn(
                'border border-dashed rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all',
                srtFile
                  ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-cyan-500 bg-zinc-50/30 dark:bg-zinc-800/10'
              )}
            >
              <div className="flex items-center gap-3">
                <FileCode className={cn('w-5 h-5', srtFile ? 'text-cyan-500' : 'text-zinc-400')} />
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {srtFile ? srtFile.name : 'No SRT uploaded — GPS telemetry unavailable'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseSrt();
                }}
                className="h-7 text-xs font-semibold rounded-lg border-zinc-300 dark:border-zinc-700"
              >
                {srtFile ? 'Change SRT' : 'Add SRT'}
              </Button>
            </div>
          </div>

          {/* Flight Telemetry Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm xl:text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              <span>Flight Telemetry & Spatial Metadata</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Surveillance Zone:
                </label>
                <Select
                  value={telemetry.zoneId}
                  onValueChange={(val: ZoneId) => setTelemetry({ ...telemetry, zoneId: val })}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs xl:text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EC-01" className="text-xs xl:text-sm">EC-01: Phase 1 West / Hosur Arterial</SelectItem>
                    <SelectItem value="EC-02" className="text-xs xl:text-sm">EC-02: Phase 1 East Commercial Belt</SelectItem>
                    <SelectItem value="EC-03" className="text-xs xl:text-sm">EC-03: Phase 2 Tech Park Boulevard</SelectItem>
                    <SelectItem value="EC-04" className="text-xs xl:text-sm">EC-04: Main Junction Corridor & Flyover</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

            {/* Action Buttons: REAL PROCESS vs DEMO SIMULATION */}
            <div className="space-y-2.5 pt-2">
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
                    <span>Real ML Pipeline Running (YOLOv8 + PostGIS)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-white" />
                    <span>START REAL ML PROCESSING (FastAPI Backend)</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleRunDemoInference}
                disabled={isAnalyzing || isRealProcessing}
                className="w-full h-10 rounded-xl text-xs font-semibold border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2 text-amber-500" />
                )}
                <span>Run Demo Preset Simulation (Offline Preview)</span>
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
                  {inferenceResult ? 'Inference Output & Mask Overlay' : 'Raw Drone Sensor Feed Preview'}
                </span>
              </div>

              {inferenceResult && (
                <div className="flex items-center gap-2 bg-zinc-800/90 px-3 py-1 rounded-xl border border-zinc-700/80">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-300">AI Overlay</span>
                  <Switch
                    checked={showOverlay}
                    onCheckedChange={setShowOverlay}
                    className="scale-75 data-[state=checked]:bg-emerald-600"
                  />
                </div>
              )}
            </div>

            {/* Screen Image / Video Preview */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              {mediaType === 'video' ? (
                <video
                  src={mediaPreviewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={
                    inferenceResult && showOverlay
                      ? inferenceResult.overlayMediaUrl
                      : mediaPreviewUrl
                  }
                  alt="Drone Feed"
                  className="w-full h-full object-contain select-none"
                />
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
                  <span>•</span>
                  <span className="text-teal-400 font-bold">1080p 60FPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* REAL ML Processing Live Progress Visualizer (Phase 11D) */}
          {realJobStatus && (
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-lg space-y-4 animate-in fade-in">
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

              {/* Real Job Summary Panel on Completion */}
              {realJobStatus.status === 'COMPLETED' && realJobStatus.results && (
                <div className="pt-3 border-t border-zinc-800 space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs xl:text-sm text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="font-semibold">
                        PostgreSQL/PostGIS Ingestion Complete: {realJobStatus.results.summary.incidents_created} Incidents, {realJobStatus.results.summary.detections_created} Detections, {realJobStatus.results.summary.evidence_created} Evidence records created.
                      </span>
                    </div>
                  </div>

                  {/* Hazard Class Counts Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-center">
                      <span className="text-xs text-teal-400 font-bold block">Waterlogging</span>
                      <span className="text-lg font-black font-mono text-white">
                        {realJobStatus.results.summary.class_counts?.waterlogging ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-center">
                      <span className="text-xs text-amber-400 font-bold block">Potholes</span>
                      <span className="text-lg font-black font-mono text-white">
                        {realJobStatus.results.summary.class_counts?.pothole ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-center">
                      <span className="text-xs text-cyan-400 font-bold block">Drainage Overflow</span>
                      <span className="text-lg font-black font-mono text-white">
                        {realJobStatus.results.summary.class_counts?.drainage_overflow ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-center">
                      <span className="text-xs text-orange-400 font-bold block">Footpath Damage</span>
                      <span className="text-lg font-black font-mono text-white">
                        {realJobStatus.results.summary.class_counts?.damaged_footpath ?? 0}
                      </span>
                    </div>
                  </div>

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
                      Incident Queue Refreshed Live ✓
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

          {/* Simulated AI Inference Progress Visualizer (Demo Presets) */}
          {isAnalyzing && (
            <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs xl:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-bold text-emerald-400">{currentStage}</span>
                </div>
                <span className="font-mono font-bold text-zinc-300">{analysisProgress}%</span>
              </div>

              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${analysisProgress}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/50"
                />
              </div>
            </div>
          )}

          {/* Simulated AI Inference Results Card (Demo Presets) */}
          {inferenceResult && (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md space-y-5 animate-in fade-in slide-in-from-bottom-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0',
                      inferenceResult.type === 'waterlogging'
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-600'
                        : inferenceResult.type === 'drainage_overflow'
                        ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600'
                        : inferenceResult.type === 'damaged_footpath'
                        ? 'bg-orange-50 dark:bg-orange-950 text-orange-600'
                        : inferenceResult.type === 'pothole'
                        ? 'bg-red-50 dark:bg-red-950 text-red-600'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                    )}
                  >
                    {inferenceResult.type === 'waterlogging' ? (
                      <Droplets className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    ) : inferenceResult.type === 'drainage_overflow' ? (
                      <Waves className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    ) : inferenceResult.type === 'damaged_footpath' ? (
                      <Footprints className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    ) : inferenceResult.type === 'pothole' ? (
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                        {inferenceResult.type === 'waterlogging'
                          ? 'Waterlogging Hazard Detected'
                          : inferenceResult.type === 'drainage_overflow'
                          ? 'Drainage Overflow Detected'
                          : inferenceResult.type === 'damaged_footpath'
                          ? 'Damaged Footpath Detected'
                          : inferenceResult.type === 'pothole'
                          ? 'Structural Pothole Detected'
                          : 'Clear Road Surface Verified'}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Simulated Inference Time: {inferenceResult.analysisDurationMs}ms • Demo Preset ID: {inferenceResult.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-mono text-zinc-400 font-bold">AI Confidence</div>
                    <div className="text-xl font-black font-mono text-zinc-900 dark:text-white">
                      {Math.round(inferenceResult.confidence * 100)}%
                    </div>
                  </div>
                  <PriorityBadge priority={inferenceResult.priority} />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">Severity Score</span>
                  <span className="text-xl font-black font-mono text-zinc-900 dark:text-white">
                    {inferenceResult.severity.toFixed(1)} / 10
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">Inundation Area</span>
                  <span className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">
                    {inferenceResult.waterAreaSqm ? `${inferenceResult.waterAreaSqm} m²` : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">Lane Obstruction</span>
                  <span className="text-xl font-black font-mono text-red-600 dark:text-red-400">
                    {inferenceResult.severityFactors.roadObstruction.toFixed(1)} / 10
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">Assigned Zone</span>
                  <span className="text-xl font-black font-mono text-zinc-900 dark:text-white">
                    {inferenceResult.telemetry.zoneId}
                  </span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs xl:text-sm">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1">
                  Recommended Mitigation Protocol:
                </span>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {inferenceResult.recommendedAction}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJson}
                  className="w-full sm:w-auto h-10 text-xs xl:text-sm font-semibold rounded-xl border-zinc-300 dark:border-zinc-700 cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Download GeoJSON Report</span>
                </Button>

                {inferenceResult.type !== 'clear' && (
                  <Button
                    onClick={handlePublishIncident}
                    disabled={isPublishing}
                    className="w-full sm:w-auto h-11 px-6 text-xs xl:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 cursor-pointer"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Publish Demo Incident to Operations Queue</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
