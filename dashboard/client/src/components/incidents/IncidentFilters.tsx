import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { IncidentFilters as FilterType, IncidentStatus, IncidentType, PriorityLevel, ZoneId } from '@/types/incident';
import { AlertTriangle, CircleDot, Droplets, Filter, Footprints, RotateCcw, Search, Waves, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface IncidentFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onReset: () => void;
}

// Reusable Sliding Glider Segmented Control
export function SlidingSegmentedControl<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: string; icon?: React.ReactNode; color?: string; badge?: string | number }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const updateIndicator = () => {
      const el = buttonRefs.current[value];
      if (el) {
        setIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    const timeout = setTimeout(updateIndicator, 40);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [value, items]);

  return (
    <div
      className={cn(
        'relative flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-inner max-w-full overflow-x-auto',
        className
      )}
    >
      {/* Animated Sliding Glider Pill */}
      <div
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: `${indicator.width}px`,
          opacity: indicator.opacity,
          transition:
            'transform 280ms cubic-bezier(0.34, 1.25, 0.64, 1), width 280ms cubic-bezier(0.34, 1.25, 0.64, 1), opacity 150ms ease',
        }}
        className="absolute top-1 bottom-1 left-0 rounded-xl bg-white dark:bg-zinc-900 shadow-md shadow-zinc-900/10 dark:shadow-emerald-500/10 ring-1 ring-black/5 dark:ring-white/10 pointer-events-none z-0"
      />

      {items.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) buttonRefs.current[item.id] = el;
            }}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative z-10 px-3.5 py-2 text-xs xl:text-sm font-bold rounded-xl transition-colors duration-200 whitespace-nowrap cursor-pointer select-none flex items-center gap-1.5',
              isActive
                ? 'text-zinc-950 dark:text-white'
                : item.color || 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-mono font-bold',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const isFiltered =
    (filters.type && filters.type !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.zoneId && filters.zoneId !== 'all') ||
    (filters.searchQuery && filters.searchQuery.trim() !== '');

  const handleTypeChange = (type: IncidentType | 'all') => {
    onFilterChange({ ...filters, type });
  };

  const handlePriorityChange = (priority: PriorityLevel | 'all') => {
    onFilterChange({ ...filters, priority });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status as IncidentStatus | 'all' });
  };

  const handleZoneChange = (zoneId: string) => {
    onFilterChange({ ...filters, zoneId: zoneId as ZoneId | 'all' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const clearSearch = () => {
    onFilterChange({ ...filters, searchQuery: '' });
  };

  const typeItems: { id: IncidentType | 'all'; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'waterlogging', label: 'Waterlogging', icon: <Droplets className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> },
    { id: 'pothole', label: 'Potholes', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> },
    { id: 'drainage_overflow', label: 'Drainage Overflow', icon: <Waves className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> },
    { id: 'damaged_footpath', label: 'Damaged Footpath', icon: <Footprints className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> },
    { id: 'open_manhole', label: 'Open Manhole', icon: <CircleDot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> },
  ];

  const priorityItems: { id: PriorityLevel | 'all'; label: string; color?: string }[] = [
    { id: 'all', label: 'All Urgencies' },
    { id: 'P1', label: 'High Urgency', color: 'text-red-600 dark:text-red-400' },
    { id: 'P2', label: 'Medium Urgency', color: 'text-orange-600 dark:text-orange-400' },
    { id: 'P3', label: 'Low Urgency', color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 xl:p-5 shadow-xs space-y-3.5">
      {/* Top row: Search and sliding filter switchers */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by issue ID, location, or description..."
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
            className="pl-10 pr-9 h-11 rounded-2xl text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 w-full font-medium"
          />
          {filters.searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sliding Filter Pills Container */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter Sliding Switcher */}
          <SlidingSegmentedControl
            items={typeItems}
            value={filters.type || 'all'}
            onChange={handleTypeChange}
          />

          {/* Priority Filter Sliding Switcher */}
          <SlidingSegmentedControl
            items={priorityItems}
            value={filters.priority || 'all'}
            onChange={handlePriorityChange}
          />
        </div>
      </div>

      {/* Bottom row: Zone and Status Dropdowns + Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Zone Selector */}
          <div className="w-full sm:w-60">
            <Select value={filters.zoneId || 'all'} onValueChange={handleZoneChange}>
              <SelectTrigger className="h-10 rounded-xl text-sm font-semibold border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 w-full">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Zones</SelectItem>
                <SelectItem value="EC-01" className="text-sm">EC-01: Phase 1 West</SelectItem>
                <SelectItem value="EC-02" className="text-sm">EC-02: Phase 1 East</SelectItem>
                <SelectItem value="EC-03" className="text-sm">EC-03: Phase 2 Tech Park</SelectItem>
                <SelectItem value="EC-04" className="text-sm">EC-04: Main Junction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Selector */}
          <div className="w-full sm:w-64">
            <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 rounded-xl text-sm font-semibold border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 w-full">
                <SelectValue placeholder={filters.queueTab === 'completed' ? 'All Resolved' : filters.queueTab === 'rejected' ? 'All Rejected' : 'All Active Statuses'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">
                  {filters.queueTab === 'completed'
                    ? 'All Resolved'
                    : filters.queueTab === 'rejected'
                    ? 'All Rejected'
                    : 'All Active Statuses'}
                </SelectItem>
                {(!filters.queueTab || filters.queueTab === 'active') && (
                  <>
                    <SelectItem value="DETECTED" className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>New (Pending Review)</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="VERIFIED" className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        <span>Verified</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="ASSIGNED" className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Assigned</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Work in Progress</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="RE_INSPECTION" className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        <span>Needs Follow-up</span>
                      </span>
                    </SelectItem>
                  </>
                )}
                {filters.queueTab === 'completed' && (
                  <SelectItem value="CLOSED" className="text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-500" />
                      <span>Resolved</span>
                    </span>
                  </SelectItem>
                )}
                {filters.queueTab === 'rejected' && (
                  <SelectItem value="REJECTED" className="text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Rejected</span>
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Filters CTA */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 px-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
};
