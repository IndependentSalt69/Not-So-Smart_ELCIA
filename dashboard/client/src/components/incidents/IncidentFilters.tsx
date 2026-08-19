import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { IncidentFilters as FilterType, IncidentStatus, IncidentType, PriorityLevel, ZoneId } from '@/types/incident';
import { Filter, RotateCcw, Search, X } from 'lucide-react';
import React from 'react';

interface IncidentFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onReset: () => void;
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

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-xs space-y-3">
      {/* Top row: Search and primary filter pills */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by ID (e.g. EC-0142), road name, or description..."
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
            className="pl-9 pr-9 h-9 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
          />
          {filters.searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0">
          {[
            { id: 'all', label: 'All Types' },
            { id: 'waterlogging', label: '🌊 Waterlogging' },
            { id: 'pothole', label: '⚠️ Potholes' },
          ].map((item) => {
            const isActive = (filters.type || 'all') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTypeChange(item.id as any)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0">
          {[
            { id: 'all', label: 'All Pri' },
            { id: 'P1', label: 'P1', color: 'text-red-600 dark:text-red-400' },
            { id: 'P2', label: 'P2', color: 'text-orange-600 dark:text-orange-400' },
            { id: 'P3', label: 'P3', color: 'text-amber-600 dark:text-amber-400' },
          ].map((item) => {
            const isActive = (filters.priority || 'all') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handlePriorityChange(item.id as any)}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                    : item.color || 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom row: Zone and Status Dropdowns + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Zone Selector */}
          <div className="w-48">
            <Select value={filters.zoneId || 'all'} onValueChange={handleZoneChange}>
              <SelectTrigger className="h-8 rounded-lg text-xs font-medium border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="EC-01">EC-01: Phase 1 West / Arterial</SelectItem>
                <SelectItem value="EC-02">EC-02: Phase 1 East Commercial</SelectItem>
                <SelectItem value="EC-03">EC-03: Phase 2 Tech Park</SelectItem>
                <SelectItem value="EC-04">EC-04: Main Junction Corridor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Selector */}
          <div className="w-48">
            <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 rounded-lg text-xs font-medium border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DETECTED">🚨 Detected (Unverified)</SelectItem>
                <SelectItem value="VERIFIED">✓ Verified</SelectItem>
                <SelectItem value="ASSIGNED">📋 Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">⚡ In Progress</SelectItem>
                <SelectItem value="RE_INSPECTION">🔍 Re-inspection</SelectItem>
                <SelectItem value="CLOSED">✅ Closed</SelectItem>
                <SelectItem value="REJECTED">✕ Rejected (False Pos)</SelectItem>
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
            className="h-8 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
};
