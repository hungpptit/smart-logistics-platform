import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../../../config';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Phone,
  ExternalLink,
  PackageCheck,
  Headphones,
  Check,
  X,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Package,
  Search,
  RefreshCw,
  Plus,
  Edit3,
} from 'lucide-react';

export interface OrderItemSummary {
  id?: string;
  orderCode: string;
  status: string;
  serviceName?: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryAddress?: string;
  deliveryAddressText?: string;
  totalFee?: number;
  codAmount?: number;
  weightKg?: number;
  createdAt?: string;
  estimatedDeliveryDate?: string;
}

export interface ActionData {
  requiresConfirmation?: boolean;
  isDraft?: boolean;
  isDraftOrder?: boolean;
  isEscalation?: boolean;
  isOrderList?: boolean;
  orders?: OrderItemSummary[];
  actionType?:
    | 'CANCEL_ORDER'
    | 'UPDATE_DELIVERY_INFO'
    | 'RESCHEDULE_DELIVERY'
    | 'CONFIRM_CREATE_ORDER';
  orderCode?: string;
  orderId?: string;
  currentStatus?: string;
  confirmationToken?: string;
  expiresInSeconds?: number;
  reason?: string;
  newReceiverPhone?: string;
  newDeliveryAddress?: string;
  newDeliveryDate?: string;
  note?: string;
  details?: Record<string, any>;
  message?: string;

  // Draft fields
  draftData?: {
    receiverName?: string;
    receiverPhone?: string;
    deliveryAddress?: string;
    weightKg?: number;
    serviceCode?: string;
    codAmount?: number;
    shippingFee?: number;
    insuranceFee?: number;
    totalShippingFee?: number;
    totalOrderAmount?: number;
    estimatedShippingFee?: number;
    estimatedTotalFee?: number;
    formattedEta?: string;
    breakdown?: any;
  };
  summary?: string;
  actionLink?: string;

  // Escalation fields
  issueType?: string;
  hotline?: string;
  zaloOA?: string;
  operatingHours?: string;
}

interface ActionConfirmationCardProps {
  actionData: ActionData;
  onConfirm: (token: string, actionType: string) => Promise<{ success: boolean; message: string }>;
  onCancel: (token: string) => Promise<void>;
}

