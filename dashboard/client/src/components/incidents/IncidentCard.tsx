import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPersistenceDuration, incidentService } from '@/services/incidentService';
import { getIncidentTypeLabel, Incident, IncidentType } from '@/types/incident';
import { AlertTriangle, ArrowRight, CircleDot, Clock, Droplets, Eye, Footprints, Gauge, MapPin, Sparkles, Timer, Waves } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface IncidentCardProps {
  incident: Incident;
  layoutMode?: 'grid' | 'list';
  onSelect: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
}

export function renderIncidentTypeIcon(type: IncidentType, className = 'w-3.5 h-3.5') {
  switch (type) {
    case 'waterlogging':
      return <Droplets className={cn(className, 'text-teal-300')} />;
    case 'drainage_overflow':
      return <Waves className={cn(className, 'text-cyan-300')} />;
    case 'damaged_footpath':
      return <Footprints className={cn(className, 'text-orange-300')} />;
    case 'open_manhole':
      return <CircleDot className={cn(className, 'text-purple-300')} />;
    case 'pothole':
    default:
      return <AlertTriangle className={cn(className, 'text-amber-300')} />;
  }
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  layoutMode = 'grid',
  onSelect,
  onQuickEvidence,
}) => {
  const confidencePct = Math.round(incident.confidence * 100);

  // Real ML evidence thumbnail resolution state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    return incident.mediaUrl || incidentService.getCachedPrimaryEvidence(incident.id) || null;
  });
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (incident.mediaUrl) {
      setThumbnailUrl(incident.mediaUrl);
      return;
    }
    const cached = incidentService.getCachedPrimaryEvidence(incident.id);
    if (cached !== undefined) {
      setThumbnailUrl(cached);
      return;
    }

    incidentService.getPrimaryEvidenceMediaUrl(incident.id).then((url) => {
      if (isMounted) {
        setThumbnailUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [incident.id, incident.mediaUrl]);

  useEffect(() => {
    setImageError(false);
  }, [incident.id, thumbnailUrl]);

  const isRealCapture = Boolean(thumbnailUrl && !imageError);
  const activeImageSrc = isRealCapture ? thumbnailUrl! : incident.evidenceFrame;

  // Severity color indicator
  const getSeverityColor = (score: number) => {
    if (score >= 8.0) return 'text-red-600 dark:text-red-400 bg-red-500';
    if (score >= 6.0) return 'text-orange-600 dark:text-orange-400 bg-orange-500';
    return 'text-amber-600 dark:text-amber-400 bg-amber-500';
  };

  const severityColor = getSeverityColor(incident.severity);

  if (layoutMode === 'list') {
    return (
      <div
        onClick={() => onSelect(incident)}
        className={cn(
          'p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4',
          incident.priority === 'P1' && 'border-l-4 border-l-red-500'
        )}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Thumbnail image or Type icon */}
          <div className="relative w-18 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-zinc-200 dark:border-zinc-800">
            <img
              src={activeImageSrc}
              alt={incident.code || incident.id}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold bg-black/75 text-white backdrop-blur-xs flex items-center">
              {renderIncidentTypeIcon(incident.type)}
            </div>
            {isRealCapture && (
              <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" title="Real ML capture" />
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
                {incident.code || incident.id}
              </span>
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
              <span className="text-xs text-zinc-400 font-mono hidden md:inline">
                {incident.zoneId}
              </span>
              {isRealCapture && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 hidden lg:inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Frame
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {incident.locationDescription}
            </p>
          </div>
        </div>

        {/* Metrics & Actions */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800 dark:text-zinc-200">
              <Gauge className="w-4 h-4 text-zinc-400" />
              <span>{incident.severity.toFixed(1)} / 10</span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              AI Conf: {confidencePct}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onQuickEvidence && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickEvidence(incident);
                }}
                className="h-8.5 px-3 rounded-xl text-xs font-semibold border-zinc-300 dark:border-zinc-700 hidden sm:inline-flex"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Evidence
              </Button>
            )}
            <Button
              size="sm"
              className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout mode (default)
  return (
    <div
      onClick={() => onSelect(incident)}
      className={cn(
        'relative rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden',
        incident.priority === 'P1' && 'ring-1 ring-red-500/20'
      )}
    >
      {/* Evidence Frame Preview Header */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900 border-b border-zinc-100 dark:border-zinc-800/60">
        <img
          src={activeImageSrc}
          alt={incident.code || incident.id}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top Badges Over Evidence */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black/75 text-white backdrop-blur-sm shadow-xs flex items-center gap-1.5">
              {renderIncidentTypeIcon(incident.type)}
              <span>{getIncidentTypeLabel(incident.type)}</span>
            </span>
            {isRealCapture && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-950/85 text-emerald-300 border border-emerald-700 backdrop-blur-sm shadow-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Capture
              </span>
            )}
          </div>
          <PriorityBadge priority={incident.priority} />
        </div>

        {/* Bottom Bar on Frame */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs font-mono text-white/95 bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-xs">
          <span className="flex items-center gap-1.5 font-bold">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            {incident.zoneId}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {confidencePct}% Conf
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 xl:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-base font-black text-zinc-900 dark:text-zinc-100">
              {incident.code || incident.id}
            </span>
            <StatusBadge status={incident.status} />
          </div>

          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-relaxed">
            {incident.locationDescription}
          </p>
        </div>

        {/* Severity Progress Bar & Persistence */}
        <div className="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between text-xs xl:text-sm font-medium">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-semibold">
              <Gauge className="w-4 h-4" />
              AI Severity Score
            </span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {incident.severity.toFixed(1)} / 10
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${(incident.severity / 10) * 100}%` }}
              className={cn('h-full rounded-full transition-all duration-300', severityColor.split(' ')[2])}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium">
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-zinc-400" />
              Persistence: {formatPersistenceDuration(incident.durationSeconds)}
            </span>
            <span>{incident.zone}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          {onQuickEvidence && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onQuickEvidence(incident);
              }}
              className="flex-1 h-9 rounded-xl text-xs xl:text-sm font-semibold border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Evidence
            </Button>
          )}

          <Button
            size="sm"
            className="flex-1 h-9 rounded-xl text-xs xl:text-sm font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white shadow-xs cursor-pointer"
          >
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
