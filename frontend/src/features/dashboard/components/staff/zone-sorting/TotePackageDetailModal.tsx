import React, { useState } from 'react';
import { Box, X, RefreshCw, Lock, CheckCircle2, Package, ShieldCheck } from 'lucide-react';

interface TotePackageDetailModalProps {
  selectedToteModal: any | null;
  toteModalLoading: boolean;
  onClose: () => void;
  onSealTote?: (zoneCode: string) => void;
}

export const TotePackageDetailModal: React.FC<TotePackageDetailModalProps> = ({
  selectedToteModal,
  toteModalLoading,
  onClose,
  onSealTote,
}) => {
  const [localIsSealed, setLocalIsSealed] = useState(false);

  if (!selectedToteModal && !toteModalLoading) return null;

  const toteCode = selectedToteModal?.toteCode || '';
  const isSealed = selectedToteModal?.status === 'SEALED' || selectedToteModal?.status === 'LOADED' || localIsSealed;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(toteCode)}`;

  const handleSealClick = () => {
    setLocalIsSealed(true);
    if (onSealTote && selectedToteModal?.zoneCode) {
      onSealTote(selectedToteModal.zoneCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Box size={24} className="text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-black text-xl text-amber-400 leading-none">
                  {toteCode || 'Đang tải Sọt...'}
                </h3>
                {isSealed ? (
                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 size={11} /> ĐÃ NIÊM PHONG
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    🟢 ĐANG GOM HÀNG
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mã QR Sọt dùng để Tài xế / Nhân viên quét xác nhận xuất kho & chất lên Xe Tải (`Shipment`)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {toteModalLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={36} className="text-amber-500 animate-spin" />
            <p className="text-xs font-bold text-slate-600">Đang tạo mã QR & tải bưu kiện trong Sọt...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto flex-1 max-h-[520px]">
            {/* Scannable 2D QR Code Container for Mobile Camera Scanning */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-5 shadow-xl">
              {isSealed ? (
                <div className="bg-white p-3 rounded-xl border-4 border-amber-400 shadow-lg shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code ${toteCode}`}
                    className="w-36 h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 bg-slate-800/90 rounded-xl border-2 border-dashed border-amber-500/50 flex flex-col items-center justify-center p-3 text-center shrink-0 space-y-2">
                  <Lock size={32} className="text-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-amber-300">Chưa Niêm Phong</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Mã QR sẽ xuất hiện sau khi chốt Sọt</span>
                </div>
              )}

              <div className="space-y-3 flex-1 text-center md:text-left">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
                    {isSealed ? '📱 MÃ QR QUÉT BỐC HÀNG LÊN XE TẢI:' : '🔒 SỌT HÀNG ĐANG TRONG TRẠNG THÁI GOM:'}
                  </span>
                  <h4 className="font-mono text-xl font-black text-white tracking-tight">{toteCode}</h4>
                </div>

                <p className="text-xs text-slate-300 bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80 leading-relaxed">
                  {isSealed ? (
                    <>📱 <strong>Tài xế / Nhân viên bốc xếp:</strong> Dùng Camera điện thoại quét mã QR này để xác nhận đã bốc toàn bộ <strong>{selectedToteModal?.totalPackages || 0} đơn hàng</strong> trong sọt lên xe tải!</>
                  ) : (
                    <>⚠️ Sọt hiện đang trong trạng thái <strong>ĐANG GOM HÀNG</strong> ({selectedToteModal?.totalPackages || 0} bưu kiện). Hãy bấm <strong>'CHỐT NIÊM PHONG SỌT'</strong> bên dưới để xuất Mã QR lên xe tải!</>
                  )}
                </p>

                {!isSealed ? (
                  <button
                    type="button"
                    onClick={handleSealClick}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock size={15} />
                    <span>CHỐT NIÊM PHONG SỌT (KÍCH HOẠT MÃ QR LÊN XE)</span>
                  </button>
                ) : (
                  <div className="py-2 px-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5">
                    <ShieldCheck size={16} />
                    Sọt đã niêm phong! Sẵn sàng đưa lên xe tải.
                  </div>
                )}
              </div>
            </div>

            {/* Package Count Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={16} className="text-amber-600" />
                Danh Sách Bưu Kiện Trong Sọt ({selectedToteModal?.totalPackages || 0} đơn)
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">Cuộn để xem danh sách</span>
            </div>

            {/* Scrollable Packages List */}
            {selectedToteModal?.packages && selectedToteModal.packages.length > 0 ? (
              <div className="space-y-2.5">
                {selectedToteModal.packages.map((pkg: any, idx: number) => (
                  <div
                    key={pkg.id || idx}
                    className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 transition space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                          {pkg.packageCode || pkg.orderCode}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          (Đơn: {pkg.orderCode})
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{pkg.scannedAt}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/80">
                      <div>
                        <span className="text-slate-400 text-[10px]">Người nhận: </span>
                        <strong className="text-slate-800">{pkg.receiverName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Bưu cục đích: </span>
                        <strong className="text-slate-800">{pkg.destinationFacilityName}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-1">
                <Package size={36} className="text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Sọt này hiện chưa có bưu kiện nào.</p>
                <p className="text-[11px] text-slate-400">Hướng bưu kiện vào camera phía trên để bắt đầu gom đơn vào sọt.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
