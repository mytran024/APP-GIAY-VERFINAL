
import React, { useState, useMemo, useEffect } from 'react';
import { Container, Vessel, UnitType, BusinessType, ContainerStatus, DetentionConfig, UserRole } from '../types';
import { StatusBadge } from './VesselImport';
import { ICONS } from '../constants';
import { checkDetentionStatus, displayDate } from '../services/dataService';
import JSZip from 'jszip';

interface OperationsProps {
  containers: Container[];
  onUpdateContainers: (c: Container[]) => void;
  vessels: Vessel[];
  businessType: BusinessType;
  onSwitchBusinessType: (type: BusinessType) => void;
  detentionConfig?: DetentionConfig;
  userRole?: UserRole; // Add optional prop
}

const Operations: React.FC<OperationsProps> = ({
  containers,
  onUpdateContainers,
  vessels,
  businessType,
  onSwitchBusinessType,
  detentionConfig: initialDetentionConfig = { urgentDays: 2, warningDays: 5 },
  userRole = UserRole.CS // Default to CS (view-only for customs fields)
}) => {
  // Permission Check: ONLY CUSTOMS can edit declaration fields
  const canEditCustoms = userRole === UserRole.CUSTOMS;
  // console.log('User Role:', userRole, 'Can Edit Customs:', canEditCustoms);

  const isExport = businessType === BusinessType.EXPORT;
  const [showWarningPanel, setShowWarningPanel] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [viewingContainer, setViewingContainer] = useState<Container | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const [detConfig, setDetConfig] = useState<DetentionConfig>(initialDetentionConfig);

  // Trạng thái lọc gộp
  const [selVesselId, setSelVesselId] = useState<string>('ALL');
  const [selUnitType, setSelUnitType] = useState<string>('ALL');

  // 3-Column Filter State
  const [filterVesselName, setFilterVesselName] = useState<string>('');
  const [filterConsignee, setFilterConsignee] = useState<string>('');
  const [filterSchedule, setFilterSchedule] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL'); // NEW: Filter state
  const [searchQuery, setSearchQuery] = useState<string>(''); // NEW: Search state

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
        setSelVesselId(match.id);
      } else {
        setSelVesselId('ALL');
      }
    }
  }, [filterVesselName, filterConsignee, filterSchedule, vessels]);

  useEffect(() => {
    setSelVesselId('ALL'); setSelUnitType('ALL');
    setFilterVesselName(''); setFilterConsignee(''); setFilterSchedule('');
  }, [businessType]);

  // Handle inline field updates
  const handleUpdateField = (id: string, field: keyof Container, value: any) => {
    const updated = containers.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    onUpdateContainers(updated);
  };

  // Handle Batch Fill Logic
  const handleBatchFill = (source: Container) => {
    if (!source.tkNhaVC) return;

    const count = containers.filter(c => c.tkNhaVC === source.tkNhaVC).length;
    // if (!confirm(`Bạn có chắc muốn áp dụng thông tin tờ khai này cho ${count} container có cùng mã TK Nhà VC: ${source.tkNhaVC}?`)) return;

    const updated = containers.map(c => {
      if (c.tkNhaVC === source.tkNhaVC) {
        return {
          ...c,
          ngayTkNhaVC: source.ngayTkNhaVC,
          tkDnlOla: source.tkDnlOla,
          ngayTkDnl: source.ngayTkDnl
        };
      }
      return c;
    });
    onUpdateContainers(updated);
    // Optional: Toast notification here
  };

  const handleUrge = (id: string) => {
    if (isExport) return;
    const updated = containers.map(c =>
      c.id === id ? { ...c, lastUrgedAt: new Date().toISOString() } : c
    );
    onUpdateContainers(updated);
  };

  // LOGIC LAN TRUYỀN CẢNH BÁO THEO TỜ KHAI
  const mismatchedDeclarations = useMemo(() => {
    if (isExport) return new Set<string>();
    const dIds = new Set<string>();
    containers.forEach(c => {
      const isMismatch = (c.customsPkgs !== undefined && c.customsPkgs !== c.pkgs) ||
        (c.customsWeight !== undefined && c.customsWeight !== c.weight);
      if (isMismatch && c.tkNhaVC) dIds.add(c.tkNhaVC);
    });
    return dIds;
  }, [containers, isExport]);

  const filtered = useMemo(() => {
    let data = containers.filter(c => {
      if (isExport) return c.unitType === UnitType.VEHICLE && c.status === ContainerStatus.COMPLETED;
      return vessels.some(v => v.id === c.vesselId);
    });

    if (selVesselId !== 'ALL') data = data.filter(c => c.vesselId === selVesselId);

    if (selUnitType !== 'ALL') {
      if (selUnitType === 'XE') data = data.filter(c => c.unitType === UnitType.VEHICLE || c.size.includes('XE'));
      else data = data.filter(c => c.size.includes(selUnitType));
    }

    return [...data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [containers, isExport, selVesselId, selUnitType, vessels]);

  const warnings = useMemo(() => {
    const mismatches = filtered.filter(c =>
      !isExport && c.tkNhaVC && mismatchedDeclarations.has(c.tkNhaVC)
    );
    const pendingTk = filtered.filter(c => !isExport && !c.tkDnlOla && c.status !== ContainerStatus.COMPLETED);
    return { mismatches, pendingTk };
  }, [filtered, isExport, mismatchedDeclarations]);

  const handleOpenGallery = (c: Container) => {
    if (c.images && c.images.length > 0) {
      setViewingContainer(c);
      setActiveImageIdx(0);
    } else {
      alert("Chưa có ảnh báo cáo cho mục này!");
    }
  };

  const handleDownloadSingle = async () => {
    if (!viewingContainer || !viewingContainer.images) return;
    setIsDownloading(true);
    const url = viewingContainer.images[activeImageIdx];
    const filename = `${viewingContainer.containerNo}_HinhAnh_${activeImageIdx + 1}.jpg`;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Lỗi tải ảnh!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!viewingContainer || !viewingContainer.images) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(viewingContainer.containerNo);
      for (let i = 0; i < viewingContainer.images.length; i++) {
        const response = await fetch(viewingContainer.images[i]);
        const blob = await response.blob();
        folder?.file(`${viewingContainer.containerNo}_${i + 1}.jpg`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `HoSo_${viewingContainer.containerNo}.zip`;
      link.click();
    } catch (e) {
      alert("Lỗi nén ZIP!");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left h-full flex flex-col relative">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 no-print shrink-0">
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm px-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">DANH MỤC:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => onSwitchBusinessType(BusinessType.IMPORT)} className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider ${!isExport ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-400'}`}>Hàng Nhập</button>
              <button onClick={() => onSwitchBusinessType(BusinessType.EXPORT)} className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider ${isExport ? 'bg-white shadow-sm text-emerald-600 border border-slate-100' : 'text-slate-400'}`}>Hàng Xuất</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isExport && (
              <>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                >
                  <ICONS.Settings className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cấu hình DET</span>
                </button>
                <button
                  onClick={() => setShowWarningPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all shadow-sm"
                >
                  <ICONS.AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">CẢNH BÁO ({warnings.mismatches.length + warnings.pendingTk.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bộ lọc 3 cột */}
        {/* Header Title */}
        <div className="flex items-center gap-3 no-print ml-1">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">QUẢN LÝ TÁC NGHIỆP</h3>
        </div>

        {/* Smart Filter Bar - Single Row */}
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
                setSelVesselId('ALL');
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
                setSelVesselId('ALL');
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
              onChange={(e) => { setFilterSchedule(e.target.value); setSelVesselId('ALL'); }}
              disabled={!filterConsignee}
            >
              <option value="">-- LỊCH TÀU --</option>
              {uniqueSchedules.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 4. Unit Type */}
          <div className="relative group flex-1 w-full md:w-auto min-w-[120px]">
            <ICONS.Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
            <select
              value={selUnitType}
              onChange={(e) => setSelUnitType(e.target.value)}
              className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase truncate"
            >
              <option value="ALL">-- LOẠI XE --</option>
              <option value="40">CONT 40'</option>
              <option value="20">CONT 20'</option>
              <option value="XE">XE THỚT</option>
            </select>
          </div>

          {/* 5. Reset Button */}
          <button
            onClick={() => {
              setSelVesselId('ALL');
              setSelUnitType('ALL');
              setFilterVesselName('');
              setFilterConsignee('');
              setFilterSchedule('');
              setFilterStatus('ALL'); // NEW: Reset filter status
              setSearchQuery(''); // NEW: Reset search query
            }}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap min-w-fit"
          >
            <ICONS.RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">LÀM MỚI</span>
          </button>
        </div>
      </div>

      {/* Danh sách Container - Table View (Excel Style) */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-8 py-4 border-b bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {isExport ? 'NHẬT KÝ XE ĐÃ XUẤT' : 'CHI TIẾT TÁC NGHIỆP DỮ LIỆU TÀU NHẬP'}
          </h3>

          {/* NEW: Filter Controls */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterStatus === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              TẤT CẢ
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterStatus === 'PENDING' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              CHƯA KHAI THÁC
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterStatus === 'COMPLETED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ĐÃ KHAI THÁC
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="min-w-max text-left border-collapse border border-slate-300">
            <thead className="bg-slate-100 z-40 sticky top-0 shadow-sm">
              <tr className="text-slate-700">
                <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 w-10 sticky left-0 z-50">STT</th>
                {!isExport ? (
                  <>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">KẾ HOẠCH</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 sticky left-10 z-50 drop-shadow-sm">SỐ CONT</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">SỐ SEAL</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">SỐ TK NHÀ VC</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">NGÀY TK NHÀ VC</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">SỐ TK DNL</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">NGÀY TK DNL</th>

                    {/* NEW COLUMNS */}
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-green-100 text-green-800">NGÀY NHẬP KHO</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-green-100 text-green-800 w-10">CA</th>
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-green-100 text-green-800">KIỂM VIÊN</th>

                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 w-12">SỐ KIỆN</th>
                    {/* <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">KIỆN (HQ)</th> */}
                    <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 w-12">SỐ TẤN</th>
                    {/* <th className="px-2 py-1.5 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">TẤN (HQ)</th> */}
                    <th className="px-2 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">VENDOR</th>
                    <th className="px-2 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">HẠN DET</th>
                    <th className="px-2 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200">NƠI HẠ RỖNG</th>
                    <th className="px-2 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 sticky right-[80px] z-50 drop-shadow-sm">TRẠNG THÁI</th>
                    <th className="px-2 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap text-center bg-slate-200 sticky right-0 z-50">THAO TÁC</th>
                  </>
                ) : (
                  // EXPORT COLUMNS (Simple Table)
                  <>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100 sticky left-0 z-50" style={{ backgroundColor: '#f1f5f9' }}>STT</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100 sticky left-[40px] z-50 drop-shadow-sm" style={{ backgroundColor: '#f1f5f9' }}>Số Cont</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100">Loại</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100">Tàu</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100">Chủ Hàng</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100">Seal</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100">Cập Nhật</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100 text-center">Số Kiện</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100 text-center">Số Tấn</th>
                    <th className="px-3 py-2 border border-slate-300 font-bold uppercase text-[10px] whitespace-nowrap bg-slate-100 text-right sticky right-0 z-50 shadow-sm">Thao Tác</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.filter(c => {
                // Status Filters
                if (filterStatus === 'PENDING') {
                  const isNotDone = c.status === ContainerStatus.PENDING ||
                    c.status === ContainerStatus.MISMATCH ||
                    c.status === ContainerStatus.URGENT ||
                    c.status === ContainerStatus.ISSUE ||
                    !c.tkNhaVC; // Treat missing declaration as pending
                  if (!isNotDone) return false;
                }
                if (filterStatus === 'COMPLETED') {
                  if (c.status !== ContainerStatus.COMPLETED) return false;
                }
                return true; // If no status filter applies, or it passes the filter
              }).map((c, index) => {
                const v = vessels.find(vis => vis.id === c.vesselId);
                const isCompleted = c.status === ContainerStatus.COMPLETED;
                const detStatus = (!isExport && c.detExpiry) ? checkDetentionStatus(c.detExpiry, detConfig) : 'safe';
                const isDataMismatch = !isExport && c.tkNhaVC && mismatchedDeclarations.has(c.tkNhaVC);

                // Row Highlighting Logic
                let rowBg = 'bg-white';
                if (!isExport) {
                  if (isDataMismatch) rowBg = 'bg-indigo-50';
                  else if (detStatus === 'urgent' && !isCompleted) rowBg = 'bg-red-50';
                  else if (detStatus === 'warning' && !isCompleted) rowBg = 'bg-amber-50';
                }

                return (
                  <tr key={c.id} className={`${rowBg} hover:bg-slate-100 transition-colors group`}>
                    <td className="px-2 py-1.5 border border-slate-300 text-center text-[11px] font-medium text-slate-500 sticky left-0 z-10" style={{ backgroundColor: 'inherit' }}>{index + 1}</td>

                    {!isExport ? (
                      <>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-700 whitespace-nowrap">{displayDate(c.ngayKeHoach)}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-bold text-slate-800 whitespace-nowrap sticky left-10 z-10 drop-shadow-sm" style={{ backgroundColor: 'inherit' }}>{c.containerNo}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-600 whitespace-nowrap">{c.sealNo || ''}</td>

                        {/* EDITABLE: TK Nha VC (Conditional) */}
                        <td className={`px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-700 whitespace-nowrap ${canEditCustoms ? 'bg-blue-50/30 p-0 relative group/cell' : ''}`}>
                          {canEditCustoms ? (
                            <>
                              <input
                                type="text"
                                className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-white text-blue-700 font-bold px-1"
                                value={c.tkNhaVC || ''}
                                onChange={(e) => handleUpdateField(c.id, 'tkNhaVC', e.target.value)}
                                placeholder="..."
                              />
                              {/* Copy Button Trigger */}
                              {c.tkNhaVC && (
                                <button
                                  onClick={() => handleBatchFill(c)}
                                  title="Copy thông tin này cho các cont cùng tờ khai"
                                  className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 bg-blue-600 text-white p-0.5 rounded shadow-sm z-20 hover:scale-110 transition-all"
                                >
                                  <ICONS.Copy className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span>{c.tkNhaVC || ''}</span>
                          )}
                        </td>

                        {/* EDITABLE: Ngay TK Nha VC (Conditional) */}
                        <td className={`px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-600 whitespace-nowrap ${canEditCustoms ? 'p-0' : ''}`}>
                          {canEditCustoms ? (
                            <input
                              type="date"
                              className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-white px-1 font-medium text-slate-700"
                              value={c.ngayTkNhaVC || ''}
                              onChange={(e) => handleUpdateField(c.id, 'ngayTkNhaVC', e.target.value)}
                            />
                          ) : (
                            <span>{displayDate(c.ngayTkNhaVC)}</span>
                          )}
                        </td>

                        {/* EDITABLE: TK DNL (Conditional) */}
                        <td className={`px-2 py-1.5 border border-slate-300 text-[11px] text-center font-bold whitespace-nowrap ${canEditCustoms ? 'p-0' : ''} ${c.tkDnlOla ? 'text-blue-600' : 'text-slate-300'}`}>
                          {canEditCustoms ? (
                            <input
                              type="text"
                              className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-white px-1 text-blue-600 font-bold placeholder:font-normal"
                              value={c.tkDnlOla || ''}
                              onChange={(e) => handleUpdateField(c.id, 'tkDnlOla', e.target.value)}
                              placeholder="..."
                            />
                          ) : (
                            <span>{c.tkDnlOla || ''}</span>
                          )}
                        </td>

                        {/* EDITABLE: Ngay TK DNL (Conditional) */}
                        <td className={`px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-600 whitespace-nowrap ${canEditCustoms ? 'p-0' : ''}`}>
                          {canEditCustoms ? (
                            <input
                              type="date"
                              className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-white px-1 font-medium text-slate-700"
                              value={c.ngayTkDnl || ''}
                              onChange={(e) => handleUpdateField(c.id, 'ngayTkDnl', e.target.value)}
                            />
                          ) : (
                            <span>{displayDate(c.ngayTkDnl)}</span>
                          )}
                        </td>

                        {/* NEW DATA COLUMNS */}
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-800 whitespace-nowrap">{displayDate(c.ngayNhapKho)}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-800 whitespace-nowrap">{c.shift || ''}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-800 whitespace-nowrap uppercase">{c.inspector || ''}</td>

                        <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-[11px] text-slate-700">{c.pkgs}</td>
                        {/* <td className="px-2 py-1.5 border border-slate-300 text-center text-[11px] text-slate-500">{c.customsPkgs || '-'}</td> */}
                        <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-[11px] text-slate-700">{c.weight}</td>
                        {/* <td className="px-2 py-1.5 border border-slate-300 text-center text-[11px] text-slate-500">{c.customsWeight || '-'}</td> */}
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-600 whitespace-nowrap max-w-[100px] truncate" title={c.vendor}>{c.vendor || ''}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-center">
                          {c.detExpiry ? (
                            <span className={`text-[10px] font-bold ${detStatus === 'urgent' && !isCompleted ? 'text-red-600' : (detStatus === 'warning' && !isCompleted ? 'text-amber-600' : 'text-slate-600')}`}>
                              {displayDate(c.detExpiry)}
                            </span>
                          ) : ''}
                        </td>
                        <td className="px-2 py-1.5 border border-slate-300 text-[11px] text-center font-medium text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={c.noiHaRong}>{c.noiHaRong || ''}</td>
                        <td className="px-2 py-1.5 border border-slate-300 text-center sticky right-[80px] z-20 shadow-sm" style={{ backgroundColor: 'inherit' }}>
                          <div className="flex justify-center scale-90 origin-center">
                            <StatusBadge status={isDataMismatch ? ContainerStatus.MISMATCH : c.status} />
                          </div>
                        </td>
                        <td className="px-2 py-1.5 border border-slate-300 text-center sticky right-0 z-20" style={{ backgroundColor: 'inherit' }}>
                          {!isCompleted && (
                            <button
                              onClick={() => handleUrge(c.id)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all shadow-sm border ${c.lastUrgedAt ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-500'}`}
                            >
                              {c.lastUrgedAt ? 'Đã giục' : 'Đôn đốc'}
                            </button>
                          )}
                          {isCompleted && (
                            <button onClick={() => handleOpenGallery(c)} className="text-blue-600 hover:text-blue-800 p-1">
                              <ICONS.FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 border border-slate-300 text-center text-[11px] font-medium text-slate-500 sticky left-0 z-10" style={{ backgroundColor: 'inherit' }}>{index + 1}</td>
                        <td className="px-3 py-2 border border-slate-300 font-bold text-slate-800 text-[11px] whitespace-nowrap sticky left-[40px] z-10" style={{ backgroundColor: 'inherit' }}>{c.containerNo}</td>
                        <td className="px-3 py-2 border border-slate-300 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{c.unitType === UnitType.VEHICLE ? 'XE THỚT' : c.size}</td>
                        <td className="px-3 py-2 border border-slate-300 text-[10px] font-medium text-slate-600 truncate max-w-[120px] whitespace-nowrap">{v?.vesselName || 'TÀU LẺ'}</td>
                        <td className="px-3 py-2 border border-slate-300 text-[10px] font-medium text-slate-600 truncate max-w-[120px] whitespace-nowrap">{v?.consignee}</td>
                        <td className="px-3 py-2 border border-slate-300 text-[10px] font-bold text-blue-600 truncate whitespace-nowrap">{c.sealNo || 'CHỜ SEAL'}</td>
                        <td className="px-3 py-2 border border-slate-300 text-[10px] font-medium text-slate-400 whitespace-nowrap">{c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                        <td className="px-3 py-2 border border-slate-300 text-center text-[11px] font-bold text-slate-700 whitespace-nowrap">{c.pkgs}</td>
                        <td className="px-3 py-2 border border-slate-300 text-center text-[11px] font-bold text-slate-700 whitespace-nowrap">{c.weight}</td>
                        <td className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap sticky right-0 z-20 shadow-sm" style={{ backgroundColor: 'inherit' }}>
                          <button onClick={() => handleOpenGallery(c)} className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                            XEM ẢNH
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isExport ? 9 : 19} className="py-20 text-center border border-slate-300">
                    <div className="flex flex-col items-center justify-center opacity-20">
                      <ICONS.Package className="w-16 h-16 mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">Không có dữ liệu phù hợp</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CẤU HÌNH DET */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-200">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Cấu hình nhắc DET</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Ngưỡng khẩn cấp (Ngày)</label>
                <input
                  type="number"
                  value={detConfig.urgentDays}
                  onChange={e => setDetConfig({ ...detConfig, urgentDays: parseInt(e.target.value) || 0 })}
                  className="w-full bg-red-50 border-2 border-red-100 rounded-2xl p-4 font-black text-red-600 outline-none text-center"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Ngưỡng cảnh báo (Ngày)</label>
                <input
                  type="number"
                  value={detConfig.warningDays}
                  onChange={e => setDetConfig({ ...detConfig, warningDays: parseInt(e.target.value) || 0 })}
                  className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 font-black text-amber-600 outline-none text-center"
                />
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
              >
                XÁC NHẬN CẬP NHẬT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM ẢNH KHAI THÁC */}
      {
        viewingContainer && viewingContainer.images && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-fadeIn">
            <button onClick={() => setViewingContainer(null)} className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center gap-6">
              <div className="relative w-full h-full bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex items-center justify-center">
                <img src={viewingContainer.images[activeImageIdx]} className="max-w-full max-h-full object-contain" alt="Báo cáo khai thác" />

                {viewingContainer.images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImageIdx(p => (p === 0 ? (viewingContainer.images?.length || 1) - 1 : p - 1))} className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>
                    <button onClick={() => setActiveImageIdx(p => (p === (viewingContainer.images?.length || 1) - 1 ? 0 : p + 1))} className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg></button>
                  </>
                )}

                <div className="absolute top-6 left-6 flex gap-3">
                  <button
                    onClick={handleDownloadSingle}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-xl disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    )}
                    TẢI ẢNH NÀY
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-2xl backdrop-blur-md transition-all font-black text-[10px] uppercase tracking-widest border border-blue-400/30 shadow-xl disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                    )}
                    TẢI TOÀN BỘ HỒ SƠ (ZIP)
                  </button>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto p-2">
                {viewingContainer.images.map((img, idx) => (
                  <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-20 h-20 rounded-2xl overflow-hidden border-4 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.3em]">Báo cáo hình ảnh khai thác - Ảnh {activeImageIdx + 1}/{viewingContainer.images.length}</p>
            </div>
          </div>
        )
      }

      {
        showWarningPanel && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-200">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center"><ICONS.AlertTriangle className="w-6 h-6" /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cảnh báo dữ liệu hàng nhập</h2>
                </div>
                <button onClick={() => setShowWarningPanel(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2"><h3 className="text-sm font-black text-indigo-700 uppercase tracking-widest">1. SAI LỆCH SỐ LIỆU TỜ KHAI ({warnings.mismatches.length})</h3></div>
                  {warnings.mismatches.map(c => (
                    <div key={c.id} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex justify-between items-center group hover:bg-indigo-100/50 transition-all">
                      <div><p className="font-black text-slate-800 text-sm uppercase">{c.containerNo}</p><p className="text-[9px] font-bold text-indigo-600 uppercase mt-1">Lô: {c.tkNhaVC}</p></div>
                      <div className="flex gap-2">
                        <StatusBadge status={ContainerStatus.MISMATCH} />
                        <button onClick={() => handleUrge(c.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${c.lastUrgedAt ? 'bg-emerald-600 text-white' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                          {c.lastUrgedAt ? 'ĐÃ NHẮC' : 'ĐÔN ĐỐC'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2"><h3 className="text-sm font-black text-amber-700 uppercase tracking-widest">2. CHƯA CÓ TỜ KHAI DNL ({warnings.pendingTk.length})</h3></div>
                  {warnings.pendingTk.map(c => (
                    <div key={c.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex justify-between items-center group hover:bg-amber-100/50 transition-all">
                      <div><p className="font-black text-slate-800 text-sm uppercase">{c.containerNo}</p><p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Chủ hàng: {vessels.find(v => v.id === c.vesselId)?.consignee}</p></div>
                      <button onClick={() => handleUrge(c.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${c.lastUrgedAt ? 'bg-emerald-600 text-white' : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white'}`}>
                        {c.lastUrgedAt ? 'ĐÃ NHẮC' : 'ĐÔN ĐỐC'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div >
  );
};

export default Operations;
