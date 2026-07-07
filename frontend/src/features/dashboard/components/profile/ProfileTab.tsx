import React from 'react';
import { useAuth } from '../../../../context/AuthContext';

export const ProfileTab: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-6 text-gray-400">Không tìm thấy thông tin tài khoản.</div>;
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg border border-[#e2e8f0] shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8 font-montserrat">
      <div className="lg:col-span-4 flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-[#e8e8e8] pb-6 lg:pb-0 lg:pr-8 gap-4">
        <div className="w-24 h-24 rounded-full bg-[#F4F4F4] border border-[#e2e8f0] flex items-center justify-center text-3xl font-bold text-[#bc0100] uppercase shadow-inner">
          {user.username.slice(0, 2)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#161D25]">{user.username}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {user.roles.map((r) => (
            <span key={r} className="text-[9px] font-bold bg-[#bc0100] text-white px-2 py-0.5 rounded uppercase tracking-wider">
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6">
        <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2">Thông tin tài khoản chi tiết</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 font-medium">ID Người dùng</span>
            <span className="font-bold text-[#161D25] font-mono bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.id}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 font-medium">Số điện thoại</span>
            <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.phone || 'Chưa cập nhật'}</span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2 mt-4">Danh sách quyền hạn được cấp (RBAC)</h3>
        
        <div className="flex flex-wrap gap-2">
          {user.permissions.length === 0 ? (
            <span className="text-xs text-gray-400 italic">Không có quyền hạn đặc biệt</span>
          ) : (
            user.permissions.map((p) => (
              <span key={p} className="text-[10px] font-bold font-mono bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded">
                {p}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
