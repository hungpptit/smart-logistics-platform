import React from 'react';
import { Check, Truck, CircleDot, Warehouse, Package, Clock, ShieldCheck } from 'lucide-react';

interface TimelineStepperProps {
  status: string;
  timestamps?: any;
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({ status, timestamps }) => {
  const currentStatus = String(status || '').toUpperCase();

  // Helper to determine step states based on full DB status enum
  const getStepState = (stepKey: string): 'completed' | 'active' | 'pending' => {
    // 1. CREATED
    if (stepKey === 'CREATED') {
      return 'completed';
    }

    // 2. IN_FACILITY (Arrival & Storage at Hub)
    if (stepKey === 'IN_FACILITY') {
      if (['CONFIRMED', 'ASSIGNED', 'PICKING_UP', 'PICKED_UP', 'IN_FACILITY', 'READY_FOR_DISPATCH', 'DISPATCHED'].includes(currentStatus)) {
        if (currentStatus === 'IN_FACILITY' || currentStatus === 'READY_FOR_DISPATCH') return 'active';
        return 'completed';
      }
      if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(currentStatus)) {
        return 'completed';
      }
      return 'pending';
    }

    // 3. IN_TRANSIT (Inter-hub Transfer)
    if (stepKey === 'IN_TRANSIT') {
      if (currentStatus === 'IN_TRANSIT') return 'active';
      if (['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(currentStatus)) return 'completed';
      return 'pending';
    }

    // 4. OUT_FOR_DELIVERY (Last-mile Motorbike Delivery)
    if (stepKey === 'OUT_FOR_DELIVERY') {
      if (currentStatus === 'OUT_FOR_DELIVERY') return 'active';
      if (['DELIVERED', 'COMPLETED'].includes(currentStatus)) return 'completed';
      return 'pending';
    }

    // 5. DELIVERED
    if (stepKey === 'DELIVERED') {
      if (['DELIVERED', 'COMPLETED'].includes(currentStatus)) return 'completed';
      return 'pending';
    }

    return 'pending';
  };

  const defaultSteps = [
    {
      key: 'CREATED',
      title: '1. Khởi tạo đơn hàng',
      desc: 'Đơn hàng đã được khởi tạo thành công trên hệ thống SLP.',
      icon: Package,
    },
    {
      key: 'IN_FACILITY',
      title: '2. Đã nhập kho bưu cục',
      desc: 'Hàng hóa đã được tiếp nhận và phân loại tại bưu cục.',
      icon: Warehouse,
    },
    {
      key: 'IN_TRANSIT',
      title: '3. Trung chuyển giữa các kho',
      desc: 'Đơn hàng trên xe tải luân chuyển đến bưu cục giao hàng.',
      icon: CircleDot,
    },
    {
      key: 'OUT_FOR_DELIVERY',
      title: '4. Shipper đang đi giao hàng (Xe máy 🏍️)',
      desc: 'Shipper đang xếp sọt chở hàng đến tận nơi cho người nhận.',
      icon: Truck,
    },
    {
      key: 'DELIVERED',
      title: '5. Giao hàng thành công',
      desc: 'Đơn hàng đã bàn giao hoàn tất cho người nhận.',
      icon: ShieldCheck,
    },
  ];

  // If dynamic timestamps from DB tracking_events are passed, render them directly (newest on top)
  if (Array.isArray(timestamps) && timestamps.length > 0 && timestamps.some((t) => t.detail || t.label)) {
    const eventsReversed = [...timestamps].reverse();
    return (
      <div className="flex flex-col gap-4 relative pl-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-red-200">
        {eventsReversed.map((event: any, index: number) => {
          const isLatest = index === 0;
          return (
            <div key={event.id || index} className="relative flex items-start gap-3">
              {/* Step Icon Badge */}
              <div
                className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                  isLatest
                    ? 'bg-[#bc0100] text-white ring-4 ring-red-100 shadow-md scale-110'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {isLatest ? <Truck size={13} /> : <Check size={13} strokeWidth={3} />}
              </div>

              {/* Step Content Box */}
              <div
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  isLatest
                    ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200 shadow-xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`font-bold text-xs ${isLatest ? 'text-red-700' : 'text-slate-800'}`}>
                    {event.label || event.status}
                  </h4>
                  {isLatest && (
                    <span className="bg-red-600 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider animate-pulse shrink-0">
                      MỚI NHẤT
                    </span>
                  )}
                </div>
                {event.detail && (
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug font-medium italic">
                    "{event.detail}"
                  </p>
                )}
                <div className="mt-1.5 text-[10px] font-medium text-slate-400 font-mono flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  <span>{event.time || event.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: Hardcoded 5-step progress bar
  const displayTimeline = defaultSteps.map((ds) => {
    const state = getStepState(ds.key);

    let matchedEvent: any = null;
    if (Array.isArray(timestamps) && timestamps.length > 0) {
      matchedEvent = timestamps.find((t: any) => {
        if (ds.key === 'CREATED' && t.status === 'CREATED') return true;
        if (ds.key === 'IN_FACILITY' && ['IN_FACILITY', 'READY_FOR_DISPATCH', 'PICKED_UP'].includes(t.status)) return true;
        if (ds.key === 'IN_TRANSIT' && t.status === 'IN_TRANSIT') return true;
        if (ds.key === 'OUT_FOR_DELIVERY' && t.status === 'OUT_FOR_DELIVERY') return true;
        if (ds.key === 'DELIVERED' && ['DELIVERED', 'COMPLETED'].includes(t.status)) return true;
        return false;
      });
    }

    let timeString = 'Chờ thực hiện';
    if (matchedEvent && matchedEvent.timestamp) {
      timeString = matchedEvent.timestamp;
    } else if (state === 'completed') {
      timeString = 'Đã xác nhận';
    } else if (state === 'active') {
      timeString = 'Đang thực hiện';
    }

    return {
      key: ds.key,
      title: matchedEvent?.title || ds.title,
      desc: matchedEvent?.subtitle || ds.desc,
      time: timeString,
      state,
      IconComp: ds.icon,
    };
  });

  return (
    <div className="flex flex-col gap-5 relative pl-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {displayTimeline.map((step) => {
        const Icon = step.IconComp;
        const isCompleted = step.state === 'completed';
        const isActive = step.state === 'active';

        return (
          <div key={step.key} className="relative flex items-start gap-3">
            {/* Step Icon Badge */}
            <div
              className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                isActive
                  ? 'bg-[#bc0100] text-white ring-4 ring-red-100 shadow-md scale-110'
                  : isCompleted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}
            >
              {isCompleted ? <Check size={13} strokeWidth={3} /> : isActive ? <Icon size={13} /> : <Clock size={12} />}
            </div>

            {/* Step Content Box */}
            <div
              className={`flex-1 p-[#0.75rem] rounded-lg border transition-all ${
                isActive
                  ? 'bg-red-50/60 border-red-300 ring-1 ring-red-200 shadow-xs'
                  : isCompleted
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50/50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className={`font-bold text-xs ${isActive ? 'text-red-700' : isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.title}
                </h4>
                {isActive && (
                  <span className="bg-red-600 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider animate-pulse shrink-0">
                    ĐANG THỰC HIỆN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
              <div className="mt-1 text-[10px] font-medium text-slate-400 font-mono">
                {step.time}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
