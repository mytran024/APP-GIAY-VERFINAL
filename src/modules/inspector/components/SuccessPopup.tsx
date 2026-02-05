
import React, { useEffect } from 'react';

interface SuccessPopupProps {
  show: boolean;
  onClose: () => void;
  vesselName?: string;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ show, onClose, vesselName }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-[100] animate-slide-down">
      <div className="bg-white border-2 border-green-500 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-black text-green-600 uppercase tracking-tight">Gửi dữ liệu thành công!</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
            Dữ liệu tàu <span className="text-blue-600 font-black">{vesselName || 'S30'}</span> đã được hệ thống ghi nhận.
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-300 hover:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style>{`
        .animate-slide-down {
          animation: slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-40px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SuccessPopup;
