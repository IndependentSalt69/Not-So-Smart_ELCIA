import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Incident, IncidentStatus } from '@/types/incident';
import { Clock, History, MapPin, Navigation, UserCheck, X } from 'lucide-react';
import React from 'react';
import { AssignmentSection } from './AssignmentSection';
import { EvidenceViewer } from './EvidenceViewer';
import { IncidentStepper } from './IncidentStepper';
import { SeverityExplainer } from './SeverityExplainer';
import { VerificationBar } from './VerificationBar';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onAssign: (id: string, owner: string, action: string) => Promise<void>;
  onUpdateStatus: (id: string, nextStatus: IncidentStatus, notes?: string) => Promise<void>;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  isOpen,
  onClose,
  onVerify,
  onReject,
  onAssign,
  onUpdateStatus,
}) => {
  if (!incident) return null;

  const isWater = incident.type === 'waterlogging';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        {/* Header Bar */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                {incident.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {isWater ? '🌊 Waterlogging' : '⚠️ Pothole'}
              </span>
            </div>
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Location Summary Header */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {incident.zoneId} — {incident.zone}
                </span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {incident.locationDescription}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span>LAT: {incident.coordinates.lat.toFixed(4)}°N</span>
              <span>•</span>
              <span>LNG: {incident.coordinates.lng.toFixed(4)}°E</span>
            </div>
          </div>

          {/* Verification Callout if in DETECTED state */}
          <VerificationBar
            incident={incident}
            onVerify={onVerify}
            onReject={onReject}
          />

          {/* Assignment Section if in VERIFIED state */}
          <AssignmentSection
            incident={incident}
            onAssign={onAssign}
          />

          {/* Main Visual Evidence Viewer */}
          <EvidenceViewer incident={incident} />

          {/* Lifecycle Stepper */}
          <IncidentStepper
            incident={incident}
            onUpdateStatus={onUpdateStatus}
          />

          {/* Severity & AI Explainability Breakdown */}
          <SeverityExplainer incident={incident} />

          {/* Audit History Timeline */}
          {incident.history && incident.history.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                <History className="w-4 h-4 text-emerald-500" />
                <span>Verification & Operations Audit Trail</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 pl-2">
                {incident.history.map((entry, idx) => (
                  <div key={idx} className="py-2.5 flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {entry.actor}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                        Status changed to{' '}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {entry.status}
                        </span>
                        {entry.notes && ` — ${entry.notes}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
