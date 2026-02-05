
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vessel, Container, ContainerStatus, BusinessType, TransportVehicle, UnitType, ServicePrice, Consignee } from '../types';
import { ICONS } from '../constants';
import { displayDate, processImportData, checkDetentionStatus } from '../services/dataService';
import { StorageService } from '../../../services/storage';
import { db } from '../../../services/db'; // Import DB
import { Role } from '../../../types';
import * as XLSX from 'xlsx';
import { User, Calendar, Trash, Edit, Plus, ChevronDown } from 'lucide-react';

export const StatusBadge: React.FC<{ status: ContainerStatus }> = ({ status }) => {
  const isCompleted = status === ContainerStatus.COMPLETED;
  const isIssue = status === ContainerStatus.ISSUE;
  const isMismatch = status === ContainerStatus.MISMATCH;

  if (isMismatch) {
    return (
      <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
        SAI LỆCH TK
      </span>
    );
  }

  if (isIssue) {
    return (
      <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight bg-amber-100 text-amber-600 border border-amber-100 whitespace-nowrap">
        CÓ VẤN ĐỀ
      </span>
    );
  }

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight border whitespace-nowrap ${isCompleted
      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
      : "bg-slate-50 text-slate-400 border-slate-100"
      }`}>
      {isCompleted ? "ĐÃ KHAI THÁC" : "CHƯA KHAI THÁC"}
    </span>
  );
};

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
}

const IMPORT_COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'STT', width: 40 },
  { id: 'ngayKeHoach', label: 'KẾ HOẠCH', width: 90 },
  { id: 'containerNo', label: 'SỐ CONT', width: 100 },
  { id: 'sealNo', label: 'SỐ SEAL', width: 100 },
  { id: 'tkNhaVC', label: 'TK NHÀ VC', width: 110 },
  { id: 'ngayTkNhaVC', label: 'NGÀY TK VC', width: 90 },
  { id: 'tkDnlOla', label: 'TỜ KHAI DNL', width: 110 },
  { id: 'ngayTkDnl', label: 'NGÀY TK DNL', width: 90 },
  { id: 'pkgs', label: 'SỐ KIỆN', width: 60 },
  { id: 'customsPkgs', label: 'KIỆN (HQ)', width: 60 },
  { id: 'weight', label: 'SỐ TẤN', width: 60 },
  { id: 'customsWeight', label: 'TẤN (HQ)', width: 60 },
  { id: 'vendor', label: 'VENDOR', width: 80 },
  { id: 'detExpiry', label: 'HẠN DET', width: 90 },
  { id: 'noiHaRong', label: 'NƠI HẠ RỖNG', width: 120 },
  { id: 'status', label: 'TRẠNG THÁI', width: 130 },
  { id: 'actions', label: 'THAO TÁC', width: 80 },
];

const EXPORT_COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'STT', width: 40 },
  { id: 'truckNo', label: 'SỐ XE', width: 100 },
  { id: 'truckReg', label: 'ĐĂNG KIỂM', width: 85 },
  { id: 'romocNo', label: 'SỐ MOOC', width: 100 },
  { id: 'romocReg', label: 'ĐĂNG KIỂM', width: 85 },
  { id: 'driverName', label: 'LÁI XE', width: 150 },
  { id: 'idCard', label: 'CCCD', width: 120 },
  { id: 'phone', label: 'SĐT', width: 100 },
  { id: 'notes', label: 'GHI CHÚ', width: 150 },
];

interface VesselImportProps {
  vessels: Vessel[];
  onUpdateVessels: (v: Vessel[]) => void;
  containers: Container[];
  onUpdateContainers: (c: Container[]) => void;
  transportVehicles: TransportVehicle[];
  prices: ServicePrice[];
  consignees: Consignee[];
}

const VesselImport: React.FC<VesselImportProps> = ({
  vessels,
  onUpdateVessels,
  containers,
  onUpdateContainers,
  transportVehicles,
  prices,
  consignees
}) => {
  const [activeBusiness, setActiveBusiness] = useState<BusinessType>(BusinessType.IMPORT);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');

  const [showExportModal, setShowExportModal] = useState(false);
  const [showVesselModal, setShowVesselModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_COMMODITY = "Bột giấy đã nén dạng tấm, hàng mới 100%";

  const [newVessel, setNewVessel] = useState<Partial<Vessel>>({
    vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: ''
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [modalSelections, setModalSelections] = useState({ vesselId: '' });
  /* Export Plan Form State */
  const [exportPlanForm, setExportPlanForm] = useState<{
    arrivalTime: string;
    operationTime: string;
    plannedWeight: number;
    exportVesselName: string;
    exportConsignee: string;
    additionalItems: { pkgs: number; weight: number; note: string }[];
  }>({
    arrivalTime: '',
    operationTime: '',
    plannedWeight: 0,
    exportVesselName: '',
    exportConsignee: '',
    additionalItems: []
  });

  const isImport = activeBusiness === BusinessType.IMPORT;
  const currentColumns = isImport ? IMPORT_COLUMNS : EXPORT_COLUMNS;

  const availableVesselsForFilter = useMemo(() => {
    if (isImport) return vessels.filter(v => !v.exportPlanActive);
    return vessels.filter(v => v.exportPlanActive);
  }, [vessels, isImport]);

  const currentVessel = vessels.find(v => v.id === selectedVesselId);
  const vesselContainers = containers.filter(c => c.vesselId === selectedVesselId);
  const currentVehicles = transportVehicles.filter(tv => tv.vesselId === selectedVesselId);
  const vesselsForModal = useMemo(() => vessels.filter(v => !v.exportPlanActive), [vessels]);

  const mismatchedTKs = useMemo(() => {
    const ids = new Set<string>();
    vesselContainers.forEach(c => {
      const isWrong = (c.customsPkgs !== undefined && c.customsPkgs !== c.pkgs) ||
        (c.customsWeight !== undefined && c.customsWeight !== c.weight);
      if (isWrong && c.tkNhaVC) ids.add(c.tkNhaVC);
    });
    return ids;
  }, [vesselContainers]);

  useEffect(() => {
    const v = vessels.find(v => v.id === modalSelections.vesselId);
    if (v) setExportPlanForm(prev => ({ ...prev, plannedWeight: v.totalWeight }));
  }, [modalSelections.vesselId, vessels]);

  const formatDateOnly = (dt: string | undefined) => {
    if (!dt) return '---';
    try {
      const date = new Date(dt);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return dt; }
  };

  /* Manual Container Entry Logic */
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
  const [newContainer, setNewContainer] = useState<Partial<Container>>({
    containerNo: '', sealNo: '', size: '40', weight: 0, pkgs: 0,
    tkNhaVC: '', ngayTkNhaVC: '', vendor: '', detExpiry: '', noiHaRong: ''
  });

  const handleManualAddContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainer.containerNo) return alert("Vui lòng nhập số Container!");

    let updatedContainers: Container[];

    if (editingContainerId) {
      // UPDATE EXISTING CONTAINER
      updatedContainers = containers.map(c => c.id === editingContainerId ? {
        ...c,
        ...newContainer,
        containerNo: (newContainer.containerNo || '').toUpperCase(),
        sealNo: (newContainer.sealNo || '').toUpperCase(),
        tkNhaVC: (newContainer.tkNhaVC || '').toUpperCase(),
        vendor: (newContainer.vendor || '').toUpperCase(),
        noiHaRong: (newContainer.noiHaRong || '').toUpperCase(),
        size: newContainer.size || '40',
        weight: Number(newContainer.weight) || 0,
        pkgs: Number(newContainer.pkgs) || 0,
      } as Container : c);

      // SUPABASE SAVE (Update)
      const targetC = updatedContainers.find(c => c.id === editingContainerId);
      if (targetC) {
        db.upsertContainer(targetC).then(({ error }) => {
          if (error) alert(`Lỗi lưu Container ${targetC.containerNo}: ${error.message}`);
        });
      }
    } else {
      // CREATE NEW CONTAINER
      // Generate a conformant UUID v4
      const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      const container: Container = {
        ...newContainer,
        id,
        vesselId: selectedVesselId,
        status: ContainerStatus.PENDING,
        unitType: UnitType.CONTAINER,
        containerNo: (newContainer.containerNo || '').toUpperCase(),
        sealNo: (newContainer.sealNo || '').toUpperCase(),
        tkNhaVC: (newContainer.tkNhaVC || '').toUpperCase(),
        vendor: (newContainer.vendor || '').toUpperCase(),
        noiHaRong: (newContainer.noiHaRong || '').toUpperCase(),
        // Default / Derived values
        billNo: '',
        carrier: '',
        size: newContainer.size || '40',
        weight: Number(newContainer.weight) || 0,
        pkgs: Number(newContainer.pkgs) || 0,
        ngayKeHoach: new Date().toISOString() // Default to today
      } as Container;
      updatedContainers = [...containers, container];

      // SUPABASE SAVE (Create)
      db.upsertContainer(container).then(({ error }) => {
        if (error) alert(`Lỗi lưu Container ${container.containerNo}: ${error.message}`);
      });

      StorageService.addNotification({
        title: "CONTAINER MỚI",
        message: `Container ${(newContainer.containerNo || '').toUpperCase()} đã được thêm manual bởi CS.`,
        type: 'INFO',
        targetRoles: [Role.INSPECTOR, Role.CUSTOMS, Role.TRANSPORT]
      });
    }

    // Update Containers List
    onUpdateContainers(updatedContainers);

    // Update Vessel Stats (Recalculate for this vessel)
    const currentVesselContainers = updatedContainers.filter(c => c.vesselId === selectedVesselId);
    let totalPkgs = 0;
    let totalWeight = 0;
    currentVesselContainers.forEach(c => {
      totalPkgs += (c.pkgs || 0);
      totalWeight += (c.weight || 0);
    });

    const updatedVessels = vessels.map(v => v.id === selectedVesselId ? {
      ...v,
      totalContainers: currentVesselContainers.length,
      totalPkgs,
      totalWeight
    } : v);

    onUpdateVessels(updatedVessels);

    // SUPABASE SAVE (Vessel Stats)
    db.upsertVessel(updatedVessels.find(v => v.id === selectedVesselId)!).catch(console.error);

    // Reset & Close
    setShowAddContainerModal(false);
    setNewContainer({
      containerNo: '', sealNo: '', size: '40', weight: 0, pkgs: 0,
      tkNhaVC: '', ngayTkNhaVC: '', vendor: '', detExpiry: '', noiHaRong: ''
    });
    setEditingContainerId(null);
    alert(editingContainerId ? "Cập nhật container thành công!" : "Đã thêm container thành công!");
  };

  const handleEditContainer = (c: Container) => {
    setEditingContainerId(c.id);
    setNewContainer({
      containerNo: c.containerNo,
      sealNo: c.sealNo,
      size: c.size,
      weight: c.weight,
      pkgs: c.pkgs,
      tkNhaVC: c.tkNhaVC,
      ngayTkNhaVC: c.ngayTkNhaVC ? new Date(c.ngayTkNhaVC).toISOString().split('T')[0] : '', // Format for Input Date
      vendor: c.vendor,
      detExpiry: c.detExpiry ? new Date(c.detExpiry).toISOString().split('T')[0] : '',
      noiHaRong: c.noiHaRong
    });
    setShowAddContainerModal(true);
  };

  const handleDeleteContainer = (containerId: string) => {
    if (!window.confirm("Bạn có chắc muốn xoá Container này?")) return;

    const updatedContainers = containers.filter(c => c.id !== containerId);
    onUpdateContainers(updatedContainers);

    // SUPABASE DELETE
    db.deleteContainer(containerId).then(success => {
      if (!success) alert("Xoá Container thất bại!");
    });

    // Recalculate Stats
    const currentVesselContainers = updatedContainers.filter(c => c.vesselId === selectedVesselId);
    let totalPkgs = 0;
    let totalWeight = 0;
    currentVesselContainers.forEach(c => {
      totalPkgs += (c.pkgs || 0);
      totalWeight += (c.weight || 0);
    });

    const updatedVessels = vessels.map(v => v.id === selectedVesselId ? {
      ...v,
      totalContainers: currentVesselContainers.length,
      totalPkgs,
      totalWeight
    } : v);
    onUpdateVessels(updatedVessels);

    // SUPABASE SAVE (Vessel Stats Update)
    db.upsertVessel(updatedVessels.find(v => v.id === selectedVesselId)!).catch(console.error);
  };

  const handleCreateVessel = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && selectedVesselId) {
      // Edit Mode
      const updatedVessels = vessels.map(v => v.id === selectedVesselId ? {
        ...v,
        ...newVessel,
        vesselName: (newVessel.vesselName || '').toUpperCase().trim(),
        voyageNo: (newVessel.voyageNo || '').toUpperCase().trim(),
        consignee: (newVessel.consignee || '').toUpperCase().trim(),
        eta: newVessel.eta || v.eta,
        etd: newVessel.etd || v.etd
      } : v);
      onUpdateVessels(updatedVessels);

      // SUPABASE SAVE
      db.upsertVessel(updatedVessels.find(v => v.id === selectedVesselId)!).then(({ error }) => {
        if (error) alert(`Lưu dữ liệu lên Cloud thất bại! Lỗi: ${error.message || JSON.stringify(error)}`);
      });

      setShowVesselModal(false);
      setNewVessel({ vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: '' });
      setIsEditMode(false);
    } else {
      // Create Mode to ensure fresh state
      // Ensure ID is UUID if possible, but keep random string if simpler for now. 
      // Supabase default is uuid_generate_v4() if we pass nothing, but interface needs ID.
      // Let's rely on DB generating ID if we pass undefined, but our Type requires ID.
      // We'll generate a temp ID for UI and let DB handle or just use this random string (it fits UUID column if we cast? No, random string 'v_...' is not UUID)
      // FIX: We must use a valid UUID or existing format.
      // For migration speed, schema says ID is UUID. 'v_...' will FAIL.
      // We should use crypto.randomUUID() if available or a placeholder.
      // Generate a conformant UUID v4 to satisfy Postgres uuid type
      const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const vessel: Vessel = {
        ...newVessel,
        id,
        vesselName: (newVessel.vesselName || '').toUpperCase().trim(),
        voyageNo: (newVessel.voyageNo || '').toUpperCase().trim(),
        consignee: (newVessel.consignee || '').toUpperCase().trim(),
        totalContainers: 0,
        totalPkgs: 0,
        totalWeight: 0,
        exportPlanActive: false
      } as Vessel;

      // Optimistic UI Update
      onUpdateVessels([...vessels, vessel]);

      // SUPABASE SAVE
      db.upsertVessel(vessel).then(({ error }) => {
        if (error) {
          alert(`Lỗi lưu tàu mới lên Cloud! Chi tiết: ${error.message || JSON.stringify(error)}`);
        } else {
          // Success
        }
      });

      StorageService.addNotification({
        title: "TÀU MỚI: " + vessel.vesselName,
        message: `CS đã nhập tàu mới: ${vessel.vesselName}. Chủ hàng: ${vessel.consignee}. ETA: ${vessel.eta ? new Date(vessel.eta).toLocaleDateString('vi-VN') : 'N/A'}`,
        type: 'INFO',
        targetRoles: [Role.INSPECTOR, Role.CUSTOMS, Role.TRANSPORT]
      });
      setShowVesselModal(false);
      setSelectedVesselId(id);
      setNewVessel({ vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: '' });
    }
  };

  /* Update vessel to Export Plan Active */
  const handleNotifyExportPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSelections.vesselId) return;
    setIsProcessing(true);

    /* Calculate Total Export Weight & Pkgs */
    const baseWeight = exportPlanForm.plannedWeight; // From Import Vessel (or user input for current batch)
    const additionalWeight = (exportPlanForm.additionalItems || []).reduce((acc, i) => acc + (i.weight || 0), 0);
    const totalWeight = baseWeight + additionalWeight;

    // Note: totalPkgs might need to be sourced from the import vessel if we want to track it
    // For now we just track additional pkgs. If we want "Total Export Pkgs", we'd need Import Pkgs + Additional Pkgs.
    // The current UI mainly asks for Weight. We will store additional items in a note or specific field if needed.

    setTimeout(() => {
      const updatedVessels = vessels.map(v => {
        if (v.id === modalSelections.vesselId) {
          return {
            ...v,
            exportPlanActive: true,
            exportArrivalTime: exportPlanForm.arrivalTime,
            exportOperationTime: exportPlanForm.operationTime,
            exportPlannedWeight: totalWeight,

            // Update Identity for Export Phase
            vesselName: (exportPlanForm.exportVesselName || v.vesselName).toUpperCase(),
            consignee: (exportPlanForm.exportConsignee || v.consignee).toUpperCase(),

            // Optional: Store additional items or original import info if needed
            // originalImportVessel: v.vesselName, 
            // additionalExportItems: exportPlanForm.additionalItems
          };
        }
        return v;
      });
      onUpdateVessels(updatedVessels);

      const targetVessel = vessels.find(vel => vel.id === modalSelections.vesselId);
      if (targetVessel) {
        // Prepare updated object for DB (merging changes)
        const dbVessel = updatedVessels.find(v => v.id === modalSelections.vesselId);
        if (dbVessel) {
          db.upsertVessel(dbVessel).then(({ error }) => {
            if (error) alert(`Lưu thông tin Tàu Xuất lên Cloud thất bại! Lỗi: ${error.message}`);
          });
        }

        StorageService.addNotification({
          title: "LỆNH TÀU XUẤT",
          message: `CS đã thông báo kế hoạch xuất cho tàu ${exportPlanForm.exportVesselName || targetVessel.vesselName}. Dự kiến: ${exportPlanForm.arrivalTime ? new Date(exportPlanForm.arrivalTime).toLocaleDateString('vi-VN') : 'N/A'}`,
          type: 'WARNING',
          targetRoles: [Role.INSPECTOR, Role.CUSTOMS, Role.TRANSPORT]
        });
      }

      setIsProcessing(false);
      setShowExportModal(false);
      setModalSelections({ vesselId: '' });
      setExportPlanForm({
        arrivalTime: '',
        operationTime: '',
        plannedWeight: 0,
        exportVesselName: '',
        exportConsignee: '',
        additionalItems: []
      });
    }, 1000);
  };

  const handleDeleteVessel = () => {
    if (!selectedVesselId) return;
    if (window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XOÁ TÀU NÀY?\nDữ liệu không thể phục hồi.")) {
      // Remove vessel
      const updatedVessels = vessels.filter(v => v.id !== selectedVesselId);
      onUpdateVessels(updatedVessels);

      // SUPABASE DELETE
      db.deleteVessel(selectedVesselId).then(success => {
        if (!success) alert("Xoá tàu trên Cloud thất bại (Có thể do còn Containers phụ thuộc)");
      });

      // Remove associated containers
      const updatedContainers = containers.filter(c => c.vesselId !== selectedVesselId);
      onUpdateContainers(updatedContainers);

      setSelectedVesselId('');
      setFilterVesselName('');
      setFilterConsignee('');
      setFilterSchedule('');
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setNewVessel({ vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: '' });
    setShowVesselModal(true);
  }

  const openEditModal = () => {
    if (!currentVessel) return;
    setIsEditMode(true);
    setNewVessel({
      vesselName: currentVessel.vesselName,
      commodity: currentVessel.commodity || DEFAULT_COMMODITY,
      consignee: currentVessel.consignee,
      voyageNo: currentVessel.voyageNo,
      eta: currentVessel.eta,
      etd: currentVessel.etd
    });
    setShowVesselModal(true);
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedVesselId) return alert("Vui lòng chọn tàu trước khi import!");
    const file = e.target.files?.[0];
    if (!file) return;

    // FORCE FEEDBACK
    alert("Đã nhận file. Đang xử lý...");

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        // Check if XLSX is available
        if (!XLSX) throw new Error("Thư viện Excel chưa được tải.");

        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        if (!wb.SheetNames.length) throw new Error("File Excel không có Sheet nào.");

        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // alert(`Tìm thấy ${data.length} dòng dữ liệu.`); 

        const { containers: resultContainers, summary } = processImportData(data as any[], selectedVesselId, containers);

        if (resultContainers.length === 0) {
          alert("Không tìm thấy dữ liệu Container hợp lệ.\n1. Kiểm tra header: 'Container No', 'Seal No', 'Weight'...\n2. File có chứa dữ liệu không?");
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const otherContainers = containers.filter(c => c.vesselId !== selectedVesselId);
        onUpdateContainers([...otherContainers, ...resultContainers]);

        const updatedVessels = vessels.map(v => v.id === selectedVesselId ? {
          ...v,
          totalContainers: resultContainers.length,
          totalPkgs: summary.totalPkgs,
          totalWeight: summary.totalWeight
        } : v);
        onUpdateVessels(updatedVessels);

        // SUPABASE BATCH SAVE
        const vesselToUpdate = updatedVessels.find(v => v.id === selectedVesselId)!;

        // 1. Save Containers
        db.upsertContainers(resultContainers).then(({ count, error }) => {
          if (error) {
            alert(`Lỗi lưu ${resultContainers.length} containers lên Cloud: ${error.message}`);
          } else {
            // 2. Save Vessel Stats Only If Containers Saved
            db.upsertVessel(vesselToUpdate).then(({ error: vError }) => {
              if (vError) console.error("Error updating vessel stats:", vError);
            });
            alert(`IMPORT THÀNH CÔNG!\nĐã thêm: ${count} containers.\nĐã lưu lên Cloud.`);
          }
        });

        const prevCount = containers.filter(c => c.vesselId === selectedVesselId).length;
        const addedCount = resultContainers.length - prevCount;

        StorageService.addNotification({
          title: "IMPORT EXCEL",
          message: `CS đã import thành công ${addedCount} container cho tàu ${vessels.find(v => v.id === selectedVesselId)?.vesselName}.`,
          type: 'SUCCESS',
          targetRoles: [Role.INSPECTOR, Role.CUSTOMS, Role.TRANSPORT]
        });

        // Aletr moved inside async callback above
      } catch (err: any) {
        console.error(err);
        alert(`LỖI IMPORT: ${err?.message || 'Không xác định'}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert("Lỗi đọc file (FileReader Error).");
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };



  /* New Filter Logic (3 Columns) */
  const [filterVesselName, setFilterVesselName] = useState<string>('');
  const [filterConsignee, setFilterConsignee] = useState<string>('');
  const [filterSchedule, setFilterSchedule] = useState<string>('');

  /* Dropdown State */
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  /* Helper to close dropdowns when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as Element).closest('.action-dropdown')) return;
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 1. Unique Vessel Names (Always available)
  const uniqueVesselNames = useMemo(() => {
    const names = availableVesselsForFilter.map(v => v.vesselName?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [availableVesselsForFilter]);

  // 2. Consignees (Dependent on Vessel Name)
  const uniqueConsignees = useMemo(() => {
    let filtered = availableVesselsForFilter;
    if (filterVesselName) {
      filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    }
    const names = filtered.map(v => v.consignee?.toUpperCase().trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [availableVesselsForFilter, filterVesselName]);

  // 3. Schedules (Filtered by Name & Consignee)
  const uniqueSchedules = useMemo(() => {
    let filtered = availableVesselsForFilter;
    if (filterVesselName) {
      filtered = filtered.filter(v => v.vesselName?.toUpperCase().trim() === filterVesselName);
    }
    if (filterConsignee) {
      filtered = filtered.filter(v => v.consignee?.toUpperCase().trim() === filterConsignee);
    }

    // Extract unique schedules (ETA - ETD) 
    const schedules = new Set<string>();
    filtered.forEach(v => {
      const eta = (v.eta && !isNaN(new Date(v.eta).getTime())) ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
      const etd = (v.etd && !isNaN(new Date(v.etd).getTime())) ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
      schedules.add(`ETA: ${eta} - ETD: ${etd}`);
    });
    return Array.from(schedules).sort();
  }, [availableVesselsForFilter, filterVesselName, filterConsignee]);

  // Logic to Resolve Selected Vessel ID
  useEffect(() => {
    if (filterVesselName && filterConsignee && filterSchedule) {
      const match = availableVesselsForFilter.find(v => {
        const nameMatch = v.vesselName?.toUpperCase().trim() === filterVesselName;
        const consigneeMatch = v.consignee?.toUpperCase().trim() === filterConsignee;

        const eta = (v.eta && !isNaN(new Date(v.eta).getTime())) ? new Date(v.eta).toLocaleDateString('en-GB') : '???';
        const etd = (v.etd && !isNaN(new Date(v.etd).getTime())) ? new Date(v.etd).toLocaleDateString('en-GB') : '???';
        const scheduleString = `ETA: ${eta} - ETD: ${etd}`;

        return nameMatch && consigneeMatch && (scheduleString === filterSchedule);
      });

      if (match) {
        if (selectedVesselId !== match.id) setSelectedVesselId(match.id);
      } else {
        if (selectedVesselId !== '') setSelectedVesselId('');
      }
    } else {
      // Auto-select if only one option exists after filtering
      /* Optional: Enable this if user wants aggressive auto-select */
      if (selectedVesselId !== '') setSelectedVesselId('');
    }
  }, [filterVesselName, filterConsignee, filterSchedule, availableVesselsForFilter, selectedVesselId]);

  const handleDownloadTemplate = () => {
    // Simple Container Import Template
    const headers = ["STT", "Container No", "Seal No", "Loại (20/40)", "Trọng lượng", "Số kiện", "Tờ khai"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Mau_Import_Container.xlsx");
  };

  return (
    <div className="space-y-4 animate-fadeIn relative text-left h-full flex flex-col">
      {/* PERSISTENT FILE INPUT */}
      <input type="file" ref={fileInputRef} onChange={(e) => {
        console.log("File Selected:", e.target.files?.[0]?.name);
        handleImportExcel(e);
      }} className="hidden" accept=".xlsx,.xls" />

      {/* Header & Tabs */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveBusiness(BusinessType.IMPORT); setSelectedVesselId(''); }}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${isImport ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
          >
            Nghiệp vụ Nhập
          </button>
          <button
            onClick={() => { setActiveBusiness(BusinessType.EXPORT); setSelectedVesselId(''); }}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${!isImport ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
          >
            Nghiệp vụ Xuất
          </button>
        </div>

        {/* Old buttons area removed/simplified - only Export notification might stay if needed, but for Import we moved Create button */}
        <div className="flex items-center gap-2">
          {!isImport && (
            <button onClick={() => setShowExportModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all flex items-center gap-2">
              <ICONS.AlertTriangle className="w-4 h-4" /> THÔNG BÁO TÀU XUẤT
            </button>
          )}
        </div>
      </div>

      {/* Filter Zone - Redesigned (3 Columns) */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 shrink-0 space-y-3">
        <div className="text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-full">CHỌN CHUYẾN TÀU LÀM VIỆC</span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* 1. Vessel Name Dropdown */}
          <div className="w-full md:w-1/3 relative group">
            <ICONS.Ship className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
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

          {/* 2. Consignee Dropdown */}
          <div className="w-full md:w-1/3 relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
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

          {/* 3. Schedule (ETA/ETD) Dropdown */}
          <div className="w-full md:w-1/3 relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 hover:border-blue-300 transition-all appearance-none shadow-sm uppercase"
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

          {/* 3. Action Buttons (Refactored to Dropdowns) */}
          <div className="flex items-center gap-2 flex-1 justify-end w-full">
            {isImport && (
              <>
                {/* Create Button (Primary) */}
                <button
                  onClick={openCreateModal}
                  className="px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  <ICONS.Ship className="w-4 h-4" /> TẠO TÀU
                </button>

                <div className="w-px h-8 bg-slate-200 mx-1"></div>

                {/* "THAO TÁC" Dropdown */}
                <div className="relative action-dropdown">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === 'ops' ? null : 'ops')}
                    className={`px-3 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 border ${activeDropdown === 'ops' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    THAO TÁC <ChevronDown className="w-3 h-3" />
                  </button>
                  {activeDropdown === 'ops' && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[50] animate-slideUp">
                      <button
                        onClick={() => {
                          setEditingContainerId(null);
                          setNewContainer({
                            containerNo: '', sealNo: '', size: '40', weight: 0, pkgs: 0,
                            tkNhaVC: '', ngayTkNhaVC: '', vendor: '', detExpiry: '', noiHaRong: ''
                          });
                          setShowAddContainerModal(true);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3 text-purple-600" /> THÊM CONT
                      </button>

                      <button
                        onClick={() => {
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          fileInputRef.current?.click();
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50"
                      >
                        <ICONS.FileText className="w-3 h-3 text-blue-600" /> IMPORT EXCEL
                      </button>
                    </div>
                  )}
                </div>

                {/* "QUẢN LÝ" Dropdown (Only if vessel selected) */}
                {selectedVesselId && (
                  <div className="relative action-dropdown">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'manage' ? null : 'manage')}
                      className={`px-3 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 border ${activeDropdown === 'manage' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      QUẢN LÝ <ChevronDown className="w-3 h-3" />
                    </button>
                    {activeDropdown === 'manage' && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[50] animate-slideUp">
                        <button
                          onClick={() => { openEditModal(); setActiveDropdown(null); }}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" /> SỬA THÔNG TIN
                        </button>
                        <button
                          onClick={() => { handleDeleteVessel(); setActiveDropdown(null); }}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                        >
                          <Trash className="w-3 h-3" /> XOÁ TÀU
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {currentVessel ? (
        <div className={`bg-white rounded-[2.5rem] shadow-xl border overflow-hidden flex-1 flex flex-col min-h-0 ${isImport ? 'border-blue-100' : 'border-emerald-100'}`}>
          <div className={`px-8 py-5 border-b flex justify-between items-center shrink-0 ${isImport ? 'bg-blue-50/20' : 'bg-emerald-50/20'}`}>
            <div className="flex items-center gap-4 text-left">
              <div className={`w-1.5 h-6 rounded-full ${isImport ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">{isImport ? 'DANH SÁCH CONTAINER NHẬP' : 'DANH SÁCH XE TRUNG CHUYỂN'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentVessel.vesselName} • {currentVessel.consignee}</p>
              </div>
            </div>
            <div className="flex gap-10 text-right">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SẢN LƯỢNG {isImport ? 'NHẬP' : 'XUẤT'}</p>
                <p className={`text-xl font-black tracking-tighter ${isImport ? 'text-blue-700' : 'text-emerald-700'}`}>
                  {isImport ? currentVessel.totalWeight.toLocaleString() : (currentVessel.exportPlannedWeight || 0).toLocaleString()} TẤN
                </p>
              </div>
              {!isImport && (
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SỐ LƯỢNG XE</p>
                  <p className="text-xl font-black text-slate-800 tracking-tighter">{currentVehicles.length} XE</p>
                </div>
              )}
            </div>
          </div>

          {!isImport && (
            <div className="px-8 py-3 bg-slate-50/50 flex gap-12 border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex items-center gap-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LỊCH TÀU CẬP:</span><span className="text-[10px] font-black text-slate-700">{formatDateOnly(currentVessel.exportArrivalTime)}</span></div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-8"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LỊCH LÀM HÀNG:</span><span className="text-[10px] font-black text-slate-700">{formatDateOnly(currentVessel.exportOperationTime)}</span></div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-8"><span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">TRẠNG THÁI:</span><span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Đã gửi lệnh</span></div>
            </div>
          )}

          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="min-w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 text-slate-400 border-b sticky top-0 z-10">
                <tr>
                  {currentColumns.map((col) => (
                    <th key={col.id} className="px-4 py-4 font-black uppercase text-[8px] tracking-widest text-center" style={{ width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isImport ? (
                  vesselContainers.length > 0 ? vesselContainers.map((c, idx) => {
                    const isMismatch = mismatchedTKs.has(c.tkNhaVC || '');
                    return (
                      <tr key={c.id} className={`transition-colors ${isMismatch ? 'bg-red-50/30' : 'hover:bg-blue-50/20'}`}>
                        <td className="px-4 py-3 text-center font-bold text-slate-300">{idx + 1}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500">{displayDate(c.ngayKeHoach)}</td>
                        <td className="px-4 py-3 font-black text-slate-900 uppercase tracking-tight">{c.containerNo}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{c.sealNo}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-700 uppercase">{c.tkNhaVC || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{displayDate(c.ngayTkNhaVC)}</td>
                        <td className="px-4 py-3 text-center font-black text-emerald-700">{c.tkDnlOla || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{displayDate(c.ngayTkDnl)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{c.pkgs}</td>
                        <td className="px-4 py-3 text-center font-medium text-purple-600">{c.customsPkgs !== undefined ? c.customsPkgs : '-'}</td>
                        <td className="px-4 py-3 text-center font-black text-blue-600">{c.weight.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-600">{c.customsWeight != null ? c.customsWeight.toFixed(1) : '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{c.vendor}</td>
                        <td className={`px-4 py-3 text-center font-bold ${checkDetentionStatus(c.detExpiry) === 'urgent' ? 'text-red-500' : 'text-slate-500'}`}>{displayDate(c.detExpiry)}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{c.noiHaRong}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={isMismatch ? ContainerStatus.MISMATCH : c.status} />
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                          {/* Actions */}
                          <button onClick={() => handleEditContainer(c)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Chỉnh sửa">
                            <Edit className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteContainer(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Xoá">
                            <Trash className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={IMPORT_COLUMNS.length} className="py-24 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">Chưa có dữ liệu. Vui lòng Import file Excel.</td></tr>
                  )
                ) : (
                  currentVehicles.length > 0 ? currentVehicles.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-4 py-4 text-center font-bold text-slate-300">{idx + 1}</td>
                      <td className="px-4 py-4 text-center font-black text-slate-900 tracking-tight">{v.truckNo}</td>
                      <td className="px-4 py-4 text-center text-slate-400 italic">---</td>
                      <td className="px-4 py-4 text-center font-black text-slate-700 tracking-tight">{v.romocNo}</td>
                      <td className="px-4 py-4 text-center text-slate-400 italic">---</td>
                      <td className="px-4 py-4 font-black text-slate-800 uppercase">{v.driverName}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-600 tracking-wider">{v.idCard}</td>
                      <td className="px-4 py-4 text-center font-black text-blue-600">{v.phone}</td>
                      <td className="px-4 py-4 text-slate-400 font-medium italic">{v.notes || ''}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={EXPORT_COLUMNS.length} className="py-24 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">Đang đợi vận tải cập nhật danh sách xe...</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-32 opacity-30 text-center">
          <ICONS.Ship className="w-20 h-20 mb-4" />
          <p className="font-black text-[12px] uppercase tracking-[0.5em]">Vui lòng chọn tàu để bắt đầu khai thác</p>
        </div>
      )}

      {/* Modal Thêm Tàu Mới */}
      {showVesselModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-100">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">{isEditMode ? 'CẬP NHẬT THÔNG TIN TÀU' : 'KHỞI TẠO TÀU NHẬP MỚI'}</h3>
              <button onClick={() => setShowVesselModal(false)} className="text-white hover:opacity-60 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleCreateVessel} className="p-8 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN TÀU</label>
                <input required type="text" value={newVessel.vesselName} onChange={e => setNewVessel({ ...newVessel, vesselName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN HÀNG</label>
                <input required type="text" value={newVessel.commodity} onChange={e => setNewVessel({ ...newVessel, commodity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỦ HÀNG / KHÁCH HÀNG</label>
                <select required value={newVessel.consignee} onChange={e => setNewVessel({ ...newVessel, consignee: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase">
                  <option value="">Chọn chủ hàng...</option>
                  {consignees.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">LỊCH TÀU CẬP (ETA)</label>
                  <input required type="date" value={newVessel.eta} onChange={e => setNewVessel({ ...newVessel, eta: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">LỊCH TÀU RỜI (ETD)</label>
                  <input required type="date" value={newVessel.etd} onChange={e => setNewVessel({ ...newVessel, etd: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-600 transition-all active:scale-95">{isEditMode ? 'LƯU THAY ĐỔI' : 'XÁC NHẬN TẠO TÀU'}</button>
            </form>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-100">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">THÔNG BÁO TÀU XUẤT</h3>
              <button onClick={() => setShowExportModal(false)} className="text-white hover:opacity-60 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleNotifyExportPlan} className="p-8 space-y-4 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỌN LÔ HÀNG (TỪ DANH SÁCH NHẬP)</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500 appearance-none"
                  value={modalSelections.vesselId}
                  onChange={e => setModalSelections({ vesselId: e.target.value })}
                >
                  <option value="">-- CHỌN LÔ HÀNG --</option>
                  {vesselsForModal.map(v => (
                    <option key={v.id} value={v.id}>{v.vesselName} ({displayDate(v.eta)})</option>
                  ))}
                </select>
              </div>

              {modalSelections.vesselId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN TÀU XUẤT (EXPORT VESSEL)</label>
                      <input required type="text" placeholder="Nhập tên tàu..." value={exportPlanForm.exportVesselName || ''} onChange={e => setExportPlanForm({ ...exportPlanForm, exportVesselName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500 uppercase" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỦ HÀNG (CONSIGNEE)</label>
                      <select required value={exportPlanForm.exportConsignee || ''} onChange={e => setExportPlanForm({ ...exportPlanForm, exportConsignee: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500 uppercase">
                        <option value="">Chọn chủ hàng...</option>
                        {consignees.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">THỜI GIAN TÀU CẬP (DỰ KIẾN)</label>
                      <input required type="datetime-local" value={exportPlanForm.arrivalTime} onChange={e => setExportPlanForm({ ...exportPlanForm, arrivalTime: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">THỜI GIAN LÀM HÀNG (DỰ KIẾN)</label>
                      <input required type="datetime-local" value={exportPlanForm.operationTime} onChange={e => setExportPlanForm({ ...exportPlanForm, operationTime: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  {/* Current Batch Info */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3">THÔNG TIN XUẤT LÔ CŨ</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">KHỐI LƯỢNG (TỪ TÀU NHẬP)</label>
                      <input required type="number" value={exportPlanForm.plannedWeight} onChange={e => setExportPlanForm({ ...exportPlanForm, plannedWeight: Number(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-xl p-3 font-bold text-emerald-700 outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  {/* Dynamic Additional Cargo */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SẢN LƯỢNG XUẤT THÊM (ADDITIONAL CARGO)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentItems = exportPlanForm.additionalItems || [];
                          setExportPlanForm({ ...exportPlanForm, additionalItems: [...currentItems, { pkgs: 0, weight: 0, note: '' }] });
                        }}
                        className="bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> THÊM
                      </button>
                    </div>

                    {/* List of Additional Items */}
                    {(exportPlanForm.additionalItems?.length || 0) > 0 ? (
                      <div className="space-y-2">
                        {exportPlanForm.additionalItems?.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start animate-fadeIn">
                            <div className="flex-1 space-y-1">
                              <input
                                placeholder="SỐ KIỆN (PKGS)"
                                type="number"
                                value={item.pkgs || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newItems = [...(exportPlanForm.additionalItems || [])];

                                  // Auto-calculate weight: pkgs * weight-factor
                                  const factor = prices.find(p => p.id === 'weight-factor')?.price || 0;
                                  const calculatedWeight = val * factor;

                                  newItems[idx] = {
                                    ...newItems[idx],
                                    pkgs: val,
                                    weight: parseFloat(calculatedWeight.toFixed(3)) // Round to 3 decimals
                                  };
                                  setExportPlanForm({ ...exportPlanForm, additionalItems: newItems });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <input
                                placeholder="TRỌNG LƯỢNG (TẤN)"
                                type="number" step="0.01"
                                readOnly
                                value={item.weight || ''}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = exportPlanForm.additionalItems?.filter((_, i) => i !== idx);
                                setExportPlanForm({ ...exportPlanForm, additionalItems: newItems });
                              }}
                              className="p-2 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Total Summary */}
                        <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs font-bold text-slate-500">
                          <span>TỔNG CỘNG THÊM:</span>
                          <span>
                            {(exportPlanForm.additionalItems || []).reduce((acc, i) => acc + (i.pkgs || 0), 0).toLocaleString()} PKGS
                            {' - '}
                            {(exportPlanForm.additionalItems || []).reduce((acc, i) => acc + (i.weight || 0), 0).toLocaleString()} TẤN
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-300 text-xs font-bold">
                        Chưa có sản lượng xuất thêm
                      </div>
                    )}
                  </div>


                  <button disabled={isProcessing} type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 mt-4">
                    {isProcessing ? 'ĐANG XỬ LÝ...' : 'GỬI THÔNG BÁO'}
                  </button>
                </>
              )}
              {vesselsForModal.length === 0 && (
                <div className="text-center text-slate-400 text-xs italic">
                  Tất cả tàu đã có kế hoạch xuất hoặc không có tàu nào.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* Manual Add Container Modal */}
      {showAddContainerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-100">
            <div className={`p-6 text-white flex justify-between items-center ${editingContainerId ? 'bg-orange-600' : 'bg-purple-600'}`}>
              <h3 className="text-sm font-black uppercase tracking-widest">{editingContainerId ? 'CẬP NHẬT THÔNG TIN CONTAINER' : 'THÊM CONTAINER THỦ CÔNG'}</h3>
              <button onClick={() => setShowAddContainerModal(false)} className="text-white hover:opacity-60 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleManualAddContainer} className="p-8 space-y-4 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SỐ CONTAINER <span className="text-red-500">*</span></label>
                  <input required type="text" value={newContainer.containerNo} onChange={e => setNewContainer({ ...newContainer, containerNo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500 uppercase" placeholder="AAAA1234567" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SỐ SEAL</label>
                  <input type="text" value={newContainer.sealNo} onChange={e => setNewContainer({ ...newContainer, sealNo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500 uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">KÍCH CỠ</label>
                  <select value={newContainer.size} onChange={e => setNewContainer({ ...newContainer, size: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500">
                    <option value="20">20 FT</option>
                    <option value="40">40 FT</option>
                    <option value="45">45 FT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TK NHÀ VC</label>
                  <input type="text" value={newContainer.tkNhaVC} onChange={e => setNewContainer({ ...newContainer, tkNhaVC: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500 uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NGÀY TK VC</label>
                  <input type="date" value={newContainer.ngayTkNhaVC} onChange={e => setNewContainer({ ...newContainer, ngayTkNhaVC: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SỐ KIỆN (PKGS)</label>
                  <input type="number" value={newContainer.pkgs} onChange={e => setNewContainer({ ...newContainer, pkgs: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TRỌNG LƯỢNG (TẤN)</label>
                  <input type="number" step="0.01" value={newContainer.weight} onChange={e => setNewContainer({ ...newContainer, weight: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500" />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">VENDOR</label>
                  <input type="text" value={newContainer.vendor} onChange={e => setNewContainer({ ...newContainer, vendor: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500 uppercase" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">HẠN DET (EXPIRY)</label>
                  <input type="date" value={newContainer.detExpiry} onChange={e => setNewContainer({ ...newContainer, detExpiry: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NƠI HẠ RỖNG</label>
                  <input type="text" value={newContainer.noiHaRong} onChange={e => setNewContainer({ ...newContainer, noiHaRong: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-purple-500 uppercase" />
                </div>
              </div>
              <button type="submit" className={`w-full py-4 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-lg ${editingContainerId ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}>
                {editingContainerId ? 'LƯU THAY ĐỔI' : 'THÊM CONTAINER'}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default VesselImport;
