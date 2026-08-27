import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Incident, IncidentStatus, getIncidentTypeLabel } from '@/types/incident';
import { AlertTriangle, Droplets, Footprints, History, MapPin, Waves, X } from 'lucide-react';
import React, { useState } from 'react';
import { AssignmentSection } from './AssignmentSection';
import { EvidenceViewer } from './EvidenceViewer';
import { IncidentStepper } from './IncidentStepper';
import { InspectionSection } from './InspectionSection';
import { SeverityExplainer } from './SeverityExplainer';
import { VerificationBar } from './VerificationBar';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onAssign: (id: string, owner: string, action: string, assignedToUserId?: string) => Promise<void>;
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
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        {/* Header Bar */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                {incident.code || incident.id}
              </span>
              <span className="px-3 py-1 rounded-full text-xs xl:text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                {incident.type === 'waterlogging' ? (
                  <Droplets className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                ) : incident.type === 'drainage_overflow' ? (
                  <Waves className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                ) : incident.type === 'damaged_footpath' ? (
                  <Footprints className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>{getIncidentTypeLabel(incident.type)}</span>
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
              className="h-8 w-8 p-0 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
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
              <div className="flex items-center gap-1.5 text-xs xl:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
                <span>
                  {incident.zoneId} — {incident.zone}
                </span>
              </div>
              <p className="text-sm xl:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {incident.locationDescription}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs xl:text-sm font-mono font-semibold text-zinc-600 dark:text-zinc-300 shrink-0 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span>Location: {incident.coordinates.lat.toFixed(4)}°N, {incident.coordinates.lng.toFixed(4)}°E</span>
            </div>
          </div>

          {/* Verification Callout if in DETECTED state */}
          <VerificationBar
            incident={incident}
            onVerify={onVerify!}
            onReject={onReject!}
          />

          {/* Assignment Section if in VERIFIED state */}
          <AssignmentSection
            incident={incident}
            onAssign={onAssign!}
          />

          {/* Main Visual Evidence Viewer */}
          <EvidenceViewer incident={incident} />

          {/* Lifecycle Stepper */}
          <IncidentStepper
            incident={incident}
            onUpdateStatus={onUpdateStatus!}
          />

          {/* Field Inspections & Verification Section */}
          <InspectionSection incident={incident} />

          {/* Severity & AI Explainability Breakdown */}
          <SeverityExplainer incident={incident} />

          {/* Technical Details (Expandable) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-xs">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Technical Details</span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {showTechDetails ? 'Hide' : 'Show Details'}
              </span>
            </button>

            {showTechDetails && (
              <div className="p-5 pt-0 border-t border-zinc-100 dark:border-zinc-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Detection Confidence</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{(incident.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Model Class</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{incident.type.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Incident ID</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block">{incident.id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Coordinates</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{incident.coordinates.lat.toFixed(6)}, {incident.coordinates.lng.toFixed(6)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          {incident.history && incident.history.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                <History className="w-4 h-4 text-emerald-500" />
                <span>Operations Audit Trail</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 pl-2">
                {incident.history.map((entry, idx) => (
                  <div key={idx} className="py-2.5 flex items-start gap-3 text-xs xl:text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {entry.actor}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                        Status updated to{' '}
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
