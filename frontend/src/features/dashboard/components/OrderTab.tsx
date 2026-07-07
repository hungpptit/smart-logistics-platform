import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
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
  AlertTriangle
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
  changeSource: string;
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
  senderName: string;
  senderPhone: string;
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
  customer: {
    id: string;
    companyName?: string;
    user: {
      username: string;
      email: string;
    };
  };
  packages: PackageItem[];
  payment: OrderPayment;
  statusHistory?: OrderStatusHistory[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Đã tạo đơn', color: '#2563eb', bg: '#eff6ff' },
  WAITING_PICKUP: { label: 'Chờ lấy hàng', color: '#d97706', bg: '#fef3c7' },
  PICKUP_ASSIGNED: { label: 'Đã phân công lấy hàng', color: '#4f46e5', bg: '#e0e7ff' },
  PICKING: { label: 'Đang lấy hàng', color: '#0891b2', bg: '#ecfeff' },
  PICK_FAILED: { label: 'Lấy hàng thất bại', color: '#dc2626', bg: '#fef2f2' },
  PICKED_UP: { label: 'Đã lấy hàng', color: '#16a34a', bg: '#f0fdf4' },
  ARRIVED_ORIGIN_FACILITY: { label: 'Đến kho gửi', color: '#059669', bg: '#ecfdf5' },
  READY_FOR_DISPATCH: { label: 'Sẵn sàng điều phối', color: '#7c3aed', bg: '#f5f3ff' },
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

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail & Update Status states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const isAdminOrStaff = user?.roles.includes('ADMIN') || user?.roles.includes('STAFF');

  const fetchOrders = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${CONFIG.API_BASE_URL}/orders?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`;
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
  }, [currentPage, statusFilter, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1);
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative font-montserrat">
      {/* Orders List Container */}
      <div className={`xl:col-span-8 flex flex-col gap-4 ${selectedOrder ? 'hidden xl:flex' : 'xl:col-span-12'}`}>
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
              className="p-2 border border-[#e2e8f0] rounded hover:bg-gray-50 text-gray-500 transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
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
                    <th className="px-6 py-4 text-left">Gói Dịch Vụ</th>
                    <th className="px-6 py-4 text-left">Địa Chỉ Nhận</th>
                    <th className="px-6 py-4 text-left">Tổng Chi Phí</th>
                    <th className="px-6 py-4 text-left">Trạng Thái</th>
                    <th className="px-6 py-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((order) => {
                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#374151', bg: '#f3f4f6' };
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-[#161D25]">{order.orderCode}</td>
                        <td className="px-6 py-4 font-medium text-gray-600">{order.service?.serviceName || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={order.deliveryAddressText}>
                          {order.deliveryAddressText}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#bc0100]">{formatPrice(order.totalAmount)}</td>
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
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="bg-[#F4F4F4] px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <span className="text-gray-500 text-xs">
                Hiển thị trang <strong className="text-[#161D25]">{pagination.page}</strong> / <strong>{pagination.totalPages}</strong> ({pagination.total} đơn hàng)
              </span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
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
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-gray-400 hover:text-white p-1"
            >
              Đóng
            </button>
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
                      <p className="font-bold text-[#161D25]">{selectedOrder.senderName} ({selectedOrder.senderPhone})</p>
                      <p className="text-gray-500 mt-0.5 leading-relaxed">{selectedOrder.pickupAddressText}</p>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-[#bc0100]/30 h-4 ml-1.5 my-[-8px]"></div>

                  <div className="flex gap-3 items-start">
                    <MapPin className="text-green-600 shrink-0 mt-0.5" size={14} />
                    <div>
                      <span className="text-gray-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Người nhận & Điểm giao</span>
                      <p className="font-bold text-[#161D25]">{selectedOrder.receiverName} ({selectedOrder.receiverPhone})</p>
                      <p className="text-gray-500 mt-0.5 leading-relaxed">{selectedOrder.deliveryAddressText}</p>
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
                    <span className="font-semibold">{formatPrice(selectedOrder.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí bảo hiểm khai giá</span>
                    <span className="font-semibold">{formatPrice(selectedOrder.insuranceFee)}</span>
                  </div>
                  {selectedOrder.codAmount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Tiền thu hộ COD</span>
                      <span className="font-semibold">{formatPrice(selectedOrder.codAmount)}</span>
                    </div>
                  )}
                  <div className="border-b border-gray-300/40 my-1"></div>
                  <div className="flex justify-between font-bold text-[#bc0100] text-sm">
                    <span>Tổng chi phí đơn</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
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
                            Nguồn: {hist.changeSource} {hist.changedBy?.username ? `(${hist.changedBy.username})` : ''}
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
    </div>
  );
};
