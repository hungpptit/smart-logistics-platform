import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { CreateOrderModal } from './CreateOrderModal';
import { BulkOrderUploadModal } from './BulkOrderUploadModal';
import { RouteOptimizationModal } from './RouteOptimizationModal';
import { formatCurrency } from '../../../lib/utils';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Package,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Bot,
  RotateCcw,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

interface PackageItem {
  id: string;
  packageCode: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  isFragile: boolean;
  temperatureRequirement?: string;
}

interface OrderPayment {
  id: string;
  shippingFee: number;
  insuranceFee: number;
  codAmount: number;
  feePayer: 'SENDER' | 'RECEIVER';
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'E_WALLET' | 'COD';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
}

interface OrderStatusHistory {
  id: string;
  status: string;
  reason?: string;
  createdAt: string;
  changedBy?: {
    username: string;
    email: string;
  };
}

interface Order {
  id: string;
  orderCode: string;
  status: string;
  pickupType: 'PICKUP' | 'DROP_OFF';
  originFacilityId?: string | null;
  destinationFacilityId?: string | null;
  senderName?: string;
  senderPhone?: string;
  pickupAddressText: string;
  pickupLatitude: number;
  pickupLongitude: number;
  receiverName: string;
  receiverPhone: string;
  deliveryAddressText: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  shippingFee: number;
  insuranceFee: number;
  codAmount: number;
  totalAmount: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  estimatedDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  service: {
    serviceCode: string;
    serviceName: string;
  };
  customer?: {
    id: string;
    fullName?: string;
    phone?: string;
    companyName?: string;
    user?: {
      username?: string;
      email?: string;
    };
  };
  packages: PackageItem[];
  payment: OrderPayment;
  statusHistory?: OrderStatusHistory[];
  originFacility?: {
    id: string;
    facilityCode: string;
    facilityName: string;
  };
  destinationFacility?: {
    id: string;
    facilityCode: string;
    facilityName: string;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Đã tạo đơn', color: '#2563eb', bg: '#eff6ff' },
  READY_FOR_PICKUP: { label: 'Chờ lấy hàng', color: '#d97706', bg: '#fef3c7' },
  PICKUP_ASSIGNED: { label: 'Đã phân công lấy hàng', color: '#4f46e5', bg: '#e0e7ff' },
  PICKING: { label: 'Đang lấy hàng', color: '#0891b2', bg: '#ecfeff' },
  PICK_FAILED: { label: 'Lấy hàng thất bại', color: '#dc2626', bg: '#fef2f2' },
  PICKED_UP: { label: 'Đã lấy hàng', color: '#16a34a', bg: '#f0fdf4' },
  ARRIVED_ORIGIN_FACILITY: { label: 'Đến kho gửi', color: '#059669', bg: '#ecfdf5' },
  READY_FOR_DISPATCH: { label: 'Sẵn sàng giao hàng', color: '#7c3aed', bg: '#f5f3ff' },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: '#3b82f6', bg: '#dbeafe' },
  AT_HUB: { label: 'Đã đến kho nhận', color: '#f59e0b', bg: '#fef3c7' },
  OUT_FOR_DELIVERY: { label: 'Đang giao hàng', color: '#06b6d4', bg: '#e0f7fa' },
  DELIVERED: { label: 'Giao hàng thành công', color: '#10b981', bg: '#d1fae5' },
  DELIVERY_FAILED: { label: 'Giao hàng thất bại', color: '#ef4444', bg: '#fee2e2' },
  RETURNING: { label: 'Đang chuyển hoàn', color: '#8b5cf6', bg: '#ede9fe' },
  RETURNED: { label: 'Đã hoàn trả', color: '#6b7280', bg: '#f3f4f6' },
  COMPLETED: { label: 'Đã hoàn thành', color: '#111827', bg: '#e5e7eb' },
  CANCELLED: { label: 'Đã hủy đơn', color: '#9ca3af', bg: '#f3f4f6' },
};

