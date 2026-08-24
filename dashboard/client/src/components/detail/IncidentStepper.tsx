import { Button } from '@/components/ui/button';
import { getNextValidStatuses, getStatusMetadata, LIFECYCLE_STEPS } from '@/lib/stateMachine';
import { cn } from '@/lib/utils';
import { Incident, IncidentStatus } from '@/types/incident';
import { Check, CheckCircle2, ChevronRight, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

interface IncidentStepperProps {
  incident: Incident;
  onUpdateStatus: (id: string, nextStatus: IncidentStatus, notes?: string) => Promise<void>;
}

export const IncidentStepper: React.FC<IncidentStepperProps> = ({
  incident,
  onUpdateStatus,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const currentStatus = incident.status;
  const currentStepIndex = LIFECYCLE_STEPS.indexOf(currentStatus);

  const handleAdvance = async (nextStatus: IncidentStatus, notes?: string) => {
    try {
      setLoading(true);
      await onUpdateStatus(incident.id, nextStatus, notes);
    } finally {
      setLoading(false);
    }
  };

  const getForwardAction = () => {
    switch (currentStatus) {
      case 'ASSIGNED':
        return {
          label: 'Start Work On-Site',
          nextStatus: 'IN_PROGRESS' as IncidentStatus,
          icon: Play,
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          notes: 'Field crew arrived on site and commenced drainage/patching operations',
        };
      case 'IN_PROGRESS':
        return {
          label: 'Request Drone Re-inspection',
          nextStatus: 'RE_INSPECTION' as IncidentStatus,
          icon: RefreshCw,
          btnClass: 'bg-cyan-600 hover:bg-cyan-700 text-white',
          notes: 'Field work concluded; requested autonomous drone aerial verification scan',
        };
      case 'RE_INSPECTION':
        return {
          label: 'Confirm Resolution & Close',
          nextStatus: 'CLOSED' as IncidentStatus,
          icon: CheckCircle2,
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          notes: 'Autonomous re-inspection confirmed zero surface water / smooth road patch',
        };
      default:
        return null;
    }
  };

  const action = getForwardAction();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm xl:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Lifecycle Workflow Progression
        </h4>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          Step {currentStepIndex >= 0 ? currentStepIndex + 1 : '-'}/6
        </span>
      </div>

      {/* Horizontal Stepper Timeline */}
      <div className="relative flex items-center justify-between gap-1 overflow-x-auto py-2">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const meta = getStatusMetadata(step);
          const isCompleted = currentStepIndex > idx;
          const isCurrent = currentStepIndex === idx;
          const isPending = currentStepIndex < idx;

          return (
            <div key={step} className="flex-1 flex flex-col items-center min-w-[76px] relative group">
              {/* Connector line */}
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4.5 left-1/2 right-0 w-full h-0.5 -z-0 transition-colors',
                    isCompleted ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
                  )}
                />
              )}

              {/* Step Circle */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs xl:text-sm font-bold transition-all relative z-10',
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isCurrent
                    ? cn('bg-white dark:bg-zinc-900 border-2 shadow-md ring-4 ring-emerald-500/20', meta.colorClass)
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-300 dark:border-zinc-700'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4.5 h-4.5 text-white stroke-3" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-xs mt-2 font-bold text-center leading-tight transition-colors',
                  isCurrent
                    ? 'text-zinc-900 dark:text-white'
                    : isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                )}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action CTA to advance lifecycle */}
      {action && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs xl:text-sm text-zinc-600 dark:text-zinc-400">
            Next operational step: <span className="font-bold text-zinc-900 dark:text-zinc-100">{action.label}</span>
          </div>

          <Button
            size="sm"
            onClick={() => handleAdvance(action.nextStatus, action.notes)}
            disabled={loading}
            className={cn('h-9 px-3.5 rounded-xl text-xs xl:text-sm font-bold shadow-xs cursor-pointer', action.btnClass)}
          >
            <action.icon className="w-4 h-4 mr-1.5" />
            <span>{action.label}</span>
          </Button>
        </div>
      )}

      {currentStatus === 'CLOSED' && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2.5 text-xs xl:text-sm font-bold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
          <span>Incident successfully resolved and verified clear by aerial drone surveillance.</span>
        </div>
      )}
    </div>
  );
};
