import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Vessel, ContainerCS, SealData, VesselStatus } from '../types';
import { AlertOctagon, CheckCircle, Shield, Plus, Hash, Trash2, AlertTriangle, Save, RefreshCw, X, AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { StorageService } from '../../../services/storage';
import { db } from '../../../services/db'; // Import DB
import { Role } from '../../../types';

interface CustomsViewProps {
  vessels: Vessel[];
  csContainers: ContainerCS[];
  onSyncDiscrepancy?: (containerId: string, reason: string) => void;
  onSaveCustomsData?: (data: Record<string, ImportRowData>) => void;
}

interface ImportRowData {
  dnlDeclNo: string;
  dnlDeclDate: string;
  packages: string;
  tons: string;
  sealNo: string;
  transportDeclNo?: string; // NEW
  transportDeclDate?: string; // NEW
}

interface MissingFieldAlert {
  containerId: string;
  missingColumns: string[];
}

interface DiscrepancyModalData {
  containerId: string;
  csPackages: number;
  csTons: number;
  inputPackages: string;
  inputTons: string;
}

const DEFAULT_WEIGHT_PER_PACKAGE = 1.8;

export const CustomsView: React.FC<CustomsViewProps> = ({ vessels, csContainers, onSyncDiscrepancy, onSaveCustomsData }) => {
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels[0]?.id || "");

  // -- Import State (Excel-like Grid) --
  const [importGridData, setImportGridData] = useState<Record<string, ImportRowData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [validationWarnings, setValidationWarnings] = useState<Set<string>>(new Set());

  // -- Missing Data Alert State --
  const [missingDataAlert, setMissingDataAlert] = useState<MissingFieldAlert[] | null>(null);

  // -- Discrepancy Detail Modal State --
  const [discrepancyModal, setDiscrepancyModal] = useState<DiscrepancyModalData | null>(null);
  const [multiDiscrepancyModal, setMultiDiscrepancyModal] = useState<DiscrepancyModalData[] | null>(null);
  // -- Selection State --
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  // -- Drag Selection State --
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const dragStartIdRef = useRef<string | null>(null);

  // -- Export State --
  const [sealPrefix, setSealPrefix] = useState("T/25.");
  const [sealStart, setSealStart] = useState("");
  const [sealEnd, setSealEnd] = useState("");
  const [sealOdd, setSealOdd] = useState("");

  // -- Seal Data Persistence --
  const [allSeals, setAllSeals] = useState<SealData[]>([]);



  useEffect(() => {
    db.getSeals().then(setAllSeals);
  }, []);

  // FIX: Reset selectedVesselId when switching tabs (IMPORT <-> EXPORT)
  useEffect(() => {
    const filteredVessels = vessels.filter(v =>
      activeTab === 'IMPORT' ? v.status === VesselStatus.INBOUND : v.status === VesselStatus.OUTBOUND
    );
    if (filteredVessels.length > 0) {
      setSelectedVesselId(filteredVessels[0].id);
    }
  }, [activeTab, vessels]);

  const savedSeals = useMemo(() => {
    return allSeals.filter(s => s.vesselId === selectedVesselId);
  }, [allSeals, selectedVesselId]);

  // Ref to track the previous vessel ID to distinguish between "Vessel Switch" and "Status Update"
  const prevVesselIdRef = useRef<string>(selectedVesselId);

  // Filter containers for current vessel
  const currentVesselContainers = useMemo(() => {
    return csContainers.filter(c => c.vesselId === selectedVesselId);
  }, [csContainers, selectedVesselId]);

  const selectedVessel = useMemo(() => vessels.find(v => v.id === selectedVesselId), [vessels, selectedVesselId]);

  // Sort containers: Errors/Warnings first
  const sortedContainers = useMemo(() => {
    const sorted = [...currentVesselContainers];
    // If we have validation errors, bring them to top so Customs can fix
    if (validationErrors.size === 0 && validationWarnings.size === 0) {
      return sorted;
    }
    return sorted.sort((a, b) => {
      const aPriority = validationErrors.has(a.id) ? 2 : (validationWarnings.has(a.id) ? 1 : 0);
      const bPriority = validationErrors.has(b.id) ? 2 : (validationWarnings.has(b.id) ? 1 : 0);
      return bPriority - aPriority;
    });
  }, [currentVesselContainers, validationErrors, validationWarnings]);

  // CORE LOGIC FIX: Handle Data Persistence vs Reset
  useEffect(() => {
    const isVesselChanged = prevVesselIdRef.current !== selectedVesselId;

    if (isVesselChanged) {
      // CASE 1: Vessel Switched - Re-initialize from props (Load saved data)
      const initialData: Record<string, ImportRowData> = {};
      currentVesselContainers.forEach(c => {
        initialData[c.id] = {
          dnlDeclNo: c.dnlDeclNo || '',
          dnlDeclDate: c.dnlDeclDate || '',
          packages: c.customsPkgs ? c.customsPkgs.toString() : '',
          tons: c.customsWeight ? c.customsWeight.toString() : '',
          sealNo: c.sealNumber || '',
          transportDeclNo: c.transportDeclNo || '',
          transportDeclDate: c.transportDeclDate || ''
        };
      });
      setImportGridData(initialData);
      setValidationErrors(new Set()); // Clear old errors
      setValidationWarnings(new Set());
      setMissingDataAlert(null);
      setDiscrepancyModal(null);
      setMultiDiscrepancyModal(null);

      // Update ref
      prevVesselIdRef.current = selectedVesselId;
    } else {
      // CASE 2: Same vessel, props updated. Sync new containers if any.
      setImportGridData(prev => {
        const nextState = { ...prev };
        let hasChanges = false;
        currentVesselContainers.forEach(c => {
          if (!nextState[c.id]) {
            nextState[c.id] = {
              dnlDeclNo: c.dnlDeclNo || '',
              dnlDeclDate: c.dnlDeclDate || '',
              packages: c.customsPkgs ? c.customsPkgs.toString() : '',
              tons: c.customsWeight ? c.customsWeight.toString() : '',
              sealNo: c.sealNumber || '',
              transportDeclNo: c.transportDeclNo || '',
              transportDeclDate: c.transportDeclDate || ''
            };
            hasChanges = true;
          }
        });
        return hasChanges ? nextState : prev;
      });
    }
  }, [selectedVesselId, currentVesselContainers]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContainerIds(new Set(sortedContainers.map(c => c.id)));
    } else {
      setSelectedContainerIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedContainerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedContainerIds(newSet);
  };

  const handleMouseDown = (id: string) => {
    setIsDragSelecting(true);
    dragStartIdRef.current = id;

    // If clicking inside an existing selection (of >1 items), preserve it to allow editing.
    // Only start a fresh selection if clicking outside or on a single item.
    if (!selectedContainerIds.has(id) || selectedContainerIds.size <= 1) {
      const newSet = new Set<string>();
      newSet.add(id);
      setSelectedContainerIds(newSet);
    }
  };

  const handleMouseEnter = (id: string) => {
    if (isDragSelecting && dragStartIdRef.current) {
      const startIdx = sortedContainers.findIndex(c => c.id === dragStartIdRef.current);
      const currentIdx = sortedContainers.findIndex(c => c.id === id);
      if (startIdx === -1 || currentIdx === -1) return;

      const [min, max] = [Math.min(startIdx, currentIdx), Math.max(startIdx, currentIdx)];
      const newSet = new Set<string>();
      for (let i = min; i <= max; i++) {
        newSet.add(sortedContainers[i].id);
      }
      setSelectedContainerIds(newSet);
    }
  };

  const handleMouseUp = () => {
    setIsDragSelecting(false);
    dragStartIdRef.current = null;
  };

  const handleGridChange = (containerId: string, field: keyof ImportRowData, value: string) => {
    let processedValue = value;

    // Strict Date Formatting with Logic (Day <= 31, Month <= 12)
    if (field === 'dnlDeclDate' || field === 'transportDeclDate') {
      let digits = value.replace(/\D/g, '');
      if (digits.length > 8) digits = digits.slice(0, 8);

      let day = digits.slice(0, 2);
      let month = digits.slice(2, 4);
      let year = digits.slice(4);

      if (parseInt(day) > 31) day = '31';
      if (day === '00') day = '01';
      if (month.length === 2 && parseInt(month) > 12) month = '12';
      if (month === '00') month = '01';

      if (digits.length <= 2) {
        processedValue = day;
      } else if (digits.length <= 4) {
        processedValue = `${day}/${month}`;
      } else {
        processedValue = `${day}/${month}/${year}`;
      }
    }

    setImportGridData(prev => {
      const newState = { ...prev };

      // Determine targets: If editing a selected row, update ALL selected rows.
      const targets = (selectedContainerIds.has(containerId) && selectedContainerIds.size > 0)
        ? Array.from(selectedContainerIds)
        : [containerId];

      targets.forEach(targetId => {
        // Ensure row exists (just in case)
        if (!newState[targetId]) return;

        const row = { ...newState[targetId] };
        row[field] = processedValue;

        // Auto-fill Date if Declaration No is entered and Date is empty
        if (field === 'dnlDeclNo' && processedValue.length > 0 && !row.dnlDeclDate) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          row.dnlDeclDate = `${dd}/${mm}/${yyyy}`;
        }

        // Auto-calculate Tons
        if (field === 'packages') {
          const numPackages = parseFloat(processedValue);
          if (!isNaN(numPackages)) {
            row.tons = (numPackages * DEFAULT_WEIGHT_PER_PACKAGE).toFixed(2);
          } else if (processedValue === '') {
            row.tons = '';
          }
        }

        newState[targetId] = row;
      });

      // Global Sync Logic (Run once based on the primary interaction row)
      // This ensures that "Same Transport Decl No" rules still apply even after bulk edit
      const primaryRow = newState[containerId];

      // SYNC: Date by Transport Declaration Number (Số TK VC)
      if (field === 'transportDeclDate') {
        const currentRefDeclNo = primaryRow.transportDeclNo;
        if (currentRefDeclNo && currentRefDeclNo.trim() !== '') {
          Object.keys(newState).forEach(key => {
            if (newState[key].transportDeclNo === currentRefDeclNo) {
              newState[key] = { ...newState[key], transportDeclDate: processedValue };
            }
          });
        }
      }

      // SYNC: DNL Decl No by Transport Declaration Number (Số TK VC)
      if (field === 'dnlDeclNo') {
        const currentRefDeclNo = primaryRow.transportDeclNo;
        if (currentRefDeclNo && currentRefDeclNo.trim() !== '') {
          Object.keys(newState).forEach(key => {
            if (newState[key].transportDeclNo === currentRefDeclNo) {
              newState[key] = { ...newState[key], dnlDeclNo: processedValue };

              // Optional: Sync generated date too if it was generated above
              if (primaryRow.dnlDeclDate && (!newState[key].dnlDeclDate || newState[key].dnlDeclDate === '')) {
                newState[key].dnlDeclDate = primaryRow.dnlDeclDate;
              }
            }
          });
        }
      }

      return newState;
    });
  };

  const handlePaste = (e: React.ClipboardEvent, startContainerId: string, field: keyof ImportRowData) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const values = pasteData.split(/\r\n|\n|\r/).filter(v => v.trim() !== '');
    if (values.length === 0) return;

    setImportGridData(prev => {
      const newState = { ...prev };

      // Case 1: Fill Selected Rows (ONLY if multiple are selected)
      if (selectedContainerIds.size > 1) {
        const targetContainers = sortedContainers.filter(c => selectedContainerIds.has(c.id));

        targetContainers.forEach((container, index) => {
          let valToUse = '';
          // If only 1 value pasted, use it for ALL. If list, use corresponding index.
          if (values.length === 1) {
            valToUse = values[0];
          } else {
            valToUse = values[index] !== undefined ? values[index] : ''; // Stop filling if run out of values? Or loop? Usually stop.
            if (index >= values.length) return; // Don't wipe out if run out of values
          }

          const row = newState[container.id] || {
            dnlDeclNo: '', dnlDeclDate: '', packages: '', tons: '', sealNo: '',
            transportDeclNo: '', transportDeclDate: ''
          };
          newState[container.id] = { ...row, [field]: valToUse.trim() };
        });

      } else {
        // Case 2: Standard Fill Down from Start
        const startIndex = sortedContainers.findIndex(c => c.id === startContainerId);
        if (startIndex === -1) return newState;

        values.forEach((val, i) => {
          const targetContainer = sortedContainers[startIndex + i];
          if (targetContainer) {
            const row = newState[targetContainer.id] || {
              dnlDeclNo: '', dnlDeclDate: '', packages: '', tons: '', sealNo: '',
              transportDeclNo: '', transportDeclDate: ''
            };
            newState[targetContainer.id] = { ...row, [field]: val.trim() };
          }
        });
      }
      return newState;
    });
  };

  const executeDataMismatchCheck = () => {
    setIsSaving(true);
    setMissingDataAlert(null);

    setTimeout(() => {
      const errors = new Set<string>();
      const warnings = new Set<string>();

      currentVesselContainers.forEach(c => {
        const row = importGridData[c.id];
        // Only check mismatch if data exists
        if (row && row.packages !== '') {
          const p = parseInt(row.packages);
          const t = parseFloat(row.tons);

          // Compare with CS Data
          const isPkgMismatch = !isNaN(p) && p !== c.packages;
          const isTonsMismatch = !isNaN(t) && Math.abs(t - c.tons) > 0.05;
          const isMissingDnl = !row.dnlDeclNo || row.dnlDeclNo.trim() === '';

          if (isPkgMismatch || isTonsMismatch || isMissingDnl) {
            errors.add(c.id);

            // SYNC TO GLOBAL STATE (CS/DEPOT)
            if (onSyncDiscrepancy) {
              let reason = "";
              if (isMissingDnl) reason = "Thiếu tờ khai DNL";
              else if (isPkgMismatch && isTonsMismatch) reason = `Sai lệch: ${c.packages} kiện/${c.tons} tấn (CS) vs ${p} kiện/${t} tấn (TK)`;
              else if (isPkgMismatch) reason = `Sai lệch số kiện: CS ${c.packages} vs TK ${p}`;
              else if (isTonsMismatch) reason = `Sai lệch trọng lượng: CS ${c.tons} vs TK ${t}`;

              onSyncDiscrepancy(c.id, reason);
            }
          }
        }
      });

      // Update State
      setValidationErrors(errors);
      setValidationWarnings(warnings);
      setIsSaving(false);

      // ALWAYS Save to parent/storage regardless of discrepancies
      if (onSaveCustomsData) {
        onSaveCustomsData(importGridData);
      }

      if (errors.size > 0) {
        alert(`Đã lưu dữ liệu! Phát hiện ${errors.size} sai lệch. Vui lòng kiểm tra các ô màu đỏ.`);
      } else {
        alert("Dữ liệu khớp hoàn toàn. Đã lưu thành công!");
      }
    }, 600);
  };

  const handlePreSaveValidation = () => {
    // 1. Check for missing columns
    const missingAlerts: MissingFieldAlert[] = [];

    currentVesselContainers.forEach(container => {
      const row = importGridData[container.id];
      const missingCols: string[] = [];
      if (!row || !row.dnlDeclNo) missingCols.push("Số TK DNL");
      if (!row || !row.dnlDeclDate) missingCols.push("Ngày TK DNL");
      if (!row || !row.packages) missingCols.push("Số kiện");
      if (!row || !row.tons) missingCols.push("Trọng lượng");

      if (missingCols.length > 0) {
        missingAlerts.push({
          containerId: container.id,
          missingColumns: missingCols
        });
      }
    });

    if (missingAlerts.length > 0) {
      setMissingDataAlert(missingAlerts);
    } else {
      executeDataMismatchCheck();
    }
  };

  // ... (Rest of component)
  // Removed old imperative loop to prevent duplicates


  const handleShowDiscrepancy = (container: ContainerCS) => {
    const rowData = importGridData[container.id] || { packages: '', tons: '' };
    setDiscrepancyModal({
      containerId: container.id,
      csPackages: container.packages,
      csTons: container.tons,
      inputPackages: rowData.packages,
      inputTons: rowData.tons
    });
  };

  const handleShowAllDiscrepancies = () => {
    const list: DiscrepancyModalData[] = [];
    validationErrors.forEach(id => {
      const container = currentVesselContainers.find(c => c.id === id);
      const row = importGridData[id];
      if (container && row) {
        list.push({
          containerId: id,
          csPackages: container.packages,
          csTons: container.tons,
          inputPackages: row.packages,
          inputTons: row.tons
        });
      }
    });
    setMultiDiscrepancyModal(list);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const sealAnalysis = useMemo(() => {
    const counts: Record<string, number> = {};
    savedSeals.forEach(s => {
      counts[s.serialNumber] = (counts[s.serialNumber] || 0) + 1;
    });
    const hasDuplicates = Object.values(counts).some(c => c > 1);
    return { counts, hasDuplicates };
  }, [savedSeals]);

  const sortedSeals = useMemo(() => {
    return [...savedSeals].sort((a, b) =>
      a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [savedSeals]);

  const calculateTotal = () => {
    let count = 0;
    const start = parseInt(sealStart);
    const end = parseInt(sealEnd);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      count += (end - start + 1);
    }
    if (sealOdd.trim()) {
      count += sealOdd.split(/[\n,;]+/).filter(s => s.trim()).length;
    }
    return count;
  };

  const handleSaveSeals = () => {
    const newSeals: SealData[] = [];
    const start = parseInt(sealStart);
    const end = parseInt(sealEnd);


    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const paddingLen = sealStart.length;
      for (let i = start; i <= end; i++) {
        const serial = i.toString().padStart(paddingLen, '0');
        newSeals.push({
          id: `SEAL-${Date.now()}-${i}`,
          vesselId: selectedVesselId,
          serialNumber: `${sealPrefix}${serial}`,
          status: 'Available'
        });
      }
    }

    if (sealOdd.trim()) {
      const oddList = sealOdd.split(/[\n,;]+/).filter(s => s.trim());
      oddList.forEach((s, idx) => {
        newSeals.push({
          id: `SEAL-ODD-${Date.now()}-${idx}`,
          vesselId: selectedVesselId,
          serialNumber: s.trim(),
          status: 'Available'
        });
      });
    }

    if (newSeals.length === 0) {
      alert("Vui lòng nhập dải số hợp lệ hoặc số seal lẻ.");
      return;
    }

    const updatedSeals = [...allSeals, ...newSeals];
    setAllSeals(updatedSeals);
    // DB Save
    db.upsertSeals(updatedSeals).catch(console.error);

    // DEBUG: Log seals after saving
    console.log('[DEBUG Customs] Saved Seals:', updatedSeals);

    // Notify Inspector
    if (newSeals.length > 0) {
      const vessel = vessels.find(v => v.id === selectedVesselId);
      StorageService.addNotification({
        title: "DỮ LIỆU SEAL (HÀNG XUẤT)",
        message: `Hải quan đã nhập Seal cho tàu ${vessel?.name || 'Unknown'}.`,
        type: 'INFO',
        targetRoles: [Role.INSPECTOR]
      });
    }

    setSealStart("");
    setSealEnd("");
    setSealOdd("");
  };
  const handleDeleteSeal = (id: string) => {
    const updatedSeals = allSeals.filter(s => s.id !== id);
    setAllSeals(updatedSeals);
    db.deleteSeal(id).catch(console.error);
  };

  const handleInputFocus = (containerId: string) => {
    // If multiple items are selected, and we focus on a specific "unique" field (Seal/Packages),
    // we want to drop the selection to JUST this item to prevent accidental bulk overwrite.
    if (selectedContainerIds.size > 1 && selectedContainerIds.has(containerId)) {
      const newSet = new Set<string>();
      newSet.add(containerId);
      setSelectedContainerIds(newSet);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Multi Discrepancy Modal */}
      {multiDiscrepancyModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center text-white font-bold text-lg">
                <AlertTriangle size={24} className="mr-3" />
                Tổng hợp Sai lệch ({multiDiscrepancyModal.length} containers)
              </div>
              <button
                onClick={() => setMultiDiscrepancyModal(null)}
                className="text-red-100 hover:text-white hover:bg-red-500/50 p-1 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Container ID</th>
                    <th className="px-6 py-4 text-center bg-blue-50/50">Dữ liệu CS (Gốc)</th>
                    <th className="px-6 py-4 text-center bg-red-50/30">Dữ liệu Nhập (Tờ khai)</th>
                    <th className="px-6 py-4 text-center">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {multiDiscrepancyModal.map((item, idx) => {
                    const inputPkg = parseInt(item.inputPackages) || 0;
                    const inputTons = parseFloat(item.inputTons) || 0;
                    const pkgDiff = inputPkg - item.csPackages;
                    const tonsDiff = inputTons - item.csTons;
                    const hasPkgErr = inputPkg !== item.csPackages;
                    const hasTonsErr = Math.abs(tonsDiff) > 0.05;

                    return (
                      <tr key={item.containerId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-700 border-r border-slate-100">
                          {idx + 1}. {item.containerId}
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-100 bg-blue-50/30">
                          <div className="flex justify-center space-x-4">
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 uppercase">Số kiện</div>
                              <div className="font-mono text-blue-700 font-bold text-base">{item.csPackages}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 uppercase">Trọng lượng</div>
                              <div className="font-mono text-blue-700 font-bold text-base">{item.csTons}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-100 bg-red-50/20">
                          <div className="flex justify-center space-x-4">
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 uppercase">Số kiện</div>
                              <div className={`font-mono font-bold text-base ${hasPkgErr ? "text-red-600 bg-red-100 px-2 rounded" : "text-slate-700"}`}>
                                {item.inputPackages}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 uppercase">Trọng lượng</div>
                              <div className={`font-mono font-bold text-base ${hasTonsErr ? "text-red-600 bg-red-100 px-2 rounded" : "text-slate-700"}`}>
                                {item.inputTons}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {(hasPkgErr || hasTonsErr) && (
                            <div className="flex flex-col items-center justify-center space-y-1">
                              {hasPkgErr && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100 w-fit">
                                  {pkgDiff > 0 ? `+${pkgDiff}` : pkgDiff} kiện
                                </span>
                              )}
                              {hasTonsErr && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100 w-fit">
                                  {tonsDiff > 0 ? `+${tonsDiff.toFixed(2)}` : tonsDiff.toFixed(2)} tấn
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setMultiDiscrepancyModal(null)}
                className="px-6 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Detail Modal */}
      {discrepancyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
              <div className="flex items-center text-red-700 font-bold">
                <AlertTriangle size={20} className="mr-2" />
                Chi tiết Sai lệch Dữ liệu
              </div>
              <button onClick={() => setDiscrepancyModal(null)} className="text-red-400 hover:text-red-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Container ID</span>
                <div className="text-xl font-mono font-bold text-slate-800">{discrepancyModal.containerId}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Left: System Data */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Dữ liệu Hệ thống (CS)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Số kiện:</span>
                      <span className="font-mono font-bold text-blue-700">{discrepancyModal.csPackages}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Trọng lượng:</span>
                      <span className="font-mono font-bold text-blue-700">{discrepancyModal.csTons}</span>
                    </div>
                  </div>
                </div>

                {/* Right: User Input Data */}
                <div className="bg-white p-4 rounded-lg border-2 border-red-100 shadow-sm">
                  <h4 className="text-xs font-bold text-red-500 uppercase mb-3 text-center">Dữ liệu Nhập tay</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Số kiện:</span>
                      <span className={`font-mono font-bold ${parseInt(discrepancyModal.inputPackages) !== discrepancyModal.csPackages ? 'text-red-600 bg-red-50 px-1 rounded' : 'text-slate-800'}`}>
                        {discrepancyModal.inputPackages || '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Trọng lượng:</span>
                      <span className={`font-mono font-bold ${parseFloat(discrepancyModal.inputTons) !== discrepancyModal.csTons ? 'text-red-600 bg-red-50 px-1 rounded' : 'text-slate-800'}`}>
                        {discrepancyModal.inputTons || '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-slate-400 italic">
                Vui lòng kiểm tra lại tờ khai hoặc liên hệ CS để xác minh.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setDiscrepancyModal(null)}
                className="px-6 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Data Modal */}
      {missingDataAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-amber-50 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertCircle className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Cảnh báo: Dữ liệu chưa đầy đủ</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Phát hiện <strong>{missingDataAlert.length}</strong> container còn thiếu thông tin bắt buộc.
                  </p>
                </div>
              </div>
              <button onClick={() => setMissingDataAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50">
              {selectedVessel && (
                <div className="mb-4 text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-bold">Tàu / Chuyến</span>
                    <span className="font-medium">{selectedVessel.name} - {selectedVessel.voyageNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-bold">Lịch tàu (ETA - ETD)</span>
                    <span className="font-medium">{formatDate(selectedVessel.eta)} - {formatDate(selectedVessel.etd)}</span>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="px-4 py-2">Container ID</th>
                      <th className="px-4 py-2 text-red-600">Thông tin thiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingDataAlert.map((item) => (
                      <tr key={item.containerId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-medium">{item.containerId}</td>
                        <td className="px-4 py-2 text-red-600 italic">
                          {item.missingColumns.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end space-x-3 bg-white rounded-b-xl">
              <button
                onClick={() => setMissingDataAlert(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Quay lại điền tiếp
              </button>
              <button
                onClick={executeDataMismatchCheck}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm flex items-center"
              >
                <AlertTriangle size={16} className="mr-2" />
                Xác nhận Vẫn Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-white px-6 pt-4">
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`pb-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'IMPORT' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Nghiệp vụ Nhập
          </button>
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`pb-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'EXPORT' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Nghiệp vụ Xuất
          </button>
        </div>

        <div className="p-6 bg-white">

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-slate-700">Chọn chuyến tàu:</label>
              <select
                className="border border-slate-300 rounded px-3 py-1.5 text-sm min-w-[250px]"
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
              >
                {vessels.filter(v =>
                  activeTab === 'IMPORT' ? v.status === VesselStatus.INBOUND : v.status === VesselStatus.OUTBOUND
                ).map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} | {formatDate(v.eta)} - {formatDate(v.etd)}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'IMPORT' && (
              <button
                onClick={handlePreSaveValidation}
                disabled={isSaving}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} />
                    Kiểm tra & Lưu
                  </>
                )}
              </button>
            )}
          </div>

          {activeTab === 'IMPORT' && (
            <div className="animate-fade-in">
              {validationErrors.size > 0 && (
                <div
                  onClick={handleShowAllDiscrepancies}
                  className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start cursor-pointer hover:bg-red-100 transition-all shadow-sm group"
                  role="button"
                  title="Nhấn để xem danh sách chi tiết"
                >
                  <AlertTriangle className="mt-0.5 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform" size={20} />
                  <div>
                    <p className="font-bold flex items-center">
                      Phát hiện sai lệch dữ liệu!
                      <span className="ml-2 text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-normal opacity-80 group-hover:opacity-100">
                        Xem chi tiết {validationErrors.size} lỗi
                      </span>
                    </p>
                    <p className="text-sm mt-1">
                      Có {validationErrors.size} container sai lệch so với dữ liệu CS (được tô đỏ).
                      Hệ thống đã khoanh vùng các container cùng tờ khai vận chuyển (tô cam) để tạm dừng khai thác.
                    </p>
                  </div>
                </div>
              )}

              <div
                className="border border-slate-200 rounded-xl overflow-hidden shadow-sm select-none"
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 bg-slate-50 w-10 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            onChange={handleSelectAll}
                            checked={sortedContainers.length > 0 && selectedContainerIds.size === sortedContainers.length}
                          />
                        </th>
                        <th className="px-4 py-3 bg-slate-50 min-w-[120px]">List Cont</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-800 min-w-[100px] border-l border-blue-100">Số Seal</th>
                        <th className="px-4 py-3 bg-slate-50 min-w-[120px]">Số TK VC</th>
                        <th className="px-4 py-3 bg-slate-50 min-w-[100px]">Ngày TK VC</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-800 min-w-[140px] border-l border-blue-100">Số TK DNL</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-800 min-w-[120px]">Ngày TK DNL</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-800 w-24">Số kiện</th>
                        <th className="px-4 py-3 bg-blue-50 text-blue-800 w-24">Trọng lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedContainers.map((container) => {
                        const rowData = importGridData[container.id] || { dnlDeclNo: '', dnlDeclDate: '', packages: '', tons: '', sealNo: '' };
                        const isError = validationErrors.has(container.id);
                        const isWarning = validationWarnings.has(container.id);
                        const isSelected = selectedContainerIds.has(container.id);

                        let rowClass = "hover:bg-slate-50 group border-b border-slate-100 transition-colors";
                        if (isSelected) rowClass = "bg-blue-50 hover:bg-blue-100 border-b border-blue-200";
                        else if (isError) rowClass = "bg-red-100 hover:bg-red-200 border-b border-red-200";
                        else if (isWarning) rowClass = "bg-orange-100 hover:bg-orange-200 border-b border-orange-200";

                        return (
                          <tr key={container.id} className={rowClass}>
                            <td
                              className="px-3 py-2 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                              onMouseDown={() => handleMouseDown(container.id)}
                              onMouseEnter={() => handleMouseEnter(container.id)}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 pointer-events-none"
                                checked={isSelected}
                                readOnly
                              />
                            </td>
                            <td className="px-4 py-2 font-mono font-medium text-slate-700">{container.id}</td>
                            <td className="p-1 border-l border-slate-100">
                              <input
                                type="text"
                                className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-mono text-blue-900`}
                                placeholder="Nhập Seal..."
                                value={rowData.sealNo}
                                onChange={(e) => handleGridChange(container.id, 'sealNo', e.target.value)}
                                onFocus={() => handleInputFocus(container.id)}
                              />
                            </td>
                            <td className={`p-1 border-l ${isError ? 'border-red-200' : isWarning ? 'border-orange-200' : 'border-slate-100'}`}>
                              <input
                                type="text"
                                className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-mono text-slate-700`}
                                placeholder="Nhập số TK VC..."
                                value={rowData.transportDeclNo || ''}
                                onChange={(e) => handleGridChange(container.id, 'transportDeclNo', e.target.value)}
                                onPaste={(e) => handlePaste(e, container.id, 'transportDeclNo')}
                                onMouseDown={() => handleMouseDown(container.id)}
                                onMouseEnter={() => handleMouseEnter(container.id)}
                              />
                            </td>
                            <td className="p-1">
                              <div className="relative w-full h-full group/date">
                                <input
                                  type="text"
                                  placeholder="dd/mm/yyyy"
                                  className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-mono text-slate-600`}
                                  value={rowData.transportDeclDate || ''}
                                  onChange={(e) => handleGridChange(container.id, 'transportDeclDate', e.target.value)}
                                  onPaste={(e) => handlePaste(e, container.id, 'transportDeclDate')}
                                  onMouseDown={() => handleMouseDown(container.id)}
                                  onMouseEnter={() => handleMouseEnter(container.id)}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/date:opacity-100 transition-opacity">
                                  <div className="relative">
                                    <Calendar size={14} className="text-slate-400 cursor-pointer hover:text-blue-600" />
                                    <input
                                      type="date"
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                      onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [y, m, d] = e.target.value.split('-');
                                        handleGridChange(container.id, 'transportDeclDate', `${d}/${m}/${y}`);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className={`p-1 border-l ${isError ? 'border-red-200' : isWarning ? 'border-orange-200' : 'border-slate-100'}`}>
                              <input
                                type="text"
                                className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-mono ${isError ? 'text-red-900 placeholder-red-300' : 'text-blue-900'}`}
                                placeholder="Nhập số TK..."
                                value={rowData.dnlDeclNo}
                                onChange={(e) => handleGridChange(container.id, 'dnlDeclNo', e.target.value)}
                                onMouseDown={() => handleMouseDown(container.id)}
                                onMouseEnter={() => handleMouseEnter(container.id)}
                              />
                            </td>
                            <td className="p-1">
                              <div className="relative w-full h-full group/date">
                                <input
                                  type="text"
                                  placeholder="dd/mm/yyyy"
                                  className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-mono ${isError ? 'text-red-900 placeholder-red-300' : 'text-blue-900'}`}
                                  value={rowData.dnlDeclDate || ''}
                                  onChange={(e) => handleGridChange(container.id, 'dnlDeclDate', e.target.value)}
                                  onMouseDown={() => handleMouseDown(container.id)}
                                  onMouseEnter={() => handleMouseEnter(container.id)}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/date:opacity-100 transition-opacity">
                                  <div className="relative">
                                    <Calendar size={14} className="text-slate-400 cursor-pointer hover:text-blue-600" />
                                    <input
                                      type="date"
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                      onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [y, m, d] = e.target.value.split('-');
                                        handleGridChange(container.id, 'dnlDeclDate', `${d}/${m}/${y}`);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-1">
                              <div className="relative">
                                <input
                                  type="number"
                                  className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-medium text-center ${isError ? 'text-red-900 font-bold' : 'text-blue-900'}`}
                                  value={rowData.packages}
                                  onChange={(e) => handleGridChange(container.id, 'packages', e.target.value)}
                                  placeholder={container.packages.toString()}
                                  onFocus={() => handleInputFocus(container.id)}
                                />
                                {isError && (
                                  <button
                                    onClick={() => handleShowDiscrepancy(container)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 pr-1 cursor-pointer hover:scale-110 transition-transform"
                                    title="Xem chi tiết sai lệch"
                                  >
                                    <AlertOctagon size={16} className="text-red-600 drop-shadow-sm" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-1">
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  className={`w-full px-3 py-1.5 border border-transparent focus:border-blue-500 focus:bg-white bg-transparent focus:outline-none rounded transition-all font-medium text-center ${isError ? 'text-red-900 font-bold' : 'text-blue-900'}`}
                                  value={rowData.tons}
                                  onChange={(e) => handleGridChange(container.id, 'tons', e.target.value)}
                                  placeholder={container.tons.toString()}
                                />
                                {isError && (
                                  <button
                                    onClick={() => handleShowDiscrepancy(container)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 pr-1 cursor-pointer hover:scale-110 transition-transform"
                                    title="Xem chi tiết sai lệch"
                                  >
                                    <AlertOctagon size={16} className="text-red-600 drop-shadow-sm" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedContainers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                            Không có container nào trong kế hoạch nhập của chuyến tàu này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-3 flex items-start justify-between text-xs text-slate-500">
                <div className="flex items-center">
                  <Shield size={12} className="mr-1" />
                  <span>Dữ liệu cột màu xanh được nhập bởi NVTTHQ.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-1"></span> Sai lệch</span>
                  <span className="flex items-center"><span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-1"></span> Cùng tờ khai</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'EXPORT' && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5 space-y-6">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <Plus size={18} className="mr-2" />
                    Nhập Seal
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ký hiệu (Prefix)</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                        placeholder="VD: T/25."
                        value={sealPrefix}
                        onChange={(e) => setSealPrefix(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Từ số (Start)</label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                          placeholder="0251111"
                          value={sealStart}
                          onChange={(e) => {
                            if (/^\d*$/.test(e.target.value)) setSealStart(e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Đến số (End)</label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                          placeholder="0252000"
                          value={sealEnd}
                          onChange={(e) => {
                            if (/^\d*$/.test(e.target.value)) setSealEnd(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 flex justify-between">
                        <span>Số seal lẻ (Nếu có)</span>
                        <span className="text-[10px] font-normal text-slate-400 lowercase">phân cách bằng dấu phẩy</span>
                      </label>
                      <textarea
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono h-20"
                        placeholder="76-Vu, 12345, ..."
                        value={sealOdd}
                        onChange={(e) => setSealOdd(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm text-blue-800 font-medium">Tổng số lượng dự kiến:</span>
                      <span className="text-lg font-bold text-blue-700">{calculateTotal()}</span>
                    </div>

                    <button
                      onClick={handleSaveSeals}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Lưu
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
                    <h4 className="font-semibold text-slate-700 flex items-center">
                      <Shield size={16} className="mr-2 text-green-600" />
                      Seal hiện có
                    </h4>
                    <div className="flex space-x-2">
                      {sealAnalysis.hasDuplicates && (
                        <div className="flex items-center text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100">
                          <AlertTriangle size={12} className="mr-1" />
                          Phát hiện trùng lặp
                        </div>
                      )}
                      <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                        Tổng: {savedSeals.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-0 overflow-y-auto max-h-[500px]">
                    {savedSeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Hash size={48} className="mb-3 opacity-20" />
                        <p className="text-sm italic">Chưa có dữ liệu seal cho chuyến tàu này.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white sticky top-0 shadow-sm z-10 text-slate-500 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-3 font-semibold bg-slate-50">STT</th>
                            <th className="px-4 py-3 font-semibold bg-slate-50">Số Seal</th>
                            <th className="px-4 py-3 font-semibold bg-slate-50 text-center">Trạng thái</th>
                            <th className="px-4 py-3 font-semibold bg-slate-50 text-right">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedSeals.map((seal, idx) => {
                            const isDuplicate = sealAnalysis.counts[seal.serialNumber] > 1;
                            return (
                              <tr key={seal.id} className={isDuplicate ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}>
                                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                <td className={`px-4 py-2 font-mono font-medium ${isDuplicate ? "text-red-700 font-bold" : "text-slate-700"}`}>
                                  {seal.serialNumber}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {isDuplicate ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                                      Trùng lặp
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Available
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    onClick={() => handleDeleteSeal(seal.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};