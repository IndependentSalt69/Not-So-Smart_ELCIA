import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { incidentService } from '@/services/incidentService';
import { inspectionService } from '@/services/inspectionService';
import {
  Incident,
  IncidentFilters as FilterType,
  IncidentQueueCounts,
  IncidentQueueTab,
} from '@/types/incident';
import { FlightInspectionRunDetailParsed } from '@/types/inspection';
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  LayoutGrid,
  ListFilter,
  Plane,
  Play,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { IncidentCard } from './IncidentCard';
import { IncidentCardSkeleton } from './IncidentCardSkeleton';
import { IncidentFilters, SlidingSegmentedControl } from './IncidentFilters';
import { FlightInspectionsGridView } from '@/components/inspections/FlightInspectionsGridView';
import { FlightInspectionDetailView } from '@/components/inspections/FlightInspectionDetailView';

export type QueueMode = 'flights' | 'incidents';

interface IncidentQueueViewProps {
  incidents: Incident[];
  tabCounts?: IncidentQueueCounts;
  loading?: boolean;
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onResetFilters: () => void;
  onSelectIncident: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
  initialMode?: QueueMode;
  initialFlightId?: string | null;
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
  initialMode = 'flights',
  initialFlightId = null,
}) => {
  // Primary Information Architecture Mode (Default: 'flights')
  const [queueMode, setQueueMode] = useState<QueueMode>(initialMode);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(initialFlightId);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<string>('severity-desc');
  const [flightDetail, setFlightDetail] = useState<FlightInspectionRunDetailParsed | null>(null);
  const [isFlightDetailLoading, setIsFlightDetailLoading] = useState<boolean>(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  const currentTab: IncidentQueueTab = filters.queueTab || 'active';

  // Fetch flight details when a specific flight run is selected in individual mode
  useEffect(() => {
    if (filters.flightRunId && filters.flightRunId !== 'all') {
      let isMounted = true;
      setIsFlightDetailLoading(true);
      inspectionService
        .getFlightRunDetail(filters.flightRunId)
        .then((detail) => {
          if (isMounted) {
            setFlightDetail(detail);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch flight detail for queue header:', err);
        })
        .finally(() => {
          if (isMounted) {
            setIsFlightDetailLoading(false);
          }
        });
      return () => {
        isMounted = false;
      };
    } else {
      setFlightDetail(null);
    }
  }, [filters.flightRunId]);

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

  // Sort incidents locally
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
          return (b.confidence ?? 0) - (a.confidence ?? 0);
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
    if (sortedIncidents.length > 0 && queueMode === 'incidents') {
      const topIds = sortedIncidents.slice(0, 24).map((i) => i.id);
      incidentService.preloadPrimaryEvidence(topIds);
    }
  }, [sortedIncidents, queueMode]);

  const queueModeItems: { id: QueueMode; label: string; icon?: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'flights',
      label: 'Flight Inspections',
      icon: <Plane className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'incidents',
      label: 'Individual Incidents',
      icon: <LayoutGrid className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />,
      badge: tabCounts?.active,
    },
  ];

  return (
    <div className="space-y-6" data-testid="incident-queue-view">
      {/* Top Level Primary Mode Switch (Flight-First Architecture) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <SlidingSegmentedControl
          items={queueModeItems}
          value={queueMode}
          onChange={(mode) => {
            setQueueMode(mode);
            if (mode === 'incidents') {
              setSelectedFlightId(null);
            }
          }}
          className="self-start"
        />
      </div>

      {/* MODE 1: FLIGHT INSPECTIONS (DEFAULT) */}
      {queueMode === 'flights' && (
        selectedFlightId ? (
          <FlightInspectionDetailView
            jobId={selectedFlightId}
            onBack={() => setSelectedFlightId(null)}
            onSelectIncident={onSelectIncident}
            onQuickEvidence={onQuickEvidence}
          />
        ) : (
          <FlightInspectionsGridView
            onSelectFlight={(jobId) => setSelectedFlightId(jobId)}
          />
        )
      )}

      {/* MODE 2: CANONICAL INDIVIDUAL INCIDENTS QUEUE (PRESERVED) */}
      {queueMode === 'incidents' && (
        <div className="space-y-5">
          {/* Operational Status Views (Active / Completed / Rejected) */}
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

          {/* Flight Inspection Context Banner */}
          {filters.flightRunId && filters.flightRunId !== 'all' && flightDetail && (
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-3xl p-5 border border-zinc-700/60 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-full bg-emerald-500/5 blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                      <Plane className="w-3.5 h-3.5" />
                      <span>Flight Inspection #{flightDetail.summary.job_prefix}</span>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {flightDetail.summary.zone_code ? `Zone ${flightDetail.summary.zone_code}` : 'All Zones'}
                    </span>

                    {flightDetail.summary.total_hazards === 0 && (
                      <span
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-full border',
                          flightDetail.summary.status === 'CONFIRMED_CLEAR'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        )}
                      >
                        {flightDetail.summary.status === 'CONFIRMED_CLEAR'
                          ? 'CONFIRMED CLEAR (True Negative)'
                          : 'VERIFICATION REQUIRED'}
                      </span>
                    )}
                  </div>

                  <div>
                    {flightDetail.summary.total_hazards === 0 ? (
                      <p className="text-sm text-zinc-300 font-medium">
                        <strong className="text-white font-bold">Clean Flight Baseline:</strong> 0 physical hazards detected by AI vision across {flightDetail.summary.zone_code || 'the zone'}.
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-300 font-medium">
                        <strong className="text-white font-bold">
                          {flightDetail.summary.total_hazards} individual {flightDetail.summary.total_hazards === 1 ? 'hazard' : 'hazards'} detected
                        </strong>
                        {Object.keys(flightDetail.summary.class_counts).length > 0 && (
                          <span className="text-zinc-400">
                            {' '}— {Object.entries(flightDetail.summary.class_counts)
                              .map(([cls, count]) => `${count} ${cls.toLowerCase().replace('_', ' ')}`)
                              .join(' • ')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                  {flightDetail.summary.annotated_video_url && (
                    <Button
                      size="sm"
                      onClick={() => setVideoModalUrl(flightDetail.summary.annotated_video_url || null)}
                      className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Flight Video</span>
                    </Button>
                  )}

                  <button
                    onClick={() => onFilterChange({ ...filters, flightRunId: 'all' })}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Clear Flight Filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Match Counter Header */}
          <div className="flex items-center justify-between text-xs xl:text-sm font-semibold text-zinc-600 dark:text-zinc-400 px-1">
            <span>
              Showing{' '}
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {sortedIncidents.length}
              </span>{' '}
              {sortedIncidents.length === 1 ? 'incident' : 'incidents'}
              {filters.flightRunId && filters.flightRunId !== 'all' && flightDetail?.summary ? (
                <>
                  {' '}from <span className="font-bold text-zinc-900 dark:text-zinc-100">Flight #{flightDetail.summary.job_prefix}</span>
                </>
              ) : null}{' '}
              in <span className="capitalize font-bold text-zinc-900 dark:text-zinc-100">{currentTab}</span> view
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
            filters.flightRunId && filters.flightRunId !== 'all' && flightDetail?.summary.total_hazards === 0 ? (
              <EmptyState
                title={`Zero Hazards Detected on Flight #${flightDetail.summary.job_prefix}`}
                description={`This drone flight scan detected 0 physical hazards across ${flightDetail.summary.zone_code || 'the zone'}. Baseline roadway condition is clear.`}
                onResetFilters={() => onFilterChange({ ...filters, flightRunId: 'all' })}
              />
            ) : (
              <EmptyState
                title={tabConfig[currentTab].emptyTitle}
                description={
                  filters.flightRunId && filters.flightRunId !== 'all'
                    ? `No incidents matching '${currentTab}' view found for Flight #${flightDetail?.summary.job_prefix || ''}.`
                    : tabConfig[currentTab].emptyDesc
                }
                onResetFilters={onResetFilters}
              />
            )
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

          {/* Annotated Video Playback Modal */}
          {videoModalUrl && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 text-white">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold">
                      Flight Inspection #{flightDetail?.summary.job_prefix} — Annotated Footage
                    </h3>
                  </div>
                  <button
                    onClick={() => setVideoModalUrl(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={videoModalUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
