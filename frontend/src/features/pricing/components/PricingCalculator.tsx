import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../../config';
import { Scale, MapPin, ShieldAlert, BadgeDollarSign, HelpCircle } from 'lucide-react';

interface ServiceData {
  id: string;
  serviceCode: string;
  serviceName: string;
  basePrice: number | string;
  freeDistanceKm: number;
  pricePerKm: number | string;
  freeWeightKg: number;
  pricePerKg: number | string;
  description: string;
  isActive: boolean;
}

const FALLBACK_SERVICES: ServiceData[] = [
  {
    id: 'standard-id',
    serviceCode: 'STANDARD',
    serviceName: 'Giao hàng Tiêu chuẩn',
    basePrice: 20000,
    freeDistanceKm: 2,
    pricePerKm: 5000,
    freeWeightKg: 1,
    pricePerKg: 3000,
    description: 'Thời gian giao hàng từ 1-3 ngày, phù hợp hàng thường',
    isActive: true
  },
  {
    id: 'express-id',
    serviceCode: 'EXPRESS',
    serviceName: 'Giao hàng Hỏa tốc 2h',
    basePrice: 35000,
    freeDistanceKm: 2,
    pricePerKm: 8000,
    freeWeightKg: 1,
    pricePerKg: 5000,
    description: 'Cam kết giao hàng siêu tốc trong vòng 2 giờ nội tỉnh',
    isActive: true
  },
  {
    id: 'saving-id',
    serviceCode: 'SAVING',
    serviceName: 'Giao hàng Tiết kiệm',
    basePrice: 15000,
    freeDistanceKm: 2,
    pricePerKm: 3000,
    freeWeightKg: 1,
    pricePerKg: 2000,
    description: 'Cước phí tối ưu cho kiện hàng không gấp, giao từ 3-5 ngày',
    isActive: true
  },
  {
    id: 'cold-chain-id',
    serviceCode: 'COLD_CHAIN',
    serviceName: 'Vận chuyển Đông lạnh',
    basePrice: 60000,
    freeDistanceKm: 2,
    pricePerKm: 12000,
    freeWeightKg: 1,
    pricePerKg: 8000,
    description: 'Đảm bảo dải nhiệt độ lạnh tiêu chuẩn cho thực phẩm & y tế',
    isActive: true
  }
];

