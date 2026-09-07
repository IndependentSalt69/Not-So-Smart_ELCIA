import React, { useEffect, useState } from 'react';
import { FlightInspectionRunSummary } from '@/types/inspection';
import { inspectionService } from '@/services/inspectionService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  History,
  Plane,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Layers,
} from 'lucide-react';

interface FlightRunHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeJobId?: string | null;
  onSelectRun: (jobId: string) => void;
  zoneId?: string;
}

export const FlightRunHistoryDrawer: React.FC<FlightRunHistoryDrawerProps> = ({
  isOpen,
  onClose,
  activeJobId,
  onSelectRun,
  zoneId,
}) => {
  const [runs, setRuns] = useState<FlightInspectionRunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRuns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await inspectionService.listFlightRuns({
        zone_id: zoneId,
        limit: 50,
      });
      setRuns(res.items || []);
    } catch (err: any) {
      console.error('Failed to fetch flight history runs:', err);
      setError(err.message || 'Failed to load historical flight runs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRuns();
    }
  }, [isOpen, zoneId]);

  const filteredRuns = runs.filter((run) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesPrefix = (run.job_prefix || '').toLowerCase().includes(q);
    const matchesId = (run.job_id || '').toLowerCase().includes(q);
    const matchesZone = (run.zone_code || '').toLowerCase().includes(q);
    return matchesPrefix || matchesId || matchesZone;
  });

  const formatTimestamp = (isoStr?: string | null) => {
    if (!isoStr) return 'Not recorded';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Not recorded';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Not recorded';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800"
        data-testid="flight-history-drawer"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <History className="w-4 h-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Flight Inspection History
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  Browse historical drone inspection runs & batches
                </SheetDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchRuns}
              disabled={isLoading}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Refresh flight history"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Search flight ID or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700"
              data-testid="flight-history-search-input"
            />
          </div>
        </SheetHeader>

        {/* Runs List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading && runs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-zinc-500">Loading flight inspection runs...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="text-xs font-semibold">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchRuns} className="text-xs h-7">
                Retry
              </Button>
            </div>
          ) : filteredRuns.length > 0 ? (
            filteredRuns.map((run) => {
              const isActive = run.job_id === activeJobId || run.job_prefix === activeJobId;
              const isZero = run.total_hazards === 0;

              return (
                <div
                  key={run.job_id}
                  onClick={() => {
                    onSelectRun(run.job_id);
                    onClose();
                  }}
                  className={cn(
                    'group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none space-y-2',
                    isActive
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/80 shadow-xs'
                      : 'bg-white dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/60 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-2xs'
                  )}
                  data-testid={`flight-history-item-${run.job_prefix}`}
                >
                  {/* Row Top: Prefix, Zone, Active indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                        <Plane className="w-3 h-3" />
                      </div>
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        #{run.job_prefix}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                        {run.zone_code === 'OTHER'
                          ? (run.custom_zone_name || 'Other')
                          : (run.zone_code || 'N/A')}
                      </span>
                    </div>

                    {isActive ? (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Active Run
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>

                  {/* Row Bottom: Hazards Count & Timestamp */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-700/50">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {isZero ? '0 Hazards (Clear)' : `${run.total_hazards} Hazards Detected`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formatTimestamp(run.completed_at || run.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-500 space-y-1">
              <Layers className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold">No historical flight runs found</p>
              <p className="text-[11px] text-zinc-400">Completed video processing jobs will appear here.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
