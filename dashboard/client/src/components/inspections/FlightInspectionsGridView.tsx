import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { inspectionService } from '@/services/inspectionService';
import { incidentService } from '@/services/incidentService';
import { FlightInspectionRunSummary } from '@/types/inspection';
import { MinimalFlightCard } from './MinimalFlightCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { Search, X, Plane, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

interface FlightInspectionsGridViewProps {
  onSelectFlight: (jobId: string) => void;
  className?: string;
}

export const FlightInspectionsGridView: React.FC<FlightInspectionsGridViewProps> = ({
  onSelectFlight,
  className,
}) => {
  const [flightRuns, setFlightRuns] = useState<FlightInspectionRunSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('all');

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedZone !== 'all' ? { zone_id: selectedZone, limit: 50 } : { limit: 50 };
      const res = await inspectionService.listFlightRuns(params);
      setFlightRuns(res.items || []);
    } catch (err: any) {
      console.error('Failed to load flight inspection runs:', err);
      setError(err.message || 'Unable to retrieve flight inspection runs from backend.');
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    fetchRuns();

    // Subscribe to live incident/ingestion notifications
    const unsubscribe = incidentService.subscribe(() => {
      fetchRuns();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchRuns]);

  // Filter & sort flight runs (newest first)
  const filteredRuns = useMemo(() => {
    const list = flightRuns.filter((run) => {
      if (selectedZone !== 'all') {
        const runZone = (run.zone_code || run.zone_id || '').toUpperCase();
        if (runZone && !runZone.includes(selectedZone.toUpperCase())) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPrefix = (run.job_prefix || '').toLowerCase().includes(q);
        const matchesId = (run.job_id || '').toLowerCase().includes(q);
        const matchesZone = (run.zone_code || '').toLowerCase().includes(q);
        const matchesStatus = (run.status || '').toLowerCase().includes(q);
        if (!matchesPrefix && !matchesId && !matchesZone && !matchesStatus) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      return timeB - timeA;
    });
  }, [flightRuns, selectedZone, searchQuery]);

  return (
    <div className={cn('space-y-5', className)} data-testid="flight-inspections-grid-view">
      {/* Header Toolbar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl xl:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Plane className="w-5 h-5 text-emerald-500" />
            <span>Flight Inspections</span>
          </h2>
          <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Aerial drone surveillance missions, multi-hazard scans, and clean baseline inspections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRuns}
            disabled={loading}
            className="h-9 px-3 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
            title="Refresh Flight Inspections"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Flight Filter Toolbar (Intentionally Streamlined) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 xl:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search by Flight ID or Zone */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by Flight ID (#EA989E90), zone, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 h-10 rounded-2xl text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 w-full font-medium"
            data-testid="flight-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Zone Selector Dropdown */}
        <div className="w-full sm:w-60 shrink-0">
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger
              className="h-10 rounded-xl text-sm font-semibold border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 w-full"
              data-testid="flight-zone-select"
            >
              <SelectValue placeholder="All Zones">
                {selectedZone !== 'all' ? selectedZone : 'All Zones'}
              </SelectValue>
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
      </div>

      {/* Flight Inspections Match Counter */}
      <div className="flex items-center justify-between text-xs xl:text-sm font-semibold text-zinc-600 dark:text-zinc-400 px-1">
        <span>
          Showing{' '}
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
            {filteredRuns.length}
          </span>{' '}
          {filteredRuns.length === 1 ? 'flight inspection' : 'flight inspections'}
          {selectedZone !== 'all' && (
            <>
              {' '}in <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedZone}</span>
            </>
          )}
        </span>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-pulse flex flex-col"
            >
              <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
              <div className="p-4 space-y-2 flex-1">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Failed to Load Flight Inspections
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">{error}</p>
          <Button
            onClick={fetchRuns}
            size="sm"
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Try Again</span>
          </Button>
        </div>
      ) : filteredRuns.length === 0 ? (
        /* Empty State */
        <EmptyState
          title={
            searchQuery || selectedZone !== 'all'
              ? 'No matching flight inspections'
              : 'No flight inspections recorded'
          }
          description={
            searchQuery || selectedZone !== 'all'
              ? 'Try clearing your search query or selecting a different zone.'
              : 'Upload and process drone surveillance footage in Ingestion Studio to generate flight inspection runs.'
          }
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedZone('all');
          }}
        />
      ) : (
        /* Minimal Flight Cards Grid */
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6"
          data-testid="flight-cards-grid"
        >
          {filteredRuns.map((run) => (
            <MinimalFlightCard
              key={run.job_id}
              summary={run}
              onSelect={onSelectFlight}
            />
          ))}
        </div>
      )}
    </div>
  );
};
