import React from 'react';
import { Check, Truck, CircleDot, Warehouse, Package } from 'lucide-react';
import type { ShipmentStatus } from '../types';

interface TimelineStepperProps {
  status: ShipmentStatus;
  timestamps: {
    created: string;
    hub: string;
    transit: string;
    out: string;
    delivered: string;
  };
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({ status, timestamps }) => {
  const steps = [
    {
      key: 'DELIVERED',
      title: 'Đã giao hàng thành công',
      desc: 'Đơn hàng đã được bàn giao thành công cho người nhận.',
      time: timestamps.delivered,
      icon: <Check size={14} />,
    },
    {
      key: 'OUT_FOR_DELIVERY',
      title: 'Đang giao hàng',
      desc: 'Tài xế đang vận chuyển đơn hàng đến địa chỉ của bạn.',
      time: timestamps.out,
      icon: <Truck size={14} />,
    },
    {
      key: 'IN_TRANSIT',
      title: 'Đang luân chuyển',
      desc: 'Đơn hàng đang được di chuyển giữa các kho trung chuyển.',
      time: timestamps.transit,
      icon: <CircleDot size={14} />,
    },
    {
      key: 'PICKED_UP', // maps to "Arrived at Hub" in UI
      title: 'Đã nhập kho trung chuyển',
      desc: 'Hàng đã được gom và phân loại tại trung tâm khai thác hàng hóa.',
      time: timestamps.hub,
      icon: <Warehouse size={14} />,
    },
    {
      key: 'CREATED',
      title: 'Đã tiếp nhận đơn hàng',
      desc: 'Đơn hàng đã được khởi tạo và ghi nhận trên hệ thống.',
      time: timestamps.created,
      icon: <Package size={14} />,
    },
  ];

  // Helper to determine if a step is completed or active
  const getStepStatusClass = (stepKey: string) => {
    if (status === 'CREATED') {
      if (stepKey === 'CREATED') return 'step-active';
      return '';
    }
    if (status === 'PICKED_UP') {
      if (stepKey === 'CREATED') return 'step-completed';
      if (stepKey === 'PICKED_UP') return 'step-active';
      return '';
    }
    if (status === 'IN_TRANSIT') {
      if (['CREATED', 'PICKED_UP'].includes(stepKey)) return 'step-completed';
      if (stepKey === 'IN_TRANSIT') return 'step-active';
      return '';
    }
    if (status === 'OUT_FOR_DELIVERY') {
      if (['CREATED', 'PICKED_UP', 'IN_TRANSIT'].includes(stepKey)) return 'step-completed';
      if (stepKey === 'OUT_FOR_DELIVERY') return 'step-active';
      return '';
    }
    if (status === 'DELIVERED') {
      return 'step-completed';
    }
    return '';
  };

  return (
    <div className="stepper-vertical">
      {steps.map((step) => {
        const statusClass = getStepStatusClass(step.key);
        return (
          <div key={step.key} className={`step ${statusClass}`}>
            <div className="step-icon">
              {step.icon}
            </div>
            <div className="step-content">
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.desc}</p>
              <span className="step-time">{step.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
