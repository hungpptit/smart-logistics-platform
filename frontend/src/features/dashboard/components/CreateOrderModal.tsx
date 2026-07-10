import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Package, MapPin, Truck, User } from 'lucide-react';
import { CONFIG } from '../../../config';
import { geocodeAddress } from '../../../lib/geocoding';
import { Map, MapMarker, MarkerContent, MapControls } from '../../../components/ui/map';
import { AddressFormFields } from '../../../components/ui/AddressFormFields';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  isAdminOrStaff: boolean;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  isAdminOrStaff,
}) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [customerId, setCustomerId] = useState('');
  const [serviceCode, setServiceCode] = useState('STANDARD');
  const [feePayer, setFeePayer] = useState<'SENDER' | 'RECEIVER'>('SENDER');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'E_WALLET' | 'COD'>('CASH');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [pickupType, setPickupType] = useState<'PICKUP' | 'DROP_OFF'>('PICKUP');

  // Sender States
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddressLine1, setSenderAddressLine1] = useState('');
  const [senderWard, setSenderWard] = useState('');
  const [senderProvince, setSenderProvince] = useState('');
  const [senderProvinceCode, setSenderProvinceCode] = useState('');
  const [senderWardCode, setSenderWardCode] = useState('');

  // Sender Coordinates & Map States
  const [senderLatitude, setSenderLatitude] = useState<number>(0);
  const [senderLongitude, setSenderLongitude] = useState<number>(0);
  const [tempLatitude, setTempLatitude] = useState<number>(0);
  const [tempLongitude, setTempLongitude] = useState<number>(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // Reset coordinates and center map on open
  useEffect(() => {
    if (isOpen) {
      setSenderLatitude(0);
      setSenderLongitude(0);
      setTempLatitude(0);
      setTempLongitude(0);
      setReceiverLatitude(0);
      setReceiverLongitude(0);
      setMapCenter([105.8542, 21.0285]);
      
      // Fix map container size in modal
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.resize();
        }, 300);
      }
    } else {
      setSenderName('');
      setSenderPhone('');
      setSenderAddressLine1('');
      setSenderWard('');
      setSenderProvince('');
      setSenderProvinceCode('');
      setSenderWardCode('');
      setReceiverName('');
      setReceiverPhone('');
      setReceiverAddressLine1('');
      setReceiverWard('');
      setReceiverProvince('');
      setReceiverProvinceCode('');
      setReceiverWardCode('');
    }
  }, [isOpen]);

  const clickHandlerRef = useRef<any>(null);
  clickHandlerRef.current = (e: any) => {
    const { lng, lat } = e.lngLat;
    setTempLatitude(parseFloat(lat.toFixed(6)));
    setTempLongitude(parseFloat(lng.toFixed(6)));
  };

  const mapCallbackRef = useCallback((mapInstance: any) => {
    mapRef.current = mapInstance;
    if (!mapInstance) return;

    // Trigger map resize shortly after loading to ensure it sizes correctly in modal
    setTimeout(() => {
      mapInstance.resize();
    }, 300);

    mapInstance.on('click', (e: any) => {
      clickHandlerRef.current?.(e);
    });
  }, []);

  const handleMarkerDragEnd = (lngLat: { lng: number; lat: number }) => {
    setTempLatitude(parseFloat(lngLat.lat.toFixed(6)));
    setTempLongitude(parseFloat(lngLat.lng.toFixed(6)));
  };

  const handleLocateCallback = useCallback((coords: { longitude: number; latitude: number }) => {
    setTempLatitude(parseFloat(coords.latitude.toFixed(6)));
    setTempLongitude(parseFloat(coords.longitude.toFixed(6)));
  }, []);

  const handleAutoLocate = async () => {
    if (!senderAddressLine1 && !senderWard && !senderProvince) return;

    setGeocodingLoading(true);
    const fullAddress = [senderAddressLine1, senderWard, senderProvince].filter(Boolean).join(', ');
    
    try {
      const coords = await geocodeAddress(fullAddress, token || '');
      if (coords) {
        const lat = parseFloat(coords.latitude.toFixed(6));
        const lng = parseFloat(coords.longitude.toFixed(6));
        setSenderLatitude(lat);
        setSenderLongitude(lng);
        setTempLatitude(lat);
        setTempLongitude(lng);
        setMapCenter([lng, lat]);
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 1000
        });
      }
    } catch (err) {
      console.error('Error auto-locating address:', err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Receiver States
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressLine1, setReceiverAddressLine1] = useState('');
  const [receiverWard, setReceiverWard] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');
  const [receiverProvinceCode, setReceiverProvinceCode] = useState('');
  const [receiverWardCode, setReceiverWardCode] = useState('');
  const [receiverLatitude, setReceiverLatitude] = useState<number>(0);
  const [receiverLongitude, setReceiverLongitude] = useState<number>(0);

  // Helper to calculate distance in Km between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(2));
  };

  // Auto-geocode sender address in background if coords are not manually confirmed
  useEffect(() => {
    if (senderLatitude !== 0 || !senderAddressLine1 || !senderWard || !senderProvince || !token) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const fullAddress = [senderAddressLine1, senderWard, senderProvince].filter(Boolean).join(', ');
        const coords = await geocodeAddress(fullAddress, token);
        if (coords) {
          const lat = parseFloat(coords.latitude.toFixed(6));
          const lng = parseFloat(coords.longitude.toFixed(6));
          setSenderLatitude(lat);
          setSenderLongitude(lng);
          setTempLatitude(lat);
          setTempLongitude(lng);
          setMapCenter([lng, lat]);
        }
      } catch (err) {
        console.error('Error auto-geocoding sender address:', err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [senderAddressLine1, senderWard, senderProvince, token, senderLatitude]);

  // Auto-geocode receiver address in background to get destination coordinates for fee calculation
  useEffect(() => {
    if (!receiverAddressLine1 || !receiverWard || !receiverProvince || !token) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const fullAddress = [receiverAddressLine1, receiverWard, receiverProvince].filter(Boolean).join(', ');
        const coords = await geocodeAddress(fullAddress, token);
        if (coords) {
          const lat = parseFloat(coords.latitude.toFixed(6));
          const lng = parseFloat(coords.longitude.toFixed(6));
          setReceiverLatitude(lat);
          setReceiverLongitude(lng);
        }
      } catch (err) {
        console.error('Error auto-geocoding receiver address:', err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [receiverAddressLine1, receiverWard, receiverProvince, token]);

  // Package States
  const [weight, setWeight] = useState<number>(1.5);
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(15);
  const [height, setHeight] = useState<number>(10);
  const [isFragile, setIsFragile] = useState(false);
  const [temperatureRequirement, setTemperatureRequirement] = useState('');

  // Fetch initial data (customers if admin, active services)
  useEffect(() => {
    if (!isOpen || !token) return;

    // Fetch services
    setLoadingServices(true);
    fetch(`${CONFIG.API_BASE_URL}/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const activeServices = data.data.filter((s: any) => s.isActive);
          setServices(activeServices);
          if (activeServices.length > 0) {
            setServiceCode(activeServices[0].serviceCode);
          }
        }
      })
      .catch(err => console.error('Error fetching services:', err))
      .finally(() => setLoadingServices(false));

    // Fetch customers if staff/admin
    if (isAdminOrStaff) {
      fetch(`${CONFIG.API_BASE_URL}/customers?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setCustomers(data.data || []);
            if (data.data.length > 0) {
              setCustomerId(data.data[0].id);
            }
          }
        })
        .catch(err => console.error('Error fetching customers:', err));
    }
  }, [isOpen, token, isAdminOrStaff]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setActionLoading(true);

    const payload = {
      customerId: isAdminOrStaff ? customerId : undefined,
      serviceCode,
      feePayer,
      paymentMethod,
      codAmount: Number(codAmount),
      pickupType,
      senderContact: {
        fullName: senderName,
        phone: senderPhone,
      },
      pickupAddress: {
        addressLine1: senderAddressLine1,
        ward: senderWard,
        province: senderProvince,
        country: 'Vietnam',
        latitude: senderLatitude !== 0 ? senderLatitude : undefined,
        longitude: senderLongitude !== 0 ? senderLongitude : undefined,
        wardCode: senderWardCode || undefined,
      },
      receiverContact: {
        fullName: receiverName,
        phone: receiverPhone,
      },
      deliveryAddress: {
        addressLine1: receiverAddressLine1,
        ward: receiverWard,
        province: receiverProvince,
        country: 'Vietnam',
        wardCode: receiverWardCode || undefined,
        latitude: receiverLatitude !== 0 ? receiverLatitude : undefined,
        longitude: receiverLongitude !== 0 ? receiverLongitude : undefined,
      },
      packages: [
        {
          weight: Number(weight),
          length: Number(length),
          width: Number(width),
          height: Number(height),
          isFragile,
          temperatureRequirement: temperatureRequirement || undefined,
        }
      ]
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        alert('Tạo đơn hàng vận chuyển thành công!');
        onSuccess();
        onClose();
      } else {
        alert(resData.message || 'Lỗi khi tạo đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  // Dynamic Pricing Calculation
  const activeService = services.find((s) => s.serviceCode === serviceCode);
  const distanceKm = (senderLatitude && senderLongitude && receiverLatitude && receiverLongitude)
    ? calculateDistance(senderLatitude, senderLongitude, receiverLatitude, receiverLongitude)
    : 0;

  let basePrice = 0;
  let distanceFee = 0;
  let weightFee = 0;
  let fragileSurcharge = 0;
  let insuranceFee = 0;
  let totalAmount = 0;
  let billableDistance = 0;
  let billableWeight = 0;

  if (activeService) {
    basePrice = Number(activeService.basePrice);
    const freeDistanceKm = activeService.freeDistanceKm;
    const pricePerKm = Number(activeService.pricePerKm);
    const freeWeightKg = activeService.freeWeightKg;
    const pricePerKg = Number(activeService.pricePerKg);

    billableDistance = Math.max(0, distanceKm - freeDistanceKm);
    distanceFee = billableDistance * pricePerKm;

    billableWeight = Math.max(0, weight - freeWeightKg);
    weightFee = billableWeight * pricePerKg;

    fragileSurcharge = isFragile ? 15000 : 0;

    if (codAmount > 0) {
      insuranceFee = Math.min(50000, Math.max(0, codAmount * 0.005));
    }

    totalAmount = basePrice + distanceFee + weightFee + fragileSurcharge + insuranceFee;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-4xl w-full my-8 flex flex-col font-montserrat max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Package className="text-[#bc0100]" size={18} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Đặt Đơn Hàng Mới</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-xs text-gray-600">
          {/* Customer Selection for admin/staff */}
          {isAdminOrStaff && (
            <div className="p-4 bg-[#F4F4F4] rounded border border-gray-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px]">
                <User size={14} className="text-[#bc0100]" />
                <span>Khách hàng thanh toán</span>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                required
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.user?.username || 'N/A'} ({c.customerCode}) - {c.user?.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Contacts */}
            <div className="flex flex-col gap-6">
              {/* Sender Section */}
              <div className="border border-[#e2e8f0] p-4 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px] border-b pb-2">
                  <MapPin className="text-[#bc0100]" size={14} />
                  <span>1. Thông tin người gửi & Điểm lấy</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Họ tên người gửi</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      placeholder="0901234567"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                </div>
                <AddressFormFields
                  token={token}
                  provinceCode={senderProvinceCode}
                  wardCode={senderWardCode}
                  addressLine1={senderAddressLine1}
                  onChange={({ province, provinceCode, ward, wardCode, addressLine1 }) => {
                    setSenderProvince(province);
                    setSenderProvinceCode(provinceCode);
                    setSenderWard(ward);
                    setSenderWardCode(wardCode);
                    setSenderAddressLine1(addressLine1);
                  }}
                  required
                />

                {/* Map for Sender Location */}
                <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                    <span>Bản đồ định vị điểm lấy hàng</span>
                    <button
                      type="button"
                      onClick={handleAutoLocate}
                      disabled={geocodingLoading || (!senderAddressLine1 && !senderWard && !senderProvince)}
                      className="text-[#bc0100] hover:text-[#900000] font-bold lowercase tracking-normal text-[10px] flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      {geocodingLoading ? 'Đang định vị...' : '🔍 [Nhấn để định vị tự động]'}
                    </button>
                  </div>
                  
                  <div className="w-full h-64 rounded border border-[#e2e8f0] overflow-hidden relative mt-0.5 bg-gray-50">
                    <Map
                      ref={mapCallbackRef}
                      center={mapCenter}
                      zoom={13}
                      className="w-full h-full"
                    >
                      {tempLatitude !== 0 && tempLongitude !== 0 && (
                        <MapMarker
                          longitude={tempLongitude}
                          latitude={tempLatitude}
                          draggable
                          onDragEnd={handleMarkerDragEnd}
                        >
                          <MarkerContent>
                            <div 
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm text-white transition-transform hover:scale-110"
                              style={{ backgroundColor: '#bc0100' }}
                            >
                              <MapPin className="h-3 w-3" />
                            </div>
                          </MarkerContent>
                        </MapMarker>
                      )}
                       <MapControls 
                        showZoom 
                        showLocate 
                        onLocate={handleLocateCallback}
                        className="top-2 right-2" 
                      />
                    </Map>

                    {/* Accidental click protection / Confirmation Panel */}
                    {(tempLatitude !== senderLatitude || tempLongitude !== senderLongitude) && (
                      <div className="absolute inset-x-0 bottom-0 bg-[#161D25]/90 backdrop-blur-xs p-2 flex justify-between items-center text-[10px] text-white animate-fade-in shadow-lg z-10">
                        <span className="font-medium text-gray-300">
                          Vị trí thay đổi chưa lưu
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTempLatitude(senderLatitude);
                              setTempLongitude(senderLongitude);
                              if (senderLatitude !== 0 && senderLongitude !== 0) {
                                mapRef.current?.flyTo({
                                  center: [senderLongitude, senderLatitude],
                                  zoom: 15,
                                  duration: 800
                                });
                              }
                            }}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white font-bold transition-colors cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSenderLatitude(tempLatitude);
                              setSenderLongitude(tempLongitude);
                            }}
                            className="px-2 py-1 bg-[#bc0100] hover:bg-[#a00100] rounded text-white font-bold transition-colors cursor-pointer"
                          >
                            Xác nhận lưu
                          </button>
                        </div>
                      </div>
                    )}

                    {!(tempLatitude !== senderLatitude || tempLongitude !== senderLongitude) && (
                      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] text-gray-500 shadow-xs pointer-events-none select-none">
                        Kéo marker hoặc click bản đồ để chọn tọa độ
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      disabled
                      value={senderLatitude || ''}
                      placeholder="Chưa xác định"
                      className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded outline-none bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-[10px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      disabled
                      value={senderLongitude || ''}
                      placeholder="Chưa xác định"
                      className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded outline-none bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Receiver Section */}
              <div className="border border-[#e2e8f0] p-4 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px] border-b pb-2">
                  <MapPin className="text-green-600" size={14} />
                  <span>2. Thông tin người nhận & Điểm giao</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Họ tên người nhận</label>
                    <input
                      type="text"
                      required
                      placeholder="Trần Thị B"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      placeholder="0987654321"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                </div>
                <AddressFormFields
                  token={token}
                  provinceCode={receiverProvinceCode}
                  wardCode={receiverWardCode}
                  addressLine1={receiverAddressLine1}
                  onChange={({ province, provinceCode, ward, wardCode, addressLine1 }) => {
                    setReceiverProvince(province);
                    setReceiverProvinceCode(provinceCode);
                    setReceiverWard(ward);
                    setReceiverWardCode(wardCode);
                    setReceiverAddressLine1(addressLine1);
                  }}
                  required
                />
              </div>
            </div>

            {/* Right Column: Packages, Service, Payment */}
            <div className="flex flex-col gap-6">
              {/* Package Details */}
              <div className="border border-[#e2e8f0] p-4 rounded-lg flex flex-col gap-3 bg-slate-50/50">
                <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px] border-b pb-2">
                  <Package className="text-amber-500" size={14} />
                  <span>3. Thông tin gói hàng</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Trọng lượng (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Yêu cầu nhiệt độ (nếu có)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 2-8 °C"
                      value={temperatureRequirement}
                      onChange={(e) => setTemperatureRequirement(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Dài (cm)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={length}
                      onChange={(e) => setLength(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Rộng (cm)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Cao (cm)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isFragileOrderCheckbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="w-4 h-4 text-[#bc0100] border-gray-300 rounded focus:ring-[#bc0100] cursor-pointer"
                  />
                  <label htmlFor="isFragileOrderCheckbox" className="font-bold text-red-600 uppercase tracking-widest cursor-pointer select-none text-[10px]">
                    Hàng dễ vỡ / Cần nhẹ tay
                  </label>
                </div>
              </div>

              {/* Service & Payment details */}
              <div className="border border-[#e2e8f0] p-4 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px] border-b pb-2">
                  <Truck className="text-blue-500" size={14} />
                  <span>4. Dịch vụ & Thanh toán</span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Gói cước dịch vụ</label>
                  {loadingServices ? (
                    <div className="py-2 text-gray-400">Đang tải gói dịch vụ...</div>
                  ) : (
                    <select
                      value={serviceCode}
                      onChange={(e) => setServiceCode(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                      required
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.serviceCode}>
                          {s.serviceName} (Phí cơ bản: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.basePrice)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Hình thức gửi hàng</label>
                  <select
                    value={pickupType}
                    onChange={(e) => setPickupType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                  >
                    <option value="PICKUP">Shipper đến lấy hàng tận nơi (PICKUP)</option>
                    <option value="DROP_OFF">Khách tự mang ra bưu cục gửi (DROP_OFF)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Người chịu phí</label>
                    <select
                      value={feePayer}
                      onChange={(e) => setFeePayer(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                    >
                      <option value="SENDER">Người gửi trả (SENDER)</option>
                      <option value="RECEIVER">Người nhận trả (RECEIVER)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Hình thức thanh toán</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                    >
                      <option value="CASH">Tiền mặt (CASH)</option>
                      <option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</option>
                      <option value="E_WALLET">Ví điện tử (E_WALLET)</option>
                      <option value="COD">Thu hộ lúc giao (COD)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tiền thu hộ COD (nếu có)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={codAmount === 0 ? '' : codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono text-amber-600 font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    * COD (Cash on Delivery) là số tiền shipper thu hộ người gửi khi giao hàng thành công (ví dụ: tiền bán sản phẩm). Nếu gửi quà tặng hoặc đã thanh toán trước, hãy để là 0.
                  </span>
                </div>

                {activeService && (
                  <div className="mt-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col gap-2.5">
                    <div className="font-extrabold text-[#161D25] uppercase tracking-wider text-[9px] border-b pb-1.5 flex justify-between items-center">
                      <span>Chi tiết cước tạm tính</span>
                      {distanceKm > 0 && <span className="text-gray-500 font-medium normal-case">(Khoảng cách: {distanceKm} km)</span>}
                    </div>
                    <div className="flex flex-col gap-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-gray-500">
                        <span>Cước cơ bản:</span>
                        <span className="font-medium text-gray-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(basePrice)}</span>
                      </div>
                      {distanceFee > 0 && (
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Phí vượt cự ly (vượt {billableDistance} km):</span>
                          <span className="font-medium text-gray-800">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(distanceFee)}</span>
                        </div>
                      )}
                      {weightFee > 0 && (
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Phí quá tải (vượt {billableWeight} kg):</span>
                          <span className="font-medium text-gray-800">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(weightFee)}</span>
                        </div>
                      )}
                      {fragileSurcharge > 0 && (
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Phụ thu hàng dễ vỡ:</span>
                          <span className="font-medium text-[#bc0100]">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fragileSurcharge)}</span>
                        </div>
                      )}
                      {insuranceFee > 0 && (
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Phí bảo hiểm COD (0.5%):</span>
                          <span className="font-medium text-gray-800">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(insuranceFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center font-bold text-sm border-t pt-2 mt-1">
                        <span className="text-[#161D25] uppercase tracking-wider text-[10px]">Tổng cước tạm tính:</span>
                        <span className="text-base text-[#bc0100] font-extrabold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-[10px]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 bg-[#bc0100] hover:bg-[#a00100] text-white rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              {actionLoading ? 'Đang tạo đơn...' : 'Xác nhận tạo đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
