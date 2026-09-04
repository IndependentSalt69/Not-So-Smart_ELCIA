import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { getIncidentTypeLabel, IncidentType, PriorityLevel } from '@/types/incident';
import { IncidentNotification } from '@/types/notification';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CircleDot,
  Clock,
  Droplets,
  ExternalLink,
  Footprints,
  MapPin,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react';
import React, { useState } from 'react';

interface NotificationCenterProps {
  onSelectIncidentId?: (incidentId: string) => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onSelectIncidentId,
  className,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const handleNotificationClick = (item: IncidentNotification) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (onSelectIncidentId) {
      onSelectIncidentId(item.incidentId);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 minute ago';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } catch {
      return 'Recently';
    }
  };

  const renderTypeIcon = (type: IncidentType) => {
    switch (type) {
      case 'waterlogging':
        return (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60">
            <Droplets className="w-3.5 h-3.5" />
          </div>
        );
      case 'drainage_overflow':
        return (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60">
            <Waves className="w-3.5 h-3.5" />
          </div>
        );
      case 'damaged_footpath':
        return (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
            <Footprints className="w-3.5 h-3.5" />
          </div>
        );
      case 'open_manhole':
        return (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
            <CircleDot className="w-3.5 h-3.5" />
          </div>
        );
      case 'pothole':
      default:
        return (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  const renderPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'P1':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            P1
          </span>
        );
      case 'P2':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            P2
          </span>
        );
      case 'P3':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            P3
          </span>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : 'Notifications'
          }
          className={cn(
            'relative p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center outline-none select-none',
            unreadCount > 0
              ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300/80 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60 shadow-xs ring-2 ring-emerald-500/20'
              : 'bg-zinc-100/90 dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 shadow-2xs',
            className
          )}
        >
          <Bell
            className={cn(
              'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200',
              unreadCount > 0 && 'text-emerald-600 dark:text-emerald-400'
            )}
          />

          {unreadCount > 0 && (
            <span
              data-testid="notification-unread-badge"
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-rose-600/30 ring-2 ring-white dark:ring-zinc-950 animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-white">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span>Mark all read</span>
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {notifications.length === 0 ? (
          <div
            data-testid="notifications-empty-state"
            className="py-12 px-6 text-center flex flex-col items-center justify-center space-y-2.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shadow-inner">
              <BellOff className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              You're all caught up.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[220px]">
              Verified incidents requiring response dispatch will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {notifications.map((item) => {
              return (
                <div
                  key={item.id}
                  data-testid="notification-item"
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    'p-3.5 transition-all duration-150 cursor-pointer group flex flex-col gap-1.5 select-none relative',
                    !item.isRead
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'
                      : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  )}
                >
                  {/* Top Status Header */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          !item.isRead
                            ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30'
                            : 'bg-zinc-300 dark:bg-zinc-700'
                        )}
                      />
                      <span
                        className={cn(
                          'tracking-tight',
                          !item.isRead
                            ? 'text-emerald-800 dark:text-emerald-300 font-extrabold'
                            : 'text-zinc-600 dark:text-zinc-400 font-medium'
                        )}
                      >
                        Incident Verified
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  {/* Incident Code & Type */}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                        {item.incidentCode}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {renderTypeIcon(item.incidentType)}
                        <span className="truncate">
                          {getIncidentTypeLabel(item.incidentType)}
                        </span>
                        <span>·</span>
                        {renderPriorityBadge(item.priority)}
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  {/* Location Description */}
                  {item.locationDescription && (
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{item.locationDescription}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
