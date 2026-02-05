
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TallyReport, WorkOrder } from '../types';
import { MOCK_VESSELS, MOCK_WORKERS, MOCK_DRIVERS, MOCK_EXTERNAL_UNITS } from '../constants';
import TallyPrintTemplate from '../components/TallyPrintTemplate';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';
import { generatePDF } from '../../../utils/pdfUtils';


interface HistoryViewProps {
  reports: TallyReport[];
  workOrders: WorkOrder[];
  mode: 'TALLY' | 'WO';
  onEditTally?: (report: TallyReport) => void;
  onEditWO?: (wo: WorkOrder) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ reports, workOrders, mode, onEditTally, onEditWO }) => {
  const [woFilter, setWoFilter] = useState<'CONG_NHAN' | 'CO_GIOI' | 'CO_GIOI_NGOAI'>('CONG_NHAN');
  const [tallyTypeFilter, setTallyTypeFilter] = useState<'NHAP' | 'XUAT'>('NHAP');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NHAP' | 'HOAN_TAT'>('ALL');

  // Tally filters (Multi-select)
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const vesselDropdownRef = useRef<HTMLDivElement>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // WO filters (Multi-select)
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const [woMonth, setWoMonth] = useState('');
  const [woFromDate, setWoFromDate] = useState('');
  const [woToDate, setWoToDate] = useState('');

  // State for printing
  // State for printing
  // REMOVED PRINT STATE AS REQUESTED


  // Preview
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewReport, setPreviewReport] = useState<TallyReport | null>(null);
  const [previewWO, setPreviewWO] = useState<WorkOrder | null>(null);

  const owners = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => { if (r.owner) set.add(r.owner); });
    return Array.from(set);
  }, [reports]);

  // Extract unique organizations for dropdown from constant lists (CS)
  const availableOrgs = useMemo(() => {
    switch (woFilter) {
      case 'CONG_NHAN': return MOCK_WORKERS;
      case 'CO_GIOI': return MOCK_DRIVERS;
      case 'CO_GIOI_NGOAI': return MOCK_EXTERNAL_UNITS;
      default: return [];
    }
  }, [woFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (vesselDropdownRef.current && !vesselDropdownRef.current.contains(event.target as Node)) {
        setIsVesselDropdownOpen(false);
      }
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setIsOwnerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected orgs when filter type changes
  useEffect(() => {
    setSelectedOrgs([]);
  }, [woFilter]);

  const toggleOrgSelection = (org: string) => {
    if (selectedOrgs.includes(org)) {
      setSelectedOrgs(selectedOrgs.filter(o => o !== org));
    } else {
      setSelectedOrgs([...selectedOrgs, org]);
    }
  };

  const toggleVesselSelection = (id: string) => {
    if (selectedVesselIds.includes(id)) {
      setSelectedVesselIds(selectedVesselIds.filter(v => v !== id));
    } else {
      setSelectedVesselIds([...selectedVesselIds, id]);
    }
  };

  const toggleOwnerSelection = (owner: string) => {
    if (selectedOwners.includes(owner)) {
      setSelectedOwners(selectedOwners.filter(o => o !== owner));
    } else {
      setSelectedOwners([...selectedOwners, owner]);
    }
  };

  // Count stats for Tabs
  const statusCounts = useMemo(() => {
    return reports.reduce((acc, r) => {
      if (r.mode !== tallyTypeFilter) return acc;
      acc.ALL++;
      if (r.status === 'NHAP') acc.NHAP++;
      else if (r.status === 'HOAN_TAT') acc.HOAN_TAT++;
      return acc;
    }, { ALL: 0, NHAP: 0, HOAN_TAT: 0 });
  }, [reports, tallyTypeFilter]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (r.mode !== tallyTypeFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Check multi-select filters
      if (selectedVesselIds.length > 0 && !selectedVesselIds.includes(r.vesselId)) return false;
      if (selectedOwners.length > 0 && !selectedOwners.includes(r.owner)) return false;

      let matchDate = true;
      if (fromDate || toDate) {
        const reportDate = new Date(r.workDate).getTime();
        if (fromDate && reportDate < new Date(fromDate).getTime()) matchDate = false;
        if (toDate && reportDate > new Date(toDate).getTime()) matchDate = false;
      }
      return matchDate;
    });
  }, [reports, tallyTypeFilter, statusFilter, selectedVesselIds, selectedOwners, fromDate, toDate]);

  const filteredWOs = useMemo(() => {
    return workOrders.filter(wo => {
      if (wo.type !== woFilter) return false;

      // Filter by Organization/Worker Name (Multi-select)
      if (selectedOrgs.length > 0) {
        // Check if the Work Order's organization string CONTAINS any of the selected individual names
        const matches = selectedOrgs.some(selectedName =>
          wo.organization.toLowerCase().includes(selectedName.toLowerCase())
        );
        if (!matches) return false;
      }

      const relatedTally = reports.find(r => r.id === wo.reportId);
      if (!relatedTally) return false;
      let matchDate = true;
      const reportDateObj = new Date(relatedTally.workDate);
      const reportDateTs = reportDateObj.getTime();
      if (woMonth) {
        const monthYear = woMonth.split('-');
        const rYear = reportDateObj.getFullYear();
        const rMonth = reportDateObj.getMonth() + 1;
        if (parseInt(monthYear[0]) !== rYear || parseInt(monthYear[1]) !== rMonth) matchDate = false;
      }
      if (woFromDate && reportDateTs < new Date(woFromDate).getTime()) matchDate = false;
      if (woToDate && reportDateTs > new Date(woToDate).getTime()) matchDate = false;
      return matchDate;
    });
  }, [workOrders, woFilter, reports, selectedOrgs, woMonth, woFromDate, woToDate]);



  const handleOpenPreview = (e: React.MouseEvent, report: TallyReport) => {
    e.stopPropagation();
    setPreviewWO(null);
    setPreviewReport(report);
    setIsPreviewing(true);
  };

  const handleResumeEdit = (e: React.MouseEvent, report: TallyReport) => {
    e.stopPropagation();
    if (onEditTally) {
      onEditTally(report);
    }
  };

  const handleOpenWOPreview = (e: React.MouseEvent, wo: WorkOrder) => {
    e.stopPropagation();
    setPreviewReport(null);
    setPreviewWO(wo);
    setIsPreviewing(true);
  };

  const handleClosePreview = () => {
    setIsPreviewing(false);
    setPreviewReport(null);
    setPreviewWO(null);
  };

  // Set document title for PDF export filename
  useEffect(() => {
    if (isPreviewing && (previewReport || previewWO)) {
      const originalTitle = document.title;

      if (previewReport) {
        const cleanContNo = previewReport?.items?.[0]?.contNo.replace(/[/\\?%*:|"<>]/g, '-') || previewReport?.id;
        document.title = `Phieu_Tally_${cleanContNo}`;
      } else if (previewWO) {
        document.title = `Phieu_Cong_Tac_${previewWO?.id}`;
      }

      return () => {
        document.title = originalTitle;
      };
    }
  }, [isPreviewing, previewReport, previewWO]);


  const handleExcelExport = () => {
    const typeText = previewReport ? 'Phiếu Tally' : 'Phiếu Công Tác';
    // Mock functionality for Excel export
    alert(`Đang xuất file Excel cho ${typeText}... (Tính năng Demo)`);
  };

  // Helper to determine dot color for WOs
  const getDotColor = (type: string) => {
    switch (type) {
      case 'CONG_NHAN': return 'bg-green-500';
      case 'CO_GIOI': return 'bg-orange-500';
      case 'CO_GIOI_NGOAI': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NHAP': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'HOAN_TAT': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NHAP': return 'Phiếu nháp';
      case 'HOAN_TAT': return 'Hoàn tất';
      default: return status;
    }
  };



  return (
    <div className="space-y-4 animate-fade-in pb-20">


      {mode === 'TALLY' ? (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl print:hidden max-w-md mx-auto">
            <button onClick={() => setTallyTypeFilter('NHAP')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tallyTypeFilter === 'NHAP' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Tally Hàng Nhập</button>
            <button onClick={() => setTallyTypeFilter('XUAT')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tallyTypeFilter === 'XUAT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Tally Hàng Xuất</button>
          </div>

          <div className="print:hidden space-y-4">
            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setStatusFilter('ALL')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${statusFilter === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-gray-500 border-gray-100'}`}>
                Tất cả ({statusCounts.ALL})
              </button>
              <button onClick={() => setStatusFilter('NHAP')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${statusFilter === 'NHAP' ? 'bg-gray-600 text-white border-gray-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>
                Phiếu nháp ({statusCounts.NHAP})
              </button>
              <button onClick={() => setStatusFilter('HOAN_TAT')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${statusFilter === 'HOAN_TAT' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' : 'bg-white text-gray-500 border-gray-100'}`}>
                Hoàn tất ({statusCounts.HOAN_TAT})
              </button>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50 space-y-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bộ lọc nâng cao</span>
                </div>

              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative" ref={vesselDropdownRef}>
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Tên Tàu</label>
                  <div
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer"
                    onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)}
                  >
                    <span className="text-[11px] font-bold text-gray-800 truncate">
                      {selectedVesselIds.length > 0 ? `${selectedVesselIds.length} đã chọn` : 'Tất cả tàu'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isVesselDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {isVesselDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                      {MOCK_VESSELS.map(v => (
                        <div
                          key={v.id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"
                          onClick={() => toggleVesselSelection(v.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedVesselIds.includes(v.id)}
                            readOnly
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-bold text-gray-700 truncate">{v.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={ownerDropdownRef}>
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Khách hàng</label>
                  <div
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer"
                    onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
                  >
                    <span className="text-[11px] font-bold text-gray-800 truncate">
                      {selectedOwners.length > 0 ? `${selectedOwners.length} đã chọn` : 'Tất cả khách'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isOwnerDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {isOwnerDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                      {owners.map(o => (
                        <div
                          key={o}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"
                          onClick={() => toggleOwnerSelection(o)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOwners.includes(o)}
                            readOnly
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-bold text-gray-700 truncate">{o}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Từ ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Đến ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
              </div>
            </div>
          </div>

          <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div key={report.id} className={`bg-white rounded-3xl p-5 shadow-sm border space-y-3 relative overflow-hidden transition-all hover:shadow-md ${report.status === 'NHAP' ? 'border-dashed border-gray-300 bg-gray-50/50' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-blue-900 text-sm uppercase">{MOCK_VESSELS.find(v => v.id === report.vesselId)?.name || 'TÀU S30'}</h4>
                      <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase">
                        Số: {report.id ? report.id.split('-').pop() : '01'}
                      </span>
                    </div>
                    <h5 className="font-bold text-gray-800 text-sm leading-tight">{report.owner}</h5>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${getStatusBadge(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </div>

                    {report.status === 'NHAP' ? (
                      <button onClick={(e) => handleResumeEdit(e, report)} className="flex items-center gap-1 pl-3 pr-4 py-2 bg-gray-800 text-white rounded-xl shadow-md active:scale-90 transition-all hover:bg-black">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span className="text-[10px] font-black uppercase">Tiếp tục nhập</span>
                      </button>
                    ) : (
                      <button onClick={(e) => handleOpenPreview(e, report)} className="p-2 bg-blue-600 text-white rounded-xl shadow-md active:scale-90 transition-all hover:bg-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100/50">
                  <div className="flex flex-col"><span className="text-[9px] font-bold text-gray-400 uppercase">Ca làm việc</span><span className="text-xs font-black text-gray-700">CA {report.shift}</span></div>
                  <div className="flex flex-col text-right"><span className="text-[9px] font-bold text-gray-400 uppercase">Ngày thực hiện</span><span className="text-xs font-black text-gray-700">{report.workDate}</span></div>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="col-span-full py-10 text-center text-gray-400 font-bold text-sm">
                Không tìm thấy dữ liệu phù hợp.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl print:hidden max-w-lg mx-auto overflow-x-auto">
            <button onClick={() => setWoFilter('CONG_NHAN')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase rounded-xl whitespace-nowrap transition-all ${woFilter === 'CONG_NHAN' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Công nhân</button>
            <button onClick={() => setWoFilter('CO_GIOI')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase rounded-xl whitespace-nowrap transition-all ${woFilter === 'CO_GIOI' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Cơ giới</button>
            <button onClick={() => setWoFilter('CO_GIOI_NGOAI')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase rounded-xl whitespace-nowrap transition-all ${woFilter === 'CO_GIOI_NGOAI' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>Cơ giới ngoài</button>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4 print:hidden">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bộ lọc phiếu công tác</span>
              </div>

            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative" ref={orgDropdownRef}>
                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">{woFilter === 'CO_GIOI_NGOAI' ? 'Tên đơn vị' : 'Tên tổ / CN'}</label>
                <div
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer"
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                >
                  <span className="text-[11px] font-bold text-gray-800 truncate">
                    {selectedOrgs.length > 0 ? `${selectedOrgs.length} đã chọn` : 'Tất cả'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>

                {isOrgDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                    {availableOrgs.map(org => (
                      <div
                        key={org}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"
                        onClick={() => toggleOrgSelection(org)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrgs.includes(org)}
                          readOnly
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-bold text-gray-700 truncate">{org}</span>
                      </div>
                    ))}
                    {availableOrgs.length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-gray-400 italic text-center">Không có dữ liệu</div>
                    )}
                  </div>
                )}
              </div>

              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Chọn Tháng</label><input type="month" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woMonth} onChange={e => setWoMonth(e.target.value)} /></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Từ ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woFromDate} onChange={e => setWoFromDate(e.target.value)} /></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Đến ngày</label><input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none" value={woToDate} onChange={e => setWoToDate(e.target.value)} /></div>
            </div>
          </div>

          <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWOs.map((wo) => {
              const relatedTally = reports.find(r => r.id === wo.reportId);
              return (
                <div key={wo.id} className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-green-100">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getDotColor(wo.type)}`}></span>
                      <span className="text-[10px] font-black text-gray-400 uppercase">{MOCK_VESSELS.find(v => v.id === relatedTally?.vesselId)?.name || 'N/A'}</span>
                    </div>
                    <button onClick={(e) => handleOpenWOPreview(e, wo)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full shadow-sm active:scale-90 transition-all hover:bg-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổ / Người thực hiện</p>
                    <p className="text-sm font-bold text-gray-800 line-clamp-2">{wo.organization}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[8.5px] font-black text-gray-400 uppercase block tracking-widest">Ca làm</span>
                      <span className="text-[13px] font-black text-gray-900 uppercase">CA {relatedTally?.shift || '---'}</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[8.5px] font-black text-gray-400 uppercase block tracking-widest">Ngày làm</span>
                      <span className="text-[13px] font-black text-gray-900">{relatedTally?.workDate || '---'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Hidden printing sections - Visible during export for html2canvas */}


      {/* Preview Modal */}
      {isPreviewing && (previewReport || previewWO) && (
        <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto print:hidden">
          <div className="sticky top-0 p-4 bg-gray-800 text-white flex justify-between items-center shadow-lg z-50">
            <button onClick={handleClosePreview} className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight hover:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              QUAY LẠI
            </button>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {previewReport ? 'Xem trước Phiếu Tally' : 'Xem trước Phiếu Công tác'}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!printRef.current) return;

                  const filename = previewReport
                    ? `Phieu_Tally_${previewReport?.items?.[0]?.contNo.replace(/[/\\?%*:|"<>\s]/g, '-') || previewReport?.id}`
                    : `Phieu_Cong_Tac_${previewWO?.id}`;

                  const orientation = previewWO ? 'landscape' : 'portrait';
                  const margin = 0;

                  await generatePDF(printRef.current, { filename, orientation, margin });
                }}
                className="bg-emerald-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2"
                title="Tải file PDF về máy"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                TẢI FILE PDF
              </button>
            </div>
          </div>
          <div className="p-4 flex justify-center bg-gray-700 min-h-screen">
            <div ref={printRef} className="w-fit">
              {previewReport ? (
                <TallyPrintTemplate report={previewReport} vessel={MOCK_VESSELS.find(v => v.id === previewReport.vesselId) || MOCK_VESSELS[0]} isPreview={true} />
              ) : (
                reports.find(r => r.id === previewWO?.reportId) && <WorkOrderPrintTemplate wo={previewWO!} report={reports.find(r => r.id === previewWO?.reportId)!} isPreview={true} />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
