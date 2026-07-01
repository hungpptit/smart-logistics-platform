import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  route: [number, number][];
  currentPos: [number, number];
  destination: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ route, currentPos, destination }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current).setView([10.762622, 106.660172], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || route.length === 0) return;

    // 1. Clean up old layers
    if (routeLineRef.current) map.removeLayer(routeLineRef.current);
    if (driverMarkerRef.current) map.removeLayer(driverMarkerRef.current);
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);

    // 2. Draw Route Polyline
    const routeLine = L.polyline(route, {
      color: '#bc0100', // Logistics Red
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8'
    }).addTo(map);
    routeLineRef.current = routeLine;

    // 3. Add Destination Marker (Red Flag Pin)
    const destCoords = route[route.length - 1];
    const destMarker = L.marker(destCoords, {
      icon: L.divIcon({
        className: 'custom-map-marker marker-destination',
        html: `<div class="marker-circle"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map).bindPopup(`<b>Destination Hub</b><br>${destination}`);
    destMarkerRef.current = destMarker;

    // 4. Add Live Driver Location Marker (Truck Icon)
    const driverMarker = L.marker(currentPos, {
      icon: L.divIcon({
        className: 'custom-map-marker marker-driver',
        html: `<div class="marker-circle active-pulse"><i class="fa-solid fa-truck"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      })
    }).addTo(map).bindPopup(`<b>Current Delivery Driver</b><br>Coordinates: ${currentPos[0]}, ${currentPos[1]}`);
    driverMarkerRef.current = driverMarker;

    // Open destination popup by default
    destMarker.openPopup();

    // 5. Fit bounds with padding
    const bounds = L.latLngBounds(route);
    map.fitBounds(bounds, { padding: [50, 50] });

    console.log(`[Geospatial Standard Alert]: Internal WGS84 standard coordinates are represented as [Lng, Lat] for GeoJSON compliance, but Leaflet draws coordinates as [Lat, Lng] (Map Centered at: ${currentPos[0]}, ${currentPos[1]}).`);
  }, [route, currentPos, destination]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '450px' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} />
    </div>
  );
};
