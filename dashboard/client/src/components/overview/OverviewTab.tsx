import { Incident, IncidentFilters } from '@/types/incident';
import { AnalyticsSummary } from '@/types/analytics';
import { Button } from '@/components/ui/button';
import React from 'react';
import { KpiSummaryGrid } from './KpiSummaryGrid';
import { MiniMapWidget } from './MiniMapWidget';
import { RecentAlertsFeed } from './RecentAlertsFeed';

interface OverviewTabProps {
  incidents: Incident[];
  analytics?: AnalyticsSummary | null;
  onSelectIncident: (incident: Incident) => void;
  onNavigateView: (view: 'overview' | 'queue' | 'map' | 'analytics' | 'ingest') => void;
  onApplyFilter: (filters: Partial<IncidentFilters>) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  incidents,
  analytics,
  onSelectIncident,
  onNavigateView,
  onApplyFilter,
}) => {
  const handleKpiFilterClick = (filterType: string, value: string) => {
    if (filterType === 'priority') {
      onApplyFilter({ priority: value as any });
      onNavigateView('queue');
    } else if (filterType === 'type') {
      onApplyFilter({ type: value as any });
      onNavigateView('queue');
    } else if (filterType === 'status') {
      onApplyFilter({ status: value as any });
      onNavigateView('queue');
    } else {
      onNavigateView('queue');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Operational Banner */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="space-y-5 max-w-4xl">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              CivicPulse Operations Command Center
            </h1>
            <p className="text-base sm:text-lg lg:text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              Automated aerial monitoring for civic hazard detection & response
            </p>
          </div>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            Automated aerial computer-vision monitoring for rapid waterlogging mitigation, pothole triage, and automated civic response across Electronics City Phase 1 & 2 corridors.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button
              type="button"
              onClick={() => onNavigateView('ingest')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base px-5 py-2.5 h-auto rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Upload & Analyze Video
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => onNavigateView('queue')}
              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-sm sm:text-base px-5 py-2.5 h-auto rounded-xl transition-colors cursor-pointer"
            >
              View Incident Queue
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Summary Grid */}
      <section>
        <KpiSummaryGrid kpis={analytics?.kpis} onFilterClick={handleKpiFilterClick} />
      </section>

      {/* Middle Two-Column Grid: Map Preview + Recent Detections Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 min-h-[460px] xl:min-h-[520px] 2xl:min-h-[580px] flex flex-col">
          <MiniMapWidget
            incidents={incidents}
            onOpenFullMap={() => onNavigateView('map')}
            onSelectIncident={onSelectIncident}
          />
        </div>

        <div className="lg:col-span-7 min-h-[460px] xl:min-h-[520px] 2xl:min-h-[580px] flex flex-col">
          <RecentAlertsFeed
            incidents={incidents}
            onSelectIncident={onSelectIncident}
            onViewAllClick={() => onNavigateView('queue')}
          />
        </div>
      </section>
    </div>
  );
};
