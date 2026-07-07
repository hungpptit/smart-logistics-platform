import React, { useState } from 'react';
import { Settings2, Cpu, ShieldAlert, Save } from 'lucide-react';

export const SystemConfigTab: React.FC = () => {
  const [configs, setConfigs] = useState([
    { key: 'GPS_INTERVAL_SECONDS', value: '5', category: 'GPS', description: 'Khoảng thời gian định kỳ (giây) chạy ngầm gửi vị trí GPS của Shipper.' },
    { key: 'ETA_REFRESH_INTERVAL_MIN', value: '5', category: 'ROUTING', description: 'Chu kỳ tính toán lại thời gian dự kiến giao hàng (ETA) cho các stop.' },
    { key: 'POPULATION_SIZE', value: '100', category: 'AI', description: 'Kích thước quần thể khởi tạo cho thuật toán Genetic Algorithm (GA).' },
    { key: 'MUTATION_RATE', value: '0.15', category: 'AI', description: 'Tần suất đột biến của thuật toán Genetic Algorithm (GA).' },
    { key: 'CROSSOVER_RATE', value: '0.80', category: 'AI', description: 'Tỷ lệ lai ghép các tuyến trong quần thể của GA.' },
    { key: 'KMEANS_CLUSTER_RADIUS_METERS', value: '5000', category: 'AI', description: 'Bán kính tối đa của một cụm gom hàng/giao hàng của K-Means.' },
    { key: 'MAX_ROUTE_DISTANCE_KM', value: '120.0', category: 'ROUTING', description: 'Giới hạn quãng đường di chuyển tối đa của một tài xế trong một ngày.' },
    { key: 'MAX_STOPS_PER_ROUTE', value: '45', category: 'ROUTING', description: 'Số điểm dừng (RouteStop) tối đa gán cho một tuyến giao/nhận.' },
    { key: 'DEFAULT_SERVICE_TIME_MINUTES', value: '10', category: 'BUSINESS', description: 'Thời gian mặc định dừng đỗ xử lý thủ tục giao nhận hàng tại điểm.' },
    { key: 'ENABLE_AI_OPTIMIZATION', value: 'true', category: 'SYSTEM', description: 'Bật/tắt chế độ động cơ tối ưu AI tự động.' },
  ]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleValueChange = (key: string, newValue: string) => {
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: newValue } : c));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#161D25] uppercase tracking-wider flex items-center gap-2">
            <Settings2 size={18} className="text-[#bc0100]" /> Cấu hình tham số hệ thống
          </h2>
          <p className="text-xs text-gray-500 mt-1">Điều chỉnh các biến điều hành GPS, thuật toán AI và giới hạn kinh doanh.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#bc0100] text-white hover:bg-[#a00100] transition-colors rounded text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <span>✓</span> Đã cập nhật thành công các tham số cấu hình hệ thống trên toàn mạng lưới!
        </div>
      )}

      {/* Safety warnings for AI variables */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex gap-3">
          <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">Lưu ý bảo mật & hiệu suất</h4>
            <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
              Việc chỉnh sửa các tham số Genetic Algorithm (như tỷ lệ đột biến và kích thước quần thể) sẽ ảnh hưởng trực tiếp đến chu kỳ tính toán và mức độ hội tụ lộ trình của động cơ tối ưu hóa chặng đường VRP. Hãy thực hiện kiểm tra tải trước khi áp dụng trên môi trường sản xuất.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config Groups */}
        {['GPS', 'ROUTING', 'AI', 'BUSINESS', 'SYSTEM'].map(category => {
          const categoryConfigs = configs.filter(c => c.category === category);
          if (categoryConfigs.length === 0) return null;

          return (
            <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                <Cpu size={14} className="text-gray-400" /> Nhóm cấu hình: {category}
              </h3>

              <div className="space-y-4">
                {categoryConfigs.map(c => (
                  <div key={c.key} className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4">
                      <label className="text-[11px] font-bold text-gray-600 tracking-wide font-mono block">
                        {c.key}
                      </label>
                      <input
                        type="text"
                        value={c.value}
                        onChange={e => handleValueChange(c.key, e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right font-bold text-gray-800 focus:outline-none focus:border-[#bc0100]"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 block leading-normal">
                      {c.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemConfigTab;