export const OrderTab: React.FC = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isCustomerDisabled = !!error && (
    error.includes('Hồ sơ khách hàng') ||
    error.includes('ngưng hoạt động') ||
    error.includes('bị khóa')
  );

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail & Update Status states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showPrintLabel, setShowPrintLabel] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [optimizing] = useState<boolean>(false);
  const isAdminOrStaff = user?.roles.includes('ADMIN') || user?.roles.includes('STAFF');
  const isAdmin = user?.roles.includes('ADMIN');
  const isStaff = user?.roles.includes('STAFF') && !user?.roles.includes('ADMIN');
  const isStaffWithoutFacility = isStaff && !user?.staffProfile?.assignedFacilityId;

  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<string>(user?.staffProfile?.assignedFacilityId || '');

  const isStaffOnly = isStaff;
  const userAssignedFacilityId = user?.staffProfile?.assignedFacilityId;
  const canOperateOnCurrentFacility = isAdmin || (isStaffOnly && facilityFilter === userAssignedFacilityId);

  const handleRunAiOptimization = () => {
    setIsOptimizationModalOpen(true);
  };

  const [resetting, setResetting] = useState<boolean>(false);

  const handleDevResetAi = async () => {
    const targetFacilityId = facilityFilter || userAssignedFacilityId;

    if (!targetFacilityId && !isAdmin) {
      alert('Vui lòng chọn Kho/Bưu cục cần hoàn tác dữ liệu AI!');
      return;
    }

    if (!canOperateOnCurrentFacility && !isAdmin) {
      alert('❌ Quyền hạn không đủ! Bạn chỉ được phép hoàn tác dữ liệu AI tại Bưu cục mình quản lý.');
      return;
    }

    const targetFacName = targetFacilityId
      ? (facilities.find(f => f.id === targetFacilityId)?.facilityName || 'kho đang chọn')
      : 'TOÀN BỘ CÁC BƯU CỤC HỆ THỐNG';

    if (!window.confirm(`⚠️ [DEV RESET] Bạn có chắc muốn HOÀN TÁC tất cả các tuyến AI đã gom và trả lại các đơn hàng của ${targetFacName} về trạng thái chờ ban đầu?`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes/dev-reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ facilityId: targetFacilityId })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`🎉 ${data.message || 'Đã hoàn tác dữ liệu AI về ban đầu!'}`);
        fetchOrders(currentPage);
      } else {
        alert(`❌ Lỗi hoàn tác: ${data.message || 'Không thể hoàn tác dữ liệu.'}`);
      }
    } catch (err) {
      console.error('Lỗi khi gọi API dev-reset:', err);
      alert('❌ Đã xảy ra lỗi kết nối khi hoàn tác.');
    } finally {
      setResetting(false);
    }
  };



  useEffect(() => {
    if (user?.staffProfile?.assignedFacilityId && !facilityFilter) {
      setFacilityFilter(user.staffProfile.assignedFacilityId);
    }
  }, [user]);

  useEffect(() => {
    const fetchFacilitiesForFilter = async () => {
      if (!token || !isAdminOrStaff) return;
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/facilities?limit=100`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setFacilities(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching facilities for filter:', err);
      }
    };
    fetchFacilitiesForFilter();
  }, [token, isAdminOrStaff]);

  const fetchOrders = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${CONFIG.API_BASE_URL}/orders?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&facilityId=${facilityFilter}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể lấy danh sách đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, statusFilter, facilityFilter, token]);

  // Real-time socket & periodic background refresh for Order status changes
  useEffect(() => {
    if (!token) return;

    const socketUrl = CONFIG.API_BASE_URL.replace('/api/v1', '');
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join:admin');
    });

    const handleRefetch = () => {
      fetchOrders(currentPage);
    };

    socket.on('routes_updated', handleRefetch);
    socket.on('driver:duty_status_changed', handleRefetch);
    socket.on('route:assigned', handleRefetch);
    socket.on('route:reset', handleRefetch);

    return () => {
      socket.emit('leave:admin');
      socket.disconnect();
    };
  }, [token, currentPage, statusFilter, facilityFilter, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage === 1) {
      fetchOrders(1);
    } else {
      setCurrentPage(1);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedOrder(data.data);
      } else {
        alert(data.message || 'Không thể lấy thông tin chi tiết đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ để xem chi tiết.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedOrder || !newStatus) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || undefined
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('Cập nhật trạng thái đơn hàng thành công!');
        setShowStatusModal(false);
        setStatusReason('');
        // Refresh detail view and list
        await fetchOrderDetail(selectedOrder.id);
        fetchOrders(currentPage);
      } else {
        alert(data.message || 'Cập nhật trạng thái thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi cập nhật.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!token) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('Hủy đơn hàng thành công!');
        if (selectedOrder?.id === orderId) {
          fetchOrderDetail(orderId);
        }
        fetchOrders(currentPage);
      } else {
        alert(data.message || 'Hủy đơn hàng thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (value: any) => {
    if (value === null || value === undefined || value === '') return '0 đ';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const getGroupedOrders = () => {
    if (facilityFilter) {
      const originOrders: Order[] = [];
      const destOrders: Order[] = [];
      const selectedFacName = facilities.find(f => f.id === facilityFilter)?.facilityName || 'Kho đang chọn';

      orders.forEach((order) => {
        if (order.originFacilityId === facilityFilter) {
          originOrders.push(order);
        } else if (order.destinationFacilityId === facilityFilter) {
          destOrders.push(order);
        }
      });

      const result = [];
      if (originOrders.length > 0) {
        result.push({
          facilityName: `📤 Đơn xuất phát từ ${selectedFacName}`,
          list: originOrders
        });
      }
      if (destOrders.length > 0) {
        result.push({
          facilityName: `📥 Đơn gửi đến ${selectedFacName}`,
          list: destOrders
        });
      }
      return result;
    } else {
      const groups: Record<string, Order[]> = {};
      orders.forEach((order) => {
        const facilityName = order.originFacility?.facilityName || 'Chưa phân kho';
        if (!groups[facilityName]) {
          groups[facilityName] = [];
        }
        groups[facilityName].push(order);
      });
      return Object.entries(groups).map(([facilityName, list]) => ({
        facilityName: `Kho gửi: ${facilityName}`,
        list
      }));
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative font-montserrat">
      {/* Orders List Container */}
      <div className={`xl:col-span-8 flex flex-col gap-4 ${selectedOrder ? 'hidden xl:flex' : 'xl:col-span-12'}`}>
        {isStaffWithoutFacility && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs">
              <p className="font-bold uppercase tracking-wider mb-0.5 text-amber-900">Cảnh báo: Chưa được phân công kho làm việc</p>
              <p className="text-amber-700 leading-relaxed font-medium">
                Tài khoản nhân viên của bạn hiện chưa được liên kết với bất kỳ kho bãi/hub nào.
                Do đó, bạn chỉ có thể xem và quản lý các đơn hàng do chính bạn tạo.
                Vui lòng liên hệ Quản trị viên (Admin) để được phân công kho làm việc.
              </p>
            </div>
          </div>
        )}
        <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Tìm mã đơn, địa chỉ gửi/nhận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded text-xs focus:outline-none focus:border-[#bc0100] transition-colors"
              />
            </div>
            <button type="submit" className="bg-[#bc0100] hover:bg-[#bc0100]/90 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
              Tìm kiếm
            </button>
          </form>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {isAdmin && (
              <select
                value={facilityFilter}
                onChange={(e) => {
                  setFacilityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-[#e2e8f0] rounded text-xs focus:outline-none bg-white font-medium max-w-[150px] truncate"
              >
                <option value="">Tất cả kho bãi</option>
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.facilityName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-[#e2e8f0] rounded text-xs focus:outline-none bg-white font-medium"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <button
              onClick={() => fetchOrders(currentPage)}
              disabled={loading}
              className="px-3 py-2 border border-[#e2e8f0] rounded hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm bg-white"
              title="Làm mới lại danh sách đơn hàng"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#bc0100]' : 'text-gray-600'} />
              <span>Làm mới</span>
            </button>

            {isStaffOnly && facilityFilter !== userAssignedFacilityId && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 font-bold flex items-center gap-1 shrink-0" title="Tài khoản nhân viên chỉ được thực hiện thao tác quản lý/gom cụm tại bưu cục được phân công.">
                🔒 Xem bưu cục khác (Chỉ đọc)
              </span>
            )}

            {isAdminOrStaff && canOperateOnCurrentFacility && (
              <>
                <button
                  onClick={handleRunAiOptimization}
                  disabled={optimizing || resetting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Kích hoạt thuật toán AI K-Means & VRP gom cụm phân đơn cho tài xế"
                >
                  <Bot size={16} className={optimizing ? 'animate-bounce' : ''} />
                  <span>{optimizing ? 'Đang gom...' : 'AI Gom Cụm'}</span>
                </button>

                <button
                  onClick={handleDevResetAi}
                  disabled={optimizing || resetting}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                  title="[DEV TOOL] Hoàn tác toàn bộ lộ trình AI và khôi phục 80 đơn hàng về trạng thái ban đầu để test AI tiếp"
                >
                  <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
                  <span>{resetting ? 'Đang reset...' : 'Hoàn tác AI (DEV)'}</span>
                </button>
              </>
            )}

            {!isAdmin && (
              <>
                <button
                  onClick={() => {
                    if (isCustomerDisabled) {
                      alert(error || 'Tài khoản của bạn đang bị khóa hoặc ngưng hoạt động. Không thể tạo đơn.');
                      return;
                    }
                    setShowCreateModal(true);
                  }}
                  disabled={isCustomerDisabled}
                  className={`text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${isCustomerDisabled
                    ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                    : 'bg-[#bc0100] hover:bg-[#bc0100]/90 cursor-pointer'
                    }`}
                  title={isCustomerDisabled ? (error || 'Hồ sơ đang bị khóa hoặc ngưng hoạt động') : 'Tạo đơn hàng đơn lẻ'}
                >
                  Tạo đơn lẻ
                </button>

                <button
                  onClick={() => {
                    if (isCustomerDisabled) {
                      alert(error || 'Tài khoản của bạn đang bị khóa hoặc ngưng hoạt động. Không thể tạo đơn.');
                      return;
                    }
                    setShowBulkUploadModal(true);
                  }}
                  disabled={isCustomerDisabled}
                  className={`text-white px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm ${isCustomerDisabled
                    ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
                    }`}
                  title="Upload đơn hàng loạt từ file Excel mẫu"
                >
                  <FileSpreadsheet size={16} />
                  <span>Tạo Đơn Loạt (Excel)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
              <RefreshCw size={36} className="animate-spin text-[#bc0100]" />
              <p className="text-xs uppercase font-bold tracking-wider">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
              <AlertTriangle size={36} />
              <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
              <Package size={48} className="text-gray-300" />
              <p className="text-xs font-bold uppercase tracking-wider">Không tìm thấy đơn hàng nào trong hệ thống</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-[#F4F4F4] text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left">Mã Đơn</th>
                    <th className="px-6 py-4 text-left">Hình Thức Gửi</th>
                    <th className="px-6 py-4 text-left">Gói Dịch Vụ</th>
                    <th className="px-6 py-4 text-left">Địa Chỉ Nhận</th>
                    <th className="px-6 py-4 text-left">Tổng Chi Phí</th>
                    <th className="px-6 py-4 text-left">Trạng Thái</th>
                    <th className="px-6 py-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {getGroupedOrders().map((group) => (
                    <React.Fragment key={group.facilityName}>
                      {/* Facility Group Header Row */}
                      <tr className="bg-[#bc0100]/5 border-y border-[#bc0100]/10">
                        <td colSpan={7} className="px-6 py-3 text-xs font-bold text-[#bc0100] select-none align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-3 bg-[#bc0100] rounded-sm"></span>
                            <span>{group.facilityName}</span>
                            <span className="text-[10px] bg-[#bc0100]/10 text-[#bc0100] px-2 py-0.5 rounded-full font-medium ml-1">
                              {group.list.length} đơn hàng
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.list.map((order) => {
                        const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#374151', bg: '#f3f4f6' };
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-[#161D25]">{order.orderCode}</td>
                            <td className="px-6 py-4 font-medium">
                              {order.pickupType === 'PICKUP' ? (
                                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-[10px]">Lấy tận nơi</span>
                              ) : (
                                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">Gửi tại kho</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-600">{order.service?.serviceName || 'N/A'}</td>
                            <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={order.deliveryAddressText}>
                              {order.deliveryAddressText}
                            </td>
                            <td className="px-6 py-4 font-bold text-[#bc0100]">
                              {formatCurrency(order.totalAmount ?? (order as any).estimatedTotalAmount)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center flex justify-center gap-2">
                              <button
                                onClick={() => fetchOrderDetail(order.id)}
                                className="bg-[#161D25] hover:bg-gray-800 text-white p-1.5 rounded transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye size={12} />
                              </button>
                              {order.status === 'CREATED' && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="border border-red-500 hover:bg-red-50 text-red-500 p-1.5 rounded transition-colors text-[10px] font-bold uppercase tracking-widest"
                                  title="Hủy đơn"
                                >
                                  HỦY
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="bg-[#F4F4F4] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 font-montserrat">
              <span className="text-gray-500 text-xs font-medium">
                Hiển thị trang <strong className="text-[#161D25]">{pagination.page}</strong> / <strong>{pagination.totalPages}</strong> ({pagination.total} đơn hàng)
              </span>
              <div className="flex items-center gap-2">
                {/* Direct Page Select Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
                  <span className="font-semibold">Trang:</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded bg-white text-xs font-bold text-[#161D25] focus:outline-none focus:border-[#bc0100] cursor-pointer"
                  >
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Trang {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Page Number Buttons with Ellipsis Windowing */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {(() => {
                    const total = pagination.totalPages;
                    const current = currentPage;
                    const pages: (number | string)[] = [];

                    if (total <= 5) {
                      for (let i = 1; i <= total; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (current > 3) pages.push('...');

                      const start = Math.max(2, current - 1);
                      const end = Math.min(total - 1, current + 1);
                      for (let i = start; i <= end; i++) pages.push(i);

                      if (current < total - 2) pages.push('...');
                      pages.push(total);
                    }

                    return pages.map((p, idx) => {
                      if (typeof p === 'string') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[32px] h-[32px] px-2 text-xs font-bold rounded border transition-colors ${p === currentPage
                            ? 'bg-[#bc0100] text-white border-[#bc0100] shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  <button
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang kế tiếp"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Sidebar / Overlay panel */}
      {(selectedOrder || detailLoading) && (
        <div className="xl:col-span-4 bg-white rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col max-h-[85vh] sticky top-6 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-[#161D25] text-white flex justify-between items-center">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400">Chi tiết vận đơn</span>
              <h3 className="text-sm font-mono font-bold tracking-widest">{selectedOrder?.orderCode || '...'}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintLabel(true)}
                className="bg-[#bc0100] hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                title="In nhãn Vận đơn (Barcode 1D Code 128 + 2D QR Code)"
              >
                <Printer size={12} />
                <span>In nhãn</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                Đóng
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-[#bc0100]" />
              <p className="text-[10px] uppercase font-bold tracking-wider">Đang tải chi tiết đơn hàng...</p>
            </div>
          ) : selectedOrder ? (
            <>
              {/* Detail Body */}
              <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 text-xs text-gray-600">
                {/* Quick Summary Row */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Gói dịch vụ</span>
                    <span className="font-bold text-[#161D25]">{selectedOrder.service?.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Hình thức gửi</span>
                    <span className="font-bold text-[#161D25]">
                      {selectedOrder.pickupType === 'PICKUP' ? 'Lấy tận nơi' : 'Gửi tại kho'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-medium">Trạng thái</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block"
                      style={{
                        color: (STATUS_MAP[selectedOrder.status] || { color: '#000' }).color,
                        backgroundColor: (STATUS_MAP[selectedOrder.status] || { bg: '#fff' }).bg
                      }}
                    >
                      {(STATUS_MAP[selectedOrder.status] || { label: selectedOrder.status }).label}
                    </span>
                  </div>
                </div>

                {/* Path details */}
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 items-start">
                    <MapPin className="text-[#bc0100] shrink-0 mt-0.5" size={14} />
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Người gửi & Điểm lấy</span>
                      <p className="font-bold text-[#161D25]">{selectedOrder.senderName || selectedOrder.customer?.fullName || 'Người gửi'} ({selectedOrder.senderPhone || selectedOrder.customer?.phone || 'N/A'})</p>
                      <p className="text-gray-500 mt-0.5 leading-relaxed">{selectedOrder.pickupAddressText}</p>
                      {selectedOrder.originFacility && (
                        <p className="text-blue-600 font-bold text-[10px] mt-1.5 flex items-center gap-1">
                          Kho xử lý gửi: {selectedOrder.originFacility.facilityName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-[#bc0100]/30 h-4 ml-1.5 my-[-8px]"></div>

                  <div className="flex gap-3 items-start">
                    <MapPin className="text-green-600 shrink-0 mt-0.5" size={14} />
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Người nhận & Điểm giao</span>
                      <p className="font-bold text-[#161D25]">{selectedOrder.receiverName} ({selectedOrder.receiverPhone})</p>
                      <p className="text-gray-500 mt-0.5 leading-relaxed">{selectedOrder.deliveryAddressText}</p>
                      {selectedOrder.destinationFacility && (
                        <p className="text-green-600 font-bold text-[10px] mt-1.5 flex items-center gap-1">
                          Kho xử lý nhận: {selectedOrder.destinationFacility.facilityName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Card */}
                <div className="bg-[#F4F4F4] p-4 rounded border border-gray-200/60 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-medium text-gray-500 uppercase">
                    <span>Mục thanh toán</span>
                    <span>Số tiền</span>
                  </div>
                  <div className="border-b border-gray-300/40 my-1"></div>
                  <div className="flex justify-between">
                    <span>Cước vận chuyển gốc</span>
                    <span className="font-semibold">{formatPrice(selectedOrder.shippingFee ?? (selectedOrder as any).estimatedShippingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí bảo hiểm khai giá</span>
                    <span className="font-semibold">{formatPrice(selectedOrder.insuranceFee ?? (selectedOrder as any).estimatedInsuranceFee)}</span>
                  </div>
                  {(selectedOrder.codAmount > 0 || (selectedOrder as any).estimatedCodAmount > 0) && (
                    <div className="flex justify-between text-amber-600">
                      <span>Tiền thu hộ COD</span>
                      <span className="font-semibold">{formatPrice(selectedOrder.codAmount ?? (selectedOrder as any).estimatedCodAmount)}</span>
                    </div>
                  )}
                  <div className="border-b border-gray-300/40 my-1"></div>
                  <div className="flex justify-between font-bold text-[#bc0100] text-sm">
                    <span>Tổng chi phí đơn</span>
                    <span>{formatPrice(selectedOrder.totalAmount ?? (selectedOrder as any).estimatedTotalAmount)}</span>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                    Thanh toán bởi: {selectedOrder.payment?.feePayer === 'SENDER' ? 'Người gửi' : 'Người nhận'} ({selectedOrder.payment?.paymentMethod})
                  </div>
                </div>

                {/* Packages list */}
                <div>
                  <h4 className="font-bold text-[#161D25] uppercase tracking-wider border-b border-gray-100 pb-2 mb-2 flex items-center gap-1.5">
                    <Package size={14} className="text-[#bc0100]" />
                    Chi tiết kiện hàng ({selectedOrder.packages?.length || 0})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedOrder.packages?.map((pkg) => (
                      <div key={pkg.id} className="p-3 bg-white border border-[#e2e8f0] rounded flex justify-between items-center">
                        <div>
                          <p className="font-bold font-mono text-[#161D25]">{pkg.packageCode}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5">Kích thước: {pkg.length} x {pkg.width} x {pkg.height} cm</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-600 block">{pkg.weight} kg</span>
                          {pkg.isFragile && (
                            <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Dễ vỡ</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status updates History Timeline */}
                <div>
                  <h4 className="font-bold text-[#161D25] uppercase tracking-wider border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                    <Clock size={14} className="text-[#bc0100]" />
                    Lịch sử hành trình đơn hàng
                  </h4>
                  <div className="flex flex-col gap-4 pl-2 relative border-l border-gray-200 ml-1.5">
                    {selectedOrder.statusHistory?.map((hist) => {
                      const statusInfo = STATUS_MAP[hist.status] || { label: hist.status, color: '#374151', bg: '#f3f4f6' };
                      return (
                        <div key={hist.id} className="relative pl-4">
                          {/* Timeline dot */}
                          <div
                            className="absolute w-2 h-2 rounded-full left-[-5px] top-1"
                            style={{ backgroundColor: statusInfo.color }}
                          ></div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#161D25]">{statusInfo.label}</span>
                            <span className="text-[9px] text-gray-400">{formatDate(hist.createdAt)}</span>
                          </div>
                          {hist.reason && (
                            <p className="text-gray-400 mt-1 italic leading-relaxed">"{hist.reason}"</p>
                          )}
                          <p className="text-[9px] text-gray-400 mt-0.5 font-medium uppercase">
                            Thực hiện bởi: {hist.changedBy?.username || 'Hệ thống'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Footer for Staff/Admin */}
              {isAdminOrStaff && (
                <div className="p-4 border-t border-gray-100 bg-[#F4F4F4] flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setNewStatus(selectedOrder.status);
                      setShowStatusModal(true);
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-[#bc0100] hover:bg-[#bc0100]/90 text-white py-2 rounded text-xs font-bold uppercase tracking-wider text-center transition-colors disabled:opacity-50"
                  >
                    Cập nhật trạng thái
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Update Status Popup Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden font-montserrat">
            <div className="bg-[#161D25] text-white p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">Cập Nhật Trạng Thái Đơn Hàng</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-white">
                Đóng
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-600">Trạng thái mới</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:border-[#bc0100] bg-white font-medium"
                  required
                >
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-600">Lý do thay đổi / Ghi chú lịch trình</label>
                <textarea
                  placeholder="Nhập lý do thay đổi trạng thái (ví dụ: Tài xế đã lấy hàng, Đang chuyển giao nội bộ...)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:border-[#bc0100] resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-[#e2e8f0] rounded font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-[#bc0100] hover:bg-[#bc0100]/90 text-white px-4 py-2 rounded font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Đang cập nhật...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waybill Print Label Modal (Barcode 1D Code 128 + 2D QR Code) */}
      {showPrintLabel && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Printer size={16} className="text-[#bc0100]" />
                  <span>NHÃN IN VẬN ĐƠN (WAYBILL LABEL)</span>
                </h3>
                <p className="text-[10px] text-slate-400">Dán lên bưu kiện để Shipper quét Barcode / QR Code</p>
              </div>
              <button
                onClick={() => setShowPrintLabel(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Label Content Printable Box */}
            <div className="border-2 border-dashed border-slate-300 p-5 rounded-lg bg-slate-50 space-y-4 text-center">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 text-left">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">SMART LOGISTICS PLATFORM</span>
                  <span className="font-mono font-bold text-slate-900 text-base">{selectedOrder.orderCode}</span>
                </div>
                <span className="bg-red-100 text-[#bc0100] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                  {selectedOrder.service?.serviceName || 'STANDARD'}
                </span>
              </div>

              {/* 1D Barcode Code 128 */}
              <div className="bg-white p-2 border border-slate-200 rounded flex flex-col items-center">
                <img
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${selectedOrder.orderCode}&scale=2&height=12`}
                  alt="1D Barcode Code 128"
                  className="h-14 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="font-mono text-[10px] font-bold text-slate-600 mt-1">{selectedOrder.orderCode}</span>
              </div>

              {/* 2D QR Code */}
              <div className="flex items-center justify-center gap-4 bg-white p-3 border border-slate-200 rounded">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${selectedOrder.orderCode}`}
                  alt="2D QR Code"
                  className="w-28 h-28 object-contain"
                />
                <div className="text-left text-[10px] space-y-1 text-slate-600">
                  <p><strong className="text-slate-800">Từ:</strong> {selectedOrder.senderName}</p>
                  <p><strong className="text-slate-800">Đến:</strong> {selectedOrder.receiverName}</p>
                  <p><strong className="text-slate-800">Kho nhận:</strong> {selectedOrder.destinationFacility?.facilityCode || 'N/A'}</p>
                  <p><strong className="text-slate-800">Số kiện:</strong> {selectedOrder.packages?.length || 1} kiện</p>
                  <p className="text-red-600 font-bold">COD: {formatCurrency(selectedOrder.codAmount ?? (selectedOrder as any).estimatedCodAmount)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => window.print()}
                className="bg-[#bc0100] hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Printer size={14} />
                <span>In nhãn Vận đơn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setCurrentPage(1);
          fetchOrders(1);
        }}
        token={token}
        isAdminOrStaff={!!isAdminOrStaff}
      />

      {/* Bulk Order Upload Excel Modal */}
      <BulkOrderUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => {
          setCurrentPage(1);
          fetchOrders(1);
        }}
        token={token}
      />

      {/* AI Route Optimization Modal */}
      <RouteOptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
        onSuccess={() => {
          fetchOrders(currentPage);
        }}
        token={token}
        facilityId={facilityFilter || userAssignedFacilityId}
        facilities={facilities}
        isAdmin={isAdmin}
      />
    </div>
  );
};
