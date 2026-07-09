import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Truck, User } from 'lucide-react';
import { CONFIG } from '../../../config';

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

  // Receiver States
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressLine1, setReceiverAddressLine1] = useState('');
  const [receiverWard, setReceiverWard] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');

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
        country: 'Vietnam'
      },
      receiverContact: {
        fullName: receiverName,
        phone: receiverPhone,
      },
      deliveryAddress: {
        addressLine1: receiverAddressLine1,
        ward: receiverWard,
        province: receiverProvince,
        country: 'Vietnam'
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
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Địa chỉ chi tiết (Số nhà, đường)</label>
                  <input
                    type="text"
                    required
                    placeholder="123 Nguyễn Trãi"
                    value={senderAddressLine1}
                    onChange={(e) => setSenderAddressLine1(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Phường / Xã</label>
                    <input
                      type="text"
                      required
                      placeholder="Bến Thành"
                      value={senderWard}
                      onChange={(e) => setSenderWard(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tỉnh / TP</label>
                    <input
                      type="text"
                      required
                      placeholder="Hồ Chí Minh"
                      value={senderProvince}
                      onChange={(e) => setSenderProvince(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
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
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Địa chỉ chi tiết (Số nhà, đường)</label>
                  <input
                    type="text"
                    required
                    placeholder="456 Lê Lợi"
                    value={receiverAddressLine1}
                    onChange={(e) => setReceiverAddressLine1(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Phường / Xã</label>
                    <input
                      type="text"
                      required
                      placeholder="Bến Nghé"
                      value={receiverWard}
                      onChange={(e) => setReceiverWard(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tỉnh / TP</label>
                    <input
                      type="text"
                      required
                      placeholder="Hồ Chí Minh"
                      value={receiverProvince}
                      onChange={(e) => setReceiverProvince(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                    />
                  </div>
                </div>
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
                    <option value="PICKUP">🛵 Shipper đến lấy hàng tận nơi (PICKUP)</option>
                    <option value="DROP_OFF">🏬 Khách tự mang ra bưu cục gửi (DROP_OFF)</option>
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
                </div>
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
