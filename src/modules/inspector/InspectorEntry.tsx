
import React, { useState, useEffect } from 'react';
import { Vessel, Shift, TallyReport, WorkOrder, MechanicalDetail, TallyItem, Container } from './types';
import { HANDLING_METHODS, MOCK_CONTAINERS } from './constants';
import LoginView from './views/LoginView';
import VesselSelectionView from './views/VesselSelectionView';
import TallyReportView from './views/TallyReportView';
import HistoryView from './views/HistoryView';
import TallyModeSelectionView from './views/TallyModeSelectionView';
import CompletionView from './views/CompletionView';
import Header from './components/Header';
import SuccessPopup from './components/SuccessPopup';
import { StorageService } from '../../services/storage';
import { db } from '../../services/db'; // Import DB
import { User } from '../../types'; // Global User
import { Vessel as LogisticsVessel, Container as LogisticsContainer, ResourceMember, ServicePrice } from '../logistics/types';
import { SealData, Vehicle } from '../paper/types';


type AppStep =
  | 'DANG_NHAP'
  | 'CHON_LOAI_TALLY'
  | 'CHON_TAU'
  | 'NHAP_TALLY'
  | 'DANH_SACH_TALLY'
  | 'DANH_SACH_WO'
  | 'HOAN_TAT';

interface InspectorProps {
  user: User;
  onLogout: () => void;
}

