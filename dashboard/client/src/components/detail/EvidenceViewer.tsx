import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Incident } from '@/types/incident';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Video,
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
  const totalFrames = 120;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback timer simulation for frame stepping
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev >= totalFrames ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
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
  };

  const activeImage = showOverlay && incident.evidenceOverlay ? incident.evidenceOverlay : incident.evidenceFrame;
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
            {viewMode === 'image' ? 'Drone Aerial Capture' : 'Sensor Video Stream'}
          </div>
        </div>

        {/* View Mode Switcher + AI Overlay Toggle */}
        <div className="flex items-center gap-4">
          {viewMode === 'image' && (
            <div className="flex items-center gap-2 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
              <Sparkles className={cn('w-3.5 h-3.5', showOverlay ? 'text-emerald-400' : 'text-zinc-400')} />
              <span className="text-[11px] font-semibold text-zinc-300 select-none">AI Overlay</span>
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
              Frame
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold transition-all',
                viewMode === 'video' ? 'bg-zinc-700 text-white shadow-2xs' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Video Stream
            </button>
          </div>
        </div>
      </div>

      {/* Screen Canvas Area */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden select-none">
        {viewMode === 'image' ? (
          <img
            src={activeImage}
            alt={incident.id}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {incident.evidenceClip ? (
              <video
                ref={videoRef}
                src={incident.evidenceClip}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay={isPlaying}
              />
            ) : (
              <img
                src={activeImage}
                alt={incident.id}
                className="w-full h-full object-contain filter contrast-125"
              />
            )}

            {/* Video overlay watermark simulation */}
            <div className="absolute top-3 left-3 bg-red-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE REPLAY
            </div>
          </div>
        )}

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

        <div className="text-[11px] font-mono text-zinc-400">
          {isWater ? '🌊 Water Extent: 78%' : '⚠️ Depth: ~18cm'}
        </div>
      </div>
    </div>
  );
};
