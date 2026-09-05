import { PriorityBadge } from '@/components/common/PriorityBadge';
import { cn } from '@/lib/utils';
import { formatPersistenceDuration } from '@/services/incidentService';
import { Incident } from '@/types/incident';
import { AlertCircle, CheckCircle2, Clock, Droplets, Info, Route, ShieldAlert, Sparkles } from 'lucide-react';
import React from 'react';

interface SeverityExplainerProps {
  incident: Incident;
}

export const SeverityExplainer: React.FC<SeverityExplainerProps> = ({ incident }) => {
  const { severityFactors } = incident;

  const factors = [
    {
      id: 'waterExtent',
      name: 'Water Extent & Road Surface Area',
      score: severityFactors.waterExtent,
      label: severityFactors.waterExtentLabel || `${severityFactors.waterExtent * 10}% surface coverage`,
      icon: Droplets,
      color: 'bg-teal-500',
      textColor: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
    },
    {
      id: 'persistence',
      name: 'Temporal Persistence & Duration',
      score:
        severityFactors.persistenceSeconds !== null && severityFactors.persistenceSeconds !== undefined
          ? Math.min(10, (severityFactors.persistenceSeconds / 300) * 10)
          : 0,
      label:
        severityFactors.persistenceSeconds !== null && severityFactors.persistenceSeconds !== undefined
          ? `${formatPersistenceDuration(severityFactors.persistenceSeconds)} continuous verification`
          : 'Continuous verification: N/A',
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      id: 'obstruction',
      name: 'Road Obstruction & Lane Blockage',
      score: severityFactors.roadObstruction,
      label: severityFactors.roadObstructionLabel || `Level ${severityFactors.roadObstruction}/10 blockage`,
      icon: ShieldAlert,
      color: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      id: 'criticality',
      name: 'Corridor & Junction Criticality',
      score: severityFactors.roadCriticality,
      label: severityFactors.roadCriticalityLabel || `Arterial factor ${severityFactors.roadCriticality}/10`,
      icon: Route,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-4">
      {/* Header with Overall Score & Priority */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-sm xl:text-base font-bold text-zinc-900 dark:text-white">
              AI Severity & Priority Explainability
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Multi-factor sensor fusion model (4 contributing vectors)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
              Severity Score
            </div>
            <div className="text-xl xl:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {incident.severity.toFixed(1)} <span className="text-xs font-semibold text-zinc-400">/ 10</span>
            </div>
          </div>
          <PriorityBadge priority={incident.priority} />
        </div>
      </div>

      {/* 4 Factor Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {factors.map((factor) => {
          const Icon = factor.icon;
          return (
            <div
              key={factor.id}
              className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', factor.bgColor, factor.textColor)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs xl:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {factor.name}
                  </span>
                </div>
                <span className="font-mono text-xs xl:text-sm font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                  {factor.score.toFixed(1)} / 10
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(factor.score / 10) * 100}%` }}
                  className={cn('h-full rounded-full transition-all duration-300', factor.color)}
                />
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate">
                {factor.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reasoning List */}
      {severityFactors.explanation && severityFactors.explanation.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
          <div className="flex items-center gap-1.5 text-xs xl:text-sm font-bold text-zinc-800 dark:text-zinc-200">
            <Info className="w-4 h-4 text-emerald-500" />
            <span>Operational Reasoning Summary</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {severityFactors.explanation.map((exp, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs xl:text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
