import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FilterX, ShieldCheck } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No incidents found',
  description = 'No active incidents match your current filter parameters or search query.',
  onResetFilters,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-4 shadow-inner">
        {onResetFilters ? <FilterX className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7 text-emerald-500" />}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">{description}</p>
      {onResetFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="rounded-lg font-medium border-zinc-300 dark:border-zinc-700"
        >
          Reset All Filters
        </Button>
      )}
    </div>
  );
};
