import { Incident, IncidentFilters } from '@/types/incident';
import { AnalyticsSummary } from '@/types/analytics';
import { CloudRain, ShieldCheck, Sparkles, TrendingDown, Zap } from 'lucide-react';
import React from 'react';
import { KpiSummaryGrid } from './KpiSummaryGrid';
import { MiniMapWidget } from './MiniMapWidget';
import { RecentAlertsFeed } from './RecentAlertsFeed';

interface OverviewTabProps {
  incidents: Incident[];
  analytics?: AnalyticsSummary | null;
  onSelectIncident: (incident: Incident) => void;
  onNavigateView: (view: 'overview' | 'queue' | 'map' | 'analytics') => void;
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-zinc-900 to-emerald-950/70 text-white p-6 sm:p-8 xl:p-10 2xl:p-12 shadow-md border border-zinc-800/80">
        {/* Decorative background glow elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs xl:text-sm font-semibold tracking-wide">
              <CloudRain className="w-4 h-4" />
              <span>Monsoon Season Surveillance • Active Aerial Patrol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-white leading-tight">
              CivicPulse Operations Command Center
            </h1>
            <p className="text-sm xl:text-base 2xl:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Real-time drone computer-vision monitoring for rapid waterlogging mitigation, pothole triage, and automated civic response across Electronics City Phase 1 & 2 corridors.
            </p>
          </div>

          {/* Live Dispatch Readiness Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 xl:p-6 border border-white/15 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-7 h-7 xl:w-8 xl:h-8" />
            </div>
            <div>
              <div className="text-xs xl:text-sm font-semibold text-slate-300">Mean Resolution Velocity</div>
              <div className="text-2xl xl:text-3xl font-black font-mono text-white">1.4 Hours</div>
              <div className="text-xs text-emerald-300 font-bold mt-0.5 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>38% vs. manual inspection</span>
              </div>
            </div>
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
