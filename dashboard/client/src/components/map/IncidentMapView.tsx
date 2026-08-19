import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Incident, PriorityLevel, ZoneId } from '@/types/incident';
import {
  Compass,
  Crosshair,
  Droplet,
  Eye,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useState } from 'react';

interface IncidentMapViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentMapView: React.FC<IncidentMapViewProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneId | 'all'>('all');
  const [hoveredIncident, setHoveredIncident] = useState<Incident | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const zones = [
    { id: 'all', name: 'All Electronics City Zones', count: incidents.length },
    { id: 'EC-01', name: 'EC-01: Phase 1 West / Hosur Arterial', count: incidents.filter((i) => i.zoneId === 'EC-01').length },
    { id: 'EC-02', name: 'EC-02: Phase 1 East Commercial', count: incidents.filter((i) => i.zoneId === 'EC-02').length },
    { id: 'EC-03', name: 'EC-03: Phase 2 Tech Park Boulevard', count: incidents.filter((i) => i.zoneId === 'EC-03').length },
    { id: 'EC-04', name: 'EC-04: Main Junction Corridor', count: incidents.filter((i) => i.zoneId === 'EC-04').length },
  ];

  const displayedIncidents = selectedZone === 'all'
    ? incidents
    : incidents.filter((i) => i.zoneId === selectedZone);

  // Map GPS to coordinate % on the Electronics City SVG Canvas
  // Lat range: 12.8350 to 12.8550
  // Lng range: 77.6580 to 77.6850
  const getMapCoordinates = (lat: number, lng: number) => {
    const minLat = 12.834;
    const maxLat = 12.856;
    const minLng = 77.657;
    const maxLng = 77.686;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Invert Y axis for screen space
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;

    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
    };
  };

  return (
    <div className="space-y-4">
      {/* Map Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Electronics City Spatial Operations Map</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Active aerial coordinate tracking & hotspot visualization across Phase 1 & 2 corridors.
          </p>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id as any)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs',
                selectedZone === z.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              )}
            >
              <span>{z.id === 'all' ? 'All Zones' : z.id}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  selectedZone === z.id
                    ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                )}
              >
                {z.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Container Viewport */}
      <div className="relative h-[620px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center select-none">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {/* SVG Roads and Zone Geometries */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s ease' }}
        >
          <defs>
            <linearGradient id="roadGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Zone Boundaries Backgrounds */}
          <rect x="50" y="50" width="420" height="260" rx="20" fill="#0f172a" fillOpacity="0.5" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6,6" />
          <text x="70" y="80" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE EC-01 (PHASE 1 WEST)</text>

          <rect x="530" y="50" width="420" height="260" rx="20" fill="#0f172a" fillOpacity="0.5" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6,6" />
          <text x="550" y="80" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE EC-02 (PHASE 1 EAST)</text>

          <rect x="530" y="340" width="420" height="220" rx="20" fill="#0f172a" fillOpacity="0.5" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6,6" />
          <text x="550" y="370" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE EC-03 (PHASE 2 TECH PARK)</text>

          <rect x="50" y="340" width="420" height="220" rx="20" fill="#0f172a" fillOpacity="0.5" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="6,6" />
          <text x="70" y="370" fill="#64748b" fontSize="12" fontFamily="monospace" fontWeight="bold">ZONE EC-04 (MAIN JUNCTION CORRIDOR)</text>

          {/* Major Arterial Highway (Hosur Road) */}
          <path
            d="M 50 150 L 300 220 L 500 300 L 750 380 L 950 480"
            fill="none"
            stroke="#475569"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 50 150 L 300 220 L 500 300 L 750 380 L 950 480"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeDasharray="12,8"
          />

          {/* Elevated Flyover */}
          <path
            d="M 120 120 L 500 280 L 880 460"
            fill="none"
            stroke="#6366f1"
            strokeWidth="4"
            strokeOpacity="0.6"
          />

          {/* Connecting Cross Streets */}
          <path d="M 250 80 L 250 520" fill="none" stroke="#334155" strokeWidth="4" />
          <path d="M 750 80 L 750 520" fill="none" stroke="#334155" strokeWidth="4" />
          <path d="M 100 300 L 900 300" fill="none" stroke="#334155" strokeWidth="4" />

          {/* Campus Landmarks */}
          <rect x="120" y="180" width="80" height="60" rx="6" fill="#1e293b" stroke="#334155" />
          <text x="135" y="215" fill="#94a3b8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">WIPRO</text>

          <rect x="780" y="160" width="90" height="70" rx="6" fill="#1e293b" stroke="#334155" />
          <text x="795" y="200" fill="#94a3b8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">INFOSYS</text>

          <rect x="620" y="390" width="90" height="60" rx="6" fill="#1e293b" stroke="#334155" />
          <text x="645" y="425" fill="#94a3b8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">TCS</text>

          <rect x="760" y="390" width="100" height="60" rx="6" fill="#1e293b" stroke="#334155" />
          <text x="775" y="425" fill="#94a3b8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">VELANKANI</text>
        </svg>

        {/* Interactive Coordinate Markers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s ease' }}
        >
          {displayedIncidents.map((incident) => {
            const coords = getMapCoordinates(incident.coordinates.lat, incident.coordinates.lng);
            const isP1 = incident.priority === 'P1';
            const isWater = incident.type === 'waterlogging';

            return (
              <div
                key={incident.id}
                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                onMouseEnter={() => setHoveredIncident(incident)}
                onMouseLeave={() => setHoveredIncident(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectIncident(incident);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-20"
              >
                {/* Pulsing halo for P1 */}
                {isP1 && (
                  <span className="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping" />
                )}

                {/* Marker Pin */}
                <div
                  className={cn(
                    'relative w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-130 border-2',
                    incident.priority === 'P1'
                      ? 'bg-red-600 border-white ring-4 ring-red-500/30'
                      : incident.priority === 'P2'
                      ? 'bg-orange-500 border-white ring-2 ring-orange-500/30'
                      : 'bg-amber-500 border-white ring-2 ring-amber-500/30'
                  )}
                >
                  <span className="text-xs">{isWater ? '🌊' : '⚠️'}</span>
                </div>

                {/* Pin Label Tag */}
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-950/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap shadow-md group-hover:border-blue-400">
                  {incident.id}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hovered Tooltip Card */}
        {hoveredIncident && (
          <div
            className="absolute top-4 left-4 z-30 w-72 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-white p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-auto cursor-pointer"
            onClick={() => onSelectIncident(hoveredIncident)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-blue-400">
                {hoveredIncident.id}
              </span>
              <PriorityBadge priority={hoveredIncident.priority} />
            </div>

            <p className="text-xs font-semibold text-zinc-100 line-clamp-2 mb-2">
              {hoveredIncident.locationDescription}
            </p>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
              <span>Severity: {hoveredIncident.severity.toFixed(1)}/10</span>
              <StatusBadge status={hoveredIncident.status} />
            </div>

            <div className="mt-3 text-[10px] text-blue-400 font-bold flex items-center justify-center gap-1 bg-blue-950/60 py-1 rounded-lg border border-blue-800/60">
              <Eye className="w-3 h-3" />
              Click marker to inspect evidence & triage
            </div>
          </div>
        )}

        {/* Zoom & Compass HUD Controls */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 p-1 rounded-xl backdrop-blur-md shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.2))}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
            className="h-8 w-8 p-0 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(1)}
            className="h-8 px-2 text-xs font-mono text-slate-300 hover:text-white"
            title="Reset Zoom"
          >
            Reset
          </Button>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-30 hidden sm:flex items-center gap-3 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 font-medium backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>P1 Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>P2 High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>P3 Routine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
