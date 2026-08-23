import { AnalyticsSummary } from '@/types/analytics';
import {
  BarChart3,
  Clock,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Waves,
} from 'lucide-react';
import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AnalyticsDashboardProps {
  analytics?: AnalyticsSummary | null;
  loading?: boolean;
}

// Custom Tooltip for Donut Chart
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-sm space-y-1.5 z-50">
        <div className="flex items-center gap-2.5 font-bold">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: data.payload.fill || data.color }}
          />
          <span className="text-slate-200 font-bold">{data.name || data.payload.status}:</span>
          <span className="font-mono font-black text-emerald-400 text-base ml-auto">
            {data.value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Monsoon Trend Area Chart
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-white text-sm space-y-2.5 z-50 min-w-[200px]">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 font-mono text-xs">
          📅 {label}
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any, idx: number) => {
            const valDisplay =
              item.value !== null && item.value !== undefined
                ? `${item.value} ${item.name === 'rainfall' ? 'mm' : ''}`
                : 'N/A';
            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs xl:text-sm">
                <span className="flex items-center gap-2 text-slate-300 font-semibold capitalize">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}:
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {valDisplay}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Zone Breakdown Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const zoneName = payload[0]?.payload?.zoneName || label;
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-white text-sm space-y-2.5 z-50 min-w-[220px]">
        <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1.5 font-mono text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{zoneName}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs xl:text-sm">
              <span className="flex items-center gap-2 text-slate-300 font-semibold">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold text-white text-sm">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, loading }) => {
  if (loading || !analytics) {
    return (
      <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-base">Synthesizing telemetry analytics...</p>
      </div>
    );
  }

  const { kpis, trend, zoneMetrics, statusDistribution } = analytics;

  const STATUS_COLORS = ['#E11D48', '#0D9488', '#D97706', '#059669', '#0891B2', '#64748B', '#EF4444'];
  const totalStatusCount = statusDistribution.reduce((acc, curr) => acc + curr.count, 0);

  const waterloggedDisplay =
    kpis.waterloggedAreaSqm !== null && kpis.waterloggedAreaSqm !== undefined
      ? `${kpis.waterloggedAreaSqm} m²`
      : 'N/A';

  const meanResolutionDisplay =
    kpis.meanTimeToResolutionHours !== null && kpis.meanTimeToResolutionHours !== undefined
      ? `${kpis.meanTimeToResolutionHours} hrs`
      : 'N/A';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl xl:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Monsoon & Road Intelligence Analytics</span>
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Comprehensive seasonal telemetry aggregated live from PostgreSQL backend tables.
        </p>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Waves className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Total Inundated Road Area</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white my-0.5">{waterloggedDisplay}</div>
            <div className="text-xs text-teal-600 dark:text-teal-400 font-bold">Physical area not measured</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Mean Time to Resolution</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white my-0.5">{meanResolutionDisplay}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">From Detection to Clear</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">P1 Critical Hotspots</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white my-0.5">{kpis.criticalP1Count}</div>
            <div className="text-xs text-red-600 dark:text-red-400 font-bold">High priority triage</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Active Incidents</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white my-0.5">{kpis.totalActiveIncidents}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Unresolved Live Incidents</div>
          </div>
        </div>
      </div>

      {/* Row 1: Daily Incident Surge Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Daily Incident Surge Trend (7-Day Window)
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Live backend daily incident aggregation for waterlogging vs. potholes.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs xl:text-sm font-bold">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <span className="w-3 h-3 rounded-full bg-teal-500" /> Waterlogging
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Potholes
            </span>
          </div>
        </div>

        <div className="h-72 xl:h-96 2xl:h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="waterColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="potholeColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" dy={4} />
              <YAxis tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" />
              <Tooltip content={<CustomTrendTooltip />} />
              <Area type="monotone" name="Waterlogging" dataKey="waterlogging" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#waterColor)" />
              <Area type="monotone" name="Potholes" dataKey="potholes" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#potholeColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Zone Breakdown & Status Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zone Priority Distribution Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Zone Vulnerability & Priority Breakdown
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Incident count categorized by P1, P2, P3 across operational zones.
            </p>
          </div>

          <div className="h-72 xl:h-80 2xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="zoneCode" tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" dy={4} />
                <YAxis tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="p1Count" name="P1 Critical" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p2Count" name="P2 High" fill="#F97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p3Count" name="P3 Routine" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lifecycle Status Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Operational Status Distribution
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Current state machine breakdown of incidents.
            </p>
          </div>

          <div className="relative h-72 xl:h-80 2xl:h-96 w-full flex items-center justify-center">
            {/* Absolute Center Overlay for Donut Hole Label */}
            <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none z-10 select-none">
              <span className="text-zinc-900 dark:text-white font-black font-mono text-3xl xl:text-4xl leading-none">
                {totalStatusCount}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[11px] xl:text-xs tracking-wider mt-1">
                Total Events
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || STATUS_COLORS[index % STATUS_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '12px' }}
                  iconType="circle"
                  formatter={(value) => <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
