import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Menu,
  Radio,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const buttonRefs = React.useRef<Map<DashboardView, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

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

  // Update sliding indicator position whenever activeView changes or window resizes
  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = buttonRefs.current.get(activeView);
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    // Allow fonts/layout to settle
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeView]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  interface NavItem {
    id: DashboardView;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      description: 'Command center KPIs & live issue alerts feed',
      icon: Activity,
    },
    {
      id: 'queue',
      label: 'Incident Queue',
      description: 'Manage, verify & dispatch repair teams',
      icon: Layers,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'map',
      label: 'Issue Map',
      description: 'Interactive map of reported issues',
      icon: MapPin,
      badge: criticalCount > 0 ? `${criticalCount} High` : undefined,
    },
    {
      id: 'ingest',
      label: 'Upload & Analyze',
      description: 'Upload drone video to detect civic issues',
      icon: Sparkles,
      badge: 'AI',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Issue trends, urgency, and type breakdown',
      icon: BarChart3,
    },
  ];

  const handleNavClick = (id: DashboardView) => {
    onViewChange(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl shadow-xs transition-colors duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
          <div className="flex items-center justify-between h-16 xl:h-20">
            {/* Brand and ELCIA Badge */}
            <div className="flex items-center gap-3.5">
              {/* Mobile Hamburger Trigger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer shadow-xs"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20 shrink-0 hover:scale-105 transition-transform duration-300">
                <Radio className="w-5 h-5 xl:w-5.5 xl:h-5.5 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-lg xl:text-xl tracking-tight text-zinc-900 dark:text-white">
                    CivicPulse
                  </span>
                  <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-700/80 shadow-2xs">
                    ELCIA 2026
                  </span>
                </div>
                <p className="text-xs xl:text-sm text-zinc-500 dark:text-zinc-400 font-semibold hidden sm:block tracking-tight">
                  Autonomous Aerial Monsoon & Road Intelligence
                </p>
              </div>
            </div>

            {/* Desktop Navigation Switcher with Sliding Active Pill */}
            <nav className="relative hidden md:flex items-center p-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-inner backdrop-blur-md">
              {/* Smooth Animated Sliding Glider Pill */}
              <div
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                  transition: 'transform 320ms cubic-bezier(0.34, 1.25, 0.64, 1), width 320ms cubic-bezier(0.34, 1.25, 0.64, 1), opacity 200ms ease',
                }}
                className="absolute top-1.5 bottom-1.5 left-0 rounded-xl bg-white dark:bg-zinc-800 shadow-md shadow-zinc-900/10 dark:shadow-emerald-500/15 ring-1 ring-zinc-950/5 dark:ring-white/10 pointer-events-none z-0"
              />

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      if (el) buttonRefs.current.set(item.id, el);
                      else buttonRefs.current.delete(item.id);
                    }}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      'relative z-10 flex items-center gap-2 px-3.5 xl:px-4 py-2 rounded-xl text-xs xl:text-sm font-bold transition-colors duration-200 select-none cursor-pointer group',
                      isActive
                        ? 'text-zinc-950 dark:text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 xl:w-4.5 xl:h-4.5 transition-all duration-300',
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                          : 'text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500'
                      )}
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-bold tracking-tight transition-transform duration-200 group-hover:scale-105',
                          item.id === 'map'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-500/40 animate-pulse'
                            : item.id === 'ingest'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                            : isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Telemetry & Live Clock */}
            <div className="flex items-center gap-2 sm:gap-3.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/90 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs xl:text-sm font-bold shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="hidden sm:inline tracking-tight">Drone Swarm Active (4/4)</span>
                <span className="sm:hidden font-mono font-bold">4/4 Swarm</span>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs xl:text-sm font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100/90 dark:bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{timeStr || '00:00:00 IST'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sliding Navigation Drawer (Left to Right) */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden transition-visibility duration-300',
          isMobileMenuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        )}
      >
        {/* Backdrop overlay (Fading Out Background) */}
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className={cn(
            'fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Drawer Panel Container (Left to Right Slide) */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 w-[84%] max-w-xs bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Top Header inside Drawer */}
          <div>
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <Radio className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-tight text-zinc-900 dark:text-white">
                    CivicPulse Command
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                    ELCIA City Grid
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Options List */}
            <div className="p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 mb-2">
                Operations Views & Tools
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      'w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between gap-3 group cursor-pointer',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                        : 'bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          isActive
                            ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                            : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-500'
                        )}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">
                          {item.label}
                        </div>
                        <div
                          className={cn(
                            'text-xs truncate',
                            isActive
                              ? 'text-zinc-300 dark:text-zinc-600'
                              : 'text-zinc-400 dark:text-zinc-500'
                          )}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.badge && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-bold',
                            item.id === 'map'
                              ? 'bg-red-500 text-white'
                              : item.id === 'ingest'
                              ? 'bg-emerald-600 text-white'
                              : isActive
                              ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 opacity-60',
                          isActive ? 'text-white dark:text-zinc-900' : 'text-zinc-400'
                        )}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Footer inside Drawer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Drone Swarm (4/4 Active)
              </span>
              <span className="font-mono text-xs">{timeStr}</span>
            </div>

            <div className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
              Electronics City Industrial Township Authority (ELCIA) • Autonomous Monsoon Response System
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

