
import React, { useState, useMemo, useEffect } from 'react';
import { Vessel, Container, ContainerStatus, ServicePrice } from '../types';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';
import * as XLSX from 'xlsx';

interface InventoryReportProps {
  containers: Container[];
  vessels: Vessel[];
  prices: ServicePrice[];
}

const InventoryReport: React.FC<InventoryReportProps> = ({ containers, vessels, prices }) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('01');
  const [yearFilter, setYearFilter] = useState<string>('2026');

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

  // Lấy hệ số quy đổi từ cấu hình đơn giá (mặc định 1.8 nếu không tìm thấy)
  const weightFactor = useMemo(() => {
    const factorItem = prices.find(p => p.id === 'weight-factor');
    return factorItem ? factorItem.price : 1.8;
  }, [prices]);

  const reportData = useMemo(() => {
    if (!selectedVesselId) return null;

    const vesselContainers = containers.filter(c => c.vesselId === selectedVesselId);
    const filterDate = new Date(`${yearFilter}-${monthFilter}-01`);

    // I. Tồn đầu (Hoàn tất trước tháng báo cáo)
    const prevContainers = vesselContainers.filter(c => {
      const tallyDate = c.updatedAt ? new Date(c.updatedAt) : null;
      return tallyDate && tallyDate < filterDate && c.status === ContainerStatus.COMPLETED;
    });

    // II. Nhập kho trong kỳ (Hoàn tất trong tháng báo cáo)
    const inboundContainers = vesselContainers.filter(c => {
      const tallyDate = c.updatedAt ? new Date(c.updatedAt) : null;
      if (!tallyDate) return false;
      return (
        tallyDate.getMonth() + 1 === parseInt(monthFilter) &&
        tallyDate.getFullYear() === parseInt(yearFilter) &&
        c.status === ContainerStatus.COMPLETED
      );
    });

    const tonDauPkgs = prevContainers.reduce((sum, c) => sum + (c.pkgs || 0), 0);
    const tonDauWeight = tonDauPkgs * weightFactor;

    const nhapTrongKyPkgs = inboundContainers.reduce((sum, c) => sum + (c.pkgs || 0), 0);
    const nhapTrongKyWeight = nhapTrongKyPkgs * weightFactor;

    // III. Xuất kho trong kỳ (Giả định xuất nguyên lô sau khi đã nhập xong trong kỳ)
    const xuatTrongKyPkgs = nhapTrongKyPkgs;
    const xuatTrongKyWeight = nhapTrongKyWeight;

    // IV. Tồn cuối = Tồn đầu + Nhập - Xuất
    const tonCuoiPkgs = tonDauPkgs + nhapTrongKyPkgs - xuatTrongKyPkgs;
    const tonCuoiWeight = tonDauWeight + nhapTrongKyWeight - xuatTrongKyWeight;

    return {
      tonDau: { pkgs: tonDauPkgs, weight: tonDauWeight },
      inbound: inboundContainers,
      inboundSummary: { pkgs: nhapTrongKyPkgs, weight: nhapTrongKyWeight },
      outboundSummary: { pkgs: xuatTrongKyPkgs, weight: xuatTrongKyWeight },
      tonCuoi: { pkgs: tonCuoiPkgs, weight: tonCuoiWeight }
    };
  }, [selectedVesselId, containers, monthFilter, yearFilter, weightFactor]);

  const handleExportExcel = () => {
    if (!reportData || !selectedVessel) return;

    // Dữ liệu thô cho file Excel (Array of Arrays)
    const data = [
      ["CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG"],
      ["97 Yết Kiêu, P. Sơn Trà, TP. Đà Nẵng, Việt Nam"],
      ["Tel: 0236.3667668 --- Fax: 02363.924111"],
      ["Email: sales@danalog.com.vn"],
      [],
      [`BẢNG KÊ NHẬP XUẤT KHO THÁNG ${monthFilter}/${yearFilter}`],
      ["CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG"],
      [],
      [`Mặt hàng: GIẤY KIỆN VUÔNG - Nhập và xuất tàu ${selectedVessel.vesselName}`],
      [],
      ["STT", "Diễn giải", "Tàu", "Ngày nhập kho", "Ngày xuất kho", "Số cont/ XE", "Số lượng (kiện)", "Khối lượng (tấn)"],

      // Section I: Tồn đầu
      ["I", "Tồn đầu", "", "", "", "", reportData.tonDau.pkgs, reportData.tonDau.weight.toFixed(1)],
      ["", "Cộng", "", "", "", "", reportData.tonDau.pkgs, reportData.tonDau.weight.toFixed(1)],

      // Section II: Nhập kho
      ["II", "Nhập kho trong kỳ", "Tàu", "Ngày nhập kho", "Ngày xuất kho", "Số cont/ XE", "Số lượng (kiện)", "Khối lượng (tấn)"]
    ];

    // Chi tiết nhập
    reportData.inbound.forEach((c, idx) => {
      data.push([
        (idx + 1).toString(),
        "BỘT GIẤY DẠNG NÉN TẤM",
        selectedVessel.vesselName,
        c.updatedAt ? c.updatedAt.split('T')[0] : "",
        "",
        c.containerNo,
        c.pkgs.toString(),
        (c.pkgs * weightFactor).toFixed(1)
      ]);
    });

    // Cộng nhập
    data.push(["", "Cộng", "", "", "", "", reportData.inboundSummary.pkgs.toString(), reportData.inboundSummary.weight.toFixed(1)]);

    // Section III: Xuất kho
    data.push(["III", "Xuất kho trong kỳ", "", "", "", "", "Số lượng (kiện)", "Khối lượng (tấn)"]);
    data.push(["1", "BỘT GIẤY DẠNG NÉN TẤM", selectedVessel.vesselName, "", "", "XUẤT NGUYÊN LÔ", reportData.outboundSummary.pkgs.toString(), reportData.outboundSummary.weight.toFixed(1)]);
    data.push(["", "Cộng", "", "", "", "", reportData.outboundSummary.pkgs.toString(), reportData.outboundSummary.weight.toFixed(1)]);

    // Section IV: Tồn cuối
    data.push(["IV", "Tồn cuối", "", "", "", "", "Số lượng (kiện)", "Khối lượng (tấn)"]);
    data.push(["1", "BỘT GIẤY DẠNG NÉN TẤM", selectedVessel.vesselName, "", "", "", reportData.tonCuoi.pkgs.toString(), reportData.tonCuoi.weight.toFixed(1)]);
    data.push(["", "Cộng", "", "", "", "", reportData.tonCuoi.pkgs.toString(), reportData.tonCuoi.weight.toFixed(1)]);

    // Chữ ký
    data.push([], []);
    data.push(["", "", "", "", "", "", `Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`]);
    data.push(["XÍ NGHIỆP CẢNG TIÊN SA", "", "", "", "", "", "CÔNG TY CP LOGISTICS CẢNG ĐÀ NẴNG"]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Gộp ô tiêu đề (Merges)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Company Name
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, // Title
      { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } }, // Sub Title
      { s: { r: 8, c: 0 }, e: { r: 8, c: 7 } }, // Subject
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Report");
    XLSX.writeFile(wb, `BangKeNhapXuatKho_${selectedVessel.vesselName}_T${monthFilter}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn text-left h-full">
      {/* Filter Section */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 no-print shrink-0">
        <div className="flex flex-col gap-6">
          {/* Row 1: Vessel Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            {/* 1. Vessel Name */}
            <div className="w-full md:w-1/3 relative group">
              <ICONS.Ship className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
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
            <div className="w-full md:w-1/3 relative group">
              <ICONS.Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
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
            <div className="w-full md:w-1/3 relative group">
              <ICONS.Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
                value={filterSchedule}
                onChange={(e) => { setFilterSchedule(e.target.value); setSelectedVesselId(''); }}
                disabled={!filterConsignee}
              >
                <option value="">-- LỊCH TÀU (ETA - ETD) --</option>
                {uniqueSchedules.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Date & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">2. THÁNG BÁO CÁO</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl py-3 px-4 font-black text-slate-700 bg-slate-50 outline-none text-sm appearance-none"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={(i + 1).toString().padStart(2, '0')}>Tháng {(i + 1).toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">3. NĂM</label>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full border border-slate-200 rounded-2xl py-3 px-4 font-black text-slate-700 bg-slate-50 outline-none text-sm appearance-none">
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div className="md:col-span-7 flex flex-col md:flex-row gap-4 items-end justify-end">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest hidden md:inline-block mb-3">Hệ số đang dùng: {weightFactor} tấn/kiện</span>
              <button
                onClick={handleExportExcel}
                disabled={!selectedVesselId}
                className={`py-3 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all ${!selectedVesselId ? 'bg-slate-100 text-slate-300 shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
              >
                <ICONS.FileText className="w-4 h-4" /> XUẤT BẢNG KÊ (EXCEL)
              </button>
              <button
                onClick={() => {
                  setSelectedVesselId('');
                  setFilterVesselName('');
                  setFilterConsignee('');
                  setFilterSchedule('');
                }}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all shadow-sm whitespace-nowrap"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary View */}
      {selectedVessel && reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
          <SummaryCard title="I. TỒN ĐẦU KỲ" pkgs={reportData.tonDau.pkgs} weight={reportData.tonDau.weight} color="text-slate-400" />
          <SummaryCard title="II. NHẬP TRONG KỲ" pkgs={reportData.inboundSummary.pkgs} weight={reportData.inboundSummary.weight} color="text-blue-600" />
          <SummaryCard title="III. XUẤT TRONG KỲ" pkgs={reportData.outboundSummary.pkgs} weight={reportData.outboundSummary.weight} color="text-rose-500" />
          <SummaryCard title="IV. TỒN CUỐI KỲ" pkgs={reportData.tonCuoi.pkgs} weight={reportData.tonCuoi.weight} color="text-emerald-600" />
        </div>
      )}

      {/* List Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex-1 min-h-0 flex flex-col">
        {selectedVessel && reportData ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-400 border-b">
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest w-16 text-center">STT</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest w-[25%]">DIỄN GIẢI</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest text-center">TÀU</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest text-center">NGÀY NHẬP</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest text-center">SỐ CONT / XE</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest text-center">SỐ LƯỢNG</th>
                  <th className="px-4 py-4 font-black uppercase text-[9px] tracking-widest text-right">KHỐI LƯỢNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Section I: Opening */}
                <tr className="bg-slate-50/50 font-black">
                  <td className="px-4 py-3 text-center text-[11px] text-slate-800">I</td>
                  <td className="px-4 py-3 text-[11px] text-slate-800 uppercase">Tồn đầu</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-3 text-center text-[11px] text-slate-800">{reportData.tonDau.pkgs} KIỆN</td>
                  <td className="px-4 py-3 text-right text-[11px] text-slate-800">{reportData.tonDau.weight.toFixed(1)} TẤN</td>
                </tr>
                <tr className="bg-slate-50/20 italic border-b-2">
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Cộng Tồn đầu</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2 text-center text-[10px] font-black text-slate-400">{reportData.tonDau.pkgs}</td>
                  <td className="px-4 py-2 text-right text-[10px] font-black text-slate-400">{reportData.tonDau.weight.toFixed(1)}</td>
                </tr>

                {/* Section II: Inbound */}
                <tr className="bg-blue-50/40 font-black">
                  <td className="px-4 py-3 text-center text-[11px] text-blue-800">II</td>
                  <td className="px-4 py-3 text-[11px] text-blue-800 uppercase" colSpan={6}>Nhập kho trong kỳ</td>
                </tr>
                {reportData.inbound.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-center text-[11px] font-bold text-slate-300">{i + 1}</td>
                    <td className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase">BỘT GIẤY DẠNG NÉN TẤM</td>
                    <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-500 uppercase">{selectedVessel.vesselName}</td>
                    <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-500">{c.updatedAt ? displayDate(c.updatedAt.split('T')[0]) : '-'}</td>
                    <td className="px-4 py-2 text-center font-black text-slate-800 text-[11px] uppercase">{c.containerNo}</td>
                    <td className="px-4 py-2 text-center font-black text-slate-700 text-[11px]">{c.pkgs}</td>
                    <td className="px-4 py-2 text-right font-black text-blue-600 text-[11px]">{(c.pkgs * weightFactor).toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50/20 italic border-b-2">
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-[10px] font-black text-blue-800 uppercase">Cộng Nhập kỳ này</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2 text-center text-[10px] font-black text-blue-800">{reportData.inboundSummary.pkgs}</td>
                  <td className="px-4 py-2 text-right text-[10px] font-black text-blue-800">{reportData.inboundSummary.weight.toFixed(1)}</td>
                </tr>

                {/* Section III: Outbound */}
                <tr className="bg-rose-50/40 font-black">
                  <td className="px-4 py-3 text-center text-[11px] text-rose-800">III</td>
                  <td className="px-4 py-3 text-[11px] text-rose-800 uppercase" colSpan={6}>Xuất kho trong kỳ</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-center text-[11px] font-bold text-slate-300">1</td>
                  <td className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase">BỘT GIẤY DẠNG NÉN TẤM</td>
                  <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-500 uppercase">{selectedVessel.vesselName}</td>
                  <td></td>
                  <td className="px-4 py-2 text-center font-black text-rose-800 text-[11px] uppercase">XUẤT NGUYÊN LÔ</td>
                  <td className="px-4 py-2 text-center font-black text-slate-700 text-[11px]">{reportData.outboundSummary.pkgs}</td>
                  <td className="px-4 py-2 text-right font-black text-rose-600 text-[11px]">{reportData.outboundSummary.weight.toFixed(1)}</td>
                </tr>
                <tr className="bg-rose-50/20 italic border-b-2">
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-[10px] font-black text-rose-800 uppercase">Cộng Xuất kỳ này</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2 text-center text-[10px] font-black text-rose-800">{reportData.outboundSummary.pkgs}</td>
                  <td className="px-4 py-2 text-right text-[10px] font-black text-rose-800">{reportData.outboundSummary.weight.toFixed(1)}</td>
                </tr>

                {/* Section IV: Closing */}
                <tr className="bg-emerald-50 font-black">
                  <td className="px-4 py-3 text-center text-[11px] text-emerald-800">IV</td>
                  <td className="px-4 py-3 text-[11px] text-emerald-800 uppercase">Tồn cuối</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-3 text-center text-[11px] text-emerald-800">{reportData.tonCuoi.pkgs} KIỆN</td>
                  <td className="px-4 py-3 text-right text-[11px] text-emerald-800">{reportData.tonCuoi.weight.toFixed(1)} TẤN</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-32 bg-slate-50/10">
            <ICONS.FileText className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black text-[10px] uppercase tracking-widest opacity-40">Vui lòng chọn Tàu & Tháng để bắt đầu tổng hợp dữ liệu</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string, pkgs: number, weight: number, color: string }> = ({ title, pkgs, weight, color }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-start gap-1">
    <span className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{title}</span>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-2xl font-black text-slate-800">{pkgs}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase">KIỆN</span>
    </div>
    <span className="text-[11px] font-black text-slate-600 tracking-tight">{weight.toFixed(1)} <span className="text-[8px] text-slate-400 uppercase">TẤN</span></span>
  </div>
);

export default InventoryReport;
