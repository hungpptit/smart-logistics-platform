import React, { useEffect, useRef } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MapRoute, MarkerPopup } from '@/components/ui/map';
import { MapPin, Truck } from 'lucide-react';
import MapLibreGL from 'maplibre-gl';

interface MapcnMapProps {
  route: [number, number][]; // Coming in as [lat, lng] from mockDb
  currentPos: [number, number]; // Coming in as [lat, lng]
  destination: string;
}

export const MapcnMap: React.FC<MapcnMapProps> = ({ route, currentPos, destination }) => {
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // Convert route coordinates from [lat, lng] to [lng, lat] for MapLibre GL
  const formattedRoute = route.map((coord) => [coord[1], coord[0]] as [number, number]);
  const formattedCurrentPos = [currentPos[1], currentPos[0]] as [number, number];

  // Destination is the last coordinate of the route
  const destCoords = formattedRoute[formattedRoute.length - 1];

  // Auto-fit bounds whenever the route changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || formattedRoute.length === 0) return;

    const lons = formattedRoute.map((c) => c[0]);
    const lats = formattedRoute.map((c) => c[1]);

    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Give some padding to make it look premium
    map.fitBounds([minLon, minLat, maxLon, maxLat], {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      duration: 1200,
    });
  }, [route]);

  // Center on current position if no route is loaded
  const centerCoord = formattedRoute.length > 0 ? formattedCurrentPos : [106.660172, 10.762622] as [number, number];

  return (
    <div className="relative w-full h-full min-h-[450px] overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <Map
        ref={mapRef}
        center={centerCoord}
        zoom={12}
        className="w-full h-full min-h-[450px]"
      >
        {/* Render Route Polyline */}
        {formattedRoute.length >= 2 && (
          <MapRoute
            coordinates={formattedRoute}
            color="#bc0100" // Velocity Logistics Red
            width={4}
            opacity={0.9}
            dashArray={[2, 2]} // Dashed routing line style
          />
        )}

        {/* Destination Marker */}
        {destCoords && (
          <MapMarker longitude={destCoords[0]} latitude={destCoords[1]}>
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-md transition-transform duration-200 hover:scale-110">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1 font-sans text-xs">
                <h4 className="font-bold text-slate-800 text-sm">Điểm Đến</h4>
                <p className="text-slate-600 mt-0.5">{destination}</p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Live Driver Marker */}
        <MapMarker longitude={formattedCurrentPos[0]} latitude={formattedCurrentPos[1]}>
          <MarkerContent>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-600 bg-slate-900 shadow-lg transition-transform duration-200 hover:scale-110">
              <Truck className="h-5 w-5 text-white" />
              {/* Pulse effect animation wrapper */}
              <span className="absolute -inset-1 animate-ping rounded-full border-2 border-red-500/40 opacity-75"></span>
            </div>
          </MarkerContent>
          <MarkerPopup closeButton={false}>
            <div className="p-1 font-sans text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Tài xế giao nhận</h4>
              <p className="text-slate-600 mt-0.5">Tọa độ: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}</p>
            </div>
          </MarkerPopup>
        </MapMarker>

        {/* Map Controls (Zoom in/out, bearing, fullscreen) */}
        <MapControls showZoom showCompass showFullscreen className="bottom-4 right-4" />
      </Map>
    </div>
  );
};
