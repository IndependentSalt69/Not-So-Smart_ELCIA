import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, BarChart3, Clock, Layers, MapPin, Radio, ShieldAlert, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export type DashboardView = 'overview' | 'queue' | 'map' | 'analytics' | 'ingest';

interface NavbarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  pendingCount?: number;
  criticalCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onViewChange,
  pendingCount = 0,
  criticalCount = 0,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  interface NavItem {
    id: DashboardView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'queue', label: 'Incidents Queue', icon: Layers, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'map', label: 'Incident Map', icon: MapPin, badge: criticalCount > 0 ? `${criticalCount} P1` : undefined },
    { id: 'ingest', label: 'AI Ingest Studio', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
        <div className="flex items-center justify-between h-16 xl:h-18">
          {/* Brand and ELCIA Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-white/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                  CivicPulse
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                  ELCIA 2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden sm:block">
                Monsoon & Road Intelligence • Electronics City
              </p>
            </div>
          </div>

          {/* Desktop Navigation Switcher Tabs */}
          <nav className="hidden md:flex items-center p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id as DashboardView)}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 select-none cursor-pointer',
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-blue-600 dark:text-blue-400' : '')} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                        item.id === 'map'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Telemetry & Live Clock (Desktop & Mobile Status) */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="hidden sm:inline">Drone Swarm Active (4/4)</span>
              <span className="sm:hidden font-mono font-bold">4/4 Swarm</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{timeStr || '00:00:00 IST'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Tab Bar */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 border-t border-zinc-100 dark:border-zinc-800/60 -mx-4 px-4 bg-white/95 dark:bg-zinc-950/95">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as DashboardView)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border select-none cursor-pointer',
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                    : 'bg-zinc-100/80 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-blue-400 dark:text-blue-600' : '')} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.2 rounded-full font-bold',
                      item.id === 'map'
                        ? 'bg-red-500 text-white'
                        : isActive
                        ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
