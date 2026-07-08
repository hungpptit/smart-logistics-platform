import React from 'react';
import { Warehouse, XCircle, Calendar, User, MapPin, Layers, Edit2, Trash2 } from 'lucide-react';

interface FacilityType {
  id: string;
  typeCode: string;
  typeName: string;
  description?: string;
}

interface FacilityAddress {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
  facilityTypeId: string;
  parentFacilityId?: string;
  managerUserId?: string;
  operatingStatus: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  note?: string;
  facilityType?: FacilityType;
  facilityAddresses?: Array<{
    address: FacilityAddress;
    addressType: string;
  }>;
  manager?: {
    username: string;
    email: string;
    phone?: string;
  };
}

interface CargoZone {
  id: string;
  facilityId: string;
  zoneCode: string;
  zoneName: string;
  zoneType: 'RECEIVING' | 'SORTING' | 'STORAGE' | 'DISPATCH' | 'RETURN' | 'QUARANTINE';
  capacity?: number;
  createdAt: string;
}

interface FacilityDetailPanelProps {
  facility: Facility;
  zones: CargoZone[];
  zonesLoading: boolean;
  onClose: () => void;
  onAddZone: () => void;
  onEditZone: (z: CargoZone) => void;
  onDeleteZone: (id: string) => void;
  canManage: boolean;
}

export const FacilityDetailPanel: React.FC<FacilityDetailPanelProps> = ({
  facility,
  zones,
  zonesLoading,
  onClose,
  onAddZone,
  onEditZone,
  onDeleteZone,
  canManage
}) => {
  return (
    <div className="lg:col-span-5 bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#e2e8f0] bg-[#161D25] text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Warehouse size={16} className="text-[#bc0100]" />
          <span className="text-xs font-extrabold uppercase tracking-wider">Thông tin chi tiết & Phân khu</span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <XCircle size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[600px]">
        {/* Facility Info Card */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-150 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <span className="font-extrabold text-[#161D25] uppercase tracking-wider">
              {facility.facilityType?.typeName || 'N/A'}
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-500">{facility.facilityCode}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-gray-400 text-[10px]">Tên kho bãi</span>
              <span className="font-bold text-[#161D25] text-sm">{facility.facilityName}</span>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10} /> Ngày mở cửa</span>
              <span className="font-bold text-[#161D25]">{facility.openedAt ? new Date(facility.openedAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px] flex items-center gap-1"><User size={10} /> Quản lý</span>
              <span className="font-bold text-[#161D25]">{facility.manager?.username || 'Chưa chỉ định'}</span>
            </div>

            {facility.facilityAddresses?.[0]?.address && (
              <div className="flex flex-col gap-0.5 col-span-2 border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-400 text-[10px] flex items-center gap-1"><MapPin size={10} /> Địa chỉ vật lý</span>
                <span className="font-medium text-gray-700 leading-relaxed">
                  {facility.facilityAddresses[0].address.formattedAddress}
                </span>
                <span className="text-[9px] font-mono text-gray-400">
                  GPS: {facility.facilityAddresses[0].address.latitude.toFixed(6)}, {facility.facilityAddresses[0].address.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {facility.note && (
            <div className="border-t border-gray-200 pt-2 mt-1">
              <span className="text-gray-400 text-[10px] block mb-0.5">Ghi chú vận hành</span>
              <p className="text-gray-600 italic bg-white p-2 rounded border border-gray-150 text-[11px] leading-relaxed">
                {facility.note}
              </p>
            </div>
          )}
        </div>

        {/* Cargo Zones Area */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
            <h4 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-[#bc0100]" />
              Phân Khu Lưu Kho ({zones.length})
            </h4>
            {canManage && (
              <button
                onClick={onAddZone}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#161D25] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                <span>Thêm phân khu</span>
              </button>
            )}
          </div>

          {zonesLoading ? (
            <div className="py-8 text-center text-gray-400 text-xs">Đang tải phân khu...</div>
          ) : zones.length === 0 ? (
            <div className="py-12 border border-dashed border-gray-200 rounded text-center text-gray-400 text-xs flex flex-col items-center gap-2">
              <Layers size={24} className="text-gray-300 animate-pulse" />
              <span>Chưa có phân khu hàng hóa nào</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {zones.map((zone) => (
                <div 
                  key={zone.id}
                  className="p-3 rounded border border-gray-200 bg-white text-xs flex flex-col gap-2 transition-all hover:shadow-soft"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-800">{zone.zoneName}</span>
                      <span className="px-2 py-0.5 rounded-[3px] text-[8px] font-extrabold bg-[#bc0100]/10 text-[#bc0100] border border-[#bc0100]/20 tracking-wider font-mono">
                        {zone.zoneCode}
                      </span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditZone(zone)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                          title="Sửa phân khu"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => onDeleteZone(zone.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded cursor-pointer"
                          title="Xóa phân khu"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-gray-500 border-t border-gray-100 pt-2 mt-1">
                    <span>Loại phân khu: <strong className="text-gray-700">{zone.zoneType}</strong></span>
                    <span>Sức chứa: <strong className="text-gray-700">{zone.capacity || 'N/A'}</strong> kiện</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
