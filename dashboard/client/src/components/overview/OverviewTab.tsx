import { Incident, IncidentFilters } from '@/types/incident';
import { AnalyticsSummary } from '@/types/analytics';
import { CloudRain, ShieldCheck, Sparkles, Zap } from 'lucide-react';
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        {/* Decorative background glow elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide">
              <CloudRain className="w-3.5 h-3.5" />
              <span>Monsoon Season Surveillance • Active Aerial Patrol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              CivicPulse Operations Command Center
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Real-time drone computer-vision monitoring for rapid waterlogging mitigation, pothole triage, and automated civic response across Electronics City Phase 1 & 2 corridors.
            </p>
          </div>

          {/* Live Dispatch Readiness Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-300">Mean Resolution Velocity</div>
              <div className="text-xl font-black text-white">1.4 Hours</div>
              <div className="text-[11px] text-emerald-300 font-medium mt-0.5">
                ↓ 38% vs. manual inspection
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
        <div className="lg:col-span-5 h-[380px]">
          <MiniMapWidget
            incidents={incidents}
            onOpenFullMap={() => onNavigateView('map')}
            onSelectIncident={onSelectIncident}
          />
        </div>

        <div className="lg:col-span-7 h-[380px]">
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
