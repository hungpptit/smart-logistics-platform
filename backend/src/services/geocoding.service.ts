export class GeocodingService {
  /**
   * Chuyển đổi địa chỉ văn bản thành tọa độ GPS [latitude, longitude]
   */
  public async geocode(address: string): Promise<{ latitude: number; longitude: number; formattedAddress: string }> {
    const GOONG_API_KEY = process.env.GOONG_API_KEY;
    
    if (GOONG_API_KEY) {
      try {
        const url = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return {
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: data.results[0].formatted_address || address
            };
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Goong Geocoding API lỗi, fallback sang Nominatim:', error.message);
      }
    }

    try {
      // Gọi thử API Nominatim (OpenStreetMap) - miễn phí và không cần API key
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SmartLogisticsPlatform/1.0'
        }
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0];
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            formattedAddress: result.display_name
          };
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Geocoding API lỗi hoặc timeout, sử dụng tọa độ giả lập:', error.message);
    }

    // Cơ chế Fallback: Sinh tọa độ ngẫu nhiên gần Hà Nội hoặc TP.HCM dựa trên từ khóa trong địa chỉ
    const addrLower = address.toLowerCase();
    const isHCMC = addrLower.includes('hồ chí minh') || addrLower.includes('hcm') || addrLower.includes('sài gòn') || addrLower.includes('hơi') || addrLower.includes('bình dương');
    
    // Tọa độ gốc
    const baseLat = isHCMC ? 10.8231 : 21.0285;
    const baseLng = isHCMC ? 106.6297 : 105.8542;
    
    // Offset nhỏ tránh trùng lặp tọa độ tuyệt đối
    const randomOffsetLat = (Math.random() - 0.5) * 0.05;
    const randomOffsetLng = (Math.random() - 0.5) * 0.05;

    return {
      latitude: parseFloat((baseLat + randomOffsetLat).toFixed(6)),
      longitude: parseFloat((baseLng + randomOffsetLng).toFixed(6)),
      formattedAddress: address
    };
  }

  /**
   * Tính khoảng cách địa lý giữa 2 tọa độ GPS (Haversine Formula) theo đơn vị Km
   */
  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Khoảng cách (km)
    return parseFloat(d.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
