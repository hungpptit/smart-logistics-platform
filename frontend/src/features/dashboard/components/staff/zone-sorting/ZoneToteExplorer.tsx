import React from 'react';
import { Layers, RefreshCw, Box, Eye } from 'lucide-react';

export interface FacilityZoneItem {
  id: string;
  zoneCode: string;
  zoneName: string;
  zoneType: string;
  capacity?: number;
}

interface ZoneToteExplorerProps {
  facilityZones: FacilityZoneItem[];
  activeExplorerZone: string;
  setActiveExplorerZone: (zoneCode: string) => void;
  zoneTotesData: any[];
  getActiveToteCode: (zoneCode: string) => string;
  fetchZoneTotes: () => void;
  handleOpenToteDetailModal: (toteCode: string) => void;
}

export const ZoneToteExplorer: React.FC<ZoneToteExplorerProps> = ({
  facilityZones,
  activeExplorerZone,
  setActiveExplorerZone,
  zoneTotesData,
  getActiveToteCode,
  fetchZoneTotes,
  handleOpenToteDetailModal,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Explorer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Layers size={18} className="text-amber-600" />
            <span>DANH SÁCH 4 PHÂN KHU KHO & QUẢN LÝ SỌT HÀNG (ZONES & TOTES EXPLORER)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bấm chọn Phân khu để xem danh sách các Sọt Hàng (`toteCode`). Bấm icon con mắt 👁️ để mở Popup xem chi tiết đơn hàng trong sọt và lấy mã quét lên xe tải.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchZoneTotes}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center"
        >
          <RefreshCw size={13} />
          <span>Làm Mới Sọt</span>
        </button>
      </div>

      {/* 4 Zone Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {facilityZones.map((zone) => {
          const isSelected = activeExplorerZone === zone.zoneCode;
          const activeToteCode = getActiveToteCode(zone.zoneCode);
          const zoneToteObj = zoneTotesData.find((z) => z.zoneCode === zone.zoneCode);
          let totesList = zoneToteObj?.totes || [];
          if (activeToteCode && !totesList.some((t: any) => t.toteCode === activeToteCode)) {
            totesList = [{ toteCode: activeToteCode, packageCount: 0 }, ...totesList];
          }

          return (
            <div
              key={zone.id}
              onClick={() => setActiveExplorerZone(zone.zoneCode)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                  {zone.zoneCode}
                </span>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {totesList.length} Sọt
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{zone.zoneName}</h4>
              <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Sọt đang gom:</span>
                <span className="font-mono font-bold text-amber-700">{activeToteCode}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Zone's Totes List Panel */}
      {(() => {
        const selectedZone = facilityZones.find((z) => z.zoneCode === activeExplorerZone);
        const zoneToteObj = zoneTotesData.find((z) => z.zoneCode === activeExplorerZone);
        const currentActiveTote = getActiveToteCode(activeExplorerZone);

        let totesList = zoneToteObj?.totes || [];
        if (!totesList.some((t: any) => t.toteCode === currentActiveTote)) {
          totesList = [{ toteCode: currentActiveTote, packageCount: 0, lastScannedAt: 'Vừa tạo' }, ...totesList];
        }

        return (
          <div className="bg-slate-900 rounded-xl p-4 text-white space-y-3 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Box size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  DANH SÁCH SỌT HÀNG THUỘC: {selectedZone?.zoneName || activeExplorerZone}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {totesList.length} sọt khả dụng
              </span>
            </div>

            {/* Totes Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {totesList.map((tote: any) => (
                <div
                  key={tote.toteCode}
                  className="p-3 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700/80 space-y-2 transition flex justify-between items-center shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono font-extrabold text-xs text-amber-300">
                        {tote.toteCode}
                      </span>
                      {tote.status === 'SEALED' ? (
                        <span className="text-[9px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded">
                          🔴 Đã niêm phong
                        </span>
                      ) : tote.status === 'LOADED' ? (
                        <span className="text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded">
                          🚚 Đã lên xe
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                          🟢 Đang gom
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Số lượng: <strong className="text-slate-200">{tote.packageCount || 0} bưu kiện</strong>
                    </p>
                  </div>

                  {/* View Eye Icon Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenToteDetailModal(tote.toteCode);
                    }}
                    title="Xem danh sách đơn/bưu kiện và lấy mã quét lên xe tải"
                    className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition font-bold flex items-center justify-center gap-1 shadow shrink-0 cursor-pointer"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
