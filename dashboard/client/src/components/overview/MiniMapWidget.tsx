import { Button } from '@/components/ui/button';
import { Incident } from '@/types/incident';
import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { ArrowUpRight, Compass, Navigation } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface MiniMapWidgetProps {
  incidents: Incident[];
  onOpenFullMap: () => void;
  onSelectIncident: (incident: Incident) => void;
}

const ELCIA_CENTER = { lat: 12.8450, lng: 77.6650 };

// Controller to fit bounds dynamically on mini map preview
const MiniMapCameraController: React.FC<{ incidents: Incident[] }> = ({ incidents }) => {
  const map = useMap();
  const lastFittedKeyRef = useRef<string>('');

  const validIncidents = incidents.filter(
    (i) =>
      i &&
      i.coordinates &&
      typeof i.coordinates.lat === 'number' &&
      !isNaN(i.coordinates.lat) &&
      typeof i.coordinates.lng === 'number' &&
      !isNaN(i.coordinates.lng)
  );

  const coordsKey = validIncidents
    .map((i) => `${Number(i.coordinates.lat).toFixed(5)},${Number(i.coordinates.lng).toFixed(5)}`)
    .sort()
    .join('|');

  useEffect(() => {
    if (!map) return;
    if (coordsKey === lastFittedKeyRef.current && coordsKey !== '') return;

    lastFittedKeyRef.current = coordsKey;

    if (validIncidents.length === 1) {
      const single = validIncidents[0].coordinates;
      map.panTo({ lat: Number(single.lat), lng: Number(single.lng) });
      map.setZoom(14);
    } else if (validIncidents.length > 1) {
      if (window.google?.maps?.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        validIncidents.forEach((inc) => {
          bounds.extend({
            lat: Number(inc.coordinates.lat),
            lng: Number(inc.coordinates.lng),
          });
        });
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    } else if (validIncidents.length === 0) {
      map.panTo(ELCIA_CENTER);
      map.setZoom(13);
    }
  }, [map, coordsKey, validIncidents]);

  return null;
};

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
    return envKey;
  });

  const validIncidents = incidents.filter(
    (i) =>
      i &&
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
          <Compass className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Electronics City Spatial Preview
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFullMap}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2.5 cursor-pointer"
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
            <MiniMapCameraController incidents={validIncidents} />
            {validIncidents.map((incident) => (
              <AdvancedMarker
                key={incident.id}
                position={{ lat: incident.coordinates.lat, lng: incident.coordinates.lng }}
                onClick={() => onSelectIncident(incident)}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer ${
                    incident.priority === 'P1'
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
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs text-amber-300 shadow-md pointer-events-none select-none">
          <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0">
            !
          </div>
          <span className="font-semibold tracking-tight">For development purposes only</span>
        </div>

        {/* Overlay hover CTA to switch to full interactive view */}
        <div
          onClick={onOpenFullMap}
          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 backdrop-blur-[1px] transition-opacity flex items-center justify-center cursor-pointer"
        >
          <span className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs xl:text-sm font-bold shadow-xl flex items-center gap-2 border border-zinc-200/60 dark:border-zinc-700">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Launch Full Spatial Operations Map
          </span>
        </div>
      </div>
    </div>
  );
};
