import React from 'react';
import { History } from 'lucide-react';

export interface SortingHistoryItem {
  id: string;
  packageCode: string;
  zoneCode: string;
  zoneName: string;
  toteCode?: string;
  sortedAt: string;
  status: string;
}

interface SortingHistoryPanelProps {
  sortingHistory: SortingHistoryItem[];
  getActiveToteCode: (zoneCode: string) => string;
}

export const SortingHistoryPanel: React.FC<SortingHistoryPanelProps> = ({
  sortingHistory,
  getActiveToteCode,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <History size={16} className="text-amber-600" />
            Lịch Sử Phân Loại Vừa Thực Hiện
          </h3>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {sortingHistory.length} đơn
          </span>
        </div>

        {sortingHistory.length > 0 ? (
          <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {sortingHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-xs text-slate-900">
                    {item.packageCode}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">{item.sortedAt}</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 line-clamp-1">{item.zoneName}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {item.zoneCode}
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {item.toteCode || getActiveToteCode(item.zoneCode)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-1">
            <p className="text-xs font-semibold">Chưa có lịch sử phân loại trong phiên</p>
            <p className="text-[10px]">Quét bưu kiện để bắt đầu ghi nhận nhật ký.</p>
          </div>
        )}
      </div>
    </div>
  );
};
