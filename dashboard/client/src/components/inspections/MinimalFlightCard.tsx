import React, { useState } from 'react';
import { FlightInspectionRunSummary } from '@/types/inspection';
import { cn } from '@/lib/utils';
import { Plane, Play, Clock, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';

interface MinimalFlightCardProps {
  summary: FlightInspectionRunSummary;
  onSelect: (jobId: string) => void;
  className?: string;
}

export const MinimalFlightCard: React.FC<MinimalFlightCardProps> = ({
  summary,
  onSelect,
  className,
}) => {
  const [videoError, setVideoError] = useState<boolean>(false);
  const isZeroHazard = summary.total_hazards === 0;

  // Format timestamp truthfully
  const formatTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return 'Recent flight';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recent flight';
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return 'Recent flight';
    }
  };

  const hasVideo = !!summary.annotated_video_url && !videoError;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(summary.job_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(summary.job_id);
        }
      }}
      data-testid="minimal-flight-card"
      data-job-id={summary.job_id}
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-200',
        'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80',
        'hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg dark:hover:shadow-zinc-950/50',
        'focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50',
        className
      )}
    >
      {/* Upper Media Thumbnail Container (Aspect 16:9) */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
        {hasVideo ? (
          <video
            src={`${summary.annotated_video_url}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* High-Fidelity SVG Radar / Aerial Frame Fallback */
          <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-zinc-600">
            {/* Grid Lines Pattern */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id={`grid-${summary.job_id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${summary.job_id})`} />
            </svg>

            {/* Subtle Radar Ring */}
            <div className="absolute w-24 h-24 rounded-full border border-emerald-500/10 animate-pulse pointer-events-none" />
            <div className="absolute w-36 h-36 rounded-full border border-zinc-700/20 pointer-events-none" />

            <div className="flex flex-col items-center gap-1.5 z-10 text-zinc-400">
              <Plane className="w-6 h-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-[11px] font-mono font-medium tracking-wider text-zinc-500">
                AERIAL SCAN #{summary.job_prefix}
              </span>
            </div>
          </div>
        )}

        {/* Subtle Top-Left Zone Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-black/70 backdrop-blur-md text-zinc-200 border border-white/10 shadow-xs">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {summary.zone_code || 'Zone EC-01'}
          </span>
        </div>

        {/* Subtle Top-Right Clean Flight Badge (if 0 hazards) */}
        {isZeroHazard && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide backdrop-blur-md border shadow-xs',
                summary.status === 'CONFIRMED_CLEAR'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              )}
            >
              {summary.status === 'CONFIRMED_CLEAR' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Clean Flight</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verification Required</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Subtle Bottom-Right Hover Play Indicator */}
        <div className="absolute bottom-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Lower Card Body: Strictly Minimal Heading & Context */}
      <div className="p-4 flex flex-col justify-between flex-1 bg-white dark:bg-zinc-900">
        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">
            Flight Inspection #{summary.job_prefix}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatTimestamp(summary.completed_at || summary.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
