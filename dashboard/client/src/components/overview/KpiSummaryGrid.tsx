import { KpiMetrics } from '@/types/analytics';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Droplets, Eye, ShieldAlert, Waves } from 'lucide-react';
import React from 'react';

interface KpiSummaryGridProps {
  kpis?: KpiMetrics;
  onFilterClick?: (filterType: string, value: string) => void;
}

export const KpiSummaryGrid: React.FC<KpiSummaryGridProps> = ({ kpis, onFilterClick }) => {
  const cards = [
    {
      id: 'active',
      title: 'Total Active Incidents',
      value: kpis?.totalActiveIncidents ?? 0,
      subtext: 'Across Electronics City Phase 1 & 2',
      icon: ShieldAlert,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60',
      borderColor: 'hover:border-blue-300 dark:hover:border-blue-700',
      filterType: 'status',
      filterValue: 'all',
    },
    {
      id: 'p1',
      title: 'P1 Critical Incidents',
      value: kpis?.criticalP1Count ?? 0,
      subtext: 'Arterial blockages / Deep craters',
      icon: AlertCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-950/60',
      borderColor: 'border-red-200/80 dark:border-red-900/50 hover:border-red-400',
      badge: 'Immediate Dispatch',
      badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/80 dark:text-red-200',
      filterType: 'priority',
      filterValue: 'P1',
    },
    {
      id: 'p2',
      title: 'P2 High Priority',
      value: kpis?.highP2Count ?? 0,
      subtext: 'Lane bottlenecks & potholes',
      icon: AlertTriangle,
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-950/60',
      borderColor: 'hover:border-orange-300 dark:hover:border-orange-700',
      filterType: 'priority',
      filterValue: 'P2',
    },
    {
      id: 'p3',
      title: 'P3 Routine Incidents',
      value: kpis?.routineP3Count ?? 0,
      subtext: 'Minor shoulder ponding',
      icon: CheckCircle2,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60',
      borderColor: 'hover:border-amber-300 dark:hover:border-amber-700',
      filterType: 'priority',
      filterValue: 'P3',
    },
    {
      id: 'waterlogging',
      title: 'Waterlogged Surface',
      value: `${kpis?.waterloggedAreaSqm ?? 0} m²`,
      subtext: 'Active road inundation area',
      icon: Waves,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/60',
      borderColor: 'hover:border-cyan-300 dark:hover:border-cyan-700',
      filterType: 'type',
      filterValue: 'waterlogging',
    },
    {
      id: 'pending',
      title: 'Awaiting Human Verification',
      value: kpis?.pendingVerificationCount ?? 0,
      subtext: 'New autonomous drone detections',
      icon: Eye,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60',
      borderColor: 'border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400',
      badge: 'Requires Action',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-200 animate-pulse',
      filterType: 'status',
      filterValue: 'DETECTED',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-5 2xl:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onFilterClick && onFilterClick(card.filterType, card.filterValue)}
            className={`relative p-4 xl:p-5 2xl:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between ${card.borderColor}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor} transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5 xl:w-6 xl:h-6" />
                </div>
                {card.badge && (
                  <span className={`text-[10px] xl:text-xs font-bold px-2.5 py-0.5 rounded-full ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-zinc-900 dark:text-white mb-1">
                {card.value}
              </div>
              <div className="text-xs xl:text-sm font-semibold text-zinc-700 dark:text-zinc-300 line-clamp-1">
                {card.title}
              </div>
            </div>
            <div className="text-[11px] xl:text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium line-clamp-1">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
