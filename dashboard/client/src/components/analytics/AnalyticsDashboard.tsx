import { AnalyticsSummary } from '@/types/analytics';
import { IncidentType } from '@/types/incident';
import {
  BarChart3,
  Calendar,
  Clock,
  Filter,
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
  onSelectType?: (type: IncidentType) => void;
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

// Custom Tooltip for Trend Area Chart
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-white text-sm space-y-2.5 z-50 min-w-[200px]">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 font-mono text-xs flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label}</span>
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

// Custom Tooltip for Bar Chart
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

// Custom Tooltip for Type Horizontal Bar Chart
const CustomTypeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-sm space-y-1 z-50">
        <div className="flex items-center gap-2.5 font-bold">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-slate-200">{item.name}:</span>
          <span className="font-mono font-black text-emerald-400 text-base ml-auto">{item.count}</span>
        </div>
        <div className="text-xs text-zinc-400 font-medium">Click to filter Incident Queue by {item.name}</div>
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics, loading, onSelectType }) => {
  if (loading || !analytics) {
    return (
      <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-base">Loading analytics data...</p>
      </div>
    );
  }

  const { kpis, trend, zoneMetrics, statusDistribution, typeDistribution } = analytics;

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
          <span>Civic Issue Analytics</span>
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Operational issue trends, urgency metrics, and canonical issue type breakdown.
        </p>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Waves className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Total Waterlogged Surface</div>
            <div className="text-3xl xl:text-4xl font-black font-mono text-zinc-900 dark:text-white my-1">{waterloggedDisplay}</div>
            <div className="text-xs text-teal-600 dark:text-teal-400 font-bold">Estimated flood extent</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Average Time to Resolve</div>
            <div className="text-3xl xl:text-4xl font-black font-mono text-zinc-900 dark:text-white my-1">{meanResolutionDisplay}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">From detection to completion</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">High Urgency Issues</div>
            <div className="text-3xl xl:text-4xl font-black font-mono text-zinc-900 dark:text-white my-1">{kpis.criticalP1Count}</div>
            <div className="text-xs text-red-600 dark:text-red-400 font-bold">Requires immediate action</div>
          </div>
        </div>

        <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs xl:text-sm font-bold text-zinc-500 dark:text-zinc-400">Total Active Issues</div>
            <div className="text-3xl xl:text-4xl font-black font-mono text-zinc-900 dark:text-white my-1">{kpis.totalActiveIncidents}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Unresolved reported issues</div>
          </div>
        </div>
      </div>

      {/* Row 1: Issues Over Time */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Issues Over Time
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Daily issue counts across all 5 civic hazard types over the past 7 days.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 text-xs xl:text-sm font-bold">
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <span className="w-3 h-3 rounded-full bg-teal-500" /> Waterlogging
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Potholes
            </span>
            <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <span className="w-3 h-3 rounded-full bg-cyan-500" /> Drainage Overflow
            </span>
            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <span className="w-3 h-3 rounded-full bg-orange-500" /> Damaged Footpath
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-500" /> Open Manhole
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
                <linearGradient id="drainageColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="footpathColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="manholeColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" dy={4} />
              <YAxis tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" />
              <Tooltip content={<CustomTrendTooltip />} />
              <Area type="monotone" name="Waterlogging" dataKey="waterlogging" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#waterColor)" />
              <Area type="monotone" name="Potholes" dataKey="potholes" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#potholeColor)" />
              <Area type="monotone" name="Drainage Overflow" dataKey="drainage_overflow" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#drainageColor)" />
              <Area type="monotone" name="Damaged Footpath" dataKey="damaged_footpath" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#footpathColor)" />
              <Area type="monotone" name="Open Manhole" dataKey="open_manhole" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#manholeColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Issues by Type + Issues by Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Issues by Type (Horizontal Bar Chart) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Issues by Type
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Total issues detected for each canonical CivicPulse hazard type.
              </p>
            </div>
            {onSelectType && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Click bar to filter queue
              </span>
            )}
          </div>

          <div className="h-64 xl:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeDistribution || []}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 13, fontWeight: 600, fill: '#334155' }}
                  stroke="#94a3b8"
                  width={130}
                />
                <Tooltip content={<CustomTypeTooltip />} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {(typeDistribution || []).map((entry, index) => (
                    <Cell
                      key={`type-cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onSelectType && onSelectType(entry.type)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Urgency (Bar Chart) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
          <div>
            <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              Issues by Urgency
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Incident count categorized by High, Medium, and Low urgency across operational zones.
            </p>
          </div>

          <div className="h-64 xl:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="zoneCode" tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" dy={4} />
                <YAxis tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="p1Count" name="High Urgency" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p2Count" name="Medium Urgency" fill="#F97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p3Count" name="Low Urgency" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Operational Status Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 xl:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base xl:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
            Operational Status Breakdown
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            Current resolution lifecycle distribution of reported issues.
          </p>
        </div>

        <div className="relative h-72 xl:h-80 w-full flex items-center justify-center">
          <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none z-10 select-none">
            <span className="text-zinc-900 dark:text-white font-black font-mono text-3xl xl:text-4xl leading-none">
              {totalStatusCount}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[11px] xl:text-xs tracking-wider mt-1">
              Total Issues
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="42%"
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
  );
};
