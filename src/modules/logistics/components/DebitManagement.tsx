
import React, { useState, useMemo, useEffect } from 'react';
import { Vessel, Container, ServicePrice, WorkOrder } from '../types';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';

interface DebitManagementProps {
  vessels: Vessel[];
  containers: Container[];
  workOrders: WorkOrder[];
  prices: ServicePrice[];
  onGoToPricing: () => void;
}

const DebitManagement: React.FC<DebitManagementProps> = ({ vessels, containers, prices }) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // 3-Column Filter State
  const [filterVesselName, setFilterVesselName] = useState<string>('');
  const [filterConsignee, setFilterConsignee] = useState<string>('');
  const [filterSchedule, setFilterSchedule] = useState<string>('');

  // 1. Unique Vessel Names
  const uniqueVesselNames = useMemo(() => {
    const names = vessels.map(v => v.vesselName?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [vessels]);

  // 2. Consignees (Filtered by Name)
  const uniqueConsignees = useMemo(() => {
    let filtered = vessels;
    if (filterVesselName) {
      filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    }
    const names = filtered.map(v => v.consignee?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [vessels, filterVesselName]);

  // 3. Schedules (Filtered by Name & Consignee)
  const uniqueSchedules = useMemo(() => {
    let filtered = vessels;
    if (filterVesselName) {
      filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    }
    if (filterConsignee) {
      filtered = filtered.filter(v => v.consignee?.toUpperCase().trim() === filterConsignee);
    }

    const schedules = new Set<string>();
    filtered.forEach(v => {
      const eta = v.eta ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
      const etd = v.etd ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
      schedules.add(`ETA: ${eta} - ETD: ${etd}`);
    });
    return Array.from(schedules).sort();
  }, [vessels, filterVesselName, filterConsignee]);

  // Auto-Select Logic
  useEffect(() => {
    if (filterVesselName && filterConsignee && filterSchedule) {
      const match = vessels.find(v => {
        const nameMatch = v.vesselName?.toUpperCase().trim() === filterVesselName;
        const consigneeMatch = v.consignee?.toUpperCase().trim() === filterConsignee;

        const eta = v.eta ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
        const etd = v.etd ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
        const scheduleString = `ETA: ${eta} - ETD: ${etd}`;

        return nameMatch && consigneeMatch && (scheduleString === filterSchedule);
      });

      if (match) {
        setSelectedVesselId(match.id);
      } else {
        setSelectedVesselId('ALL');
      }
    }
  }, [filterVesselName, filterConsignee, filterSchedule, vessels]);

  const selectedVessel = useMemo(() => vessels.find(v => v.id === selectedVesselId), [vessels, selectedVesselId]);

  const vesselStats = useMemo(() => {
    if (!selectedVesselId) return { totalWeight: 0, totalConts: 0 };
    const filtered = containers.filter(c => c.vesselId === selectedVesselId);
    return {
      totalWeight: filtered.reduce((sum, c) => sum + (c.weight || 0), 0),
      totalConts: filtered.length
    };
  }, [containers, selectedVesselId]);

  const debitRows = useMemo(() => {
    if (!selectedVessel) return [];
    const { totalWeight, totalConts } = vesselStats;

    // Ánh xạ các dịch vụ theo đúng mẫu ảnh (6 mục chính)
    const serviceMap = [
      { id: '1', name: 'Phí khai thác hàng nhập kho', cat: 'WEIGHT', unit: 'đồng/tấn' },
      { id: '2', name: 'Phí khai thác hàng xuất kho', cat: 'WEIGHT', unit: 'đồng/tấn' },
      { id: '3', name: 'Phí xếp lô hàng trong kho', cat: 'WEIGHT', unit: 'đồng/tấn' },
      { id: '4', name: 'Phí trả container về bãi sau khai thác', cat: 'UNIT', unit: 'đồng/cont' },
      { id: '5', name: 'Phí vận chuyển (từ kho Danalog- Cảng Tiên Sa)', cat: 'WEIGHT', unit: 'đồng/tấn' },
      { id: '6', name: `Phí thuê kho Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear().toString().slice(-2)}-Tàu ${selectedVessel.vesselName} (${selectedVessel.voyageNo || 'S30'})`, cat: 'WEIGHT', unit: 'đồng/tấn thông qua' },
    ];

    return serviceMap.map((s, idx) => {
      const priceItem = prices.find(p => p.id === s.id) || { price: 0 };
      const qty = s.cat === 'WEIGHT' ? totalWeight : totalConts;
      const amountBeforeVat = Math.round(qty * priceItem.price);
      const vat = Math.round(amountBeforeVat * 0.08);

      return {
        stt: idx + 1,
        service: s.name,
        qty,
        unit: s.unit,
        price: priceItem.price,
        amountBeforeVat,
        vat,
        total: amountBeforeVat + vat
      };
    });
  }, [selectedVessel, vesselStats, prices]);

  const totals = useMemo(() => {
    const amountBeforeVat = debitRows.reduce((s, r) => s + r.amountBeforeVat, 0);
    const vat = debitRows.reduce((s, r) => s + r.vat, 0);
    return { amountBeforeVat, vat, total: amountBeforeVat + vat };
  }, [debitRows]);

  const handleExportPDF = () => {
    if (!selectedVessel) return;
    setIsExporting(true);
    setTimeout(() => {
      const element = document.getElementById('debit-pdf-template');
      if (element) {
        const opt = {
          margin: 0,
          filename: `PhieuTinhCuoc_${selectedVessel.vesselName}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 3, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
      }
    }, 600);
  };

  const today = new Date();
  const dateStr = `Đà Nẵng, ngày ${today.getDate()} tháng ${String(today.getMonth() + 1).padStart(2, '0')} năm ${today.getFullYear()}.`;

  return (
    <div className="flex flex-col gap-4 animate-fadeIn text-left h-full">
      <div className="flex items-center gap-3 no-print ml-1">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">TÍNH HOÁ ĐƠN DEBIT</h3>
      </div>

      <div className="bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3 no-print">
        {/* 1. Vessel Name */}
        <div className="relative group flex-1 w-full md:w-auto min-w-[150px]">
          <ICONS.Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
          <select
            className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
            value={filterVesselName}
            onChange={(e) => {
              setFilterVesselName(e.target.value);
              setFilterConsignee('');
              setFilterSchedule('');
              setSelectedVesselId('');
            }}
          >
            <option value="">-- TÊN TÀU --</option>
            {uniqueVesselNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* 2. Consignee */}
        <div className="relative group flex-1 w-full md:w-auto min-w-[150px]">
          <ICONS.Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
          <select
            className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
            value={filterConsignee}
            onChange={(e) => {
              setFilterConsignee(e.target.value);
              setFilterSchedule('');
              setSelectedVesselId('');
            }}
            disabled={!filterVesselName}
          >
            <option value="">-- CHỦ HÀNG --</option>
            {uniqueConsignees.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 3. Schedule */}
        <div className="relative group flex-1 w-full md:w-auto min-w-[150px]">
          <ICONS.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
          <select
            className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
            value={filterSchedule}
            onChange={(e) => { setFilterSchedule(e.target.value); setSelectedVesselId(''); }}
            disabled={!filterConsignee}
          >
            <option value="">-- LỊCH TÀU --</option>
            {uniqueSchedules.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              setSelectedVesselId('');
              setFilterVesselName('');
              setFilterConsignee('');
              setFilterSchedule('');
            }}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
            title="Làm mới"
          >
            <ICONS.RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!selectedVesselId || isExporting}
            className="py-2.5 px-5 bg-rose-600 disabled:opacity-30 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <ICONS.FileText className="w-3.5 h-3.5" /> {isExporting ? 'ĐANG XUẤT...' : 'XUẤT PHIẾU'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 overflow-hidden flex-1 flex flex-col no-print">
        {selectedVessel ? (
          <div className="flex flex-col h-full">
            <div className="px-8 py-5 border-b bg-slate-50/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <div><h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{selectedVessel.vesselName}</h3><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Chủ hàng: {selectedVessel.consignee}</p></div>
              </div>
              <div className="flex gap-10 text-right uppercase">
                <div><p className="text-[8px] font-black text-slate-400">Trọng lượng</p><p className="text-xl font-black text-slate-800">{vesselStats.totalWeight.toLocaleString()} T</p></div>
                <div><p className="text-[8px] font-black text-slate-400">Số lượng Cont</p><p className="text-xl font-black text-slate-800">{vesselStats.totalConts} C</p></div>
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 z-10 border-b"><tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest"><th className="px-6 py-4 w-12 text-center">STT</th><th className="px-2 py-4">Dịch vụ</th><th className="px-2 py-4 text-right">Số lượng</th><th className="px-2 py-4 text-center">ĐVT</th><th className="px-2 py-4 text-right">Đơn giá</th><th className="px-2 py-4 text-right">Trước VAT</th><th className="px-2 py-4 text-right">VAT (8%)</th><th className="px-8 py-4 text-right">Tổng cộng</th></tr></thead>
                <tbody className="divide-y text-[11px] font-bold text-slate-600 uppercase">
                  {debitRows.map((r) => (
                    <tr key={r.stt} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 text-center text-slate-300">{r.stt}</td><td className="px-2 py-4 font-black text-slate-800">{r.service}</td><td className="px-2 py-4 text-right font-black">{r.qty.toLocaleString()}</td><td className="px-2 py-4 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded text-[9px]">{r.unit}</span></td><td className="px-2 py-4 text-right">{r.price.toLocaleString()}</td><td className="px-2 py-4 text-right">{r.amountBeforeVat.toLocaleString()}</td><td className="px-2 py-4 text-right text-slate-400">{r.vat.toLocaleString()}</td><td className="px-8 py-4 text-right font-black text-blue-600">{r.total.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-900 text-white px-10 py-5 flex justify-end gap-12 border-t shrink-0 items-center">
              <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TỔNG CHƯA THUẾ</p><p className="text-lg font-black">{totals.amountBeforeVat.toLocaleString()} ₫</p></div>
              <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TỔNG VAT (8%)</p><p className="text-lg font-black text-amber-500">{totals.vat.toLocaleString()} ₫</p></div>
              <div className="bg-blue-600 px-8 py-4 -my-5 ml-4 text-right"><p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">TỔNG THANH TOÁN</p><p className="text-2xl font-black tracking-tighter">{totals.total.toLocaleString()} ₫</p></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-40"><ICONS.FileText className="w-20 h-20 mb-4" /><p className="font-black text-xs uppercase tracking-widest">Chọn tàu để hạch toán cước phí</p></div>
        )}
      </div>

      {/* --- TEMPLATE PDF HOÀN CHỈNH (ẨN) --- */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        {selectedVessel && (
          <div id="debit-pdf-template" className="bg-white p-[10mm] text-black w-[297mm] font-serif-paper text-left box-border">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 border-b border-black pb-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 flex items-center justify-center transform rotate-45">
                    <div className="w-5 h-5 bg-white transform -rotate-45"></div>
                  </div>
                  <span className="text-2xl font-black tracking-tighter">DANALOG</span>
                </div>
                <p className="text-[9px] font-bold tracking-[0.3em] ml-14 -mt-2 uppercase">Danang Port Logistics</p>
              </div>
              <div className="text-center font-bold text-[12px] uppercase leading-tight">
                <p>CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</p>
                <p className="font-normal normal-case">97 Yết Kiêu, P. Sơn Trà, TP. Đà Nẵng, Việt Nam</p>
                <p className="font-normal normal-case">Tel: 0236.3667668 --- Fax: 02363.924111</p>
                <p className="font-normal normal-case">Email: sales@danalog.com.vn</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-6">
              <h1 className="text-3xl font-bold tracking-widest uppercase">BẢNG TÍNH CƯỚC DỊCH VỤ</h1>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-12 text-[13px] leading-relaxed mb-4 px-10">
              <div className="col-span-2 font-bold">Gửi Đến:</div>
              <div className="col-span-10 font-bold uppercase">CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG</div>

              <div className="col-span-2"></div>
              <div className="col-span-10">26 Bạch Đằng - Quận Hải Châu - Thành Phố Đà Nẵng</div>

              <div className="col-span-2"></div>
              <div className="col-span-10 font-bold">MST-0400101972</div>

              <div className="col-span-2 font-bold mt-2">Số HĐ:</div>
              <div className="col-span-10 text-red-600 font-bold mt-2">theo dự thảo HĐ số 03- 2026/ DNL-DNP</div>

              <div className="col-span-2 font-bold mt-1">Nội dung bảng kê:</div>
              <div className="col-span-10 mt-1">Thu phí thuê kho, vận chuyển, bốc xếp làm hàng giấy kiện vuông tháng {today.getMonth() + 1}/{today.getFullYear()}</div>

              <div className="col-span-2"></div>
              <div className="col-span-10 font-bold">Tàu {selectedVessel.vesselName} (ngoài Donghong)</div>

              <div className="col-span-4 font-bold mt-2">Bảng kê kèm theo hóa đơn số:</div>
              <div className="col-span-8 mt-2 flex gap-10">
                <span>ngày &nbsp;&nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp;&nbsp; năm</span>
              </div>

              <div className="col-span-2 font-bold">Email:</div>
              <div className="col-span-10 font-bold">hongvan@danangport.com, hieunt@danangport.com</div>
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse border border-black text-[13px] font-bold">
              <thead>
                <tr className="bg-gray-100 h-10">
                  <th className="border border-black text-center w-12">STT</th>
                  <th className="border border-black text-center px-4">Dịch vụ</th>
                  <th className="border border-black text-center w-24">Số lượng</th>
                  <th className="border border-black text-center w-28">Đơn vị tính</th>
                  <th className="border border-black text-center w-28">Đơn giá</th>
                  <th className="border border-black text-center w-32">Số tiền trước VAT</th>
                  <th className="border border-black text-center w-24">8%* VAT</th>
                  <th className="border border-black text-center w-32">Tổng số tiền</th>
                </tr>
              </thead>
              <tbody>
                {debitRows.map((r, i) => (
                  <tr key={i} className="h-9">
                    <td className="border border-black text-center">{r.stt}</td>
                    <td className="border border-black px-2">{r.service}</td>
                    <td className="border border-black text-right px-2">{r.qty.toLocaleString()}</td>
                    <td className="border border-black text-center font-normal">{r.unit}</td>
                    <td className="border border-black text-right px-2">{r.price.toLocaleString()}</td>
                    <td className="border border-black text-right px-2">{r.amountBeforeVat.toLocaleString()}</td>
                    <td className="border border-black text-right px-2">{r.vat.toLocaleString()}</td>
                    <td className="border border-black text-right px-2">{r.total.toLocaleString()}</td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="h-10">
                  <td colSpan={5} className="border border-black text-center uppercase font-bold">Tổng số tiền</td>
                  <td className="border border-black text-right px-2">{totals.amountBeforeVat.toLocaleString()}</td>
                  <td className="border border-black text-right px-2">{totals.vat.toLocaleString()}</td>
                  <td className="border border-black text-right px-2 bg-gray-50">{totals.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="mt-8 flex justify-between px-20">
              <div className="text-center flex flex-col items-center">
                <p className="font-bold uppercase mb-20">CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG</p>
                <div className="h-1 bg-black/10 w-40"></div>
              </div>
              <div className="text-center flex flex-col items-center">
                <p className="italic text-[13px] mb-2">{dateStr}</p>
                <p className="font-bold uppercase mb-20">CÔNG TY CP LOGISTICS CẢNG ĐÀ NẴNG</p>
                <div className="h-1 bg-black/10 w-40"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
        .font-serif-paper { font-family: 'Tinos', serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DebitManagement;
