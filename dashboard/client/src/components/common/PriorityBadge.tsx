import { cn } from '@/lib/utils';
import { PriorityLevel } from '@/types/incident';
import React from 'react';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className, showIcon = true }) => {
  const configs = {
    P1: {
      label: 'P1 Critical',
      badgeClass:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60',
      dotClass: 'bg-red-500 animate-radar-pulse',
    },
    P2: {
      label: 'P2 High',
      badgeClass:
        'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
      dotClass: 'bg-orange-500 animate-amber-pulse',
    },
    P3: {
      label: 'P3 Routine',
      badgeClass:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
      dotClass: 'bg-amber-500',
    },
  };

  const config = configs[priority] || configs.P3;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150 select-none shadow-xs',
        config.badgeClass,
        className
      )}
    >
      {showIcon && <span className={cn('w-2 h-2 rounded-full', config.dotClass)} />}
      <span>{config.label}</span>
    </span>
  );
};
