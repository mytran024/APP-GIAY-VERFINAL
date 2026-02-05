import React, { useState, useEffect } from 'react';
import { WorkOrder, TallyReport } from '../types';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';

interface WorkOrderViewProps {
  type: 'CONG_NHAN' | 'CO_GIOI' | 'CO_GIOI_NGOAI';
  report: TallyReport;
  initialWO?: WorkOrder;
  onSave: (wo: WorkOrder, isDraft: boolean) => void;
  onCancel: () => void;
}

const WorkOrderView: React.FC<WorkOrderViewProps> = ({ type, report, initialWO, onSave, onCancel }) => {
  const totalUnits = report.items.reduce((sum, item) => sum + item.actualUnits, 0);
  const totalWeight = report.items.reduce((sum, item) => sum + item.actualWeight, 0);

  const [formData, setFormData] = useState<Partial<WorkOrder>>({});

  useEffect(() => {
    if (initialWO) {
      setFormData(initialWO);
    } else {
      const names = type === 'CONG_NHAN' ? report.workerNames : report.mechanicalNames;
      const defaultOrg = type === 'CONG_NHAN' ? 'Tổ CN' : 'Tổ CG';

      setFormData({
        organization: names && names.trim() !== '' ? names : defaultOrg,
        personCount: type === 'CONG_NHAN' ? report.workerCount : report.mechanicalCount,
        vehicleType: type === 'CO_GIOI' ? report.vehicleType : '',
        vehicleNo: type === 'CO_GIOI' ? report.vehicleNo : '',
        handlingMethod: type === 'CONG_NHAN' ? 'Đóng mở Cont, Bấm Seal,\nquấn phủ bạt' : 'Nâng hàng từ cont <-> kho',
        commodityType: 'Giấy vuông',
        specification: `${report.items.length} Cont`,
        quantity: totalUnits,
        weight: totalWeight,
        dayLaborerCount: 0,
        note: ''
      });
    }
  }, [type, report, initialWO, totalUnits, totalWeight]);

  const handleAction = (isDraft: boolean) => {
    const wo: WorkOrder = {
      ...formData,
      id: formData.id || `WO-${Date.now()}-${type}`,
      reportId: report.id,
      type,
      status: isDraft ? 'NHAP' : 'HOAN_TAT'
    } as WorkOrder;
    onSave(wo, isDraft);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-40">
      {/* Mobile App Interface */}
      <div className="print:hidden space-y-6">
        <div className={`p-5 rounded-3xl shadow-lg text-white ${type === 'CONG_NHAN' ? 'bg-green-600' : (type === 'CO_GIOI_NGOAI' ? 'bg-purple-600' : 'bg-orange-600')}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter">Phiếu công tác {type === 'CONG_NHAN' ? 'CN' : 'CG'}</h2>
            <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">CA {report.shift} • {report.workDate}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tổ (Cá nhân)</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 min-h-[60px]" 
                value={formData.organization || ''} 
                onChange={e => setFormData({...formData, organization: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Số người</label>
              <input type="number" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none" 
                value={formData.personCount || 0} onChange={e => setFormData({...formData, personCount: parseInt(e.target.value) || 0})} />
            </div>
            <div className={type === 'CONG_NHAN' ? 'col-span-1' : 'col-span-2'}>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Số người làm công nhật</label>
              <input type="number" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none" 
                value={formData.dayLaborerCount || 0} onChange={e => setFormData({...formData, dayLaborerCount: parseInt(e.target.value) || 0})} />
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Loại hàng</label>
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none" 
                value={formData.commodityType || ''} onChange={e => setFormData({...formData, commodityType: e.target.value})} />
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phương án bốc dỡ</label>
              <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none min-h-[80px]" 
                value={formData.handlingMethod || ''} onChange={e => setFormData({...formData, handlingMethod: e.target.value})} />
            </div>

            <div>
              <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Khối lượng (số kiện)</label>
              <div className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-blue-700 text-sm">
                {formData.quantity || 0}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Trọng lượng (số tấn)</label>
              <div className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-blue-700 text-sm">
                {formData.weight || 0}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quy cách</label>
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 text-sm" value={formData.specification || ''} readOnly />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ghi chú</label>
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-sm" 
                value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 max-w-md mx-auto z-40 shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleAction(true)} className="py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase text-[11px] active:scale-95 transition-all">
              Lưu nháp
            </button>
            <button onClick={() => handleAction(false)} className={`py-4 font-black rounded-2xl text-white uppercase text-[11px] shadow-xl active:scale-95 transition-all ${type === 'CONG_NHAN' ? 'bg-green-600' : 'bg-orange-600'}`}>
              Hoàn tất & In
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block bg-white">
        <WorkOrderPrintTemplate wo={formData as WorkOrder} report={report} />
      </div>

      <style>{`
        @media screen {
          .print-wo-document { display: none; }
        }
        @media print {
          @page { 
            size: portrait; 
            margin: 10mm; 
          }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden { display: none !important; }
          .print-wo-document { 
            display: block !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkOrderView;