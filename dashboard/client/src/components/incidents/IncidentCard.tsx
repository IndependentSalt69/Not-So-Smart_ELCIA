import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Incident } from '@/types/incident';
import { ArrowRight, Clock, Eye, Gauge, MapPin, Sparkles, Timer } from 'lucide-react';
import React from 'react';

interface IncidentCardProps {
  incident: Incident;
  layoutMode?: 'grid' | 'list';
  onSelect: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  layoutMode = 'grid',
  onSelect,
  onQuickEvidence,
}) => {
  const isWater = incident.type === 'waterlogging';
  const confidencePct = Math.round(incident.confidence * 100);

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
          <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-zinc-200 dark:border-zinc-800">
            <img
              src={incident.evidenceFrame}
              alt={incident.id}
              onError={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-1 left-1 px-1 py-0.2 rounded text-[9px] font-bold bg-black/70 text-white backdrop-blur-xs">
              {isWater ? '🌊' : '⚠️'}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {incident.id}
              </span>
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
              <span className="text-xs text-zinc-400 font-mono hidden md:inline">
                {incident.zoneId}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
              {incident.locationDescription}
            </p>
          </div>
        </div>

        {/* Metrics & Actions */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
              <span>{incident.severity.toFixed(1)} / 10</span>
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
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
                className="h-8 px-2.5 rounded-lg text-xs font-medium border-zinc-300 dark:border-zinc-700 hidden sm:inline-flex"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Evidence
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
          src={incident.evidenceFrame}
          alt={incident.id}
          onError={(e) => {
            // Fallback to dark canvas if image load fails
            e.currentTarget.style.opacity = '0';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top Badges Over Evidence */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-black/75 text-white backdrop-blur-sm shadow-xs flex items-center gap-1">
              <span>{isWater ? '🌊 Waterlogging' : '⚠️ Pothole'}</span>
            </span>
          </div>
          <PriorityBadge priority={incident.priority} />
        </div>

        {/* Bottom Bar on Frame */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/60 px-2 py-1 rounded-md backdrop-blur-xs">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-400" />
            {incident.zoneId}
          </span>
          <span className="flex items-center gap-1 text-emerald-300 font-semibold">
            <Sparkles className="w-3 h-3" />
            {confidencePct}% Conf
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-sm font-black text-zinc-900 dark:text-zinc-100">
              {incident.id}
            </span>
            <StatusBadge status={incident.status} />
          </div>

          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
            {incident.locationDescription}
          </p>
        </div>

        {/* Severity Progress Bar & Persistence */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              AI Severity Score
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {incident.severity.toFixed(1)} / 10
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${(incident.severity / 10) * 100}%` }}
              className={cn('h-full rounded-full transition-all duration-300', severityColor.split(' ')[2])}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3 text-zinc-400" />
              Persistence: {incident.durationSeconds}s
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
              className="flex-1 h-8 rounded-lg text-xs font-semibold border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Evidence
            </Button>
          )}

          <Button
            size="sm"
            className="flex-1 h-8 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white shadow-xs"
          >
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
