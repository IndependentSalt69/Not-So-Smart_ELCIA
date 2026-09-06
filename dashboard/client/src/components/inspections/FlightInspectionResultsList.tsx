import React, { useState, useMemo } from 'react';
import { Incident, IncidentType, PriorityLevel, IncidentStatus } from '@/types/incident';
import { FlightInspectionRow } from './FlightInspectionRow';
import { renderIncidentTypeIcon } from '@/components/incidents/IncidentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Filter, Layers, Check, AlertCircle } from 'lucide-react';

interface FlightInspectionResultsListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  className?: string;
}

export const FlightInspectionResultsList: React.FC<FlightInspectionResultsListProps> = ({
  incidents = [],
  onSelectIncident,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<IncidentType | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'all'>('all');

  // Compute dynamic counts from actual incident array
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.type] = (counts[inc.type] || 0) + 1;
    });
    return counts;
  }, [incidents]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.priority] = (counts[inc.priority] || 0) + 1;
    });
    return counts;
  }, [incidents]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.status] = (counts[inc.status] || 0) + 1;
    });
    return counts;
  }, [incidents]);

  // Filter incidents deterministically
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (inc.code || '').toLowerCase().includes(q);
        const matchesType = (inc.type || '').toLowerCase().includes(q);
        const matchesLoc = (inc.locationDescription || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesType && !matchesLoc) return false;
      }

      // 2. Class filter
      if (selectedClass !== 'all' && inc.type !== selectedClass) {
        return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'all' && inc.priority !== selectedPriority) {
        return false;
      }

      // 4. Status filter
      if (selectedStatus !== 'all' && inc.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [incidents, searchQuery, selectedClass, selectedPriority, selectedStatus]);

  const availableClasses: IncidentType[] = [
    'pothole',
    'waterlogging',
    'open_manhole',
    'drainage_overflow',
    'damaged_footpath',
  ];

  return (
    <div className={cn('space-y-4', className)} data-testid="flight-inspection-results-list">
      {/* Header & Sub-Filter Bar */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Inspection Results
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Showing {filteredIncidents.length} of {incidents.length} hazards
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Search code or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700"
              data-testid="inspection-search-input"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Class Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedClass('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                selectedClass === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              )}
              data-testid="filter-class-all"
            >
              All Classes ({incidents.length})
            </button>

            {availableClasses.map((cls) => {
              const count = classCounts[cls] || 0;
              if (count === 0 && selectedClass !== cls) return null;
              const labels: Record<IncidentType, string> = {
                pothole: 'Potholes',
                waterlogging: 'Waterlogging',
                open_manhole: 'Open Manholes',
                drainage_overflow: 'Drainage Overflow',
                damaged_footpath: 'Damaged Footpaths',
              };

              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                    selectedClass === cls
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                  data-testid={`filter-class-${cls}`}
                >
                  {renderIncidentTypeIcon(cls, 'w-3 h-3')}
                  <span>{labels[cls]}</span>
                  <span className={cn('text-[11px] px-1.5 py-0.2 rounded-full', selectedClass === cls ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedPriority('all')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors',
                selectedPriority === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
              data-testid="filter-priority-all"
            >
              All Prio
            </button>
            {(['P1', 'P2', 'P3'] as PriorityLevel[]).map((p) => {
              const count = priorityCounts[p] || 0;
              if (count === 0 && selectedPriority !== p) return null;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors',
                    selectedPriority === p
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                  data-testid={`filter-priority-${p}`}
                >
                  {p} ({count})
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedStatus('all')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors',
                selectedStatus === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
              data-testid="filter-status-all"
            >
              All Status
            </button>
            {(['DETECTED', 'VERIFIED', 'ASSIGNED'] as IncidentStatus[]).map((st) => {
              const count = statusCounts[st] || 0;
              if (count === 0 && selectedStatus !== st) return null;
              const labels: Record<string, string> = {
                DETECTED: 'Detected',
                VERIFIED: 'Verified',
                ASSIGNED: 'Assigned',
              };
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors',
                    selectedStatus === st
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                  data-testid={`filter-status-${st}`}
                >
                  {labels[st] || st} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length > 0 ? (
        <div className="space-y-2.5" data-testid="flight-incidents-container">
          {filteredIncidents.map((incident) => (
            <FlightInspectionRow
              key={incident.id || incident.code}
              incident={incident}
              onSelect={onSelectIncident}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No hazards match the selected filters
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Try resetting class, priority, or status filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedClass('all');
              setSelectedPriority('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            className="mt-3 text-xs h-7"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};
