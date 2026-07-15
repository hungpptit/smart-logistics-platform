import React, { useState, useEffect, useCallback } from 'react';

interface UseMapConfirmationProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  mapRef: React.RefObject<any>;
}

export const useMapConfirmation = ({
  latitude,
  longitude,
  onChange,
  mapRef
}: UseMapConfirmationProps) => {
  const [tempLatitude, setTempLatitude] = useState<number>(latitude);
  const [tempLongitude, setTempLongitude] = useState<number>(longitude);

  // Sync temp coordinates when actual coordinates change (e.g. on load or address selection)
  useEffect(() => {
    setTempLatitude(latitude);
    setTempLongitude(longitude);
  }, [latitude, longitude]);

  const onMapClick = useCallback((e: any) => {
    const { lng, lat } = e.lngLat;
    setTempLatitude(parseFloat(lat.toFixed(6)));
    setTempLongitude(parseFloat(lng.toFixed(6)));
  }, []);

  const onMarkerDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    setTempLatitude(parseFloat(lngLat.lat.toFixed(6)));
    setTempLongitude(parseFloat(lngLat.lng.toFixed(6)));
  }, []);

  const onLocate = useCallback((coords: { longitude: number; latitude: number }) => {
    setTempLatitude(parseFloat(coords.latitude.toFixed(6)));
    setTempLongitude(parseFloat(coords.longitude.toFixed(6)));
  }, []);

  const handleCancel = useCallback(() => {
    setTempLatitude(latitude);
    setTempLongitude(longitude);
    if (latitude !== 0 && longitude !== 0) {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 800
      });
    }
  }, [latitude, longitude, mapRef]);

  const handleConfirm = useCallback(() => {
    onChange(tempLatitude, tempLongitude);
  }, [tempLatitude, tempLongitude, onChange]);

  const hasChanges = tempLatitude !== latitude || tempLongitude !== longitude;

  return {
    tempLatitude,
    tempLongitude,
    setTempLatitude,
    setTempLongitude,
    onMapClick,
    onMarkerDragEnd,
    onLocate,
    handleCancel,
    handleConfirm,
    hasChanges
  };
};
