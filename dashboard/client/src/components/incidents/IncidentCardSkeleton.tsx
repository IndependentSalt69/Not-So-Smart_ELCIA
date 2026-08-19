import React from 'react';

export const IncidentCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-0 overflow-hidden shadow-xs animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="h-44 bg-zinc-200 dark:bg-zinc-800 w-full" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        </div>
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
          <div className="flex justify-between">
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
          </div>
        </div>
        <div className="pt-2 flex gap-2">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-1" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
};