export const PricingCalculator: React.FC = () => {
  const [services, setServices] = useState<ServiceData[]>(FALLBACK_SERVICES);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>('STANDARD');
  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [weightKg, setWeightKg] = useState<number>(1);
  const [isFragile, setIsFragile] = useState<boolean>(false);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch dynamic services from the database via Backend API
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/services`);
        const result = await response.json();
        if (response.ok && result.success && result.data && result.data.length > 0) {
          setServices(result.data);
          // Set first active service code
          const activeSvc = result.data.find((s: ServiceData) => s.isActive);
          if (activeSvc) {
            setSelectedServiceCode(activeSvc.serviceCode);
          }
        }
      } catch (error) {
        console.error('Lỗi khi lấy danh sách dịch vụ từ DB, sử dụng dữ liệu mặc định:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const activeService = services.find((s) => s.serviceCode === selectedServiceCode) || services[0] || FALLBACK_SERVICES[0];

  // Pricing formula matching pricing.service.ts
  const basePrice = Number(activeService.basePrice);
  const freeDistanceKm = activeService.freeDistanceKm;
  const pricePerKm = Number(activeService.pricePerKm);
  const freeWeightKg = activeService.freeWeightKg;
  const pricePerKg = Number(activeService.pricePerKg);

  const billableDistance = Math.max(0, distanceKm - freeDistanceKm);
  const distanceFee = billableDistance * pricePerKm;

  const billableWeight = Math.max(0, weightKg - freeWeightKg);
  const weightFee = billableWeight * pricePerKg;

  const fragileSurcharge = isFragile ? 15000 : 0;

  let insuranceFee = 0;
  if (codAmount > 0) {
    insuranceFee = Math.min(50000, Math.max(0, codAmount * 0.005));
  }

  const shippingFee = basePrice + distanceFee + weightFee + fragileSurcharge;
  const totalAmount = shippingFee + insuranceFee;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 font-montserrat">
      <div className="bg-white rounded-lg shadow-soft border border-[#e2e8f0] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Form Column */}
        <div className="lg:col-span-7 p-6 md:p-8 flex flex-col gap-6 bg-white border-r border-[#e8e8e8]">
          <div>
            <h3 className="text-xl font-bold text-[#161D25] uppercase tracking-wider mb-2">Ước tính phí giao hàng</h3>
            <p className="text-sm text-gray-500">Điền thông tin khoảng cách & trọng lượng để ước tính chi phí chính xác nhất.</p>
          </div>

          {/* Service Cards selection grid */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-[#161D25] uppercase tracking-wider">Chọn Gói Dịch Vụ</label>
            {loading ? (
              <div className="text-sm text-gray-400 py-2">Đang tải dữ liệu bảng giá dịch vụ...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => {
                  const isSelected = svc.serviceCode === selectedServiceCode;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setSelectedServiceCode(svc.serviceCode)}
                      className={`p-4 text-left border rounded-md transition-all flex flex-col gap-1 cursor-pointer bg-white relative overflow-hidden ${
                        isSelected
                          ? 'border-[#bc0100] shadow-medium bg-[#bc0100]/[0.02]'
                          : 'border-[#e2e8f0] hover:border-gray-400'
                      }`}
                      style={{ borderLeftWidth: isSelected ? '4px' : '1px' }}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-8 h-8 bg-[#bc0100] text-white flex items-center justify-center rounded-bl-lg">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                      )}
                      <span className="font-bold text-sm text-[#161D25]">{svc.serviceName}</span>
                      <span className="text-xs text-gray-400 line-clamp-1 pr-6">{svc.description}</span>
                      <span className="text-xs font-bold text-[#bc0100] mt-1">
                        Giá mở cửa: {formatVND(Number(svc.basePrice))}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sliders and Numeric Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Distance Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#161D25] flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin size={16} className="text-[#bc0100]" /> Khoảng cách (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value)))}
                  className="w-20 p-1 text-center border border-[#e2e8f0] rounded focus:outline-none focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] text-sm font-bold text-[#161D25]"
                />
              </div>
              <input
                type="range"
                min="1"
                max="500"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full h-1.5 bg-[#F4F4F4] rounded-lg appearance-none cursor-pointer accent-[#bc0100]"
              />
              <span className="text-[10px] text-gray-400">Miễn phí {freeDistanceKm} km đầu tiên</span>
            </div>

            {/* Weight Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#161D25] flex items-center gap-1.5 uppercase tracking-wider">
                  <Scale size={16} className="text-[#bc0100]" /> Khối lượng (kg)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Math.max(0.1, Number(e.target.value)))}
                  className="w-20 p-1 text-center border border-[#e2e8f0] rounded focus:outline-none focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] text-sm font-bold text-[#161D25]"
                />
              </div>
              <input
                type="range"
                min="0.5"
                max="100"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full h-1.5 bg-[#F4F4F4] rounded-lg appearance-none cursor-pointer accent-[#bc0100]"
              />
              <span className="text-[10px] text-gray-400">Miễn phí {freeWeightKg} kg đầu tiên</span>
            </div>
          </div>

          {/* Options: Fragile & COD */}
          <div className="border-t border-[#e8e8e8] pt-4 flex flex-col gap-4">
            <label className="text-sm font-semibold text-[#161D25] uppercase tracking-wider">Dịch vụ bổ sung</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fragile Surcharge option */}
              <label className="flex items-center gap-3 p-3 border border-[#e2e8f0] rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="w-4 h-4 rounded text-[#bc0100] focus:ring-[#bc0100] border-gray-300"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#161D25] flex items-center gap-1">
                    <ShieldAlert size={14} className="text-amber-500" /> Hàng dễ vỡ
                  </span>
                  <span className="text-[11px] text-gray-400">Phụ thu +15.000đ đóng gói kỹ</span>
                </div>
              </label>

              {/* COD option */}
              <div className="flex flex-col gap-1 border border-[#e2e8f0] p-3 rounded-md">
                <label className="text-xs font-bold text-[#161D25] flex items-center gap-1 uppercase tracking-wider">
                  <BadgeDollarSign size={14} className="text-[#bc0100]" /> Tiền thu hộ COD (VND)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Nhập số tiền..."
                    value={codAmount || ''}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    className="w-full p-1 px-2 border border-[#e2e8f0] rounded focus:outline-none focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] text-xs font-bold"
                  />
                </div>
                <span className="text-[10px] text-gray-400">Phí bảo hiểm: 0.5% số tiền COD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Column */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-[#F4F4F4] flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-[#161D25] uppercase tracking-wider border-b border-gray-300 pb-3">Chi tiết cước tạm tính</h3>
            
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Gói cước:</span>
                <span className="font-bold text-[#161D25]">{activeService.serviceName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Cước cơ bản (mở cửa):</span>
                <span className="font-semibold text-[#161D25]">{formatVND(basePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Phí khoảng cách ({distanceKm} km):</span>
                <span className="font-semibold text-[#161D25]">{formatVND(distanceFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Phí khối lượng ({weightKg} kg):</span>
                <span className="font-semibold text-[#161D25]">{formatVND(weightFee)}</span>
              </div>
              {isFragile && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Phụ phí hàng dễ vỡ:</span>
                  <span className="font-semibold text-[#161D25]">{formatVND(fragileSurcharge)}</span>
                </div>
              )}
              {codAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Phí bảo hiểm COD (0.5%):</span>
                  <span className="font-semibold text-[#161D25]">{formatVND(insuranceFee)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-300 pt-6">
            <div className="flex justify-between items-end">
              <span className="text-base font-bold text-[#161D25] uppercase tracking-wider">Tổng cước tạm tính:</span>
              <span className="text-2xl font-extrabold text-[#bc0100]">{formatVND(totalAmount)}</span>
            </div>
            
            <div className="text-[11px] text-gray-400 bg-white/70 p-3 rounded border border-gray-200 flex gap-2">
              <HelpCircle size={14} className="text-[#bc0100] shrink-0" />
              <span>Giá cước trên chỉ là tạm tính dựa trên khoảng cách đường chim bay, chưa bao gồm các phụ phí xăng dầu hoặc điều kiện đặc biệt khác.</span>
            </div>

            <button
              onClick={() => {
                const element = document.getElementById('dashboard') || document.getElementById('tracking-results');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="w-full bg-[#bc0100] hover:bg-[#930100] text-white py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Đăng nhập để đặt hàng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PricingCalculator;
