import React from 'react';
import { Incident } from '@/types/incident';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { renderIncidentTypeIcon } from '@/components/incidents/IncidentCard';
import { getIncidentTypeLabel } from '@/types/incident';
import { cn } from '@/lib/utils';
import { ChevronRight, MapPin, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';

interface FlightInspectionRowProps {
  incident: Incident;
  onSelect: (incident: Incident) => void;
  className?: string;
}

export const FlightInspectionRow: React.FC<FlightInspectionRowProps> = ({
  incident,
  onSelect,
  className,
}) => {
  const isHumanReported =
    incident.source === 'HUMAN_REPORTED' ||
    (incident.code && incident.code.includes('-M'));

  const confidencePct =
    !isHumanReported && incident.confidence !== null && incident.confidence !== undefined
      ? Math.round(incident.confidence * 100)
      : null;

  const hasGps =
    incident.coordinates &&
    (incident.coordinates.lat !== 0 || incident.coordinates.lng !== 0);

  // Severity color indicator
  const getSeverityBadgeClass = (score: number) => {
    if (score >= 8.0) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60';
    if (score >= 6.0) return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60';
    return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
  };

  return (
    <div
      onClick={() => onSelect(incident)}
      className={cn(
        'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none',
        'bg-white dark:bg-zinc-900/90 border-zinc-200/90 dark:border-zinc-800/80 hover:border-blue-400 dark:hover:border-blue-600/80 hover:shadow-sm',
        incident.priority === 'P1' && 'border-l-4 border-l-red-500',
        className
      )}
      data-testid={`flight-incident-row-${incident.id || incident.code}`}
    >
      {/* Left Column: Code, Type, Priority, Confidence */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Type Icon Avatar */}
        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
          {renderIncidentTypeIcon(incident.type, 'w-4 h-4')}
        </div>

        {/* Hazard Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {incident.code || incident.id}
            </span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {getIncidentTypeLabel(incident.type)}
            </span>
            <PriorityBadge priority={incident.priority} className="text-[11px] py-0 px-2" />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            {/* Detection Source & Confidence */}
            {isHumanReported ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <UserCheck className="w-3 h-3" />
                <span>AI Confidence: N/A • HUMAN REPORTED</span>
              </span>
            ) : confidencePct !== null ? (
              <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <Sparkles className="w-3 h-3" />
                <span>{confidencePct}% AI Conf</span>
              </span>
            ) : (
              <span className="text-zinc-400 text-[11px]">AI Conf: N/A</span>
            )}

            {/* GPS Location */}
            <span className="inline-flex items-center gap-1 truncate text-[11px]">
              <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
              {hasGps ? (
                <span>
                  {incident.coordinates.lat.toFixed(4)}°N, {incident.coordinates.lng.toFixed(4)}°E
                </span>
              ) : (
                <span className="italic text-zinc-400">Coordinates unavailable</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Severity, Status, Inspect Action */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
        {/* Severity Score Pill */}
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-bold border',
            getSeverityBadgeClass(incident.severity)
          )}
        >
          {incident.severity.toFixed(1)}/10 Sev
        </span>

        {/* Status Badge */}
        <StatusBadge status={incident.status} className="text-[11px] py-0.5 px-2" />

        {/* Action button */}
        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors pl-1">
          <span className="hidden md:inline">Inspect</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
