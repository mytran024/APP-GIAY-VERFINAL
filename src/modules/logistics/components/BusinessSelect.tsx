
import React from 'react';
import { ICONS } from '../constants';
import { BusinessType } from '../types';

interface BusinessSelectProps {
  onSelect: (type: BusinessType) => void;
  userName: string;
}

const BusinessSelect: React.FC<BusinessSelectProps> = ({ onSelect, userName }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full animate-fadeIn">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
            Xin chào, <span className="text-blue-600">{userName}</span>
          </h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em] mt-3">
            Vui lòng chọn nghiệp vụ khai thác để bắt đầu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Nhập hàng Card */}
          <button 
            onClick={() => onSelect(BusinessType.IMPORT)}
            className="group relative bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-blue-500 overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <ICONS.Ship className="w-48 h-48" />
            </div>
            
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
              <ICONS.Ship className="w-10 h-10 text-blue-600" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Nghiệp vụ Nhập</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
              Quản lý tàu cập cảng, import danh sách container từ Excel, theo dõi tờ khai và tiến độ rút ruột tại kho Danalog.
            </p>
            
            <div className="flex items-center gap-3 text-blue-600 font-black text-xs uppercase tracking-widest">
              Truy cập ngay
              <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </div>
          </button>

          {/* Xuất hàng Card */}
          <button 
            onClick={() => onSelect(BusinessType.EXPORT)}
            className="group relative bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-emerald-500 overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <ICONS.Package className="w-48 h-48" />
            </div>
            
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
              <ICONS.Package className="w-10 h-10 text-emerald-600" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Nghiệp vụ Xuất</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
              Lập kế hoạch xuất kho, đóng container, quản lý booking hãng tàu và in phiếu Tally xuất khẩu chính xác.
            </p>
            
            <div className="flex items-center gap-3 text-emerald-600 font-black text-xs uppercase tracking-widest">
              Truy cập ngay
              <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default BusinessSelect;
