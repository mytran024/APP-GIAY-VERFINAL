
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, WorkOrder, WorkOrderStatus, WorkOrderType } from '../types';
import { ICONS } from '../constants';

interface WorkOrderReviewProps {
  containers: Container[];
  workOrders: WorkOrder[];
  onUpdateWorkOrders: (wo: WorkOrder[]) => void;
  onUpdateContainers: (c: Container[]) => void;
}

const CustomSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[8px] font-black text-slate-400 uppercase block ml-1 tracking-widest">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-[9px] font-black bg-white border ${isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'} rounded-xl py-2 px-3 flex items-center justify-between cursor-pointer transition-all shadow-sm hover:border-blue-300`}
      >
        <span className="truncate">{selectedOption?.label || 'Tất cả'}</span>
        <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] overflow-hidden animate-slideUp max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-between ${value === opt.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
              {value === opt.value && <ICONS.CheckCircle className="w-3 h-3" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WorkOrderReview: React.FC<WorkOrderReviewProps> = ({
  containers,
  workOrders,
  onUpdateWorkOrders,
  onUpdateContainers
}) => {
  const [selectedWOIds, setSelectedWOIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<WorkOrderType>(WorkOrderType.LABOR);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [filterMonth, setFilterMonth] = useState<string>('01');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredWOs = useMemo(() => {
    return workOrders.filter(wo => {
      if (wo.type !== filterType) return false;

      const parts = wo.date.includes('-') ? wo.date.split('-').reverse() : wo.date.split('/');
      const [d, m, y] = parts;
      const woDateISO = `${y}-${m}-${d}`;

      if (filterMonth !== 'ALL' && m !== filterMonth) return false;
      if (filterYear !== 'ALL' && y !== filterYear) return false;
      if (startDate && woDateISO < startDate) return false;
      if (endDate && woDateISO > endDate) return false;

      return true;
    });
  }, [workOrders, filterType, filterMonth, filterYear, startDate, endDate]);

  useEffect(() => {
    if (filteredWOs.length > 0 && !currentViewId) {
      setCurrentViewId(filteredWOs[0].id);
    }
  }, [filteredWOs, currentViewId]);

  const handleUpdateNames = (woId: string, field: 'workerNames' | 'vehicleNos', value: string) => {
    const list = value.split(',').map(s => s.trim()).filter(s => s !== '');
    const updated = workOrders.map(wo =>
      wo.id === woId ? {
        ...wo,
        [field]: list,
        peopleCount: field === 'workerNames' ? list.length : wo.peopleCount
      } : wo
    );
    onUpdateWorkOrders(updated);
  };

  const handlePrint = () => {
    if (selectedWOIds.size === 0 && !currentViewId) return;
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 800);
  };

  const toggleSelectAll = () => {
    if (selectedWOIds.size === filteredWOs.length && filteredWOs.length > 0) {
      setSelectedWOIds(new Set());
    } else {
      setSelectedWOIds(new Set(filteredWOs.map(w => w.id)));
    }
  };

  const monthOptions = [
    { value: 'ALL', label: 'Tất cả' },
    ...Array.from({ length: 12 }).map((_, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: `T. ${(i + 1).toString().padStart(2, '0')}`
    }))
  ];

  const yearOptions = [
    { value: 'ALL', label: 'Tất cả' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' }
  ];

  const renderVirtualPaper = (wo: WorkOrder) => {
    if (!wo) return null;
    const parts = wo.date.includes('-') ? wo.date.split('-').reverse() : wo.date.split('/');
    const [d, m, y] = parts;
    const workerNamesStr = wo.workerNames.join(', ');
    const vehicleNosStr = wo.vehicleNos.join(', ');

    return (
      <div key={wo.id} className="bg-white p-10 text-black shadow-2xl mx-auto mb-10 w-[210mm] min-h-[148mm] relative border border-slate-200 print:shadow-none print:border-none print:m-0 print:mb-0 print:p-8 font-serif-paper print:break-after-page text-left box-border overflow-hidden">
        <div className="flex justify-between items-start mb-1 text-[11px]">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center transform rotate-45">
                <div className="w-4 h-4 bg-white transform -rotate-45"></div>
              </div>
              <span className="text-xl font-bold tracking-tighter text-slate-800">DANALOG</span>
            </div>
            <p className="text-[7px] font-bold tracking-[0.3em] ml-10 -mt-1 uppercase opacity-60">Danang Port Logistics</p>
          </div>
          <div className="text-right font-bold leading-tight">
            <p className="uppercase text-[12px]">CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</p>
            <p className="font-normal text-[10px] opacity-70">97 Yết Kiêu, Phường Thọ Quang, Quận Sơn Trà, Tp Đà Nẵng</p>
          </div>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-black/90">PHIẾU CÔNG TÁC</h2>
        </div>

        <div className="text-[14px] space-y-1 mb-4 px-2">
          <div className="grid grid-cols-12 gap-x-2 items-baseline">
            <div className="col-span-6 flex items-baseline">
              <span className="whitespace-nowrap font-bold">Tổ (Cá nhân):</span>
              <div className="ml-2 border-b border-dotted border-black/50 flex-1 relative min-h-[24px]">
                <span className="font-bold px-2 italic text-blue-900 leading-tight">{workerNamesStr || wo.teamName}</span>
                <input
                  type="text"
                  className="no-print absolute inset-0 opacity-0 focus:opacity-100 bg-white border border-blue-400 font-bold px-2 outline-none z-10 text-sm"
                  defaultValue={workerNamesStr}
                  onBlur={(e) => handleUpdateNames(wo.id, 'workerNames', e.target.value)}
                />
              </div>
            </div>
            <div className="col-span-2 flex items-baseline">
              <span className="whitespace-nowrap font-bold ml-2">Số người:</span>
              <span className="ml-2 border-b border-dotted border-black/50 flex-1 text-center font-bold h-6 italic text-blue-900">{String(wo.peopleCount).padStart(2, '0')}</span>
            </div>
            <div className="col-span-4 flex justify-end gap-1 items-baseline">
              <span className="font-bold">Ca:</span>
              <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{wo.shift}</span>
              <span className="font-bold">, ngày</span>
              <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{d}</span>
              <span className="font-bold">tháng</span>
              <span className="border-b border-dotted border-black/50 w-8 text-center font-bold h-6 italic text-blue-900">{m}</span>
              <span className="font-bold">năm {y}</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-2 items-baseline">
            <div className="col-span-5 flex items-baseline">
              <span className="whitespace-nowrap font-bold">Loại xe:</span>
              <span className="ml-2 border-b border-dotted border-black/50 flex-1 font-bold h-6 italic text-blue-900">{wo.vehicleType || ''}</span>
            </div>
            <div className="col-span-4 flex items-baseline">
              <span className="whitespace-nowrap font-bold ml-2">Số xe:</span>
              <div className="ml-2 border-b border-dotted border-black/50 flex-1 relative min-h-[24px]">
                <span className="font-bold px-2 italic text-blue-900">{vehicleNosStr || ''}</span>
                <input
                  type="text"
                  className="no-print absolute inset-0 opacity-0 focus:opacity-100 bg-white border border-blue-400 font-bold px-2 outline-none z-10 text-sm"
                  defaultValue={vehicleNosStr}
                  onBlur={(e) => handleUpdateNames(wo.id, 'vehicleNos', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-2 border-black">
          <table className="w-full border-collapse text-[13px] text-center table-fixed">
            <thead>
              <tr className="font-bold h-10 border-b border-black bg-gray-50/50">
                <th className="border-r border-black p-1 w-[190px] leading-tight text-[11px]">PHƯƠNG ÁN BỐC DỠ</th>
                <th className="border-r border-black p-1 w-[90px] leading-tight text-[11px]">Loại Hàng</th>
                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Quy Cách</th>
                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Khối Lượng</th>
                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Trọng Lượng</th>
                <th className="border-r border-black p-1 w-[80px] leading-tight text-[11px]">Số người làm công nhật</th>
                <th className="p-1 text-[11px]">Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {wo.items.map((item, idx) => (
                <tr key={idx} className="h-16 align-middle border-b border-black">
                  <td className="border-r border-black p-1 font-bold italic text-[12px] leading-tight text-left px-3">
                    {item.method}
                  </td>
                  <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.cargoType}</td>
                  <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.specs}</td>
                  <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.volume}</td>
                  <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.weight}</td>
                  <td className="border-r border-black p-1 italic text-blue-900 font-bold">{item.extraLabor || ''}</td>
                  <td className="p-1 italic text-blue-900 text-left px-2 text-[11px]">{item.notes}</td>
                </tr>
              ))}

              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={`h-10 border-b border-black last:border-b-0`}>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className=""></td>
                </tr>
              ))}
              <tr className="h-12 font-bold bg-gray-50/20">
                <td colSpan={1} className="border-r border-black text-center font-bold uppercase text-[11px]">Tổng cộng</td>
                <td colSpan={3} className="border-r border-black"></td>
                <td colSpan={1} className="border-r border-black text-lg italic text-blue-900 text-center">{wo.items[0].weight}</td>
                <td colSpan={2} className=""></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-4 text-center text-[10px] font-bold uppercase gap-2">
          <div className="flex flex-col h-32">
            <p className="mb-0.5 tracking-tight">PHÒNG KINH DOANH</p>
            <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
          </div>
          <div className="flex flex-col h-32 items-center">
            <p className="mb-0.5 tracking-tight">NGƯỜI THỰC HIỆN</p>
            <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
            <div className="mt-auto h-20 flex flex-col items-center justify-center pt-2">
              <span className="font-signature italic text-blue-900 text-3xl opacity-80 leading-none">Duc</span>
              <p className="text-[13px] text-blue-900 font-bold mt-3 border-t border-black/40 px-4 pt-1 whitespace-nowrap">{wo.workerNames[0] || 'LÊ VIỆT ĐỨC'}</p>
            </div>
          </div>
          <div className="flex flex-col h-32 items-center">
            <p className="mb-0.5 tracking-tight">XÁC NHẬN NV CHỈ ĐẠO</p>
            <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
            <div className="mt-auto h-20 flex flex-col items-center justify-center pt-2">
              <span className="font-signature italic text-blue-900 text-3xl opacity-80 leading-none">Dung</span>
              <p className="text-[13px] text-blue-900 font-bold mt-3 border-t border-black/40 px-4 pt-1 whitespace-nowrap">HỒ KỲ DŨNG</p>
            </div>
          </div>
          <div className="flex flex-col h-32 items-center">
            <p className="mb-0.5 tracking-tight">GIAO NHẬN</p>
            <p className="font-normal italic normal-case opacity-60 text-[9px]">(Ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    );
  };

  const currentViewWO = workOrders.find(w => w.id === currentViewId);

  return (
    <div className="flex h-full bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-300 no-print-layout relative">
      <div className="w-72 flex flex-col bg-white border-r border-slate-200 no-print shadow-xl z-20">
        <div className="p-5 bg-white flex flex-col gap-3.5 border-b border-slate-100 text-left shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase text-[10px] tracking-tight text-blue-800 flex items-center gap-1.5">
              <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
              DANH SÁCH PCT
            </h3>
            <button onClick={toggleSelectAll} className="text-[9px] font-black uppercase text-blue-600 hover:opacity-70 transition-all">TẤT CẢ</button>
          </div>

          <button onClick={handlePrint} disabled={selectedWOIds.size === 0 && !currentViewId} className="w-full py-3 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-[10px] transition-all shadow-md flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            IN PHIẾU
          </button>

          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-100">
            <button onClick={() => setFilterType(WorkOrderType.LABOR)} className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${filterType === WorkOrderType.LABOR ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>CÔNG NHÂN</button>
            <button onClick={() => setFilterType(WorkOrderType.MECHANICAL)} className={`flex-1 text-[8px] font-black uppercase py-2 rounded-lg transition-all ${filterType === WorkOrderType.MECHANICAL ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>CƠ GIỚI</button>
          </div>
        </div>

        <div className="bg-white px-4 py-3 border-b border-slate-100 space-y-3 shrink-0">
          <div onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between cursor-pointer py-0.5 group">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BỘ LỌC THỜI GIAN</span>
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">{showFilters ? 'ẨN' : 'HIỆN'}</span>
          </div>

          {showFilters && (
            <div className="animate-fadeIn space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect label="Tháng" value={filterMonth} options={monthOptions} onChange={setFilterMonth} />
                <CustomSelect label="Năm" value={filterYear} options={yearOptions} onChange={setFilterYear} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 space-y-2.5 bg-white">
          {filteredWOs.map(wo => {
            const isSelected = selectedWOIds.has(wo.id);
            const isViewing = currentViewId === wo.id;
            const [d, m, y] = wo.date.split('/');
            const displayTitle = `Ca ${wo.shift} - ${d}${m}${y.slice(-2)}`;

            return (
              <div key={wo.id} onClick={() => setCurrentViewId(wo.id)} className={`p-3 rounded-full border-2 transition-all cursor-pointer flex items-center gap-3 relative shadow-sm ${isViewing ? 'bg-white border-[#3B82F6]' : 'bg-slate-50 border-transparent'}`}>
                <div onClick={(e) => { e.stopPropagation(); const next = new Set(selectedWOIds); if (next.has(wo.id)) next.delete(wo.id); else next.add(wo.id); setSelectedWOIds(next); }} className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                </div>
                <span className="font-black text-[11px] text-slate-800 truncate uppercase">{displayTitle}</span>
                {wo.isHoliday && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>}
                {wo.isWeekend && !wo.isHoliday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-200/30 print-container">
        <div className="flex flex-col items-center">
          {currentViewId && currentViewWO && (
            <div className="w-full flex flex-col items-center">
              <div className="mb-4 px-4 py-1.5 bg-white rounded-full shadow-sm border border-slate-200 flex items-center gap-4 no-print">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loại hình ca:</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${currentViewWO.isHoliday ? 'bg-amber-500' : (currentViewWO.isWeekend ? 'bg-indigo-500' : 'bg-blue-500')}`}></div>
                  <span className={`text-[10px] font-black uppercase ${currentViewWO.isHoliday ? 'text-amber-600' : (currentViewWO.isWeekend ? 'text-indigo-600' : 'text-blue-600')}`}>
                    {currentViewWO.isHoliday ? 'NGÀY LỄ' : (currentViewWO.isWeekend ? 'CA CUỐI TUẦN' : 'CA HÀNH CHÍNH')}
                  </span>
                </div>
              </div>
              {renderVirtualPaper(currentViewWO)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-serif-paper { font-family: 'Tinos', serif; }
        .font-signature { font-family: 'Dancing Script', cursive; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default WorkOrderReview;
