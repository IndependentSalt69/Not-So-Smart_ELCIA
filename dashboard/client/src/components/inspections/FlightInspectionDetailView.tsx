import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { inspectionService } from '@/services/inspectionService';
import { incidentService } from '@/services/incidentService';
import { FlightInspectionRunDetailParsed } from '@/types/inspection';
import { Incident, IncidentType, PriorityLevel } from '@/types/incident';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { IncidentCardSkeleton } from '@/components/incidents/IncidentCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { SlidingSegmentedControl } from '@/components/incidents/IncidentFilters';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Plane,
  Play,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Search,
  X,
  LayoutGrid,
  ListFilter,
  ArrowUpDown,
  Droplets,
  Waves,
  Footprints,
  CircleDot,
  RefreshCw,
} from 'lucide-react';

interface FlightInspectionDetailViewProps {
  jobId: string;
  onBack: () => void;
  onSelectIncident: (incident: Incident) => void;
  onQuickEvidence?: (incident: Incident) => void;
  className?: string;
}

export const FlightInspectionDetailView: React.FC<FlightInspectionDetailViewProps> = ({
  jobId,
  onBack,
  onSelectIncident,
  onQuickEvidence,
  className,
}) => {
  const [detail, setDetail] = useState<FlightInspectionRunDetailParsed | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<string>('severity-desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<IncidentType | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'all'>('all');

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await inspectionService.getFlightRunDetail(jobId);
      setDetail(res);
    } catch (err: any) {
      console.error(`Failed to load flight inspection detail for ${jobId}:`, err);
      setError(err.message || 'Unable to retrieve flight inspection details from backend.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDetail();

    // Subscribe to live incident updates (e.g. status changes in IncidentDetailDrawer)
    const unsubscribe = incidentService.subscribe(() => {
      fetchDetail();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchDetail]);

  // Format timestamp truthfully
  const formatTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return 'Recorded';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recorded';
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      );
    } catch {
      return 'Recorded';
    }
  };

  // Filter & sort incidents strictly belonging to this flight
  const filteredIncidents = useMemo(() => {
    if (!detail) return [];

    let list = detail.incidents.filter((inc) => {
      // 1. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (inc.code || '').toLowerCase().includes(q);
        const matchesType = (inc.type || '').toLowerCase().includes(q);
        const matchesLoc = (inc.locationDescription || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesType && !matchesLoc) return false;
      }

      // 2. Hazard Type
      if (selectedType !== 'all' && inc.type !== selectedType) {
        return false;
      }

      // 3. Priority
      if (selectedPriority !== 'all' && inc.priority !== selectedPriority) {
        return false;
      }

      return true;
    });

    return list.sort((a, b) => {
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
  }, [detail, searchQuery, selectedType, selectedPriority, sortOption]);

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

  if (loading) {
    return (
      <div className={cn('space-y-5', className)} data-testid="flight-detail-loading">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 rounded-xl border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Flight Inspections</span>
          </Button>
        </div>
        <div className="h-40 rounded-3xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <IncidentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className={cn('space-y-5', className)} data-testid="flight-detail-error">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-9 px-3 rounded-xl border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Flight Inspections</span>
        </Button>
        <div className="p-8 rounded-3xl bg-red-950/20 border border-red-500/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Unable to Load Flight Details
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {error || 'Flight record not found on server.'}
          </p>
          <Button
            onClick={fetchDetail}
            size="sm"
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const { summary } = detail;
  const isZeroHazard = summary.total_hazards === 0 && detail.incidents.length === 0;

  return (
    <div className={cn('space-y-5', className)} data-testid="flight-inspection-detail-view">
      {/* Back Navigation Button */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          data-testid="back-to-flights-btn"
          className="h-9 px-3 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Flight Inspections</span>
        </Button>
      </div>

      {/* Flight Context Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-5 sm:p-6 border border-zinc-700/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <Plane className="w-3.5 h-3.5" />
                <span>Flight Inspection #{summary.job_prefix}</span>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>
                  {summary.zone_code === 'OTHER'
                    ? (summary.custom_zone_name || 'Other / Custom Zone')
                    : summary.zone_code
                      ? `Zone ${summary.zone_code}`
                      : 'Zone unavailable'}
                </span>
              </span>

              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{formatTimestamp(summary.completed_at || summary.created_at)}</span>
              </span>

              {isZeroHazard && (
                <span
                  className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full border',
                    summary.status === 'CONFIRMED_CLEAR'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  )}
                >
                  {summary.status === 'CONFIRMED_CLEAR'
                    ? 'CONFIRMED CLEAR (True Negative)'
                    : 'VERIFICATION REQUIRED'}
                </span>
              )}
            </div>

            <div>
              {isZeroHazard ? (
                <p className="text-sm text-zinc-300 font-medium">
                  <strong className="text-white font-bold">Clean Flight Baseline:</strong> 0 physical hazards detected by AI vision across {summary.zone_code || 'the zone'}.
                </p>
              ) : (
                <p className="text-sm text-zinc-300 font-medium">
                  <strong className="text-white font-bold">
                    {detail.incidents.length} individual {detail.incidents.length === 1 ? 'hazard' : 'hazards'} detected
                  </strong>
                  {Object.keys(summary.class_counts || {}).length > 0 && (
                    <span className="text-zinc-400">
                      {' '}— {Object.entries(summary.class_counts)
                        .filter(([_, cnt]) => cnt > 0)
                        .map(([cls, cnt]) => `${cnt} ${cls.toLowerCase().replace('_', ' ')}`)
                        .join(' • ')}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Action: Video Playback */}
          {summary.annotated_video_url && (
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                size="sm"
                onClick={() => setVideoModalUrl(summary.annotated_video_url || null)}
                data-testid="watch-flight-video-btn"
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Flight Video</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Filters & Controls (When incidents exist) */}
      {!isZeroHazard && detail.incidents.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 xl:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search incidents in this flight..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-10 rounded-2xl text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 w-full font-medium"
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

              {/* Sliding Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <SlidingSegmentedControl
                  items={typeItems}
                  value={selectedType}
                  onChange={setSelectedType}
                />
                <SlidingSegmentedControl
                  items={priorityItems}
                  value={selectedPriority}
                  onChange={setSelectedPriority}
                />
              </div>
            </div>

            {/* Bottom Controls: Sort & Layout Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <span className="text-xs xl:text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Showing{' '}
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {filteredIncidents.length}
                </span>{' '}
                of{' '}
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {detail.incidents.length}
                </span>{' '}
                hazards in Flight #{summary.job_prefix}
              </span>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <div className="w-48">
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="h-9 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity-desc" className="text-xs">Severity: High to Low</SelectItem>
                      <SelectItem value="severity-asc" className="text-xs">Severity: Low to High</SelectItem>
                      <SelectItem value="time-desc" className="text-xs">Newest Detected</SelectItem>
                      <SelectItem value="time-asc" className="text-xs">Oldest Detected</SelectItem>
                      <SelectItem value="confidence-desc" className="text-xs">Highest AI Confidence</SelectItem>
                      <SelectItem value="priority-p1" className="text-xs">Priority: P1 Critical First</SelectItem>
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
          </div>
        </div>
      )}

      {/* Incidents Grid/List or Zero-Hazard Empty State */}
      {isZeroHazard ? (
        <EmptyState
          title={`Clean Flight Baseline — Flight #${summary.job_prefix}`}
          description={`0 physical roadway hazards detected by AI vision during this flight across ${summary.zone_code ? `Zone ${summary.zone_code}` : 'designated surveillance zone'}. Verification status is currently ${summary.status === 'CONFIRMED_CLEAR' ? 'Confirmed Clear (True Negative)' : 'Verification Required'}.`}
          onResetFilters={onBack}
        />
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          title="No incidents match the selected filters"
          description="Try resetting your search query or hazard type filters for this flight."
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedType('all');
            setSelectedPriority('all');
          }}
        />
      ) : layoutMode === 'grid' ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6"
          data-testid="flight-incidents-grid"
        >
          {filteredIncidents.map((incident) => (
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
        <div className="space-y-3" data-testid="flight-incidents-list">
          {filteredIncidents.map((incident) => (
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
                  Flight Inspection #{summary.job_prefix} — Annotated Footage
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
  );
};
