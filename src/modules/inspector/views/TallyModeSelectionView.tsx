
import React from 'react';

interface TallyModeSelectionViewProps {
  onSelect: (mode: 'NHAP' | 'XUAT') => void;
}

const TallyModeSelectionView: React.FC<TallyModeSelectionViewProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col gap-5 animate-fade-in pt-12 px-2 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tight">Chọn nghiệp vụ</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option: Tạo Tally Hàng Nhập */}
        <button 
            onClick={() => onSelect('NHAP')}
            className="group relative bg-white p-8 rounded-[28px] border border-gray-100 shadow-xl shadow-blue-900/5 active:scale-95 transition-all text-left flex items-center gap-5 hover:border-blue-200"
        >
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            </div>
            
            <div className="flex-1">
            <h3 className="text-[18px] md:text-[20px] font-black text-gray-900 uppercase leading-tight tracking-tight">Tạo Tally<br/>Hàng Nhập</h3>
            </div>

            <div className="text-gray-200 group-hover:text-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            </div>
        </button>

        {/* Option: Tạo Tally Hàng Xuất */}
        <button 
            onClick={() => onSelect('XUAT')}
            className="group relative bg-white p-8 rounded-[28px] border border-gray-100 shadow-xl shadow-indigo-900/5 active:scale-95 transition-all text-left flex items-center gap-5 hover:border-indigo-200"
        >
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            </div>

            <div className="flex-1">
            <h3 className="text-[18px] md:text-[20px] font-black text-gray-900 uppercase leading-tight tracking-tight">Tạo Tally<br/>Hàng Xuất</h3>
            </div>

            <div className="text-gray-200 group-hover:text-indigo-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            </div>
        </button>
      </div>

      <div className="mt-20 text-center opacity-10">
        <div className="w-10 h-1 bg-gray-400 rounded-full mx-auto"></div>
      </div>
    </div>
  );
};

export default TallyModeSelectionView;
