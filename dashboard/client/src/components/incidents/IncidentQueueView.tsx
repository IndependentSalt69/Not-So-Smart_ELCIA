import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { incidentService } from '@/services/incidentService';
import {
  Incident,
  IncidentFilters as FilterType,
  IncidentQueueCounts,
  IncidentQueueTab,
  SortDirection,
  SortField,
} from '@/types/incident';
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { IncidentCard } from './IncidentCard';
import { IncidentCardSkeleton } from './IncidentCardSkeleton';
import { IncidentFilters, SlidingSegmentedControl } from './IncidentFilters';

interface IncidentQueueViewProps {
  incidents: Incident[];
  tabCounts?: IncidentQueueCounts;
  loading?: boolean;
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onResetFilters: () => void;
  onSelectIncident: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
}

export const IncidentQueueView: React.FC<IncidentQueueViewProps> = ({
  incidents,
  tabCounts,
  loading = false,
  filters,
  onFilterChange,
  onResetFilters,
  onSelectIncident,
  onQuickEvidence,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<string>('severity-desc');

  const currentTab: IncidentQueueTab = filters.queueTab || 'active';

  const tabConfig: Record<
    IncidentQueueTab,
    { title: string; subtitle: string; emptyTitle: string; emptyDesc: string }
  > = {
    active: {
      title: 'Active Issues Queue',
      subtitle: 'Reported civic issues requiring review, team assignment, or field work.',
      emptyTitle: 'No active issues found',
      emptyDesc: 'All reported issues have been addressed or no issues match your filter.',
    },
    completed: {
      title: 'Resolved Issues Archive',
      subtitle: 'Historical record of resolved issues and completed field inspections.',
      emptyTitle: 'No resolved issues found',
      emptyDesc: 'Resolved civic issues will be archived here.',
    },
    rejected: {
      title: 'Rejected Issues Log',
      subtitle: 'Audited false-positive detections and dismissed alerts.',
      emptyTitle: 'No rejected issues found',
      emptyDesc: 'Dismissed false-positive detections will be logged here.',
    },
  };

  const handleTabChange = (tab: IncidentQueueTab) => {
    onFilterChange({
      ...filters,
      queueTab: tab,
      status: 'all',
    });
  };

  const handleSortChange = (val: string) => {
    setSortOption(val);
  };

  // Sort incidents locally (memoized so reference is stable unless incidents or sortOption change)
  const sortedIncidents = useMemo(() => {
    return [...incidents].sort((a, b) => {
      switch (sortOption) {
        case 'severity-desc':
          return b.severity - a.severity;
        case 'severity-asc':
          return a.severity - b.severity;
        case 'time-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'time-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'confidence-desc':
          return b.confidence - a.confidence;
        case 'priority-p1': {
          const rank = { P1: 3, P2: 2, P3: 1 };
          return rank[b.priority] - rank[a.priority];
        }
        default:
          return 0;
      }
    });
  }, [incidents, sortOption]);

  // Preload evidence for visible top cards
  useEffect(() => {
    if (sortedIncidents.length > 0) {
      const topIds = sortedIncidents.slice(0, 24).map((i) => i.id);
      incidentService.preloadPrimaryEvidence(topIds);
    }
  }, [sortedIncidents]);

  return (
    <div className="space-y-5">
      {/* Top Level Operational Status Views (Active / Completed / Rejected) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SlidingSegmentedControl
          items={[
            {
              id: 'active' as IncidentQueueTab,
              label: 'Active',
              icon: <Activity className="w-4 h-4 text-emerald-500" />,
              badge: tabCounts?.active,
            },
            {
              id: 'completed' as IncidentQueueTab,
              label: 'Completed',
              icon: <CheckCircle2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
              badge: tabCounts?.completed,
            },
            {
              id: 'rejected' as IncidentQueueTab,
              label: 'Rejected',
              icon: <XCircle className="w-4 h-4 text-rose-500" />,
              badge: tabCounts?.rejected,
            },
          ]}
          value={currentTab}
          onChange={handleTabChange}
          className="self-start"
        />
      </div>

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl xl:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {tabConfig[currentTab].title}
          </h2>
          <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            {tabConfig[currentTab].subtitle}
          </p>
        </div>

        {/* View Controls: Sort & Layout Mode */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Sort selector */}
          <div className="w-52">
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs xl:text-sm font-semibold border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity-desc" className="text-xs xl:text-sm">Severity: High to Low</SelectItem>
                <SelectItem value="severity-asc" className="text-xs xl:text-sm">Severity: Low to High</SelectItem>
                <SelectItem value="time-desc" className="text-xs xl:text-sm">Newest Detected</SelectItem>
                <SelectItem value="time-asc" className="text-xs xl:text-sm">Oldest Detected</SelectItem>
                <SelectItem value="confidence-desc" className="text-xs xl:text-sm">Highest AI Confidence</SelectItem>
                <SelectItem value="priority-p1" className="text-xs xl:text-sm">Priority: P1 Critical First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid / List switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Filter Toolbar */}
      <IncidentFilters
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
      />

      {/* Match Counter Header */}
      <div className="flex items-center justify-between text-xs xl:text-sm font-semibold text-zinc-600 dark:text-zinc-400 px-1">
        <span>
          Showing{' '}
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
            {sortedIncidents.length}
          </span>{' '}
          incidents in{' '}
          <span className="capitalize font-bold text-zinc-900 dark:text-zinc-100">{currentTab}</span> view
        </span>
      </div>

      {/* Grid or List Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <IncidentCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedIncidents.length === 0 ? (
        <EmptyState
          title={tabConfig[currentTab].emptyTitle}
          description={tabConfig[currentTab].emptyDesc}
          onResetFilters={onResetFilters}
        />
      ) : layoutMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
          {sortedIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              layoutMode="grid"
              onSelect={onSelectIncident}
              onQuickEvidence={onQuickEvidence}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              layoutMode="list"
              onSelect={onSelectIncident}
              onQuickEvidence={onQuickEvidence}
            />
          ))}
        </div>
      )}
    </div>
  );
};
