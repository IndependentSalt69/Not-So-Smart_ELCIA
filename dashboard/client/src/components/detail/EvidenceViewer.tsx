import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { isMockDataEnabled } from '@/services/api';
import { getEvidenceMediaUrl, getIncidentVideoUrlFromEvidencePath, incidentService } from '@/services/incidentService';
import { DetectionObservation, EvidenceAsset, Incident } from '@/types/incident';
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cpu,
  Droplets,
  FileCode2,
  Footprints,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Video,
  Waves,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface EvidenceViewerProps {
  incident: Incident;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ incident }) => {
  const [viewMode, setViewMode] = useState<'image' | 'video'>('image');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrame, setCurrentFrame] = useState<number>(42);
  const [evidenceList, setEvidenceList] = useState<EvidenceAsset[]>([]);
  const [detectionsList, setDetectionsList] = useState<DetectionObservation[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);
  const totalFrames = 120;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBackendMetadata() {
      setLoadingEvidence(true);
      try {
        const [assets, detections] = await Promise.all([
          incidentService.getIncidentEvidence(incident.id),
          incidentService.getIncidentDetections(incident.id),
        ]);
        if (isMounted) {
          setEvidenceList(assets);
          setDetectionsList(detections);
          if (detections.length > 0 && detections[0].frameNumber != null) {
            setCurrentFrame(detections[0].frameNumber);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch backend evidence/detections for incident:', incident.id, err);
      } finally {
        if (isMounted) {
          setLoadingEvidence(false);
        }
      }
    }
    loadBackendMetadata();
    return () => {
      isMounted = false;
    };
  }, [incident.id]);

  const primaryEvidence = evidenceList.find((e) => e.isPrimary) || evidenceList[0];

  // Reset image and video error states on incident or evidence asset switch
  useEffect(() => {
    setImageLoadError(false);
    setVideoLoadError(false);
  }, [incident.id, primaryEvidence?.id, primaryEvidence?.filePath]);

  // Playback timer simulation for frame stepping (when no real video is active)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && (!derivedVideoUrl || videoLoadError)) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev >= totalFrames ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTogglePlay = async () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        try {
          await video.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Video playback failed:', err);
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.min(totalFrames, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const mediaUrl =
    primaryEvidence?.mediaUrl ||
    (primaryEvidence?.filePath ? getEvidenceMediaUrl(primaryEvidence.filePath) : null);

  const derivedVideoUrl =
    primaryEvidence?.videoUrl ||
    (primaryEvidence?.filePath ? getIncidentVideoUrlFromEvidencePath(primaryEvidence.filePath) : null) ||
    (primaryEvidence?.mediaUrl ? getIncidentVideoUrlFromEvidencePath(primaryEvidence.mediaUrl) : null) ||
    (incident.evidenceClip || null);


  const fallbackImage =
    showOverlay && incident.evidenceOverlay
      ? incident.evidenceOverlay
      : incident.evidenceFrame;

  const isUsingFallback = !mediaUrl || imageLoadError;
  const activeImage = !isUsingFallback ? mediaUrl : fallbackImage;

  const isWater = incident.type === 'waterlogging';

  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 text-white overflow-hidden shadow-md flex flex-col">
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            {viewMode === 'image' ? <Camera className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </div>
          <div className="text-xs font-bold text-zinc-200">
            {viewMode === 'image' ? 'Photos & Evidence' : 'Inspection Video'}
          </div>
        </div>

        {/* View Mode Switcher + AI Overlay Toggle */}
        <div className="flex items-center gap-4">
          {viewMode === 'image' && (
            <div className="flex items-center gap-2 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
              <Sparkles className={cn('w-3.5 h-3.5', showOverlay ? 'text-emerald-400' : 'text-zinc-400')} />
              <span className="text-[11px] font-semibold text-zinc-300 select-none">Show Detected Issues</span>
              <Switch
                checked={showOverlay}
                onCheckedChange={setShowOverlay}
                className="scale-75 data-[state=checked]:bg-emerald-600"
              />
            </div>
          )}

          {/* Mode toggle (Photo vs Video) */}
          <div className="flex items-center bg-zinc-800 p-0.5 rounded-lg border border-zinc-700">
            <button
              onClick={() => setViewMode('image')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold transition-all',
                viewMode === 'image' ? 'bg-zinc-700 text-white shadow-2xs' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Photos
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold transition-all',
                viewMode === 'video' ? 'bg-zinc-700 text-white shadow-2xs' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Inspection Video
            </button>
          </div>
        </div>
      </div>

      {/* Backend Evidence & Detection Metadata Bar */}
      <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-300 gap-2 flex-wrap">
        {loadingEvidence ? (
          <div className="flex items-center gap-2 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Fetching backend evidence & detection observations...</span>
          </div>
        ) : (
          <>
            {primaryEvidence ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>[Evidence]</span>
                </div>
                <span>Type: <strong className="text-white">{primaryEvidence.evidenceType}</strong></span>
                <span>•</span>
                <span>Path: <strong className="text-sky-300">{primaryEvidence.filePath}</strong></span>
              </div>
            ) : (
              <div className="text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span>No backend evidence assets</span>
              </div>
            )}

            {detectionsList.length > 0 && (
              <div className="flex items-center gap-2 font-mono text-[11px] px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  <strong>AI Detection:</strong> {detectionsList[0].detectionType} ({Math.round(detectionsList[0].confidence * 100)}% Conf)
                  {detectionsList[0].frameNumber != null && ` • Frame #${detectionsList[0].frameNumber}`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Screen Canvas Area */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden select-none">
        {viewMode === 'image' ? (
          !isMockDataEnabled() && isUsingFallback ? (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2.5 max-w-sm">
              <Camera className="w-8 h-8 text-zinc-500 mx-auto" />
              <div className="text-xs xl:text-sm font-bold text-zinc-200">
                Evidence Snapshot Unavailable
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {imageLoadError
                  ? 'The evidence snapshot image could not be loaded from the static server.'
                  : 'No evidence snapshot is attached to this incident record.'}
              </p>
            </div>
          ) : (
            <img
              src={activeImage}
              alt={incident.code || incident.id}
              onError={() => {
                if (mediaUrl && !imageLoadError) {
                  console.warn(`Evidence media failed to load at '${mediaUrl}'.`);
                  setImageLoadError(true);
                }
              }}
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {derivedVideoUrl && !videoLoadError ? (
              <video
                ref={videoRef}
                src={derivedVideoUrl}
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setVideoLoadError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2.5 max-w-sm">
                <Video className="w-8 h-8 text-zinc-500 mx-auto" />
                <div className="text-xs xl:text-sm font-bold text-zinc-200">
                  Processed Flight Video Unavailable
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {videoLoadError
                    ? 'The annotated output video clip could not be loaded from the static server.'
                    : 'No job-scoped flight video is associated with this incident record.'}
                </p>
              </div>
            )}

            {derivedVideoUrl && !videoLoadError && (
              <div className="absolute top-3 left-3 bg-red-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                ANNOTATED TRACK VIDEO
              </div>
            )}
          </div>
        )}


        {/* Media source indicator badge */}
        {!isUsingFallback && mediaUrl ? (
          <div className="absolute top-3 right-3 bg-emerald-950/85 text-emerald-300 border border-emerald-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>REAL EVIDENCE CAPTURE</span>
          </div>
        ) : isUsingFallback && isMockDataEnabled() ? (
          <div className="absolute top-3 right-3 bg-amber-950/85 text-amber-300 border border-amber-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>PREVIEW FALLBACK</span>
          </div>
        ) : null}

        {/* HUD Stamp Over Canvas */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs font-mono text-zinc-300 bg-black/80 px-3.5 py-2 rounded-xl backdrop-blur-md border border-zinc-800">
          <div className="flex items-center gap-3 font-semibold">
            <span>SENSOR: DRONE-ALPHA-CAM4</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400">
              GPS: {incident.coordinates.lat.toFixed(4)}°N, {incident.coordinates.lng.toFixed(4)}°E
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300 font-semibold">
            <span>FRAME: #{currentFrame} / {totalFrames}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-bold">1080p 60FPS</span>
          </div>
        </div>
      </div>

      {/* Bottom Frame Stepper & Playback Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-t border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePlay}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStepBack}
            className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Step Back -1 Frame"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStepForward}
            className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Step Forward +1 Frame"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Frame scrub bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xs mx-4">
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${(currentFrame / totalFrames) * 100}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all"
            />
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-300">
          {incident.type === 'waterlogging' ? (
            <span className="flex items-center gap-1.5 text-teal-400">
              <Droplets className="w-3.5 h-3.5" />
              <span>Water Extent: 78%</span>
            </span>
          ) : incident.type === 'drainage_overflow' ? (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Waves className="w-3.5 h-3.5" />
              <span>Overflow Rate: High</span>
            </span>
          ) : incident.type === 'damaged_footpath' ? (
            <span className="flex items-center gap-1.5 text-orange-400">
              <Footprints className="w-3.5 h-3.5" />
              <span>Pedestrian Impact: Mod</span>
            </span>
          ) : incident.type === 'open_manhole' ? (
            <span className="flex items-center gap-1.5 text-purple-400">
              <CircleDot className="w-3.5 h-3.5" />
              <span>Chamber Exposure: Severe</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Depth: ~18cm</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
