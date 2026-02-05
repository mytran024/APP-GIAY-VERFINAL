
import React from 'react';

interface HomeViewProps {
  onNavigate: (target: any) => void;
  reportCount: number;
  woCount: number;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, reportCount, woCount }) => {
  return (
    <div className="space-y-6 animate-fade-in pt-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black leading-tight">Chào buổi làm việc,<br/>Kiểm viên!</h2>
          <p className="text-xs opacity-80 mt-2 font-bold uppercase tracking-widest">Hệ thống sẵn sàng khai thác</p>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
           </svg>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phiếu Tally</p>
          <div className="text-3xl font-black text-blue-600">{reportCount}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phiếu CT</p>
          <div className="text-3xl font-black text-green-600">{woCount}</div>
        </div>
      </div>

      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Lối tắt nhanh</h3>
      
      <div className="space-y-3">
        <button 
          onClick={() => onNavigate('CHON_TAU')}
          className="w-full flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-95 transition-all"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </div>
          <div className="text-left">
            <p className="font-black text-gray-800 text-sm">Tạo Tally mới</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Bắt đầu khai thác tàu mới</p>
          </div>
        </button>

        <button 
          onClick={() => onNavigate('DANH_SACH_TALLY')}
          className="w-full flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-95 transition-all"
        >
          <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div className="text-left">
            <p className="font-black text-gray-800 text-sm">Lịch sử Tally</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Xem và in phiếu kiểm hàng</p>
          </div>
        </button>
      </div>

      <div className="bg-gray-100 p-6 rounded-3xl border border-gray-200">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 text-center">Hướng dẫn nhanh</h4>
        <ul className="space-y-2 text-[11px] text-gray-600 font-medium">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-black">•</span>
            Nhấn "Tạo Tally mới" để bắt đầu quy trình khai thác tàu.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-black">•</span>
            Phiếu công tác sẽ được tạo tự động sau khi bạn gửi báo cáo Tally.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HomeView;
