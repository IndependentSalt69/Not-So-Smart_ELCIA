import { IncidentStatus } from '@/types/incident';

export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RE_INSPECTION'],
  RE_INSPECTION: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  REJECTED: ['DETECTED'],
};

export interface StatusMetadata {
  label: string;
  description: string;
  colorClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  stepNumber: number;
}

export const STATUS_METADATA: Record<IncidentStatus, StatusMetadata> = {
  DETECTED: {
    label: 'Detected',
    description: 'AI detected issue from drone sensor stream, awaiting human verification.',
    colorClass: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeBorder: 'border-rose-200 dark:border-rose-800/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    dotColor: 'bg-rose-500',
    stepNumber: 1,
  },
  VERIFIED: {
    label: 'Verified',
    description: 'Confirmed genuine incident by drone operator, awaiting team assignment.',
    colorClass: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeBorder: 'border-teal-200 dark:border-teal-800/60',
    badgeText: 'text-teal-700 dark:text-teal-300',
    dotColor: 'bg-teal-500',
    stepNumber: 2,
  },
  ASSIGNED: {
    label: 'Assigned',
    description: 'Assigned to field operations crew with recommended mitigation procedure.',
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-200 dark:border-amber-800/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    stepNumber: 3,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    description: 'Field mitigation crew is actively deployed on-site resolving the issue.',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    stepNumber: 4,
  },
  RE_INSPECTION: {
    label: 'Re-inspection',
    description: 'Field work completed; scheduled for automated drone verification flyover.',
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    badgeBorder: 'border-cyan-200 dark:border-cyan-800/60',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    dotColor: 'bg-cyan-500',
    stepNumber: 5,
  },
  CLOSED: {
    label: 'Closed & Resolved',
    description: 'Re-inspection confirmed clear road surface and restored traffic flow.',
    colorClass: 'text-zinc-600 dark:text-zinc-400',
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800/60',
    badgeBorder: 'border-zinc-300 dark:border-zinc-700',
    badgeText: 'text-zinc-700 dark:text-zinc-300',
    dotColor: 'bg-zinc-500',
    stepNumber: 6,
  },
  REJECTED: {
    label: 'Rejected (False Positive)',
    description: 'Marked as false positive or non-actionable reflection/shadow artifact.',
    colorClass: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-slate-800/50',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    badgeText: 'text-slate-600 dark:text-slate-400',
    dotColor: 'bg-slate-400',
    stepNumber: 0,
  },
};

export const LIFECYCLE_STEPS: IncidentStatus[] = [
  'DETECTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RE_INSPECTION',
  'CLOSED',
];

/**
 * Checks whether a state transition from `currentStatus` to `nextStatus` is permitted.
 */
export function canTransition(currentStatus: IncidentStatus, nextStatus: IncidentStatus): boolean {
  if (currentStatus === nextStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Returns list of allowed next statuses for a given status.
 */
export function getNextValidStatuses(currentStatus: IncidentStatus): IncidentStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Returns full metadata for a status.
 */
export function getStatusMetadata(status: IncidentStatus): StatusMetadata {
  return STATUS_METADATA[status] || STATUS_METADATA.DETECTED;
}
