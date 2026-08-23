# CivicPulse Map Viewport & Data-Driven Centering Integration

**Document Date:** August 24, 2026  
**System Area:** Frontend Google Maps Operations Viewport  

---

## 1. Source of Map Coordinates

Map coordinates originate from spatial telemetry stored in the PostgreSQL / PostGIS database (`incidents.location` column containing `Geometry(POINT, srid=4326)`).

```text
Backend Database (PostgreSQL / PostGIS)
  └─► GET /api/v1/incidents/
        └─► incidentService.getIncidents()
              └─► Incident.coordinates { lat: number, lng: number }
                    └─► IncidentMapView & MiniMapWidget
```

The frontend maps spatial GeoJSON GeoJSON `Point` objects (`[longitude, latitude]`) to `{ lat, lng }` JavaScript objects consumed directly by Google Maps components.

---

## 2. How Bounds Are Calculated

Bounds calculation is derived dynamically from the active incident dataset:

1. **Filtering**: The active incident list (`incidents` or zone-filtered `displayedIncidents`) is filtered to valid numeric coordinates using `isValidCoordinate(lat, lng)`.
2. **Key Serialization**: A sorted string key (`coordsKey`) is computed from the valid lat/lng pairs (e.g. `"12.84500,77.66500|12.84900,77.66800"`).
3. **`LatLngBounds` Extension**: When `coordsKey` changes and 2 or more valid incidents exist, `MapCameraController` initializes a `google.maps.LatLngBounds` object:
   ```ts
   const bounds = new window.google.maps.LatLngBounds();
   validIncidents.forEach((inc) => {
     bounds.extend({
       lat: Number(inc.coordinates.lat),
       lng: Number(inc.coordinates.lng),
     });
   });
   map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
   ```

---

## 3. How Single-Incident Centering Works

When the dataset contains exactly **one** valid incident, applying `fitBounds` directly causes Google Maps to zoom into extreme levels (zoom 20+).

To prevent this:
```ts
if (validIncidents.length === 1) {
  const single = validIncidents[0].coordinates;
  map.panTo({ lat: Number(single.lat), lng: Number(single.lng) });
  map.setZoom(15); // Sensible zoom level for single incident
}
```

---

## 4. How Selected-Incident Fly-To Works

There are two distinct camera modes in `MapCameraController`:

1. **Data-Driven Viewport (Automatic Bounds)**: Controlled by changes to `coordsKey` (initial load, dataset refetch, zone filter selection).
2. **User-Selected Marker Fly-To (Interactive)**: Triggered when a user clicks an incident marker or enters manual GPS coordinates.

### Stabilization Logic
- Marker clicks update `manualTarget` to `{ lat, lng }` and `manualZoom` to `17`.
- The fly-to effect calls `map.panTo` and `map.setZoom`.
- Because the underlying dataset key (`coordsKey`) does not change during drawer opening, detail inspection, or re-rendering, `fitBounds` does **not** override or reset the camera view.

---

## 5. How Invalid Coordinates Are Handled

Invalid coordinates (`null`, `undefined`, `NaN`, `"invalid"` strings, infinite values) are sanitized before passing to Google Maps API methods:

```ts
const isValidCoordinate = (lat: any, lng: any): boolean => {
  const numLat = typeof lat === 'number' ? lat : parseFloat(lat);
  const numLng = typeof lng === 'number' ? lng : parseFloat(lng);
  return !isNaN(numLat) && !isNaN(numLng) && isFinite(numLat) && isFinite(numLng);
};
```

- Invalid incidents are omitted from bounds calculation.
- If zero valid coordinates remain, the map gracefully remains at its safe fallback center (`DEFAULT_FALLBACK_CENTER`) without throwing runtime JavaScript errors or crashing Google Maps.

---

## 6. Why No City Is Hard-Coded

The map viewport is 100% data-driven and derived strictly from mathematical bounds of returned incident coordinates.

- **Vadodara Incident Dataset**: Derived bounds fit automatically around `22.3072, 73.1812`.
- **Bengaluru Incident Dataset**: Derived bounds fit automatically around `12.8450, 77.6650`.
- **Multi-Region / Dispersed Incidents**: Derived bounds fit across all coordinates regardless of administrative boundaries.

No city names or static coordinate assumptions dictate the viewport.

---

## 7. Known Google Maps Credential Limitations

- Google Maps component rendering relies on `VITE_GOOGLE_MAPS_API_KEY` defined in `dashboard/client/.env`.
- If the browser key is missing or unauthenticated, Google Maps renders a clean application-level fallback card state ("For development purposes only") while maintaining complete application stability.
