
import React, { useState } from 'react';
import { Container, Vessel, ServicePrice } from '../types';
import InventoryReport from './InventoryReport';
import PerformanceStats from './PerformanceStats';

interface ReportsDashboardProps {
  containers: Container[];
  vessels: Vessel[];
  prices: ServicePrice[];
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ containers, vessels, prices }) => {
  const [activeSubTab, setActiveSubTab] = useState<'INVENTORY' | 'PERFORMANCE'>('INVENTORY');

  return (
    <div className="flex flex-col h-full space-y-6 animate-fadeIn">
      {/* Header Title */}
      <div className="flex items-center gap-3 no-print ml-1">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">THỐNG KÊ BÁO CÁO</h3>
      </div>

      {/* Internal Sub-navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200 no-print">
        <button
          onClick={() => setActiveSubTab('INVENTORY')}
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider ${activeSubTab === 'INVENTORY' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Báo cáo kho
        </button>
        <button
          onClick={() => setActiveSubTab('PERFORMANCE')}
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider ${activeSubTab === 'PERFORMANCE' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Thống kê hiệu suất
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeSubTab === 'INVENTORY' ? (
          <InventoryReport containers={containers} vessels={vessels} prices={prices} />
        ) : (
          <PerformanceStats invoices={[]} />
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default ReportsDashboard;
