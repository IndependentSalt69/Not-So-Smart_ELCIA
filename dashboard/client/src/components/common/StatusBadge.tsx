import { getStatusMetadata } from '@/lib/stateMachine';
import { cn } from '@/lib/utils';
import { IncidentStatus } from '@/types/incident';
import React from 'react';

interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showDot = true }) => {
  const meta = getStatusMetadata(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border select-none transition-colors shadow-2xs',
        meta.badgeBg,
        meta.badgeBorder,
        meta.badgeText,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            meta.dotColor,
            status === 'DETECTED' && 'animate-ping'
          )}
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
};