export const ActionConfirmationCard: React.FC<ActionConfirmationCardProps> = ({
  actionData,
  onConfirm,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(actionData.expiresInSeconds || 300);
  const [state, setState] = useState<'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'ERROR'>('PENDING');
  const [resultMessage, setResultMessage] = useState<string>('');

  useEffect(() => {
    if (state !== 'PENDING') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setState('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirm = async () => {
    if (!actionData.confirmationToken || !actionData.actionType || state !== 'PENDING') return;
    setState('CONFIRMING');
    try {
      const res = await onConfirm(actionData.confirmationToken, actionData.actionType);
      if (res.success) {
        setState('CONFIRMED');
        setResultMessage(res.message);
      } else {
        setState('ERROR');
        setResultMessage(res.message);
      }
    } catch (err: any) {
      setState('ERROR');
      setResultMessage(err.message || 'Lỗi kết nối khi xác nhận hành động.');
    }
  };

  const handleCancel = async () => {
    if (!actionData.confirmationToken || state !== 'PENDING') return;
    setState('CANCELLED');
    setResultMessage('Quý khách đã hủy bỏ yêu cầu này.');
    try {
      await onCancel(actionData.confirmationToken);
    } catch (err) {
      console.warn('Lỗi khi gửi yêu cầu hủy token:', err);
    }
  };

  const getTheme = () => {
    switch (actionData.actionType) {
      case 'CANCEL_ORDER':
        return {
          title: 'XÁC NHẬN HỦY ĐƠN HÀNG',
          borderColor: 'border-red-300',
          bgColor: 'bg-red-50/60',
          badgeBg: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertTriangle size={17} className="text-red-600" />,
          btnConfirmClass: 'bg-[#bc0100] hover:bg-[#9c0100] text-white',
        };
      case 'UPDATE_DELIVERY_INFO':
        return {
          title: 'XÁC NHẬN ĐỔI THÔNG TIN GIAO HÀNG',
          borderColor: 'border-amber-300',
          bgColor: 'bg-amber-50/60',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <MapPin size={17} className="text-amber-600" />,
          btnConfirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'RESCHEDULE_DELIVERY':
        return {
          title: 'XÁC NHẬN HẸN LẠI NGÀY GIAO HÀNG',
          borderColor: 'border-blue-300',
          bgColor: 'bg-blue-50/60',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Calendar size={17} className="text-blue-600" />,
          btnConfirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          confirmText: 'Xác nhận hẹn ngày',
        };
      case 'CONFIRM_CREATE_ORDER':
        return {
          title: 'XÁC NHẬN ĐẶT ĐƠN HÀNG VẬN CHUYỂN',
          borderColor: 'border-emerald-300',
          bgColor: 'bg-emerald-50/60',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <PackageCheck size={17} className="text-emerald-600" />,
          btnConfirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          confirmText: 'Xác nhận đặt đơn hàng',
        };
      default:
        return {
          title: 'XÁC NHẬN HÀNH ĐỘNG HỆ THỐNG',
          borderColor: 'border-gray-300',
          bgColor: 'bg-gray-50',
          badgeBg: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <ShieldCheck size={17} className="text-gray-600" />,
          btnConfirmClass: 'bg-gray-800 hover:bg-black text-white',
          confirmText: 'Xác nhận thực hiện',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`mt-3 p-3.5 rounded-xl border ${theme.borderColor} ${theme.bgColor} shadow-xs text-xs text-gray-800 transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10">
        <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide">
          {theme.icon}
          <span>{theme.title}</span>
        </div>
        {state === 'PENDING' && (
          <span className="flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-700 shadow-2xs">
            <Clock size={12} className="text-[#bc0100] animate-pulse" />
            {formatTimer(secondsLeft)}
          </span>
        )}
      </div>

      {/* Details Section */}
      <div className="space-y-1.5 mb-3 text-gray-700 leading-relaxed">
        {actionData.orderCode && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
            <span className="font-bold font-mono text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200">
              {actionData.orderCode}
            </span>
          </div>
        )}

        {actionData.actionType === 'CANCEL_ORDER' && (
          <>
            {actionData.currentStatus && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Trạng thái hiện tại:</span>
                <span className="font-semibold text-gray-800">{actionData.currentStatus}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium shrink-0">Lý do hủy:</span>
              <span className="font-medium text-red-700">{actionData.reason || 'Khách yêu cầu hủy qua Chat AI'}</span>
            </div>
          </>
        )}

        {actionData.actionType === 'UPDATE_DELIVERY_INFO' && (
          <>
            {actionData.newReceiverPhone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">SĐT nhận mới:</span>
                <span className="font-bold text-amber-800 font-mono">{actionData.newReceiverPhone}</span>
              </div>
            )}
            {actionData.newDeliveryAddress && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Địa chỉ mới:</span>
                <span className="font-semibold text-amber-900">{actionData.newDeliveryAddress}</span>
              </div>
            )}
            {actionData.note && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Ghi chú:</span>
                <span className="italic text-gray-700">{actionData.note}</span>
              </div>
            )}
          </>
        )}

        {actionData.actionType === 'RESCHEDULE_DELIVERY' && (
          <>
            {actionData.newDeliveryDate && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Ngày hẹn mới:</span>
                <span className="font-bold text-blue-800">{actionData.newDeliveryDate}</span>
              </div>
            )}
            {actionData.note && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Ghi chú hẹn:</span>
                <span className="italic text-gray-700">{actionData.note}</span>
              </div>
            )}
          </>
        )}

        {actionData.actionType === 'CONFIRM_CREATE_ORDER' && actionData.details && (
          <div className="space-y-1.5">
            {actionData.details.senderName && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Người gửi:</span>
                <span className="font-semibold text-gray-800">
                  {actionData.details.senderName} ({actionData.details.senderPhone})
                </span>
              </div>
            )}
            {actionData.details.pickupAddressText && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 font-medium shrink-0">Điểm lấy:</span>
                <span className="font-medium text-gray-800">{actionData.details.pickupAddressText}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium shrink-0">Người nhận:</span>
              <span className="font-bold text-gray-900">
                {actionData.details.receiverName} ({actionData.details.receiverPhone})
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium shrink-0">Địa chỉ giao:</span>
              <span className="font-medium text-gray-800">{actionData.details.deliveryAddress}</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500 font-medium">Kiện hàng: </span>
                <span className="font-semibold text-gray-800">
                  {actionData.details.description || 'Hàng hóa'} ({actionData.details.weightKg} kg)
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Gói cước: </span>
                <span className="font-bold text-emerald-700">{actionData.details.serviceCode || 'STANDARD'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-gray-500 font-medium">Cước vận chuyển:</span>
              <span className="font-bold text-gray-900 font-mono">
                {Number(actionData.details.totalShippingFee).toLocaleString('vi-VN')} đ
              </span>
              {actionData.details.formattedEta && (
                <span className="text-[11px] text-gray-500 ml-1">({actionData.details.formattedEta})</span>
              )}
            </div>
            {Number(actionData.details.codAmount) > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Tiền thu hộ COD:</span>
                <span className="font-bold text-amber-700 font-mono">
                  {Number(actionData.details.codAmount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/70 mt-1">
              <span className="text-gray-800 font-bold">Tổng chi phí dự kiến:</span>
              <span className="font-extrabold text-sm text-[#bc0100] font-mono">
                {Number(actionData.details.totalOrderAmount || actionData.details.totalShippingFee).toLocaleString('vi-VN')} đ
              </span>
              {Number(actionData.details.codAmount) > 0 && (
                <span className="text-[10px] text-gray-500 font-normal">(gồm COD + Cước)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* State Transitions / Buttons */}
      {state === 'PENDING' && (
        <div className="pt-2 border-t border-black/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X size={14} />
            <span>Hủy bỏ</span>
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${theme.btnConfirmClass}`}
          >
            <Check size={14} />
            <span>{theme.confirmText || 'Xác nhận thực hiện'}</span>
          </button>
        </div>
      )}

      {state === 'CONFIRMING' && (
        <div className="pt-2 border-t border-black/10 flex items-center justify-center gap-2 text-gray-600 font-semibold py-1">
          <Loader2 size={16} className="animate-spin text-[#bc0100]" />
          <span>Đang xác nhận và lưu vào hệ thống...</span>
        </div>
      )}

      {state === 'CONFIRMED' && (
        <div className="pt-2 border-t border-emerald-200 bg-emerald-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex items-center gap-2 text-emerald-800 font-semibold">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-emerald-900">Đã hoàn tất thành công!</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{resultMessage}</p>
          </div>
        </div>
      )}

      {state === 'CANCELLED' && (
        <div className="pt-2 border-t border-gray-200 bg-gray-100/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex items-center gap-2 text-gray-600">
          <XCircle size={18} className="text-gray-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-gray-700">Yêu cầu đã bị hủy bỏ</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{resultMessage}</p>
          </div>
        </div>
      )}

      {state === 'EXPIRED' && (
        <div className="pt-2 border-t border-amber-200 bg-amber-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex items-center gap-2 text-amber-800">
          <Clock size={18} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-amber-900">Yêu cầu đã hết hạn sau 5 phút</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Để đảm bảo an toàn giao dịch, token xác nhận đã hết hiệu lực. Quý khách vui lòng gửi lại yêu cầu trong chat nếu vẫn muốn thực hiện.
            </p>
          </div>
        </div>
      )}

      {state === 'ERROR' && (
        <div className="pt-2 border-t border-red-200 bg-red-50 -mx-3.5 -mb-3.5 p-3 rounded-b-xl flex items-center justify-between gap-2 text-red-800">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-900">Không thể thực hiện</p>
              <p className="text-[11px] text-red-700 mt-0.5">{resultMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
};

export const DraftOrderCard: React.FC<{ actionData: ActionData }> = ({ actionData }) => {
  const draft = actionData.draftData;
  if (!draft) return null;

  const totalShippingFee = draft.totalShippingFee ?? draft.estimatedTotalFee ?? draft.estimatedShippingFee ?? 0;
  const codAmount = Number(draft.codAmount) || 0;
  const totalOrderAmount = draft.totalOrderAmount ?? (totalShippingFee + codAmount);

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-xs text-xs text-gray-800">
      <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-emerald-900 pb-2 mb-2 border-b border-emerald-200">
        <PackageCheck size={17} className="text-emerald-600" />
        <span>BẢN XEM TRƯỚC ĐƠN HÀNG NHÁP</span>
      </div>

      <div className="space-y-1.5 text-gray-700 leading-relaxed mb-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Người nhận:</span>
          <span className="font-bold text-gray-900">
            {draft.receiverName} ({draft.receiverPhone})
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500 font-medium shrink-0">Địa chỉ giao:</span>
          <span className="font-medium text-gray-800">{draft.deliveryAddress}</span>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-500 font-medium">Khối lượng: </span>
            <span className="font-bold text-gray-800">{draft.weightKg} kg</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Gói cước: </span>
            <span className="font-bold text-emerald-700">{draft.serviceCode || 'STANDARD'}</span>
          </div>
        </div>

        {/* Cước phí vận chuyển */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-gray-500 font-medium">Cước vận chuyển:</span>
          <span className="font-bold text-gray-900 font-mono">
            {Number(totalShippingFee).toLocaleString('vi-VN')} đ
          </span>
          {draft.formattedEta && (
            <span className="text-[11px] text-gray-500 ml-1">({draft.formattedEta})</span>
          )}
        </div>

        {/* Tiền thu hộ COD nếu có */}
        {codAmount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Tiền thu hộ COD:</span>
            <span className="font-bold text-amber-700 font-mono">
              {Number(codAmount).toLocaleString('vi-VN')} đ
            </span>
          </div>
        )}

        {/* Tổng chi phí dự kiến */}
        <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/70 mt-1">
          <span className="text-gray-700 font-bold">Tổng chi phí dự kiến:</span>
          <span className="font-extrabold text-sm text-[#bc0100] font-mono">
            {Number(totalOrderAmount).toLocaleString('vi-VN')} đ
          </span>
          {codAmount > 0 && (
            <span className="text-[10px] text-gray-500 font-normal">(gồm COD + Cước)</span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-emerald-200 flex justify-end">
        <a
          href={`/customer/orders?action=create&receiverName=${encodeURIComponent(draft.receiverName || '')}&receiverPhone=${encodeURIComponent(draft.receiverPhone || '')}&address=${encodeURIComponent(draft.deliveryAddress || '')}&weight=${draft.weightKg || 1}&cod=${codAmount || 0}`}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <span>Mở form hoàn tất đặt đơn</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
};

export const EscalationCard: React.FC<{ actionData: ActionData }> = ({ actionData }) => {
  return (
    <div className="mt-3 p-3.5 rounded-xl border border-red-200 bg-red-50/50 shadow-xs text-xs text-gray-800">
      <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-[#bc0100] pb-2 mb-2 border-b border-red-200">
        <Headphones size={17} className="text-[#bc0100]" />
        <span>KẾT NỐI TỔNG ĐÀI CSKH VELOCITY 24/7</span>
      </div>

      <p className="text-gray-600 mb-3 leading-relaxed">
        {actionData.message ||
          'Chuyên viên CSKH trực ca luôn sẵn sàng giải quyết các trường hợp phát sinh đặc biệt hoặc khiếu nại bồi thường cho Quý khách.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href="tel:19006868"
          className="px-3 py-2 rounded-lg bg-[#bc0100] hover:bg-[#a00100] text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <Phone size={14} />
          <span>Gọi 1900-6868 (Phím 1)</span>
        </a>
        <a
          href="https://zalo.me/velocity_logistics"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <ExternalLink size={14} />
          <span>Chat qua Zalo OA</span>
        </a>
      </div>
    </div>
  );
};

export const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  CREATED: { label: 'Đã tạo', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  READY_FOR_PICKUP: { label: 'Chờ lấy', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  PICKED_UP: { label: 'Đã lấy', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IN_TRANSIT: { label: 'Đang trung chuyển', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  AT_HUB: { label: 'Tại kho bưu cục', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  OUT_FOR_DELIVERY: { label: 'Đang giao hàng', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  DELIVERED: { label: 'Giao thành công', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  DELIVERY_FAILED: { label: 'Giao thất bại', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: 'Đã hủy', badgeClass: 'bg-gray-100 text-gray-600 border-gray-300' },
};

/**
 * Thẻ hiển thị Danh sách đơn hàng kèm các nút hành động tương tác nhanh
 */
export const OrderListInteractiveCard: React.FC<{
  orders: OrderItemSummary[];
  onSelectAction: (text: string, autoSend?: boolean) => void;
}> = ({ orders, onSelectAction }) => {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs text-xs text-gray-800">
      <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-blue-900 pb-2 mb-2.5 border-b border-blue-200">
        <Package size={16} className="text-blue-600" />
        <span>DANH SÁCH ĐƠN HÀNG CỦA BẠN ({orders.length})</span>
      </div>

      <div className="space-y-2.5">
        {orders.map((ord, idx) => {
          const statusConfig = STATUS_LABELS[ord.status] || {
            label: ord.status,
            badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
          };
          const canCancel = ord.status === 'CREATED' || ord.status === 'READY_FOR_PICKUP';

          return (
            <div
              key={ord.orderCode || idx}
              className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-2xs hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono font-bold text-gray-900 text-xs">{ord.orderCode}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              {(ord.receiverName || ord.deliveryAddress) && (
                <p className="text-[11px] text-gray-600 mb-2 truncate">
                  Giao đến: <span className="font-medium text-gray-800">{ord.receiverName}</span>
                  {ord.deliveryAddress && ` • ${ord.deliveryAddress}`}
                </p>
              )}

              {/* Hàng nút bấm thao tác nhanh một chạm */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => onSelectAction(`Tôi chọn đơn hàng ${ord.orderCode}`, true)}
                  className="px-2 py-1 bg-gray-900 hover:bg-black text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Chọn đơn này để tra cứu hoặc xử lý"
                >
                  <Check size={11} className="stroke-[2.5]" />
                  <span>Chọn đơn</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAction(`Kiểm tra vị trí đơn hàng ${ord.orderCode} của tôi`, true)}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tra cứu vị trí và lộ trình đơn này"
                >
                  <Search size={11} className="stroke-[2.5]" />
                  <span>Tra cứu</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAction(`Tôi muốn hủy đơn hàng ${ord.orderCode}`, true)}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Yêu cầu hủy đơn này"
                >
                  <XCircle size={11} className="stroke-[2.5]" />
                  <span>Hủy đơn</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSelectAction(
                      `Tôi muốn đổi thông tin người nhận / địa chỉ cho đơn hàng ${ord.orderCode}`,
                      true
                    )
                  }
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Đổi thông tin người nhận, địa chỉ hoặc số điện thoại"
                >
                  <Edit3 size={11} className="stroke-[2.5]" />
                  <span>Đổi thông tin</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Modal Popover Bộ chọn Đơn hàng (Order Picker Modal)
 */
export const OrderPickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (text: string, autoSend?: boolean) => void;
}> = ({ isOpen, onClose, onSelectAction }) => {
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/orders?limit=20`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách đơn hàng cho OrderPicker:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderCode.toLowerCase().includes(q) ||
      (o.receiverName && o.receiverName.toLowerCase().includes(q)) ||
      (o.receiverPhone && o.receiverPhone.includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs font-montserrat"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#161D25] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#bc0100]" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Chọn Đơn Hàng Của Bạn</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 outline-none focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100]"
            />
          </div>
        </div>

        {/* Orders List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#bc0100]" />
              <span className="text-xs">Đang tải danh sách đơn hàng...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              <Package size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-600">Không tìm thấy đơn hàng nào</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Quý khách chưa có đơn hàng nào hoặc mã tìm kiếm không khớp.
              </p>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const statusConfig = STATUS_LABELS[ord.status] || {
                label: ord.status,
                badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
              };
              const canCancel = ord.status === 'CREATED' || ord.status === 'READY_FOR_PICKUP';

              return (
                <div
                  key={ord.orderCode}
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:border-[#bc0100] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-gray-900 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {ord.orderCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 font-medium mt-1">
                    Người nhận: {ord.receiverName} {ord.receiverPhone && `(${ord.receiverPhone})`}
                  </p>
                  {ord.deliveryAddressText && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      Đến: {ord.deliveryAddressText}
                    </p>
                  )}

                  {/* Hành động nhanh */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectAction(`Tôi chọn đơn hàng ${ord.orderCode}`, true);
                      }}
                      className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                      title="Chọn đơn này để tra cứu hoặc xử lý"
                    >
                      <Check size={13} className="stroke-[2.5]" />
                      <span>Chọn đơn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectAction(`Kiểm tra vị trí đơn hàng ${ord.orderCode} của tôi`, true);
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Search size={13} className="stroke-[2.5]" />
                      <span>Tra cứu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectAction(`Tôi muốn hủy đơn hàng ${ord.orderCode}`, true);
                      }}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <XCircle size={13} className="stroke-[2.5]" />
                      <span>Hủy đơn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectAction(
                          `Tôi muốn đổi thông tin người nhận / địa chỉ cho đơn hàng ${ord.orderCode}`,
                          true
                        );
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                      title="Đổi thông tin người nhận, địa chỉ hoặc số điện thoại"
                    >
                      <Edit3 size={13} className="stroke-[2.5]" />
                      <span>Đổi thông tin</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-200 text-center">
          <p className="text-[11px] text-gray-500">
            * Bấm chọn thao tác trên đơn để trợ lý AI thực hiện yêu cầu cho bạn ngay lập tức.
          </p>
        </div>
      </div>
    </div>
  );
};
