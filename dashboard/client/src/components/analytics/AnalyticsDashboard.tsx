import { AnalyticsSummary } from '@/types/analytics';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Droplets,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
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

// Custom Tooltip for Donut Chart with high contrast white text and color bullet
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs space-y-1 z-50">
        <div className="flex items-center gap-2 font-bold">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: data.payload.fill || data.color }}
          />
          <span className="text-slate-200 font-semibold">{data.name || data.payload.status}:</span>
          <span className="font-mono font-black text-emerald-400 text-sm ml-auto">
            {data.value}
          </span>
        </div>
        {data.payload.percentage && (
          <div className="text-[10px] text-slate-400 font-mono pl-5">
            {data.payload.percentage}% of active lifecycle
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Monsoon Trend Area Chart
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs space-y-2 z-50 min-w-[170px]">
        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 font-mono text-[11px]">
          📅 {label}
        </div>
        <div className="space-y-1">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium capitalize">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold text-white text-xs">
                {item.value} {item.name === 'rainfall' ? 'mm' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Zone Breakdown Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs space-y-2 z-50 min-w-[170px]">
        <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1 font-mono text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>Zone {label}</span>
        </div>
        <div className="space-y-1">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold text-white text-xs">
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
        <p className="font-semibold text-sm">Synthesizing telemetry analytics...</p>
      </div>
    );
  }

  const { kpis, trend, zoneMetrics, statusDistribution } = analytics;

  const STATUS_COLORS = ['#E11D48', '#0D9488', '#D97706', '#059669', '#0891B2', '#64748B'];
  const totalStatusCount = statusDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Monsoon & Road Intelligence Analytics</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Comprehensive seasonal correlation between drone detections, precipitation, and resolution velocity.
        </p>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Inundated Road Area</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white">{kpis.waterloggedAreaSqm} m²</div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">Across Phase 1 & 2</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mean Time to Resolution</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white">{kpis.meanTimeToResolutionHours} hrs</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">From Detection to Clear</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">P1 Critical Hotspots</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white">{kpis.criticalP1Count}</div>
            <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold">High priority triage</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">AI Detection Precision</div>
            <div className="text-2xl xl:text-3xl font-black font-mono text-zinc-900 dark:text-white">94.2%</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Operator Verified Accuracy</div>
          </div>
        </div>
      </div>

      {/* Row 1: Monsoon Rainfall vs Detection Volume Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Precipitation vs. Incident Surge Trend (7-Day Rolling)
            </h3>
            <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Correlation between millimeter rainfall volume and autonomous waterlogging / pothole alerts.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <span className="w-3 h-3 rounded-full bg-teal-500" /> Waterlogging
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Potholes
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 rounded-full bg-slate-400" /> Rainfall (mm)
            </span>
          </div>
        </div>

        <div className="h-72 xl:h-96 2xl:h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
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
            <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Incident count categorized by P1, P2, P3 across Electronics City zones.
            </p>
          </div>

          <div className="h-72 xl:h-80 2xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="zoneId" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
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
            <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Current state machine breakdown of active incidents.
            </p>
          </div>

          {/* Donut Chart with Center Metric Counter */}
          <div className="relative h-72 xl:h-80 2xl:h-96 w-full flex items-center justify-center">
            {/* Center Summary Counter inside Donut Ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none pb-8">
              <span className="text-3xl xl:text-4xl font-black font-mono text-zinc-900 dark:text-white tracking-tight">
                {totalStatusCount}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
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
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                  formatter={(value) => <span className="text-zinc-700 dark:text-zinc-300 font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
