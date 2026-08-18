import React from 'react';

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
  fetchZoneTotes?: () => void;
  handleOpenToteDetailModal: (toteCode: string) => void;
  includeLoaded?: boolean;
  onToggleIncludeLoaded?: (include: boolean) => void;
}

export const ZoneToteExplorer: React.FC<ZoneToteExplorerProps> = ({
  facilityZones,
  activeExplorerZone,
  setActiveExplorerZone,
  zoneTotesData,
  getActiveToteCode,
  fetchZoneTotes: _fetchZoneTotes,
  handleOpenToteDetailModal,
  includeLoaded = false,
  onToggleIncludeLoaded: _onToggleIncludeLoaded,
}) => {
  const getZoneTheme = (zoneCode: string, zoneType: string) => {
    const code = zoneCode.toUpperCase();

    // Inbound / Unloading Receiving
    if (code.includes('UNLOADING') || code.includes('INBOUND') || zoneType === 'RECEIVING') {
      return {
        categoryLabel: 'SÀN HẠ NHẬP KHO',
        activeClass: 'bg-emerald-500/10 border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-md',
        inactiveClass: 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/80',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        toteColor: 'text-emerald-700',
      };
    }

    // Regional Long-Haul Dispatch (Đi Các Miền)
    if (code.includes('REGION') || code.includes('NORTH-DISPATCH') || code.includes('CENTRAL-DISPATCH') || code.includes('SOUTH-DISPATCH')) {
      return {
        categoryLabel: 'TUYẾN LIÊN MIỀN',
        activeClass: 'bg-purple-500/10 border-purple-500/60 ring-2 ring-purple-500/30 shadow-md',
        inactiveClass: 'bg-purple-50/40 hover:bg-purple-50/80 border-purple-200/80',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        toteColor: 'text-purple-700',
      };
    }

    // Province Dispatch (Đi Các Tỉnh Nội Vùng)
    if (code.includes('DISPATCH-') || code.includes('INTRA') || code.includes('PROVINCE')) {
      return {
        categoryLabel: 'TUYẾN TỈNH NỘI VÙNG',
        activeClass: 'bg-sky-500/10 border-sky-500/60 ring-2 ring-sky-500/30 shadow-md',
        inactiveClass: 'bg-sky-50/40 hover:bg-sky-50/80 border-sky-200/80',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
        toteColor: 'text-sky-700',
      };
    }

    // Holding / Buffer Storage
    return {
      categoryLabel: 'KHO LƯU ĐỆM CHỜ XE',
      activeClass: 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/30 shadow-md',
      inactiveClass: 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/80',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      toteColor: 'text-amber-700',
    };
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Explorer Header */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
          DANH SÁCH {facilityZones.length} PHÂN KHU KHO & QUẢN LÝ SỌT HÀNG (ZONES & TOTES EXPLORER)
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Bấm chọn Phân khu để xem các Sọt Hàng (`toteCode`). Cuộn xuống để xem trọn bộ {facilityZones.length} phân khu kho.
        </p>
      </div>

      {/* Zone Cards Scrollable Grid Container */}
      <div className="max-h-[340px] overflow-y-auto pr-1.5 space-y-3 scrollbar-thin">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {facilityZones.map((zone) => {
            const isSelected = activeExplorerZone === zone.zoneCode;
            const activeToteCode = getActiveToteCode(zone.zoneCode);
            const theme = getZoneTheme(zone.zoneCode, zone.zoneType);
            const zoneToteObj = zoneTotesData.find((z) => z.zoneCode === zone.zoneCode);
            let totesList = zoneToteObj?.totes || [];
            if (activeToteCode && !totesList.some((t: any) => t.toteCode === activeToteCode)) {
              totesList = [{ toteCode: activeToteCode, packageCount: 0 }, ...totesList];
            }

            return (
              <div
                key={zone.id}
                onClick={() => setActiveExplorerZone(zone.zoneCode)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                  isSelected ? theme.activeClass : theme.inactiveClass
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-mono font-extrabold text-[10px] text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm leading-tight break-all">
                    {zone.zoneCode}
                  </span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${theme.badgeBg}`}>
                    {totesList.length} Sọt
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">{theme.categoryLabel}</span>
                  <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{zone.zoneName}</h4>
                </div>
                <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] gap-1">
                  <span className="text-slate-500 font-medium text-[10px] shrink-0">Sọt đang gom:</span>
                  <span className={`font-mono font-extrabold text-[10px] break-all text-right ${theme.toteColor}`}>{activeToteCode}</span>
                </div>
              </div>
            );
          })}
        </div>
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
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                DANH SÁCH SỌT HÀNG THUỘC: {selectedZone?.zoneName || activeExplorerZone} {includeLoaded ? '(TẤT CẢ LỊCH SỬ)' : '(ĐANG Ở SÀN KHO)'}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {totesList.length} sọt {includeLoaded ? 'tổng cộng' : 'tại sàn'}
              </span>
            </div>

            {/* Totes Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {totesList.map((tote: any) => (
                <div
                  key={tote.toteCode}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition flex flex-col justify-between shadow-md space-y-2.5"
                >
                  {/* Top Row: Status Tag & Package Count */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
                    {tote.status === 'SEALED' ? (
                      <span className="text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Đã niêm phong
                      </span>
                    ) : tote.status === 'LOADED' ? (
                      <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Đã lên xe tải
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Đang gom hàng
                      </span>
                    )}
                    <span className="text-xs text-slate-300 font-medium">
                      Số lượng: <strong className="text-amber-300 font-bold">{tote.packageCount || 0} bưu kiện</strong>
                    </span>
                  </div>

                  {/* Middle Row: Tote Code */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mã sọt hàng (Tote Code):
                    </span>
                    <div className="font-mono font-bold text-xs text-amber-400 break-all leading-normal bg-slate-950/70 p-2 rounded-lg border border-slate-700/60 select-all">
                      {tote.toteCode}
                    </div>
                  </div>

                  {/* Bottom Row: Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenToteDetailModal(tote.toteCode);
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg transition text-center uppercase tracking-wider cursor-pointer shadow mt-1"
                  >
                    Xem Chi Tiết & Mã QR Xe Tải
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
