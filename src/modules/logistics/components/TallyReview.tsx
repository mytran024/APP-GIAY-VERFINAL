
import React, { useState, useMemo, useEffect } from 'react';
import { Container, ContainerStatus, Vessel } from '../types';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';
import { TallyReport } from '../../inspector/types';
import TallyPrintTemplate from '../../inspector/components/TallyPrintTemplate';

// @ts-ignore

interface TallyReportGroup {
  id: string;
  vesselId: string;
  vesselName: string;
  vesselCode: string;
  shift: string;
  day: string;
  month: string;
  year: string;
  dateStr: string;
  reportNo: string;
  consignee: string;
  commodity: string;
  containers: Container[];
  type: 'IMPORT' | 'EXPORT';
}

const TallyReview: React.FC<{ containers: Container[], vessels: Vessel[], onUpdateContainers: (c: Container[]) => void, reports?: TallyReport[] }> = ({ containers, vessels, reports = [] }) => {
  const [activeFilter, setActiveFilter] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [selectedVesselId, setSelectedVesselId] = useState<string>('ALL');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [currentPrintReport, setCurrentPrintReport] = useState<{ report: TallyReport, vessel: Vessel } | null>(null);
  const [allPrintReports, setAllPrintReports] = useState<{ report: TallyReport, vessel: Vessel }[]>([]);

  const monthYearOptions = useMemo(() => {
    const options = [{ value: 'ALL', label: 'TẤT CẢ CÁC THÁNG' }];
    const years = ['2026', '2025'];
    for (const y of years) {
      for (let m = 1; m <= 12; m++) {
        const mm = m.toString().padStart(2, '0');
        options.push({ value: `${mm}/${y}`, label: `Tháng ${mm}/${y}` });
      }
    }
    return options;
  }, []);

  const reportGroups = useMemo(() => {
    const groups: TallyReportGroup[] = [];
    let filteredContainers = containers.filter(c => {
      if (activeFilter === 'EXPORT') return c.unitType === 'VEHICLE';
      return c.unitType === 'CONTAINER' && c.status === ContainerStatus.COMPLETED;
    });

    if (selectedVesselId !== 'ALL') filteredContainers = filteredContainers.filter(c => c.vesselId === selectedVesselId);

    if (monthYearFilter !== 'ALL') {
      const [m, y] = monthYearFilter.split('/');
      filteredContainers = filteredContainers.filter(c => {
        const d = new Date(c.updatedAt);
        return (d.getMonth() + 1).toString().padStart(2, '0') === m && d.getFullYear().toString() === y;
      });
    }

    if (startDate || endDate) {
      filteredContainers = filteredContainers.filter(c => {
        const dateStr = c.updatedAt.split('T')[0];
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      });
    }

    const targetVessels = selectedVesselId === 'ALL' ? vessels : vessels.filter(v => v.id === selectedVesselId);

    targetVessels.forEach(vessel => {
      const vesselData = filteredContainers.filter(c => c.vesselId === vessel.id);
      if (vesselData.length === 0) return;
      const vesselCode = vessel.vesselName.split(' ').pop() || vessel.vesselName;


      for (let i = 0; i < vesselData.length; i += 15) {
        const chunk = vesselData.slice(i, i + 15);
        const reportIndex = Math.floor(i / 15) + 34;
        const dateObj = new Date(chunk[0].updatedAt);
        groups.push({
          id: `REP-${activeFilter}-${vessel.id}-${reportIndex}`,
          vesselId: vessel.id,
          vesselName: vessel.vesselName,
          vesselCode: vesselCode,
          shift: "2",
          day: String(dateObj.getDate()).padStart(2, '0'),
          month: String(dateObj.getMonth() + 1).padStart(2, '0'),
          year: String(dateObj.getFullYear()),
          dateStr: dateObj.toISOString().split('T')[0],
          reportNo: `${reportIndex}`,
          consignee: vessel.consignee,
          commodity: vessel.commodity,
          containers: chunk,
          type: activeFilter
        });
      }
    });

    // --- INTEGRATE SYNCED REPORTS FROM INSPECTOR ---
    if (reports && reports.length > 0) {
      reports.forEach(r => {
        // Filter by active tab (IMPORT/EXPORT)
        if ((activeFilter === 'IMPORT' && r.mode !== 'NHAP') || (activeFilter === 'EXPORT' && r.mode !== 'XUAT')) return;

        // Filter by Vessel
        if (selectedVesselId !== 'ALL' && r.vesselId !== selectedVesselId) return;

        const dateObj = new Date(r.workDate);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear());

        // Filter by Month/Year
        if (monthYearFilter !== 'ALL') {
          const [m, y] = monthYearFilter.split('/');
          if (m !== month || y !== year) return;
        }

        // Filter by Date Range
        const dateStr = r.workDate; // Assuming YYYY-MM-DD
        if (startDate && dateStr < startDate) return;
        if (endDate && dateStr > endDate) return;

        const vessel = vessels.find(v => v.id === r.vesselId);
        const vesselName = vessel ? vessel.vesselName : r.vesselId;
        const vesselCode = vesselName.split(' ').pop() || vesselName;
        const consignee = vessel ? vessel.consignee : r.owner;
        const commodity = vessel ? vessel.commodity : '';

        // Map TallyItem to Container-like structure for display
        const mappedContainers: any[] = r.items.map(item => ({
          containerNo: item.contNo || item.transportVehicle || 'N/A',
          sealNo: item.sealNo,
          pkgs: item.actualUnits,
          weight: item.actualWeight,
          // Extra logic for distinguishing vehicle vs container if needed
        }));

        groups.push({
          id: r.id,
          vesselId: r.vesselId,
          vesselName: vesselName,
          vesselCode: vesselCode,
          shift: r.shift,
          day,
          month,
          year,
          dateStr: r.workDate,
          reportNo: r.id.split('-').pop() || '00', // Extract seq from ID if needed
          consignee: consignee,
          commodity: commodity,
          containers: mappedContainers,
          type: r.mode === 'NHAP' ? 'IMPORT' : 'EXPORT'
        });
      });
    }

    // Deduplicate? If we have both simulated and real, maybe prefer real?
    // For now, let's just show both but we might want to disable the simulated ones if we have real data.
    // However, the prompt implies "sync", so we assume the existing local "containers" are still valid for internal CS tracking,
    // but the Reports come from Inspectors.
    // The previous logic generated reports from containers marked as COMPLETED.
    // If the Inspector creates the report, it is the source of truth.
    // Maybe filtering out the "simulated" ones if we have real ones for the same vessel? 
    // Let's keep it simple and just append for now, grouping by date sort.

    return groups.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [containers, vessels, activeFilter, selectedVesselId, monthYearFilter, startDate, endDate, reports]);

  // Helper to map Group to Report
  const mapGroupToReport = (group: TallyReportGroup): TallyReport => {
    // If this group ID looks like a synced report ID (e.g., NHAP-v1-01), try to find it in the `reports` prop
    const exactReport = reports.find(r => r.id === group.id);
    if (exactReport) return exactReport;

    // Otherwise, construct a report from the group (Legacy CS)
    return {
      id: group.id,
      vesselId: group.vesselId,
      mode: group.type === 'IMPORT' ? 'NHAP' : 'XUAT',
      shift: group.shift as any,
      workDate: group.dateStr,
      owner: group.consignee,
      workerCount: 0,
      workerNames: '', // Legacy reports might not have this, or we can fetch from containers?
      mechanicalCount: 0,
      mechanicalNames: '',
      equipment: 'Xe nâng',
      vehicleNo: '',
      vehicleType: '',
      items: group.containers.map(c => ({
        contId: c.id,
        contNo: c.containerNo,
        commodityType: group.commodity,
        sealNo: c.sealNo,
        actualUnits: c.pkgs,
        actualWeight: c.weight,
        isScratchedFloor: false,
        tornUnits: 0,
        notes: c.remarks || '',
        photos: []
      })),
      createdAt: Date.now(),
      status: 'HOAN_TAT',
      vehicleCategory: 'CONTAINER'
    } as TallyReport;
  };

  const mapVesselToInspectorVessel = (v: Vessel): any => ({
    id: v.id,
    name: v.vesselName,
    voyage: v.voyageNo || '',
    eta: v.eta,
    etd: v.etd,
    customerName: v.consignee,
    totalConts: v.totalContainers,
    totalUnitsExpected: v.totalPkgs,
    totalWeightExpected: v.totalWeight
  });

  const handleExportPDF = (group: TallyReportGroup) => {
    const report = mapGroupToReport(group);
    let vessel = vessels.find(v => v.id === group.vesselId);

    // Map to Inspector Vessel Type
    let inspectorVessel = vessel ? mapVesselToInspectorVessel(vessel) : {
      id: group.vesselId,
      name: group.vesselName,
      voyage: '',
      eta: '',
      etd: '',
      customerName: group.consignee,
      totalConts: 0,
      totalUnitsExpected: 0,
      totalWeightExpected: 0
    };

    setCurrentPrintReport({ report, vessel: inspectorVessel });
    setIsExportingPDF(true);

    setTimeout(() => {
      const element = document.getElementById('new-tally-pdf-template');
      if (element) {
        const opt = {
          margin: 0,
          filename: `TallyReport_${group.vesselCode}_No${group.reportNo}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 3, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
          setIsExportingPDF(false);
          setCurrentPrintReport(null);
        });
      }
    }, 1000);
  };

  const handleExportAllPDF = () => {
    const allReportsData = reportGroups.map(group => {
      let vessel = vessels.find(v => v.id === group.vesselId);
      let inspectorVessel = vessel ? mapVesselToInspectorVessel(vessel) : {
        id: group.vesselId,
        name: group.vesselName,
        voyage: '',
        eta: '',
        etd: '',
        customerName: group.consignee,
        totalConts: 0,
        totalUnitsExpected: 0,
        totalWeightExpected: 0
      };

      return {
        report: mapGroupToReport(group),
        vessel: inspectorVessel
      };
    });

    setAllPrintReports(allReportsData);
    setIsExportingAll(true);

    setTimeout(() => {
      const element = document.getElementById('all-tally-pdf-template');
      if (element) {
        const vesselNamePrefix = reportGroups.length > 0 ? reportGroups[0].vesselCode : 'All';
        const opt = {
          margin: 0,
          filename: `TallyReport_ALL_${vesselNamePrefix}_${reportGroups.length}Reports.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 3, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
          setIsExportingAll(false);
          setAllPrintReports([]);
        });
      }
    }, 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left p-2 h-full flex flex-col relative">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">LỊCH SỬ PHIẾU TALLY</h3>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => { setActiveFilter('IMPORT'); setSelectedVesselId('ALL'); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${activeFilter === 'IMPORT' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Tally Nhập</button>
            <button onClick={() => { setActiveFilter('EXPORT'); setSelectedVesselId('ALL'); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${activeFilter === 'EXPORT' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400'}`}>Tally Xuất</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-50">
          <div className="md:col-span-12 flex flex-col xl:flex-row gap-3 items-center w-full">

            {/* Group 1: Vessel Info (Flex Grow) */}
            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto xl:flex-[2]">
              <div className="relative group flex-1 min-w-[130px]">
                <ICONS.Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
                <select
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
                  value={filterVesselName}
                  onChange={(e) => {
                    setFilterVesselName(e.target.value);
                    setFilterConsignee('');
                    setFilterSchedule('');
                    setSelectedVesselId('ALL');
                  }}
                >
                  <option value="">-- TÊN TÀU --</option>
                  {uniqueVesselNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="relative group flex-1 min-w-[130px]">
                <ICONS.Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
                <select
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
                  value={filterConsignee}
                  onChange={(e) => {
                    setFilterConsignee(e.target.value);
                    setFilterSchedule('');
                    setSelectedVesselId('ALL');
                  }}
                  disabled={!filterVesselName}
                >
                  <option value="">-- CHỦ HÀNG --</option>
                  {uniqueConsignees.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="relative group flex-1 min-w-[130px]">
                <ICONS.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
                <select
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
                  value={filterSchedule}
                  onChange={(e) => { setFilterSchedule(e.target.value); setSelectedVesselId('ALL'); }}
                  disabled={!filterConsignee}
                >
                  <option value="">-- LỊCH TÀU --</option>
                  {uniqueSchedules.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Group 2: Time Filters (Flex Grow or Fixed) */}
            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto xl:flex-1">
              {/* Month */}
              <div className="relative group flex-1 min-w-[100px]">
                <ICONS.Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
                <select
                  value={monthYearFilter}
                  onChange={(e) => setMonthYearFilter(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
                >
                  {monthYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex gap-2 flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-w-[80px] px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all shadow-sm uppercase"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-w-[80px] px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all shadow-sm uppercase"
                />
              </div>
            </div>

            {/* Group 3: Actions */}
            <div className="flex gap-2 shrink-0 w-full xl:w-auto">
              <button
                onClick={() => {
                  setSelectedVesselId('ALL'); setMonthYearFilter('ALL'); setStartDate(''); setEndDate('');
                  setFilterVesselName(''); setFilterConsignee(''); setFilterSchedule('');
                }}
                className="py-2.5 px-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                title="Reset"
              >
                <ICONS.RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleExportAllPDF}
                disabled={reportGroups.length === 0}
                className="py-2.5 px-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap flex-1"
              >
                <ICONS.FileText className="w-3.5 h-3.5" /> ZIP PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar no-print space-y-3">
        {reportGroups.length > 0 ? reportGroups.map((group) => (
          <div key={group.id} className={`bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all py-3 px-6 flex items-center gap-6 border-l-4 ${activeFilter === 'EXPORT' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${activeFilter === 'EXPORT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <ICONS.ClipboardList className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1 grid grid-cols-12 gap-2 items-center text-left">
              <div className="col-span-3">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">SỐ PHIẾU: {group.reportNo}</span>
                <h4 className="text-[12px] font-black text-slate-900 uppercase truncate">{group.vesselName}</h4>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">CHỦ HÀNG</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase truncate block">{group.consignee}</span>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">NGÀY / CA</span>
                <span className="text-[10px] font-black text-slate-800">{group.day}/{group.month}/{group.year} | CA {group.shift}</span>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">SẢN LƯỢNG</span>
                <span className="text-[10px] font-black text-slate-900">{group.containers.length} {activeFilter === 'EXPORT' ? 'Lượt xe' : 'Cont'}</span>
              </div>
            </div>
            <button onClick={() => handleExportPDF(group)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-all shrink-0">
              <ICONS.FileText className="w-3.5 h-3.5" /> XUẤT PDF
            </button>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-full py-32 opacity-20"><ICONS.ClipboardList className="w-16 h-16 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Không tìm thấy phiếu nào</p></div>
        )}
      </div>

      {/* Template Tally PDF (Ẩn) */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        {isExportingPDF && currentPrintReport && (
          <div id="new-tally-pdf-template">
            <TallyPrintTemplate report={currentPrintReport.report} vessel={currentPrintReport.vessel as any} />
          </div>
        )}

        {isExportingAll && allPrintReports.length > 0 && (
          <div id="all-tally-pdf-template">
            {allPrintReports.map((item, idx) => (
              <div key={idx} className="page-break">
                <TallyPrintTemplate report={item.report} vessel={item.vessel as any} />
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
        .font-serif-paper { font-family: 'Tinos', serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .page-break { page-break-after: always; }
        .page-break:last-child { page-break-after: avoid; }
      `}</style>
    </div>
  );
};

export default TallyReview;
