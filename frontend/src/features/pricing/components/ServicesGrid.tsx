import React from 'react';
import { PlaneTakeoff, Warehouse, Snowflake } from 'lucide-react';

export const ServicesGrid: React.FC = () => {
  const services = [
    {
      title: 'Giao hàng Hỏa tốc',
      desc: 'Vận chuyển nhanh chóng cho tài liệu quan trọng, bưu phẩm gấp và linh kiện điện tử cao cấp.',
      cost: 'Từ 35.000 đ',
      icon: <PlaneTakeoff size={32} />,
    },
    {
      title: 'Giao hàng Tiêu chuẩn',
      desc: 'Vận chuyển đường bộ tối ưu chi phí, mạng lưới phân phối rộng khắp kèm xác nhận quét mã vạch.',
      cost: 'Từ 20.000 đ',
      icon: <Warehouse size={32} />,
    },
    {
      title: 'Vận chuyển Đông lạnh',
      desc: 'Vận chuyển kiểm soát nhiệt độ nghiêm ngặt với cảm biến đo nhiệt độ liên tục qua GPS cho thực phẩm, dược phẩm.',
      cost: 'Từ 60.000 đ',
      icon: <Snowflake size={32} />,
    },
  ];

  return (
    <section className="services-section" id="services">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Các Dịch Vụ Vận Chuyển</h2>
          <p className="section-subtitle">Smart Logistics Platform cung cấp các giải pháp tối ưu hóa chi phí và thời gian giao nhận hàng.</p>
        </div>
        
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="card service-card">
              <div className="service-accent-bar"></div>
              <div className="card-body">
                <div className="service-icon">{service.icon}</div>
                <h3 className="service-name">{service.title}</h3>
                <p className="service-desc">{service.desc}</p>
                <span className="service-cost">{service.cost}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
