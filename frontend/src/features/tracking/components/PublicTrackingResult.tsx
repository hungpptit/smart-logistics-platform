import React from 'react';
import { Package, Clock, User, Building2, Earth } from 'lucide-react';
import { TimelineStepper } from './TimelineStepper';
import { MapcnMap } from './MapcnMap';

interface PublicTrackingResultProps {
  currentTracking: any;
  liveDriverPos: [number, number] | null;
}

export const PublicTrackingResult: React.FC<PublicTrackingResultProps> = ({
  currentTracking,
  liveDriverPos,
}) => {
  if (!currentTracking) return null;

  const isShipperActive =
    currentTracking.status === 'OUT_FOR_DELIVERY' ||
    currentTracking.status === 'PICKUP_ASSIGNED';

  return (
    <section className="tracking-results-section" id="tracking-results">
      <div className="container">
        <div className="results-grid">
          {/* Timeline Stepper Card */}
          <div className="card timeline-card shadow-sm border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 space-y-4">
              {/* Top Header Row: Tracking Code & Status Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#bc0100] shrink-0">
                    <Package size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mã vận đơn
                    </span>
                    <h3 className="font-mono text-base font-black text-slate-900 leading-tight">
                      {currentTracking.code}
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 text-[#bc0100] px-3 py-1 rounded-full font-bold text-[11px] uppercase tracking-wide shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#bc0100] animate-pulse"></span>
                  {currentTracking.statusLabel || currentTracking.status}
                </span>
              </div>

              {/* Metadata Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs">
                {/* ETA Box */}
                <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Thời gian giao dự kiến
                    </span>
                    <span className="font-extrabold text-red-600 text-xs block leading-snug break-words">
                      {currentTracking.eta || 'Đang cập nhật'}
                    </span>
                  </div>
                </div>

                {/* Shipper or Facility Box depending on delivery status */}
                {isShipperActive ? (
                  <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Shipper phụ trách
                      </span>
                      <span className="font-bold text-slate-800 text-xs block leading-snug break-words">
                        {currentTracking.driverName || 'Shipper giao hàng'}
                      </span>
                      {currentTracking.vehiclePlate && (
                        <span className="font-mono text-slate-500 font-medium text-[11px] block mt-0.5">
                          Biển số: {currentTracking.vehiclePlate}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Bưu cục xử lý hiện tại
                      </span>
                      <span className="font-bold text-slate-800 text-xs block leading-snug break-words">
                        {currentTracking.destinationFacilityName ||
                          currentTracking.originFacilityName ||
                          'Bưu cục Phước Long'}
                      </span>
                      {currentTracking.driverName &&
                        (currentTracking.status === 'READY_FOR_DISPATCH' ||
                          currentTracking.status === 'ARRIVED_ORIGIN_FACILITY') && (
                          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5 italic">
                            (Đã phân sọt, chờ Shipper nhận sọt)
                          </span>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card-body p-5 pt-3">
              <TimelineStepper
                status={currentTracking.status}
                timestamps={
                  currentTracking.timeline
                    ? currentTracking.timeline.map((t: any) => ({
                        status: t.status,
                        label: t.title,
                        time: t.timestamp,
                        completed: t.isCompleted,
                        detail: t.subtitle,
                      }))
                    : currentTracking.timestamps || []
                }
              />
            </div>
          </div>

          {/* Geospatial Map with Real-time Motorbike GPS Marker */}
          <div className="card map-card shadow-sm border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            <div className="card-header p-4 px-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="card-title flex items-center gap-2 text-sm font-bold text-slate-800">
                <Earth className="map-icon text-[#bc0100]" size={18} />
                <span>
                  {currentTracking.status === 'OUT_FOR_DELIVERY'
                    ? 'Định vị trực tiếp Shipper Xe Máy 🏍️'
                    : 'Định vị vị trí Bưu cục & Người nhận 🏢'}
                </span>
              </h3>
              {liveDriverPos && currentTracking.status === 'OUT_FOR_DELIVERY' && (
                <span className="map-coordinates font-mono text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  GPS: {liveDriverPos[0].toFixed(5)}, {liveDriverPos[1].toFixed(5)}
                </span>
              )}
            </div>
            <div className="card-body map-body p-0">
              <MapcnMap
                route={currentTracking.route}
                currentPos={
                  liveDriverPos || [
                    currentTracking.coordinates?.currentDriver?.lat || 10.824,
                    currentTracking.coordinates?.currentDriver?.lng || 106.759,
                  ]
                }
                destination={
                  currentTracking.receiverAddress ||
                  currentTracking.destination ||
                  'Điểm giao hàng'
                }
                receiverPos={
                  currentTracking.coordinates?.receiver
                    ? [
                        currentTracking.coordinates.receiver.lat,
                        currentTracking.coordinates.receiver.lng,
                      ]
                    : undefined
                }
                facilityPos={
                  currentTracking.coordinates?.currentFacility
                    ? [
                        currentTracking.coordinates.currentFacility.lat,
                        currentTracking.coordinates.currentFacility.lng,
                      ]
                    : undefined
                }
                facilityName={
                  currentTracking.destinationFacilityName ||
                  currentTracking.originFacilityName ||
                  'Bưu cục Phước Long'
                }
                shipperName={currentTracking.driverName}
                vehiclePlate={currentTracking.vehiclePlate}
                statusLabel={currentTracking.statusLabel}
                isOutForDelivery={currentTracking.status === 'OUT_FOR_DELIVERY'}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
