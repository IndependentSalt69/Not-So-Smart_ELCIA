import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { ArrowRight, Clock, Droplet, Eye, ShieldAlert } from 'lucide-react';
import React from 'react';

interface RecentAlertsFeedProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onViewAllClick: () => void;
}

export const RecentAlertsFeed: React.FC<RecentAlertsFeedProps> = ({
  incidents,
  onSelectIncident,
  onViewAllClick,
}) => {
  const recentList = incidents.slice(0, 8);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/60 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Live Detections Feed
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAllClick}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2"
        >
          <span>View Queue</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 flex-1 overflow-y-auto pr-1">
        {recentList.map((incident) => {
          const isWater = incident.type === 'waterlogging';
          return (
            <div
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              className="py-3 px-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-xs mt-0.5 ${isWater
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                    }`}
                >
                  {isWater ? '🌊' : '⚠️'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {incident.id}
                    </span>
                    <PriorityBadge priority={incident.priority} />
                    <StatusBadge status={incident.status} />
                  </div>

                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {incident.locationDescription}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{incident.zoneId}</span>
                    <span>•</span>
                    <span>AI Conf: {Math.round(incident.confidence * 100)}%</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formatTimeAgo(incident.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 text-xs font-medium px-2.5 rounded-lg border-zinc-300 dark:border-zinc-700"
              >
                <Eye className="w-3 h-3 mr-1" />
                Inspect
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
