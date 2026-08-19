import { PriorityBadge } from '@/components/common/PriorityBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Incident, PriorityLevel, ZoneId } from '@/types/incident';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Crosshair,
  Eye,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface IncidentMapViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

// Controller to smoothly pan & zoom map to any target coordinate
const MapFlyToController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
  targetZoom?: number;
}> = ({ targetCoords, targetZoom = 16 }) => {
  const map = useMap();

  useEffect(() => {
    if (map && targetCoords) {
      map.panTo(targetCoords);
      if (targetZoom) {
        map.setZoom(targetZoom);
      }
    }
  }, [map, targetCoords, targetZoom]);

  return null;
};

// Electronics City Coordinates Center
const ELCIA_CENTER = { lat: 12.8450, lng: 77.6650 };

const ZONE_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  'all': { lat: 12.8450, lng: 77.6650, zoom: 14 },
  'EC-01': { lat: 12.8420, lng: 77.6600, zoom: 16 },
  'EC-02': { lat: 12.8490, lng: 77.6680, zoom: 16 },
  'EC-03': { lat: 12.8380, lng: 77.6780, zoom: 16 },
  'EC-04': { lat: 12.8450, lng: 77.6630, zoom: 16 },
};

export const IncidentMapView: React.FC<IncidentMapViewProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneId | 'all'>('all');
  const [hoveredIncident, setHoveredIncident] = useState<Incident | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mapType, setMapType] = useState<'hybrid' | 'roadmap' | 'satellite'>('hybrid');
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(ELCIA_CENTER);
  const [targetZoom, setTargetZoom] = useState<number>(14);

  // Manual GPS coordinate input feed state
  const [customLat, setCustomLat] = useState<string>('12.8412');
  const [customLng, setCustomLng] = useState<string>('77.6638');
  const [customPin, setCustomPin] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // API Key management (from .env or localStorage with demo fallback)
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('civicpulse_gmaps_key') || envKey;
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>(apiKey);

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

  // Fly to zone
  const handleZoneSelect = (zoneId: ZoneId | 'all') => {
    setSelectedZone(zoneId);
    const centerConfig = ZONE_CENTERS[zoneId] || ZONE_CENTERS.all;
    setTargetCoords({ lat: centerConfig.lat, lng: centerConfig.lng });
    setTargetZoom(centerConfig.zoom);
  };

  // Fly to manual coordinates fed by user
  const handleFlyToCustomCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setTargetCoords({ lat, lng });
      setTargetZoom(18);
      setCustomPin({ lat, lng, label: `Custom GPS Point: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    }
  };

  // Focus on incident
  const handleMarkerClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setTargetCoords({ lat: incident.coordinates.lat, lng: incident.coordinates.lng });
    setTargetZoom(17);
  };

  const handleSaveApiKey = () => {
    setApiKey(tempKey.trim());
    localStorage.setItem('civicpulse_gmaps_key', tempKey.trim());
    setShowKeyInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Map Control Header & Coordinate Input Feed */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg xl:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              Google Maps Spatial Operations Center
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Live Satellite Aerial
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Real GPS coordinate surveillance across Electronics City Phase 1 & 2 corridors.
          </p>
        </div>

        {/* GPS Coordinate Feed & Quick Navigation Bar */}
        <form onSubmit={handleFlyToCustomCoordinates} className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 pl-2">LAT:</span>
            <input
              type="number"
              step="0.0001"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-20 px-1.5 py-1 text-xs font-mono font-bold bg-transparent text-zinc-900 dark:text-white border-0 outline-none"
              placeholder="12.8450"
            />
            <span className="text-[11px] font-bold text-zinc-400 pl-1">LNG:</span>
            <input
              type="number"
              step="0.0001"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              className="w-20 px-1.5 py-1 text-xs font-mono font-bold bg-transparent text-zinc-900 dark:text-white border-0 outline-none"
              placeholder="77.6650"
            />
            <Button
              type="submit"
              size="sm"
              className="h-7 px-3 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 mr-1" />
              <span>Fly to Coords</span>
            </Button>
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-700 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={cn(
                'px-2.5 py-1 rounded-xl transition-all cursor-pointer',
                mapType === 'hybrid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              Satellite Hybrid
            </button>
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={cn(
                'px-2.5 py-1 rounded-xl transition-all cursor-pointer',
                mapType === 'roadmap'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              Street Road
            </button>
          </div>
        </form>
      </div>

      {/* Zone Selector Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {zones.map((z) => (
          <button
            key={z.id}
            onClick={() => handleZoneSelect(z.id as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-2xs',
              selectedZone === z.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
            )}
          >
            <span>{z.id === 'all' ? 'All Zones' : z.id}</span>
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-black',
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

      {/* Google Maps Viewport Container */}
      <div className="relative h-[calc(100vh-230px)] min-h-[600px] 2xl:min-h-[780px] rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl flex items-center justify-center bg-slate-950">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={ELCIA_CENTER}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapType}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            className="w-full h-full"
          >
            {/* Map Camera Controller for Coordinate Fly-To */}
            <MapFlyToController targetCoords={targetCoords} targetZoom={targetZoom} />

            {/* Custom Manual Pin (if fed) */}
            {customPin && (
              <AdvancedMarker position={{ lat: customPin.lat, lng: customPin.lng }}>
                <div className="relative flex flex-col items-center animate-bounce">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-500/40 font-bold text-xs">
                    🎯
                  </div>
                  <div className="bg-slate-950/90 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mt-1 border border-emerald-700 shadow-md">
                    Target GPS
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Real-time Incident Advanced Markers */}
            {displayedIncidents.map((incident) => {
              const isP1 = incident.priority === 'P1';
              const isWater = incident.type === 'waterlogging';
              const isSelected = selectedIncident?.id === incident.id;

              return (
                <AdvancedMarker
                  key={incident.id}
                  position={{ lat: incident.coordinates.lat, lng: incident.coordinates.lng }}
                  onClick={() => handleMarkerClick(incident)}
                >
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    {/* Pulsing Radar Ring for P1 Critical */}
                    {isP1 && (
                      <span className="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
                    )}

                    {/* Marker Capsule */}
                    <div
                      className={cn(
                        'relative w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-125 border-2',
                        incident.priority === 'P1'
                          ? 'bg-red-600 border-white ring-4 ring-red-500/30'
                          : incident.priority === 'P2'
                          ? 'bg-orange-500 border-white ring-2 ring-orange-500/30'
                          : 'bg-amber-500 border-white ring-2 ring-amber-500/30',
                        isSelected && 'scale-125 ring-4 ring-white'
                      )}
                    >
                      <span className="text-xs">{isWater ? '🌊' : '⚠️'}</span>
                    </div>

                    {/* Tag badge below pin */}
                    <div className="mt-1 bg-slate-950/90 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap shadow-md group-hover:border-emerald-400 group-hover:text-emerald-300">
                      {incident.id}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Selected Incident */}
            {selectedIncident && (
              <InfoWindow
                position={{
                  lat: selectedIncident.coordinates.lat,
                  lng: selectedIncident.coordinates.lng,
                }}
                onCloseClick={() => setSelectedIncident(null)}
              >
                <div className="p-2 max-w-xs text-zinc-900 space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      {selectedIncident.id}
                    </span>
                    <PriorityBadge priority={selectedIncident.priority} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 line-clamp-2">
                    {selectedIncident.locationDescription}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>Severity: {selectedIncident.severity.toFixed(1)}/10</span>
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onSelectIncident(selectedIncident)}
                    className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs mt-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>Inspect Evidence & Triage</span>
                  </Button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* HUD Quick Summary in Corner */}
        <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl text-xs text-white shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold">Electronics City Drone Grid</span>
          </div>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-emerald-400 font-bold">
            {displayedIncidents.length} Active Hotspots
          </span>
        </div>

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-2xl text-[11px] text-slate-300 font-medium shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold">P1 Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-bold">P2 High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-bold">P3 Routine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
