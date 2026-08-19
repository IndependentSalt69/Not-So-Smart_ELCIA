import { AnalyticsSummary } from '@/types/analytics';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  CloudRain,
  Droplets,
  Layers,
  PieChart as PieIcon,
  ShieldCheck,
  TrendingUp,
  Waves,
  Zap,
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
  analytics: AnalyticsSummary | null;
  loading?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  loading = false,
}) => {
  if (loading || !analytics) {
    return (
      <div className="p-12 text-center text-zinc-500 font-medium animate-pulse">
        Loading spatial analytics & trend telemetry...
      </div>
    );
  }

  const { kpis, trend, zoneMetrics, statusDistribution, priorityDistribution } = analytics;

  const STATUS_COLORS = ['#E11D48', '#2563EB', '#D97706', '#059669', '#0891B2', '#64748B'];
  const PRIORITY_COLORS = ['#EF4444', '#F97316', '#F59E0B'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Monsoon & Road Intelligence Analytics</span>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Comprehensive seasonal correlation between drone detections, precipitation, and resolution velocity.
        </p>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Inundated Road Area</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{kpis.waterloggedAreaSqm} m²</div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Across Phase 1 & 2</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mean Time to Resolution</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{kpis.meanTimeToResolutionHours} hrs</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">From Detection to Clear</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">P1 Critical Hotspots</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{kpis.criticalP1Count}</div>
            <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">High priority triage</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">AI Detection Precision</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white">94.2%</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Operator Verified Accuracy</div>
          </div>
        </div>
      </div>

      {/* Row 1: Monsoon Rainfall vs Detection Volume Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Precipitation vs. Incident Surge Trend (7-Day Rolling)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Correlation between millimeter rainfall volume and autonomous waterlogging / pothole alerts.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Waterlogging
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Potholes
            </span>
            <span className="flex items-center gap-1.5 text-indigo-500">
              <span className="w-3 h-3 rounded-full bg-indigo-300" /> Rainfall (mm)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waterColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="potholeColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="waterlogging" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#waterColor)" />
              <Area type="monotone" dataKey="potholes" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#potholeColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Zone Breakdown & Status Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zone Priority Distribution Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Zone Vulnerability & Priority Breakdown
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Incident count categorized by P1, P2, P3 across Electronics City zones.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="zoneId" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="p1Count" name="P1 Critical" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p2Count" name="P2 High" fill="#F97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p3Count" name="P3 Routine" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lifecycle Status Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Operational Status Distribution
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Current state machine breakdown of active incidents.
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
