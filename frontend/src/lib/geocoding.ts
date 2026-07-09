import { CONFIG } from '../config';

export async function geocodeAddress(address: string, token: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `${CONFIG.API_BASE_URL}/locations/geocode?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return {
          latitude: data.data.latitude,
          longitude: data.data.longitude
        };
      }
    }
  } catch (err) {
    console.error("Backend Geocoding failed", err);
  }
  return null;
}
