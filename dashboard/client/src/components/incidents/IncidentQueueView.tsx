import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { incidentService } from '@/services/incidentService';
import { Incident, IncidentFilters as FilterType, SortDirection, SortField } from '@/types/incident';
import { ArrowUpDown, LayoutGrid, ListFilter, SlidersHorizontal } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { IncidentCard } from './IncidentCard';
import { IncidentCardSkeleton } from './IncidentCardSkeleton';
import { IncidentFilters } from './IncidentFilters';

interface IncidentQueueViewProps {
  incidents: Incident[];
  loading?: boolean;
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onResetFilters: () => void;
  onSelectIncident: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
}

export const IncidentQueueView: React.FC<IncidentQueueViewProps> = ({
  incidents,
  loading = false,
  filters,
  onFilterChange,
  onResetFilters,
  onSelectIncident,
  onQuickEvidence,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<string>('severity-desc');

  const handleSortChange = (val: string) => {
    setSortOption(val);
  };

  // Sort incidents locally
  const sortedIncidents = [...incidents].sort((a, b) => {
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

  // Preload evidence for visible top cards
  useEffect(() => {
    if (sortedIncidents.length > 0) {
      const topIds = sortedIncidents.slice(0, 24).map((i) => i.id);
      incidentService.preloadPrimaryEvidence(topIds);
    }
  }, [sortedIncidents]);

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl xl:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Active Incidents Queue
          </h2>
          <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Surveillance triage feed with human-in-the-loop verification protocol.
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
          incidents
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
          title="No matching incidents in queue"
          description="Try broadening your filter criteria or clear the search query to see all drone detections."
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
