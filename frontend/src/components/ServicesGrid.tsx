import React from 'react';
import { PlaneTakeoff, Warehouse, Snowflake } from 'lucide-react';

export const ServicesGrid: React.FC = () => {
  const services = [
    {
      title: 'Express Delivery',
      desc: 'Next-day flight transit for time-critical documents, packages, and premium electronics.',
      cost: 'From $12.50',
      icon: <PlaneTakeoff size={32} />,
    },
    {
      title: 'Standard Logistics',
      desc: 'Cost-efficient overland transport with high-density distribution and scanning confirmation.',
      cost: 'From $4.20',
      icon: <Warehouse size={32} />,
    },
    {
      title: 'Cold Chain Logistics',
      desc: 'Climate-controlled transport with continuous GPS temperature logging for pharmaceutical/fresh goods.',
      cost: 'From $22.00',
      icon: <Snowflake size={32} />,
    },
  ];

  return (
    <section className="services-section" id="services">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Our Service Offerings</h2>
          <p className="section-subtitle">Velocity Logistics offers tailored solutions to optimize cost and time schedules.</p>
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