const InspectorEntry: React.FC<InspectorProps> = ({ user: globalUser, onLogout }) => {
  const [step, setStep] = useState<AppStep>('CHON_LOAI_TALLY'); // Skip login
  const [user, setUser] = useState<string | null>(globalUser.username);
  const [tallyMode, setTallyMode] = useState<'NHAP' | 'XUAT' | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Initial Load from DB
  useEffect(() => {
    // parallel fetch
    Promise.all([
      db.getTallyReports(),
      db.getWorkOrders(),
      db.getVessels(),
      db.getContainers(),
      db.getSeals(),
      db.getTransportVehicles()
    ]).then(([reports, wos, vessels, conts, seals, vehicles]) => {
      setAllReports(reports);
      setAllWorkOrders(wos);
      setLogisticsVessels(vessels);
      setLogisticsContainers(conts);
      setExportSeals(seals);
      setExportVehicles(vehicles);
    });

    // Legacy: Resources and Prices still from Storage (or TODO: move to DB)
    setResources(StorageService.getResources([]));
    setPrices(StorageService.getPrices([]));
  }, []);

  const [allReports, setAllReports] = useState<TallyReport[]>([]);
  // Use any here to bypass strict local type mismatch, effectively we use the DB type now
  const [allWorkOrders, setAllWorkOrders] = useState<any[]>([]);

  // Synced from CS (DB)
  const [logisticsVessels, setLogisticsVessels] = useState<LogisticsVessel[]>([]);
  const [logisticsContainers, setLogisticsContainers] = useState<LogisticsContainer[]>([]);
  const [resources, setResources] = useState<ResourceMember[]>([]);
  // Load Prices for Weight Factor
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  // Synced from Paper (DB)
  const [exportSeals, setExportSeals] = useState<SealData[]>([]);
  const [exportVehicles, setExportVehicles] = useState<Vehicle[]>([]);

  const [editingReport, setEditingReport] = useState<TallyReport | null>(null);
  const [lastCreatedWOs, setLastCreatedWOs] = useState<WorkOrder[]>([]);
  const [lastCreatedReports, setLastCreatedReports] = useState<TallyReport[]>([]);

  // Listen for external updates (e.g. from Logistics)
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent) => {
      if (e.detail.key === 'danalog_resources') {
        setResources(e.detail.value);
      }
      if (e.detail.key === 'danalog_vessels') {
        setLogisticsVessels(e.detail.value);
      }
      if (e.detail.key === 'danalog_containers') {
        setLogisticsContainers(e.detail.value);
      }
      if (e.detail.key === 'danalog_seals') {
        setExportSeals(e.detail.value);
      }
      if (e.detail.key === 'danalog_export_vehicles') {
        setExportVehicles(e.detail.value);
      }
    };
    window.addEventListener('storage-update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
  }, []);

  // Removed local storage sync effects as we now save directly on action
  // But kept listener for Resources updates (if they are still local)


  // Derived Data for Views
  const inspectorVessels: Vessel[] = logisticsVessels.map(v => {
    let isBlocked = false;
    let blockReason = '';

    if (v.exportPlanActive) {
      const hasSeals = exportSeals.some(s => s.vesselId === v.id);
      const hasVehicles = exportVehicles.some(veh => veh.vesselId === v.id);

      if (!hasSeals) blockReason = 'Chưa có Seal HQ';
      else if (!hasVehicles) blockReason = 'Chưa có Xe Thớt';

      if (!hasSeals || !hasVehicles) isBlocked = true;
    }

    return {
      id: v.id,
      name: v.vesselName,
      voyage: v.voyageNo || '',
      eta: v.eta,
      etd: v.etd,
      customerName: v.consignee,
      totalConts: v.totalContainers,
      totalUnitsExpected: v.totalPkgs,
      totalWeightExpected: v.totalWeight,
      isExport: v.exportPlanActive,
      isBlocked,
      blockReason
    };
  });

  const inspectorContainers: Container[] = logisticsContainers.map(c => ({
    id: c.id,
    contNo: c.containerNo,
    size: c.size,
    expectedUnits: c.pkgs,
    expectedWeight: c.weight,
    owner: c.vendor,
    sealNo: c.sealNo,
    tkHouse: c.tkNhaVC,
    tkHouseDate: c.ngayTkNhaVC,
    tkDnl: c.tkDnlOla,
    tkDnlDate: c.ngayTkDnl,
    detLimit: c.detExpiry
  })); // We will filter these by vessel in TallyReportView or before passing

  const workerOptions = resources.filter(r => r.type === 'LABOR').map(r => r.name);
  const driverOptions = resources.filter(r => r.type === 'MECHANICAL' && !r.isOutsourced).map(r => r.name);
  const externalUnitOptions = resources.filter(r => r.type === 'EXTERNAL_UNIT').map(r => r.name);

  // DEBUG: Log resources and options
  console.log('[DEBUG Inspector] Resources:', resources);
  console.log('[DEBUG Inspector] Driver Options (MECHANICAL & !isOutsourced):', driverOptions);
  console.log('[DEBUG Inspector] External Unit Options:', externalUnitOptions);


  const [showSuccess, setShowSuccess] = useState(false);

  // Removed internal handleLogin


  const handleSelectMode = (mode: 'NHAP' | 'XUAT') => {
    setTallyMode(mode);
    setStep('CHON_TAU');
  };

  const handleSelectVessel = (vessel: Vessel, shift: Shift, date: string, isHoliday: boolean, isWeekend: boolean) => {
    setSelectedVessel(vessel);
    setSelectedShift(shift);
    setSelectedDate(date);
    setStep('NHAP_TALLY');
  };

  const handleSaveReport = async (report: TallyReport, isDraft: boolean) => {
    let finalReports: TallyReport[] = [];
    const ITEMS_PER_PAGE = 15;
    let hasError = false;

    // Helper to generate unique IDs
    const generateId = (prefix: string, index: number = 0) => `${prefix}-${Date.now()}-${index}`;

    try {
      if (editingReport) {
        setAllReports(allReports.map(r => r.id === report.id ? report : r));
        finalReports = [report];
        setEditingReport(null);
      } else {
        // LOGIC TÁCH TALLY: Container thường vs Xe thớt (chỉ áp dụng hàng Nhập)
        let groupedItems: { container: TallyItem[], flatbed: TallyItem[] } = { container: [], flatbed: [] };

        if (report.mode === 'NHAP') {
          report.items.forEach(item => {
            const isFlatbed = item.contNo.includes('/') || (MOCK_CONTAINERS[report.vesselId]?.find(c => c.contNo === item.contNo)?.size === 'XE THỚT');

            if (isFlatbed) groupedItems.flatbed.push(item);
            else groupedItems.container.push(item);
          });
        } else {
          groupedItems.container = report.items;
        }

        // Tạo các report con từ các nhóm
        const createSubReports = (items: TallyItem[], category: 'CONTAINER' | 'XE_THOT') => {
          if (items.length === 0) return;
          const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

          // Find max sequence specifically for this vessel and mode pattern
          // ID pattern: MODE-VesselID-Seq (e.g., NHAP-v4-01)
          const idPrefix = `${report.mode}-${report.vesselId}-`;
          const existingReports = allReports.filter(r => r.id && r.id.startsWith(idPrefix));

          let maxSeq = 0;
          existingReports.forEach(r => {
            const parts = r.id.split('-');
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          });

          // Also check against currently generated reports in this batch to avoid duplicates within same save action
          finalReports.forEach(r => {
            if (r.id && r.id.startsWith(idPrefix)) {
              const parts = r.id.split('-');
              const lastPart = parts[parts.length - 1];
              const num = parseInt(lastPart);
              if (!isNaN(num) && num > maxSeq) maxSeq = num;
            }
          });

          let currentSeq = maxSeq;

          for (let i = 0; i < totalPages; i++) {
            currentSeq++;
            const seqStr = currentSeq.toString().padStart(2, '0');
            const chunkItems = items.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE);

            const subReport: TallyReport = {
              ...report,
              id: `${idPrefix}${seqStr}`,
              items: chunkItems,
              vehicleCategory: category
            };
            finalReports.push(subReport);
          }
        };

        createSubReports(groupedItems.container, 'CONTAINER');
        createSubReports(groupedItems.flatbed, 'XE_THOT');

        // Update Local State
        setAllReports(prev => [...finalReports, ...prev]);

        // DB SAVE (Async & Strict)
        for (const r of finalReports) {
          const result = await db.upsertTallyReport(r);
          if (!result) {
            console.error(`Failed to save report ${r.id}`);
            hasError = true;
          }
        }
      }

      if (isDraft) {
        if (!hasError) {
          setShowSuccess(true);
          setStep('DANH_SACH_TALLY');
        } else {
          alert("Lỗi: Không thể lưu nháp phiếu Tally. Vui lòng kiểm tra kết nối mạng và thử lại.");
        }
      } else {
        // CRITICAL: Mark used seals as 'Used' to prevent reuse
        if (report.mode === 'XUAT') {
          const usedSealNumbers = new Set<string>();
          finalReports.forEach(r => {
            r.items.forEach(item => {
              if (item.sealNo) {
                item.sealNo.split(', ').forEach(s => {
                  const trimmed = s.trim();
                  if (trimmed) usedSealNumbers.add(trimmed);
                });
              }
            });
          });

          if (usedSealNumbers.size > 0) {
            const updatedSeals = exportSeals.map(seal => {
              if (usedSealNumbers.has(seal.serialNumber)) {
                return { ...seal, status: 'Used' as const };
              }
              return seal;
            });

            // Update Local
            setExportSeals(updatedSeals);
            // DB Save
            const { error: sealError } = await db.upsertSeals(updatedSeals);
            if (sealError) console.error("Error updating seals", sealError);
          }
        }

        // --- CUSTOMER REQUIREMENT: Sync Status to Logistics Containers (CS Dashboard) ---
        const containersToUpdate: LogisticsContainer[] = [];

        finalReports.forEach(r => {
          const isComplete = r.status === 'HOAN_TAT';
          if (!isComplete) return;

          r.items.forEach(item => {
            // Find matching container in Global Logistics List
            const existingCont = logisticsContainers.find(c =>
              c.containerNo === item.contNo || c.id === item.contId // match by No or ID
            );

            if (existingCont) {
              // Append new Proof Image if exists (FROM ITEM PHOTOS)
              const currentImages = existingCont.images || [];
              // Sync photos from the Tally Item to the Logistics Container
              if (item.photos && item.photos.length > 0) {
                item.photos.forEach(p => {
                  if (!currentImages.includes(p)) {
                    currentImages.push(p);
                  }
                });
              }

              // Update fields
              containersToUpdate.push({
                ...existingCont,
                status: 'COMPLETED' as any, // Mark as Exploited
                inspector: r.createdBy,     // Update Inspector Name
                shift: r.shift,             // Update Shift
                workOrderApproved: true,    // Auto-approve WO check?
                tallyApproved: true,        // Auto-approve Tally
                images: currentImages,      // Sync Image
                ngayNhapKho: r.workDate,    // Sync Work Date from Tally to Date In
                // updated_at: ... handled by DB service
              });
            }
          });
        });

        if (containersToUpdate.length > 0) {
          // 1. Update Local State to reflect immediately
          setLogisticsContainers(prev => prev.map(c => {
            const updated = containersToUpdate.find(u => u.id === c.id);
            return updated || c;
          }));

          // 2. Save to DB
          const { error: batchErr } = await db.upsertContainers(containersToUpdate);
          if (batchErr) {
            console.error("Error syncing containers to CS:", batchErr);
            // Non-critical, but good to warn?
          }
        }
        // --------------------------------------------------------------------------------

        setLastCreatedReports(finalReports);
        const newWOs: WorkOrder[] = [];

        finalReports.forEach((r) => {
          const totalUnits = r.items.reduce((sum, item) => sum + item.actualUnits, 0);
          const totalWeight = r.items.reduce((sum, item) => sum + item.actualWeight, 0);

          let unitLabel = 'Cont';
          if (r.mode === 'XUAT' || r.vehicleCategory === 'XE_THOT') {
            unitLabel = 'Xe';
          }

          let workerHandlingMethod = "";
          if (r.mode === 'XUAT') {
            workerHandlingMethod = HANDLING_METHODS.WORKER_EXPORT;
          } else {
            if (r.vehicleCategory === 'XE_THOT') {
              workerHandlingMethod = HANDLING_METHODS.WORKER_IMPORT_FLATBED;
            } else {
              workerHandlingMethod = HANDLING_METHODS.WORKER_IMPORT_CONT;
            }
          }

          const woCN: WorkOrder = {
            id: generateId('WO-CN', newWOs.length),
            reportId: r.id,
            type: 'CONG_NHAN',
            organization: r.workerNames || 'Tổ Công Nhân',
            personCount: r.workerCount,
            vehicleType: '',
            vehicleNo: '',
            handlingMethod: workerHandlingMethod,
            commodityType: 'Giấy vuông',
            specification: `${r.items.length} ${unitLabel}`,
            quantity: totalUnits,
            weight: totalWeight,
            dayLaborerCount: 0,
            note: '',
            status: 'COMPLETED' as any // Cast to match DB enum or Inspector string
          };
          newWOs.push(woCN);

          if (r.mechanicalDetails && r.mechanicalDetails.length > 0) {
            const mechGroups: Record<string, MechanicalDetail[]> = {};

            r.mechanicalDetails.forEach(mech => {
              const key = `${mech.isExternal ? 'EXT' : 'INT'}|${mech.task}`;
              if (!mechGroups[key]) mechGroups[key] = [];
              mechGroups[key].push(mech);
            });

            Object.entries(mechGroups).forEach(([key, mechs]) => {
              const [typeCode, task] = key.split('|');
              const isExternal = typeCode === 'EXT';
              const uniqueNames = Array.from(new Set(mechs.map(m => m.name))).filter(Boolean).join(', ');

              const woMech: WorkOrder = {
                id: generateId(isExternal ? 'WO-CG-EXT' : 'WO-CG', newWOs.length),
                reportId: r.id,
                type: isExternal ? 'CO_GIOI_NGOAI' : 'CO_GIOI',
                // Fix: Use the unique external unit name instead of generic "Cơ Giới Ngoài" if available
                organization: isExternal ? uniqueNames : (uniqueNames || r.mechanicalNames || 'Tổ Cơ Giới'),
                personCount: mechs.length,
                vehicleType: r.vehicleType,
                vehicleNo: isExternal ? '' : r.vehicleNo,
                handlingMethod: task,
                commodityType: 'Giấy vuông',
                specification: `${r.items.length} ${unitLabel}`,
                quantity: totalUnits,
                weight: totalWeight,

                dayLaborerCount: 0,
                note: isExternal ? `Thuê ngoài: ${uniqueNames}` : `Lái xe: ${uniqueNames}`,
                status: 'COMPLETED' as any
              };
              newWOs.push(woMech);
            });
          } else {
            if (r.mechanicalCount > 0) {
              const woCG: WorkOrder = {
                id: generateId('WO-CG-LEGACY', newWOs.length),
                reportId: r.id,
                type: 'CO_GIOI',
                organization: r.mechanicalNames || 'Tổ Cơ Giới DNL',
                personCount: r.mechanicalCount,
                vehicleType: r.vehicleType,
                vehicleNo: r.vehicleNo,
                handlingMethod: r.mode === 'NHAP' ? 'Cont -> Cửa kho' : 'Cửa kho -> Lên xe',
                commodityType: 'Giấy vuông',
                specification: `${r.items.length} ${unitLabel}`,
                quantity: totalUnits,
                weight: totalWeight,

                dayLaborerCount: 0,
                note: '',
                status: 'COMPLETED' as any
              };
              newWOs.push(woCG);
            }
          }
        });

        setAllWorkOrders(prev => [...newWOs, ...prev]);

        // DB Save WOs (Strict)
        for (const wo of newWOs) {
          const { error: woError } = await db.upsertWorkOrder(wo as any);
          if (woError) {
            console.error(`Failed to save Work Order ${wo.id}`, woError);
            hasError = true;
          }
        }

        setLastCreatedWOs(newWOs);

        if (!hasError) {
          setStep('HOAN_TAT');
        } else {
          alert("Cảnh báo: Một số dữ liệu (Phiếu Work Order) không lưu được vào hệ thống. Vui lòng báo quản trị viên.");
        }
      }
    } catch (error) {
      console.error("Critical Save Error:", error);
      alert("LỖI NGHIÊM TRỌNG: Đã xảy ra lỗi trong quá trình lưu. Dữ liệu có thể chưa được đồng bộ.");
    }
  };

  const handleNavigate = (target: AppStep | 'LOGOUT' | 'CREATE_IMPORT_TALLY' | 'CREATE_EXPORT_TALLY') => {
    if (target === 'LOGOUT') {
      onLogout();
    } else if (target === 'CREATE_IMPORT_TALLY') {
      setTallyMode('NHAP');
      setStep('CHON_TAU');
    } else if (target === 'CREATE_EXPORT_TALLY') {
      setTallyMode('XUAT');
      setStep('CHON_TAU');
    } else {
      setStep(target as AppStep);
    }
  };

  const renderContent = () => {
    switch (step) {
      // case 'DANG_NHAP': return <LoginView onLogin={handleLogin} />;

      case 'CHON_LOAI_TALLY':
        return <TallyModeSelectionView onSelect={handleSelectMode} />;
      case 'CHON_TAU':
        // FILTER: Strict Import vs Export Separation
        const filteredVessels = inspectorVessels.filter(v =>
          tallyMode === 'XUAT' ? v.isExport : !v.isExport
        );
        return <VesselSelectionView vessels={filteredVessels} onSelect={handleSelectVessel} />;
      case 'NHAP_TALLY':
        // Get weight factor from prices (default: 1.8 = tấn/kiện)
        const configuredWeightFactor = (() => {
          const weightFactorSetting = prices.find(p => p.name === 'Hệ số tấn');
          return weightFactorSetting ? weightFactorSetting.price : 1.8;
        })();

        return (
          <TallyReportView
            vessel={selectedVessel!}
            shift={selectedShift!}
            mode={tallyMode!}
            workDate={selectedDate}
            user={user || ''}
            initialReport={editingReport || undefined}
            onSave={handleSaveReport}
            onFinish={() => setStep('CHON_LOAI_TALLY')}
            onBack={() => setStep('CHON_LOAI_TALLY')}
            availableContainers={inspectorContainers.filter(c => logisticsContainers.find(lc => lc.id === c.id)?.vesselId === selectedVessel?.id)}
            workers={workerOptions}
            drivers={driverOptions}
            externalUnits={externalUnitOptions}
            weightFactor={configuredWeightFactor}
            exportSeals={exportSeals}
            exportVehicles={exportVehicles}
          />
        );
      case 'DANH_SACH_TALLY':
        return <HistoryView reports={allReports} workOrders={allWorkOrders} mode="TALLY" user={user || ''} onEditTally={(r) => { setEditingReport(r); setStep('NHAP_TALLY'); }} />;
      case 'DANH_SACH_WO':
        return <HistoryView reports={allReports} workOrders={allWorkOrders} mode="WO" user={user || ''} />;
      case 'HOAN_TAT':
        return (
          <CompletionView
            workOrders={lastCreatedWOs}
            reports={lastCreatedReports}
            onDone={() => setStep('CHON_LOAI_TALLY')}
          />
        );
      default:
        return <TallyModeSelectionView onSelect={handleSelectMode} />;
    }
  };

  const getHeaderTitle = () => {
    if (step === 'CHON_LOAI_TALLY') return 'CHỌN NGHIỆP VỤ';
    if (step === 'NHAP_TALLY') return `TALLY HÀNG ${tallyMode === 'NHAP' ? 'NHẬP' : 'XUẤT'}`;
    if (step === 'HOAN_TAT') return 'HOÀN TẤT';
    return 'DANALOG';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden">
      {step !== 'HOAN_TAT' && (
        <div className="w-full flex justify-center bg-blue-600 sticky top-0 z-[60] shadow-md">
          <div className="w-full max-w-screen-lg">
            <Header
              title={getHeaderTitle()}
              user={user}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      )}

      <SuccessPopup
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        vesselName={selectedVessel?.name}
      />

      <main className={`flex-1 w-full mx-auto max-w-screen-lg ${step !== 'HOAN_TAT' ? 'p-4 md:p-6 lg:p-8' : ''}`}>

        {renderContent()}
      </main>
    </div>
  );
};

export default InspectorEntry;
