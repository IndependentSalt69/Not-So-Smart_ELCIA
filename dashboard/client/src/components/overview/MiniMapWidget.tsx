import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { AdvancedMarker, APIProvider, Map } from '@vis.gl/react-google-maps';
import { ArrowUpRight, Compass, Navigation } from 'lucide-react';
import React, { useState } from 'react';

interface MiniMapWidgetProps {
  incidents: Incident[];
  onOpenFullMap: () => void;
  onSelectIncident: (incident: Incident) => void;
}

const ELCIA_CENTER = { lat: 12.8450, lng: 77.6650 };

export const MiniMapWidget: React.FC<MiniMapWidgetProps> = ({
  incidents,
  onOpenFullMap,
  onSelectIncident,
}) => {
  const envKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_FRONTEND_FORGE_API_KEY ||
    '';
  const [apiKey] = useState<string>(() => {
    return localStorage.getItem('civicpulse_gmaps_key') || envKey;
  });

  const validIncidents = incidents.filter(
    (i) =>
      i.coordinates &&
      typeof i.coordinates.lat === 'number' &&
      !isNaN(i.coordinates.lat) &&
      typeof i.coordinates.lng === 'number' &&
      !isNaN(i.coordinates.lng)
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/60 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Electronics City Spatial Preview
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFullMap}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2 cursor-pointer"
        >
          <span>Full Map</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Mini Google Map Preview Viewport */}
      <div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner group">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={ELCIA_CENTER}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            mapTypeId="hybrid"
            gestureHandling={'none'}
            disableDefaultUI={true}
            className="w-full h-full"
          >
            {validIncidents.map((incident) => (
              <AdvancedMarker
                key={incident.id}
                position={{ lat: incident.coordinates.lat, lng: incident.coordinates.lng }}
                onClick={() => onSelectIncident(incident)}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer ${incident.priority === 'P1'
                      ? 'bg-red-500 animate-ping'
                      : incident.priority === 'P2'
                        ? 'bg-orange-500'
                        : 'bg-amber-400'
                    }`}
                />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>

        {/* Top-Left: Clean Development Purpose Badge with ! Sign */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/40 px-2.5 py-1 rounded-xl text-[10px] text-amber-300 shadow-md pointer-events-none select-none">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[9px] shrink-0">
            !
          </div>
          <span className="font-semibold tracking-tight">For development purposes only</span>
        </div>

        {/* Overlay hover CTA to switch to full interactive view */}
        <div
          onClick={onOpenFullMap}
          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 backdrop-blur-[1px] transition-opacity flex items-center justify-center cursor-pointer"
        >
          <span className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-zinc-200/60 dark:border-zinc-700">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Launch Full Spatial Operations Map
          </span>
        </div>
      </div>
    </div>
  );
};
