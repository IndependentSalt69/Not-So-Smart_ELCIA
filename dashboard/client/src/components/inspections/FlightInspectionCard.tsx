import React from 'react';
import { FlightInspectionRunSummary } from '@/types/inspection';
import { VideoVerification } from '@/types/verification';
import { renderIncidentTypeIcon } from '@/components/incidents/IncidentCard';
import { mapBackendTypeToFrontend, getIncidentTypeLabel } from '@/types/incident';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Clock,
  Play,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Plane,
  Eye,
  MapPin,
} from 'lucide-react';

interface FlightInspectionCardProps {
  summary: FlightInspectionRunSummary;
  verification?: VideoVerification | null;
  onOpenHistory?: () => void;
  onPlayVideo?: (videoUrl: string) => void;
  onConfirmClear?: () => Promise<void> | void;
  onReportAnomaly?: () => void;
  isConfirmingClear?: boolean;
  className?: string;
}

export const FlightInspectionCard: React.FC<FlightInspectionCardProps> = ({
  summary,
  verification,
  onOpenHistory,
  onPlayVideo,
  onConfirmClear,
  onReportAnomaly,
  isConfirmingClear = false,
  className,
}) => {
  const isZeroHazard = summary.total_hazards === 0;
  const isPendingVerification =
    summary.status === 'PENDING_REVIEW' ||
    (verification && verification.status === 'PENDING_REVIEW');
  const isConfirmedClear =
    summary.status === 'CONFIRMED_CLEAR' ||
    (verification && verification.status === 'CONFIRMED_CLEAR');
  const isAnomalyReported =
    summary.status === 'ANOMALY_REPORTED' ||
    (verification && verification.status === 'ANOMALY_REPORTED');

  // Format timestamp truthfully
  const formatTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return 'Not recorded';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Not recorded';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Not recorded';
    }
  };

  // Status badge styling
  const getStatusBadge = () => {
    switch (summary.status) {
      case 'CONFIRMED_CLEAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CONFIRMED CLEAR (True Negative)</span>
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFICATION REQUIRED</span>
          </span>
        );
      case 'ANOMALY_REPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>ANOMALY REPORTED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>PROCESSING FAILED</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Plane className="w-3.5 h-3.5 animate-pulse" />
            <span>INSPECTION IN PROGRESS</span>
          </span>
        );
      case 'COMPLETED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COMPLETED</span>
          </span>
        );
    }
  };

  const classEntries = Object.entries(summary.class_counts || {}).filter(([_, count]) => count > 0);
  const priorityEntries = Object.entries(summary.priority_counts || {}).filter(([_, count]) => count > 0);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white dark:bg-zinc-900 shadow-xs overflow-hidden transition-all',
        'border-zinc-200/90 dark:border-zinc-800',
        className
      )}
      data-testid="flight-inspection-card"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                Flight Inspection #{summary.job_prefix}
              </h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Zone: {summary.zone_code || 'EC-01'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                {formatTimestamp(summary.completed_at || summary.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="text-xs h-8 px-3 gap-1.5 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              data-testid="open-flight-history-btn"
            >
              <History className="w-3.5 h-3.5 text-zinc-500" />
              <span>Flight History</span>
            </Button>
          )}

          {summary.annotated_video_url && onPlayVideo && (
            <Button
              size="sm"
              onClick={() => onPlayVideo(summary.annotated_video_url!)}
              className="text-xs h-8 px-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              data-testid="play-flight-video-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Annotated Flight Video</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Inspection Metrics Banner */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Total Hazards & Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Box 1: Total Hazards Count */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 flex flex-col justify-center">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Hazards
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {summary.total_hazards}
              </span>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {summary.total_hazards === 1 ? 'Hazard Detected' : isZeroHazard ? 'Hazards (AI Scan Clear)' : 'Hazards Detected'}
              </span>
            </div>
            {summary.has_human_report && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                Contains human-reported anomaly
              </span>
            )}
          </div>

          {/* Box 2: Hazard Class Breakdown Chips */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 flex flex-col justify-center sm:col-span-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Hazard Class Breakdown
            </span>
            {classEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {classEntries.map(([typeKey, count]) => {
                  const feType = mapBackendTypeToFrontend(typeKey);
                  return (
                    <span
                      key={typeKey}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                    >
                      {renderIncidentTypeIcon(feType, 'w-3.5 h-3.5')}
                      <span>{count} {getIncidentTypeLabel(feType)}{count > 1 ? 's' : ''}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                No physical hazards detected on this flight.
              </span>
            )}
          </div>
        </div>

        {/* Priority Breakdown Bar */}
        {priorityEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 text-xs">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">
              Priority Urgency:
            </span>
            <div className="flex items-center gap-2">
              {['P1', 'P2', 'P3'].map((prio) => {
                const count = summary.priority_counts?.[prio] || 0;
                if (count === 0) return null;
                const colors = {
                  P1: 'bg-red-500 text-white',
                  P2: 'bg-orange-500 text-white',
                  P3: 'bg-amber-500 text-white',
                }[prio as 'P1' | 'P2' | 'P3'];

                return (
                  <span
                    key={prio}
                    className="inline-flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md"
                  >
                    <span className={cn('w-2 h-2 rounded-full', colors)} />
                    <span>{count} {prio}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 14: Zero-Hazard Verification Controls */}
        {isZeroHazard && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {isConfirmedClear
                    ? 'Flight Verified Clear of Hazards'
                    : isAnomalyReported
                    ? 'Undetected Anomaly Logged'
                    : 'Human Verification Required (0 Hazards Detected)'}
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  {isConfirmedClear
                    ? 'Operator completed aerial verification. Flight confirmed as True Negative.'
                    : isAnomalyReported
                    ? 'Operator reported a missed hazard from flight video. Genuine Incident record created.'
                    : 'AI vision pipeline detected zero roadway hazards in this flight. Review video footage to confirm clear baseline or report any missed anomalies.'}
                </p>
              </div>
            </div>

            {/* Verification Buttons */}
            {isPendingVerification && onConfirmClear && onReportAnomaly && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={onConfirmClear}
                  disabled={isConfirmingClear}
                  className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  data-testid="confirm-clear-btn"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isConfirmingClear ? 'Confirming...' : 'Confirm Clear (True Negative)'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReportAnomaly}
                  className="text-xs h-8 px-4 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  data-testid="report-anomaly-btn"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                  <span>Report Undetected Hazard</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
