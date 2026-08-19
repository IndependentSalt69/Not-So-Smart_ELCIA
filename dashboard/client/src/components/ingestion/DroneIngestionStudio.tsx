import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { inferenceService, SAMPLE_PRESETS } from '@/services/inferenceService';
import { DroneTelemetry, InferenceResult, SampleFootagePreset } from '@/types/ingestion';
import { ZoneId } from '@/types/incident';
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Compass,
  Download,
  Eye,
  FileVideo,
  Gauge,
  ImageIcon,
  Layers,
  MapPin,
  Play,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Waves,
  Zap,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';

interface DroneIngestionStudioProps {
  onIncidentPublished: (incidentId: string) => void;
}

export const DroneIngestionStudio: React.FC<DroneIngestionStudioProps> = ({
  onIncidentPublished,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SampleFootagePreset | null>(SAMPLE_PRESETS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>(SAMPLE_PRESETS[0].mediaUrl);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  // Telemetry Configuration State
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(SAMPLE_PRESETS[0].defaultTelemetry);

  // Inference execution states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Preset selection
  const handleSelectPreset = (preset: SampleFootagePreset) => {
    setSelectedPreset(preset);
    setMediaFile(null);
    setMediaPreviewUrl(preset.mediaUrl);
    setMediaType(preset.mediaType);
    setTelemetry(preset.defaultTelemetry);
    setInferenceResult(null);
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setSelectedPreset(null);
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      setInferenceResult(null);
      toast.success(`Loaded file: ${file.name}`);
    }
  };

  // Trigger file dialog
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Run AI Inference Pipeline
  const handleRunInference = async () => {
    try {
      setIsAnalyzing(true);
      setInferenceResult(null);
      setAnalysisProgress(0);

      const presetType = selectedPreset?.type || (mediaFile ? 'waterlogging' : 'waterlogging');

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
      toast.success('Drone Vision AI Analysis Complete!', {
        description: `Detection: ${result.type.toUpperCase()} • Priority: ${result.priority}`,
      });
    } catch (err: any) {
      toast.error(err.message || 'AI Inference failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Publish to Operations Queue
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
    if (!inferenceResult) return;
    const exportData = {
      incidentId: inferenceResult.id,
      timestamp: new Date().toISOString(),
      type: inferenceResult.type,
      confidence: inferenceResult.confidence,
      severity: inferenceResult.severity,
      priority: inferenceResult.priority,
      telemetry: inferenceResult.telemetry,
      severityFactors: inferenceResult.severityFactors,
      recommendedAction: inferenceResult.recommendedAction,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicPulse_AI_Inference_${inferenceResult.id}.json`;
    a.click();
    toast.success('Inference GeoJSON export downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 xl:p-10 shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>YOLOv8 + SAM Sensor Pipeline • Live Ingestion Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-white">
              Drone Vision AI Ingestion & Inference Studio
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
              Feed raw aerial drone camera feeds or video streams into our computer-vision pipeline. The model segments waterlogged road surfaces, detects pothole craters, scores 4-vector severity, and publishes actionable incidents directly into the civic response workflow.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-300">Model Pipeline</div>
              <div className="text-lg font-black text-white">YOLOv8 + SAM 2.1</div>
              <div className="text-[11px] text-emerald-300 font-medium">1080p Real-time 60FPS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Fast-Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Quick-Select Sample Drone Feeds (1-Click Demo)
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">Or upload custom media below</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SAMPLE_PRESETS.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative shadow-xs',
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base',
                    preset.type === 'waterlogging'
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600'
                      : preset.type === 'pothole'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600'
                  )}
                >
                  {preset.type === 'waterlogging' ? '🌊' : preset.type === 'pothole' ? '⚠️' : '🟢'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {preset.title}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Two-Column Grid: Left Ingestion + Config, Right Live Preview & AI Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Flight Telemetry Config */}
        <div className="lg:col-span-5 space-y-5">
          {/* Dropzone Container */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Upload Drone Footage</span>
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleBrowseClick}
                className="h-8 text-xs font-semibold rounded-xl border-zinc-300 dark:border-zinc-700"
              >
                Browse Files
              </Button>
            </div>

            {/* Visual Drag/Drop Surface */}
            <div
              onClick={handleBrowseClick}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/20 space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                {mediaType === 'video' ? <FileVideo className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              </div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {mediaFile ? mediaFile.name : 'Drag & drop drone aerial photo or video clip'}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Supports High-Res JPG, PNG, WEBP, MP4, MOV up to 100MB
              </p>
            </div>
          </div>

          {/* Flight Telemetry Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Flight Telemetry & Spatial Metadata</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Surveillance Zone:
                </label>
                <Select
                  value={telemetry.zoneId}
                  onValueChange={(val: ZoneId) => setTelemetry({ ...telemetry, zoneId: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EC-01">EC-01: Phase 1 West / Hosur Arterial</SelectItem>
                    <SelectItem value="EC-02">EC-02: Phase 1 East Commercial Belt</SelectItem>
                    <SelectItem value="EC-03">EC-03: Phase 2 Tech Park Boulevard</SelectItem>
                    <SelectItem value="EC-04">EC-04: Main Junction Corridor & Flyover</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Road / Junction Description:
                </label>
                <Input
                  value={telemetry.locationDescription}
                  onChange={(e) => setTelemetry({ ...telemetry, locationDescription: e.target.value })}
                  placeholder="e.g. Hosur Road Flyover Underpass"
                  className="h-9 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Drone Swarm ID:
                  </label>
                  <Input
                    value={telemetry.droneId}
                    onChange={(e) => setTelemetry({ ...telemetry, droneId: e.target.value })}
                    className="h-9 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Flight Altitude (m):
                  </label>
                  <Input
                    type="number"
                    value={telemetry.altitudeMeters}
                    onChange={(e) => setTelemetry({ ...telemetry, altitudeMeters: Number(e.target.value) })}
                    className="h-9 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Latitude:
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={telemetry.coordinates.lat}
                    onChange={(e) =>
                      setTelemetry({
                        ...telemetry,
                        coordinates: { ...telemetry.coordinates, lat: Number(e.target.value) },
                      })
                    }
                    className="h-9 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Longitude:
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={telemetry.coordinates.lng}
                    onChange={(e) =>
                      setTelemetry({
                        ...telemetry,
                        coordinates: { ...telemetry.coordinates, lng: Number(e.target.value) },
                      })
                    }
                    className="h-9 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            {/* Run AI Analysis CTA */}
            <Button
              onClick={handleRunInference}
              disabled={isAnalyzing}
              className="w-full h-11 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  <span>Processing Neural Vision Tensors...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300" />
                  <span>Run AI Drone Vision Analysis</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Live Feed Screen, Inference Visualizer & Results */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Visual Display Screen */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xl text-white flex flex-col">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-zinc-200">
                  {inferenceResult ? 'Inference Output & Mask Overlay' : 'Raw Drone Sensor Feed Preview'}
                </span>
              </div>

              {inferenceResult && (
                <div className="flex items-center gap-2 bg-zinc-800/90 px-3 py-1 rounded-xl border border-zinc-700/80">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-zinc-300">AI Overlay</span>
                  <Switch
                    checked={showOverlay}
                    onCheckedChange={setShowOverlay}
                    className="scale-75 data-[state=checked]:bg-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Screen Image Canvas */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              <img
                src={
                  inferenceResult && showOverlay
                    ? inferenceResult.overlayMediaUrl
                    : mediaPreviewUrl
                }
                alt="Drone Feed"
                className="w-full h-full object-contain select-none"
              />

              {/* In-Flight Telemetry Stamp Overlay */}
              <div className="absolute bottom-3 left-4 right-4 bg-black/75 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">{telemetry.droneId}</span>
                  <span>•</span>
                  <span>ALT: {telemetry.altitudeMeters}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    GPS: {telemetry.coordinates.lat.toFixed(4)}°N, {telemetry.coordinates.lng.toFixed(4)}°E
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">1080p 60FPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Inference Progress Visualizer Bar */}
          {isAnalyzing && (
            <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="font-bold text-blue-400">{currentStage}</span>
                </div>
                <span className="font-mono font-bold text-zinc-300">{analysisProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${analysisProgress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 shadow-sm shadow-blue-500/50"
                />
              </div>
            </div>
          )}

          {/* AI Inference Results Card */}
          {inferenceResult && (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md space-y-5 animate-in fade-in slide-in-from-bottom-3">
              {/* Header with Classification Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0',
                      inferenceResult.type === 'waterlogging'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
                        : inferenceResult.type === 'pothole'
                        ? 'bg-red-50 dark:bg-red-950 text-red-600'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                    )}
                  >
                    {inferenceResult.type === 'waterlogging'
                      ? '🌊'
                      : inferenceResult.type === 'pothole'
                      ? '⚠️'
                      : '✅'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                        {inferenceResult.type === 'waterlogging'
                          ? 'Waterlogging Hazard Detected'
                          : inferenceResult.type === 'pothole'
                          ? 'Structural Pothole Detected'
                          : 'Clear Road Surface Verified'}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Inference Time: {inferenceResult.analysisDurationMs}ms • Generated ID: {inferenceResult.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-zinc-400 font-bold">AI Confidence</div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white">
                      {Math.round(inferenceResult.confidence * 100)}%
                    </div>
                  </div>
                  <PriorityBadge priority={inferenceResult.priority} />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">Severity Score</span>
                  <span className="text-lg font-black text-zinc-900 dark:text-white">
                    {inferenceResult.severity.toFixed(1)} / 10
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">Inundation Area</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {inferenceResult.waterAreaSqm ? `${inferenceResult.waterAreaSqm} m²` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">Lane Obstruction</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400">
                    {inferenceResult.severityFactors.roadObstruction.toFixed(1)} / 10
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">Assigned Zone</span>
                  <span className="text-lg font-black font-mono text-zinc-900 dark:text-white">
                    {inferenceResult.telemetry.zoneId}
                  </span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200 block mb-1">
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
                  className="w-full sm:w-auto h-9 text-xs font-semibold rounded-xl border-zinc-300 dark:border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download GeoJSON Report</span>
                </Button>

                {inferenceResult.type !== 'clear' && (
                  <Button
                    onClick={handlePublishIncident}
                    disabled={isPublishing}
                    className="w-full sm:w-auto h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Publish Incident to Operations Queue</span>
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
