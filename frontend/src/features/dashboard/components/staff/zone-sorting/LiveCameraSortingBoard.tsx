import React from 'react';
import { Camera, Sparkles, Package } from 'lucide-react';
import type { FacilityZoneItem } from './ZoneToteExplorer';

interface LiveCameraSortingBoardProps {
  isCameraActive: boolean;
  stopCamera: () => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  liveScannedInfo: any | null;
  scannedPackageInfo: any | null;
  facilityZones: FacilityZoneItem[];
  getActiveToteCode: (zoneCode: string) => string;
  handleSealAndOpenNewTote: (zoneCode: string) => void;
}

export const LiveCameraSortingBoard: React.FC<LiveCameraSortingBoardProps> = ({
  isCameraActive,
  stopCamera,
  videoRef,
  streamRef,
  liveScannedInfo,
  scannedPackageInfo,
  facilityZones,
  getActiveToteCode,
  handleSealAndOpenNewTote,
}) => {
  if (!isCameraActive) return null;

  const activeDisplayInfo = liveScannedInfo || scannedPackageInfo;

  return (
    <div className="bg-slate-950 rounded-2xl p-6 border-2 border-amber-500/40 shadow-2xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wide">
          <Camera size={18} className="animate-pulse text-amber-400" />
          <span>SÀN KHAI THÁC KHO - CAMERA QUÉT MÃ & BẢNG CHỈ DẪN PHÂN LOẠI REALTIME</span>
        </div>
        <button
          type="button"
          onClick={stopCamera}
          className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg text-xs font-bold border border-red-500/40 transition cursor-pointer"
        >
          ✕ Đóng Camera
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column (50%): Camera Viewfinder */}
        <div className="flex flex-col justify-between space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                  el.play().catch(() => { });
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-2 border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="w-56 h-36 border-2 border-dashed border-amber-400 rounded-lg animate-pulse flex items-center justify-center">
                <span className="text-[10px] font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded shadow">
                  Khung quét QR / Barcode
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center font-medium">
            📸 Hướng tem mã vạch Bưu kiện vào khung nét đứt màu vàng để máy tự động bắn mã.
          </p>
        </div>

        {/* Right Column (50%): Giant Realtime Sorting Instruction Board */}
        <div className="flex flex-col justify-between bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} />
              BẢNG HIỂN THỊ HƯỚNG PHÂN LOẠI HÀNG
            </span>
            {activeDisplayInfo && (
              <span className="font-mono text-xs font-bold bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">
                {activeDisplayInfo.code}
              </span>
            )}
          </div>

          {activeDisplayInfo ? (
            <div className="space-y-4 flex-1 flex flex-col justify-center animate-fade-in">
              {/* Giant Target Zone Display Box */}
              <div
                className={`p-5 rounded-2xl border text-center space-y-2 shadow-xl ${activeDisplayInfo.suggestedZoneCode === 'ZONE-W-LOCAL'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100 ring-2 ring-emerald-500/30'
                    : activeDisplayInfo.suggestedZoneCode === 'ZONE-W-PROVINCE-DISPATCH'
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-100 ring-2 ring-amber-500/30'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-100 ring-2 ring-rose-500/30'
                  }`}
              >
                <span className="text-xs font-bold uppercase tracking-widest block opacity-80">
                  PHÂN KHU KHO ĐÍCH NÉM HÀNG VÀO:
                </span>
                <h3 className="text-2xl font-black tracking-tight font-mono">
                  {activeDisplayInfo.suggestedZoneCode}
                </h3>
                <div className="text-sm font-extrabold py-1 px-3 rounded-full bg-black/40 inline-block border border-white/10">
                  {activeDisplayInfo.suggestedZoneName}
                </div>

                {/* Giant Active Tote Instruction Badge */}
                <div className="pt-2 border-t border-white/10 mt-2">
                  <span className="text-[11px] font-bold text-amber-300 uppercase block tracking-wider">
                    NÉM VÀO SỌT HÀNG MÃ SỐ:
                  </span>
                  <div className="text-xl font-mono font-black text-amber-400 bg-amber-950/90 px-4 py-1.5 rounded-xl border border-amber-500/50 inline-block shadow-inner mt-1">
                    {activeDisplayInfo.toteCode || getActiveToteCode(activeDisplayInfo.suggestedZoneCode)}
                  </div>
                </div>
              </div>

              {/* Clear Action Recommendation */}
              <p className="text-xs font-semibold text-slate-200 bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 leading-relaxed text-center shadow">
                {activeDisplayInfo.instructionText}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
              <Package size={42} className="text-amber-500/60 animate-bounce" />
              <h4 className="text-sm font-bold text-slate-300">Đang chờ quét bưu kiện...</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Hướng tem bưu kiện vào camera phía bên trái. Kết quả phân loại và vị trí ném sọt sẽ hiển thị to rõ tại đây!
              </p>
            </div>
          )}

          {/* Dynamic 4 Facility Zones Reference Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
            {facilityZones.map((z, idx) => {
              const activeTote = getActiveToteCode(z.zoneCode);
              const styles = [
                'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
                'bg-blue-950/60 text-blue-300 border-blue-500/40',
                'bg-amber-950/60 text-amber-300 border-amber-500/40',
                'bg-rose-950/60 text-rose-300 border-rose-500/40',
              ];
              return (
                <div
                  key={z.id || idx}
                  className={`p-2.5 rounded-xl border font-sans font-semibold text-[11px] leading-tight flex flex-col justify-between ${styles[idx % styles.length]}`}
                >
                  <div>
                    <span className="font-mono font-extrabold text-xs block opacity-90">{z.zoneCode}</span>
                    <span className="text-[10px] font-medium opacity-80 line-clamp-1">{z.zoneName}</span>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {activeTote}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSealAndOpenNewTote(z.zoneCode)}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold rounded transition cursor-pointer"
                    >
                      Chốt Sọt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
