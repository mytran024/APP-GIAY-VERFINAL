
import React, { useState, useMemo, useEffect } from 'react';
import { Container, WorkOrder, WorkOrderType, Vessel, BusinessType } from '../types';
import { TallyReport } from '../../inspector/types';
import WorkOrderPrintTemplate from '../../inspector/components/WorkOrderPrintTemplate';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';
import * as XLSX from 'xlsx';

// @ts-ignore

interface StatItem {
  id: string;
  originalWO: WorkOrder;
  name: string;
  cargoType: string;
  date: string;
  shift: string;
  method: string;
  value: number;
  typeLabel: 'CA HC' | 'CA CUỐI TUẦN' | 'CA LỄ';
  isMechanical: boolean;
  isOutsourced?: boolean;
  businessType: BusinessType;
}

const Statistics: React.FC<{
  containers: Container[];
  workOrders: WorkOrder[];
  vessels: Vessel[];
  businessType: BusinessType;
  onUpdateWorkOrders: (wo: WorkOrder[]) => void;
  reports?: TallyReport[];
}> = ({ containers, workOrders, vessels, businessType, onUpdateWorkOrders, reports = [] }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'SUMMARY'>('LIST');
  const [reportType, setReportType] = useState<'WORKER' | 'INTERNAL_MECH' | 'EXTERNAL_MECH'>('WORKER');
  const [vesselFilter, setVesselFilter] = useState('ALL');
  const [monthYearFilter, setMonthYearFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 3-Column Filter State
  const [filterVesselName, setFilterVesselName] = useState<string>('');
  const [filterConsignee, setFilterConsignee] = useState<string>('');
  const [filterSchedule, setFilterSchedule] = useState<string>('');

  const uniqueVesselNames = useMemo(() => {
    const names = vessels.map(v => v.vesselName?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [vessels]);

  const uniqueConsignees = useMemo(() => {
    let filtered = vessels;
    if (filterVesselName) filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    const names = filtered.map(v => v.consignee?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [vessels, filterVesselName]);

  const uniqueSchedules = useMemo(() => {
    let filtered = vessels;
    if (filterVesselName) filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    if (filterConsignee) filtered = filtered.filter(v => v.consignee?.toUpperCase().trim() === filterConsignee);
    const schedules = new Set<string>();
    filtered.forEach(v => {
      const eta = v.eta ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
      const etd = v.etd ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
      schedules.add(`ETA: ${eta} - ETD: ${etd}`);
    });
    return Array.from(schedules).sort();
  }, [vessels, filterVesselName, filterConsignee]);

  useEffect(() => {
    if (filterVesselName && filterConsignee && filterSchedule) {
      const match = vessels.find(v => {
        const nameMatch = v.vesselName?.toUpperCase().trim() === filterVesselName;
        const consigneeMatch = v.consignee?.toUpperCase().trim() === filterConsignee;
        const eta = v.eta ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
        const etd = v.etd ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
        return nameMatch && consigneeMatch && (`ETA: ${eta} - ETD: ${etd}` === filterSchedule);
      });
      if (match) setVesselFilter(match.id); else setVesselFilter('ALL');
    }
  }, [filterVesselName, filterConsignee, filterSchedule, vessels]);

  const [currentPrintWO, setCurrentPrintWO] = useState<{ wo: WorkOrder, report: TallyReport } | null>(null);

  const handlePrintWO = (wo: any) => {
    let report = reports.find(r => r.id === wo.reportId);
    if (!report) {
      report = {
        id: wo.reportId || 'N/A', vesselId: wo.vesselId, mode: businessType === BusinessType.IMPORT ? 'NHAP' : 'XUAT',
        shift: '1', workDate: wo.date, owner: 'N/A', workerCount: wo.peopleCount || 0,
        workerNames: Array.isArray(wo.workerNames) ? wo.workerNames.join(', ') : wo.workerNames,
        mechanicalCount: 0, mechanicalNames: '', equipment: '', vehicleNo: wo.vehicleNos ? wo.vehicleNos.join(', ') : (wo.vehicleNo || ''),
        vehicleType: wo.vehicleType || '', items: [], createdAt: Date.now(), status: 'HOAN_TAT',
      } as unknown as TallyReport;
    }
    const inspectorWO: any = { ...wo, organization: wo.teamName || wo.organization || 'Tổ Công Nhân', vehicleNo: wo.vehicleNos ? wo.vehicleNos.join(', ') : (wo.vehicleNo || ''), type: wo.type === WorkOrderType.LABOR ? 'CONG_NHAN' : (wo.isOutsourced ? 'CO_GIOI_NGOAI' : 'CO_GIOI') };
    setCurrentPrintWO({ wo: inspectorWO, report });
    setTimeout(() => {
      const element = document.getElementById('wo-print-template');
      if (element) {
        const opt = { margin: 0, filename: `PhieuCongTac_${wo.id}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => { setCurrentPrintWO(null); });
      }
    }, 500);
  };

  const monthYearOptions = useMemo(() => {
    const options = [{ value: 'ALL', label: 'TẤT CẢ CÁC THÁNG' }];
    const years = ['2026', '2025'];
    for (const y of years) { for (let m = 1; m <= 12; m++) { const mm = m.toString().padStart(2, '0'); options.push({ value: `${mm}/${y}`, label: `Tháng ${mm}/${y}` }); } }
    return options;
  }, []);

  const processedData = useMemo(() => {
    return workOrders.flatMap(wo => {
      if (reportType === 'WORKER' && wo.type !== WorkOrderType.LABOR) return [];
      if (reportType === 'INTERNAL_MECH' && (wo.type !== WorkOrderType.MECHANICAL || wo.isOutsourced)) return [];
      if (reportType === 'EXTERNAL_MECH' && (wo.type !== WorkOrderType.MECHANICAL || !wo.isOutsourced)) return [];
      if (vesselFilter !== 'ALL' && wo.vesselId !== vesselFilter) return [];
      const parts = wo.date.includes('-') ? wo.date.split('-').reverse() : wo.date.split('/');
      const [d, m, y] = parts;
      const isoDate = `${y}-${m}-${d}`;
      if (monthYearFilter !== 'ALL' && `${m}/${y}` !== monthYearFilter) return [];
      if (viewMode === 'LIST' && dateRange.start && isoDate < dateRange.start) return [];
      if (viewMode === 'LIST' && dateRange.end && isoDate > dateRange.end) return [];
      return wo.workerNames.map((name, idx) => ({
        id: `${wo.id}-${idx}`, originalWO: wo, name: name.toUpperCase(),
        cargoType: wo.items[0]?.cargoType || 'Bột giấy nén tấm', date: wo.date, shift: wo.shift, method: wo.items[0]?.method || 'N/A',
        value: wo.type === WorkOrderType.LABOR ? 1 : (wo.items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0) / wo.workerNames.length),
        typeLabel: wo.isHoliday ? 'CA LỄ' : (wo.isWeekend ? 'CA CUỐI TUẦN' : 'CA LỄ'),
        isMechanical: wo.type === WorkOrderType.MECHANICAL, isOutsourced: wo.isOutsourced, businessType: wo.businessType
      } as StatItem));
    });
  }, [workOrders, reportType, vesselFilter, monthYearFilter, dateRange, viewMode]);

  return (
    <div className="space-y-4 animate-fadeIn text-left h-full flex flex-col p-2">
      <div className="flex items-center justify-between no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">THỐNG KÊ SẢN LƯỢNG</h3>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm scale-95 origin-left">
            <button onClick={() => setViewMode('LIST')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'LIST' ? 'bg-white shadow-lg text-blue-600 border' : 'text-slate-400'}`}>Danh sách chi tiết</button>
            <button onClick={() => setViewMode('SUMMARY')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'SUMMARY' ? 'bg-white shadow-lg text-blue-600 border' : 'text-slate-400'}`}>Tổng hợp sản lượng tàu</button>
          </div>
        </div>
        <button className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-3">
          <ICONS.FileText className="w-4 h-4" /> XUẤT BÁO CÁO (EXCEL)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm items-end no-print shrink-0">
        <div className="md:col-span-12 lg:col-span-6 grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">TÊN TÀU</label>
            <select value={filterVesselName} onChange={(e) => { setFilterVesselName(e.target.value); setFilterConsignee(''); setFilterSchedule(''); setVesselFilter('ALL'); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-black text-slate-700 text-[10px] outline-none shadow-sm uppercase truncate font-sans">
              <option value="">TẤT CẢ TÊN TÀU</option>
              {uniqueVesselNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">CHỦ HÀNG</label>
            <select disabled={!filterVesselName} value={filterConsignee} onChange={(e) => { setFilterConsignee(e.target.value); setFilterSchedule(''); setVesselFilter('ALL'); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-black text-slate-700 text-[10px] outline-none shadow-sm uppercase truncate font-sans">
              <option value="">TẤT CẢ CHỦ HÀNG</option>
              {uniqueConsignees.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">LỊCH TÀU</label>
            <select disabled={!filterConsignee} value={filterSchedule} onChange={(e) => { setFilterSchedule(e.target.value); setVesselFilter('ALL'); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-black text-slate-700 text-[10px] outline-none shadow-sm uppercase truncate font-sans">
              <option value="">TẤT CẢ LỊCH TÀU</option>
              {uniqueSchedules.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="md:col-span-6 lg:col-span-2 space-y-1.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">THÁNG / NĂM</label>
          <select value={monthYearFilter} onChange={(e) => setMonthYearFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-slate-700 text-[10px] outline-none shadow-sm font-sans">
            {monthYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {viewMode === 'LIST' && (
          <div className="md:col-span-5 lg:col-span-3 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">KHOẢNG THỜI GIAN</label>
            <div className="flex gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 font-black text-slate-700 text-[9px] outline-none font-sans" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 font-black text-slate-700 text-[9px] outline-none font-sans" />
            </div>
          </div>
        )}
        <div className="md:col-span-1 lg:col-span-1 border-0"><button onClick={() => { setVesselFilter('ALL'); setFilterVesselName(''); setFilterConsignee(''); setFilterSchedule(''); setMonthYearFilter('ALL'); setDateRange({ start: '', end: '' }); }} className="w-full h-[41px] bg-slate-900 text-white rounded-xl font-black uppercase text-[8px] tracking-widest active:scale-95 shadow-sm font-sans border-0">RESET</button></div>
      </div>

      <div className="bg-white rounded-[2rem] border shadow-xl flex-1 flex flex-col overflow-hidden mb-2">
        {viewMode === 'LIST' ? (
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b flex gap-2">
              {['WORKER', 'INTERNAL_MECH', 'EXTERNAL_MECH'].map(t => (
                <button key={t} onClick={() => setReportType(t as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${reportType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}>
                  {t === 'WORKER' ? 'Công nhân' : t === 'INTERNAL_MECH' ? 'Cơ giới DNL' : 'Cơ giới ngoài'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left font-sans">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b">
                  <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                    <th className="px-8 py-4 w-[30%] font-black uppercase">{reportType === 'WORKER' ? 'TÊN NHÂN VIÊN' : 'TÊN CƠ GIỚI'}</th>
                    <th className="px-4 py-4 text-center font-black uppercase">NGÀY / CA</th>
                    <th className="px-4 py-4 text-center font-black uppercase">PHƯƠNG ÁN</th>
                    <th className="px-4 py-4 text-center font-black uppercase">SẢN LƯỢNG</th>
                    <th className="px-4 py-4 text-right pr-10 font-black uppercase">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {processedData.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="px-8 py-4"><span className="font-black text-[12px] text-slate-800 uppercase block leading-tight">{item.name}</span><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">{item.cargoType}</span></td>
                      <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-500 font-mono italic uppercase">{item.date} | CA {item.shift}</td>
                      <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-400 italic uppercase">{item.method}</td>
                      <td className="px-4 py-4 text-center"><span className="font-black text-sm text-slate-900">{item.value.toFixed(1)} <span className="text-[9px] opacity-40 uppercase">{item.isMechanical ? 'TẤN' : 'CA'}</span></span></td>
                      <td className="px-4 py-4 text-right pr-10">
                        <button onClick={() => handlePrintWO(item.originalWO)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="In phiếu công tác"><ICONS.Printer size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center h-full opacity-20"><ICONS.FileText className="w-20 h-20 mb-4" /><p className="font-black uppercase tracking-[0.4em]">Chọn tàu để xem tổng hợp</p></div>
        )}
      </div>

      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        {currentPrintWO && (
          <div id="wo-print-template">
            <WorkOrderPrintTemplate wo={currentPrintWO.wo as any} report={currentPrintWO.report} />
          </div>
        )}
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
};
export default Statistics;
