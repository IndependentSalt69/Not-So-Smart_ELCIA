import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { ArrowUpRight, Compass, MapPin, Navigation } from 'lucide-react';
import React from 'react';

interface MiniMapWidgetProps {
  incidents: Incident[];
  onOpenFullMap: () => void;
  onSelectIncident: (incident: Incident) => void;
}

export const MiniMapWidget: React.FC<MiniMapWidgetProps> = ({
  incidents,
  onOpenFullMap,
  onSelectIncident,
}) => {
  const zones = [
    { id: 'EC-01', name: 'Phase 1 - West / Hosur', x: '25%', y: '40%' },
    { id: 'EC-02', name: 'Phase 1 - East Commercial', x: '65%', y: '30%' },
    { id: 'EC-03', name: 'Phase 2 - Tech Park', x: '75%', y: '75%' },
    { id: 'EC-04', name: 'Main Junction Corridor', x: '42%', y: '50%' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/60 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Electronics City Zone Map Preview
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFullMap}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 h-8 px-2"
        >
          <span>Full Map</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Simulated Map Canvas preview */}
      <div
        onClick={onOpenFullMap}
        className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer group shadow-inner"
      >
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Electronics City Road Geometry Lines */}
        <svg className="absolute inset-0 w-full h-full stroke-slate-700/60 stroke-2" fill="none">
          {/* Hosur Road Arterial */}
          <line x1="10%" y1="10%" x2="90%" y2="90%" stroke="#475569" strokeWidth="4" />
          {/* Phase 1 loop */}
          <ellipse cx="38%" cy="38%" rx="28%" ry="22%" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" />
          {/* Phase 2 loop */}
          <ellipse cx="68%" cy="68%" rx="24%" ry="20%" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" />
        </svg>

        {/* Zone Labels & Hotspots */}
        {zones.map((zone) => {
          const zoneIncidents = incidents.filter((i) => i.zoneId === zone.id && i.status !== 'CLOSED');
          const p1s = zoneIncidents.filter((i) => i.priority === 'P1');
          return (
            <div
              key={zone.id}
              style={{ left: zone.x, top: zone.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/pin"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-transform group-hover/pin:scale-125 ${
                  p1s.length > 0
                    ? 'bg-red-500 ring-4 ring-red-500/30 animate-pulse'
                    : zoneIncidents.length > 0
                    ? 'bg-orange-500 ring-2 ring-orange-500/30'
                    : 'bg-emerald-500/80 ring-1 ring-emerald-500/20'
                }`}
              >
                {zoneIncidents.length}
              </div>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300 border border-slate-700/60 whitespace-nowrap shadow-xs">
                {zone.id}
              </span>
            </div>
          );
        })}

        {/* Overlay hover CTA */}
        <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 backdrop-blur-[1px] transition-opacity flex items-center justify-center">
          <span className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-500" />
            Launch Interactive Zone Map
          </span>
        </div>
      </div>
    </div>
  );
};
