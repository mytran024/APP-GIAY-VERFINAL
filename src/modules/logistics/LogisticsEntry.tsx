
import React, { useState, useEffect, useMemo } from 'react';
import { ICONS, MOCK_USER } from './constants';
import { User, Role as GlobalRole } from '../../types'; // Import global User type
import NotificationDropdown from '../../components/NotificationDropdown';
import { UserRole, Vessel, Container, ContainerStatus, UnitType, BusinessType, ResourceMember, ResourceType, SystemUser, WorkOrder, ServicePrice, WorkOrderType, WorkOrderStatus, TransportVehicle, Consignee } from './types';
import VesselImport from './components/VesselImport';
import Operations from './components/Operations';
import TallyReview from './components/TallyReview';
import Statistics from './components/Statistics';
import ReportsDashboard from './components/ReportsDashboard';
import DebitManagement from './components/DebitManagement';
import PricingConfigPage from './components/PricingConfig';
import UserManagement from './components/UserManagement';
import WorkOrderReview from './components/WorkOrderReview';
import { StorageService } from '../../services/storage';
import { db } from '../../services/db'; // Import Supabase Service
import { TallyReport, WorkOrder as InspectorWorkOrder } from '../inspector/types'; // Import InspectorWorkOrder
import { LogisticsSidebar } from './components/LogisticsSidebar';
import { MOCK_CONSIGNEES } from './services/dataService';


const INITIAL_PRICES: ServicePrice[] = [
  { id: 'weight-factor', name: 'Hệ số khối lượng (tấn/kiện)', unit: 'tấn/kiện', price: 1.8, category: 'UNIT', group: 'GENERAL' },
  { id: '1', name: 'Phí khai thác hàng nhập kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '2', name: 'Phí khai thác hàng xuất kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '3', name: 'Phí xếp lô hàng trong kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '4', name: 'Phí trả container về bãi sau khai thác', unit: 'đồng/cont', price: 220000, category: 'UNIT', group: 'GENERAL' },
  { id: '5', name: 'Phí vận chuyển (từ kho Danalog- Cảng Tiên Sa)', unit: 'đồng/tấn', price: 25000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '6', name: 'Phí thuê kho Tháng', unit: 'đồng/tấn thông qua', price: 10000, category: 'WEIGHT', group: 'GENERAL' },

  { id: 'im_mech_1', name: 'Cont -> Cửa kho', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.IMPORT },
  { id: 'im_mech_2', name: 'Cửa kho -> Xếp lô', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.IMPORT },
  { id: 'im_lab_1', name: 'Đóng mở cont, bấm seal', unit: 'đồng/cont', price: 250000, category: 'UNIT', group: 'METHOD', subGroup: 'LABOR', businessType: BusinessType.IMPORT },
  { id: 'ex_mech_1', name: 'Trong kho -> Cửa kho', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.EXPORT },
  { id: 'ex_lab_1', name: 'Bấm seal (Xe thớt)', unit: 'đồng/ca', price: 1500000, category: 'UNIT', group: 'METHOD', subGroup: 'LABOR', businessType: BusinessType.EXPORT },
];

const INITIAL_RESOURCES: ResourceMember[] = [
  { id: 'r1', name: 'Nguyễn Văn Nam', phone: '0905111222', department: 'KHO', type: ResourceType.LABOR },
  { id: 'r2', name: 'Trần Văn Hùng', phone: '0905333444', department: 'KHO', type: ResourceType.LABOR },
  { id: 'r6', name: 'Nguyễn Văn Tám', phone: '0905123123', department: 'KHO', type: ResourceType.MECHANICAL },
  { id: 'r9', name: 'Phạm Văn Tý', phone: '0905000111', department: 'KHO', type: ResourceType.MECHANICAL, isOutsourced: true, unitName: 'COTRACO' },
];

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1494412574743-019485676a3d?auto=format&fit=crop&q=80&w=800"
];

const INITIAL_USERS: SystemUser[] = [
  { id: '1', username: 'admin', name: 'Nguyễn Văn Kiểm', role: UserRole.INSPECTOR, isActive: true, employeeId: 'NV-831', phone: '0905.123.456', email: '1@danalog.com.vn', department: 'Phòng Khai Thác' },
  { id: '2', username: 'dieudo_dnl', name: 'Trần Thị Thảo', role: UserRole.CS, isActive: true, employeeId: 'NV-202', phone: '0905.999.888', email: 'thao.tt@danalog.com.vn', department: 'Phòng Điều Độ' },
  { id: '3', username: 'cs', name: 'NHÂN VIÊN CS', role: UserRole.CS, isActive: true, employeeId: 'NV-CS01', phone: '0905.000.111', email: 'cs@danalog.com.vn', department: 'Phòng CS' }
];

const INITIAL_TRANSPORT_VEHICLES: TransportVehicle[] = [];

interface LogisticsProps {
  user: User;
  onLogout: () => void;
}

const LogisticsEntry: React.FC<LogisticsProps> = ({ user, onLogout }) => {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.IMPORT);
  const [activeTab, setActiveTab] = useState('vessels');
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [resourceMembers, setResourceMembers] = useState<ResourceMember[]>([]);
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicle[]>(INITIAL_TRANSPORT_VEHICLES);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [consignees, setConsignees] = useState<Consignee[]>([]);

  // Listen for Storage Updates (Sync between Roles) - Only for Containers/Vessels relevant to cross-tab updates for now if needed similar logic for users?
  // Actually, for DB implementation, realtime subscription is better, but for now we stick to fetch.
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent) => {
      const { key } = e.detail;
      if (key === 'danalog_containers') {
        setContainers(StorageService.getContainers());
      }
      if (key === 'danalog_vessels') {
        setVessels(StorageService.getVessels());
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate as EventListener);

    // Also listen for cross-tab 'storage' events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'danalog_containers') setContainers(StorageService.getContainers());
      if (e.key === 'danalog_vessels') setVessels(StorageService.getVessels());
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);


  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [inspectorWorkOrders, setInspectorWorkOrders] = useState<InspectorWorkOrder[]>([]);
  const [tallyReports, setTallyReports] = useState<TallyReport[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);

  // FETCH DATA FROM SUPABASE
  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching data from Supabase...");
      try {
        const [v, c, r, w, prices, cons, usrs, res] = await Promise.all([
          db.getVessels(),
          db.getContainers(),
          db.getTallyReports(),
          db.getWorkOrders(), // Logistics WO
          db.getServicePrices(),
          db.getConsignees(),
          db.getSystemUsers(),
          db.getResourceMembers(),
        ]);

        setVessels(v);
        setContainers(c);
        setTallyReports(r);
        setWorkOrders(w);
        setServicePrices(prices);
        setConsignees(cons);
        setUsers(usrs);
        setResourceMembers(res);
        setInspectorWorkOrders(StorageService.getInspectorWorkOrders()); // Still local
      } catch (err) {
        console.error("Failed to load data from Supabase", err);
      }
    };
    fetchData();
  }, []);


  // Map global user to SystemUser
  useEffect(() => {
    // Map Global Role to Local Logistics Role
    let localRole = UserRole.CS; // Default for others
    if (user.role === 'ADMIN') localRole = UserRole.ADMIN;
    if (user.role === 'CS') localRole = UserRole.CS; // Explicit Global CS to Local CS
    if (user.role === 'CUSTOMS') localRole = UserRole.CUSTOMS;

    setCurrentUser({
      id: 'global-user',
      username: user.username,
      name: user.name,
      role: localRole,
      isActive: true,
      employeeId: user.username.toUpperCase(),
      phone: 'N/A',
      email: `${user.username}@danalog.com`,
      department: 'Logistics'
    });
  }, [user]);

  /* REMOVED AUTO-SAVE TO LOCAL STORAGE (MIGRATED TO DB ADAPTER) 
  useEffect(() => {
    StorageService.saveVessels(vessels);
  }, [vessels]);

  useEffect(() => {
    StorageService.saveContainers(containers);
  }, [containers]);
  */

  useEffect(() => {
    StorageService.saveResources(resourceMembers);
  }, [resourceMembers]); // Keep Resources Local for now or move next? User focused on Vessels first.



  // Reload Tally reports and Work Orders when tab is active (basic sync)
  useEffect(() => {
    const syncWithDB = async () => {
      if (['operations', 'tally', 'stats', 'debit', 'pct_history', 'reports'].includes(activeTab)) {
        try {
          const [reports, wos] = await Promise.all([
            db.getTallyReports(),
            db.getWorkOrders()
          ]);
          setTallyReports(reports);
          setWorkOrders(wos);
          setInspectorWorkOrders(StorageService.getInspectorWorkOrders());
        } catch (err) {
          console.error("Failed to sync history with Supabase:", err);
        }
      }
    };
    syncWithDB();
  }, [activeTab]);

  // --- WORK ORDER NORMALIZATION HELPER ---
  const normalizeWO = (wo: any): WorkOrder => {
    // If it already has the nested 'items' structure, it's a Logistics WO
    if (wo.items && Array.isArray(wo.items) && wo.items.length > 0) return wo;

    // Otherwise, treat as an Inspector WO (Flat structure)
    const report = tallyReports.find(tr => tr.id === wo.reportId);

    // Format Date to DD/MM/YYYY (Logistics expectation)
    let dateStr = wo.date;
    if (dateStr && dateStr.includes('-')) {
      // Handle YYYY-MM-DD from DB
      const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
      if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else if (!dateStr && report && report.workDate) {
      if (report.workDate.includes('-')) {
        const parts = report.workDate.split('-');
        if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        dateStr = report.workDate;
      }
    }
    dateStr = dateStr || new Date().toLocaleDateString('en-GB');

    const isLabor = wo.type === 'CONG_NHAN' || wo.type === WorkOrderType.LABOR;
    const totalUnits = wo.quantity || (report?.items.reduce((sum: number, i: any) => sum + i.actualUnits, 0)) || 0;
    const totalWeight = wo.weight || (report?.items.reduce((sum: number, i: any) => sum + i.actualWeight, 0)) || 0;

    return {
      ...wo,
      id: wo.id,
      type: isLabor ? WorkOrderType.LABOR : WorkOrderType.MECHANICAL,
      businessType: businessType,
      vesselId: wo.vesselId || report?.vesselId || '',
      teamName: wo.teamName || (wo as any).organization || 'N/A',
      workerNames: [wo.teamName || (wo as any).organization || 'N/A'].filter(Boolean),
      peopleCount: wo.quantity || wo.personCount || wo.peopleCount || 0, // Fallback to quantity for piece-rate WOs
      vehicleNos: [wo.vehicleNo || wo.vehicleNos].flat().filter(Boolean),
      shift: wo.shift || report?.shift || '1',
      date: dateStr,
      items: [{
        start: '07:00', end: '11:00',
        cargoType: wo.commodityType || 'Giấy vuông',
        method: wo.handlingMethod || 'N/A',
        quantity: totalUnits,
        weight: totalWeight,
        note: wo.note || ''
      }],
      status: wo.status === 'NHAP' ? WorkOrderStatus.PENDING : WorkOrderStatus.COMPLETED,
      isOutsourced: wo.type === 'CO_GIOI_NGOAI' || wo.isOutsourced
    } as WorkOrder;
  };

  const combinedWorkOrders = useMemo(() => {
    // 1. Normalize DB WOs
    const normalizedDB = workOrders.map(normalizeWO);

    // 2. Normalize Local Inspector WOs (Legacy Support)
    const normalizedLocal = inspectorWorkOrders.map(normalizeWO);

    // 3. Merge and Deduplicate by ID
    const merged = [...normalizedDB, ...normalizedLocal];
    const uniqueMap = new Map<string, WorkOrder>();

    merged.forEach(wo => {
      // Prefer DB version if duplicate ID found (Supabase is source of truth)
      if (!uniqueMap.has(wo.id)) {
        uniqueMap.set(wo.id, wo);
      }
    });

    return Array.from(uniqueMap.values());
  }, [workOrders, inspectorWorkOrders, tallyReports, businessType, vessels]);


  // if (!isLoggedIn) return <Login onLogin={handleLogin} users={users} />;

  // --- DB SYNC HANDLERS ---
  const handleUpdatePrices = async (newPrices: ServicePrice[]) => {
    // 1. Detect deletes
    const deleted = servicePrices.filter(p => !newPrices.find(np => np.id === p.id));
    for (const d of deleted) await db.deleteServicePrice(d.id);
    // 2. Upsert
    for (const p of newPrices) await db.upsertServicePrice(p);
    setServicePrices(newPrices);
  };

  const handleUpdateConsignees = async (newConsignees: Consignee[]) => {
    const deleted = consignees.filter(c => !newConsignees.find(nc => nc.id === c.id));
    for (const d of deleted) await db.deleteConsignee(d.id);
    for (const c of newConsignees) await db.upsertConsignee(c);
    setConsignees(newConsignees);
  };

  const handleUpdateUsers = async (newUsers: SystemUser[]) => {
    const deleted = users.filter(u => !newUsers.find(nu => nu.id === u.id));
    for (const d of deleted) await db.deleteSystemUser(d.id);
    for (const u of newUsers) await db.upsertSystemUser(u);
    setUsers(newUsers);
  };

  const handleUpdateResources = async (newResources: ResourceMember[]) => {
    const deleted = resourceMembers.filter(r => !newResources.find(nr => nr.id === r.id));
    for (const d of deleted) await db.deleteResourceMember(d.id);
    for (const r of newResources) await db.upsertResourceMember(r);
    setResourceMembers(newResources);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'vessels': return <VesselImport vessels={vessels} onUpdateVessels={setVessels} containers={containers} onUpdateContainers={setContainers} transportVehicles={transportVehicles} prices={servicePrices} consignees={consignees} />;
      case 'operations': return <Operations key={currentUser?.role} containers={containers} onUpdateContainers={setContainers} detentionConfig={{ urgentDays: 2, warningDays: 5 }} vessels={vessels} businessType={businessType} onSwitchBusinessType={setBusinessType} userRole={currentUser?.role} />;
      case 'pct_history': return <Statistics containers={containers} workOrders={combinedWorkOrders} vessels={vessels} businessType={businessType} onUpdateWorkOrders={setWorkOrders} reports={tallyReports} />;
      case 'tally': return <TallyReview containers={containers} vessels={vessels} onUpdateContainers={setContainers} reports={tallyReports} />;
      case 'stats': return <Statistics containers={containers} workOrders={combinedWorkOrders} vessels={vessels} businessType={businessType} onUpdateWorkOrders={setWorkOrders} reports={tallyReports} />;
      case 'reports': return <ReportsDashboard containers={containers} vessels={vessels} prices={servicePrices} />;
      case 'debit': return <DebitManagement vessels={vessels} containers={containers} workOrders={combinedWorkOrders} prices={servicePrices} onGoToPricing={() => setActiveTab('pricing')} />;
      case 'pricing': return <PricingConfigPage prices={servicePrices} onUpdatePrices={handleUpdatePrices} consignees={consignees} onUpdateConsignees={handleUpdateConsignees} />;
      case 'users': return <UserManagement users={users} onUpdateUsers={handleUpdateUsers} resources={resourceMembers} onUpdateResources={handleUpdateResources} currentUserRole={currentUser?.role} />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <LogisticsSidebar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onLogout={onLogout}
        currentUser={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
      />
      <main className="flex-1 ml-64 bg-slate-50 h-screen overflow-hidden flex flex-col">
        <div className="flex-1 p-8 flex flex-col min-h-0 overflow-hidden relative">
          <div className="absolute top-2 right-8 z-50">
            <NotificationDropdown userRole={currentUser?.role === UserRole.ADMIN ? GlobalRole.ADMIN : GlobalRole.CS} />
          </div>
          <div className="animate-fadeIn flex-1 flex flex-col min-h-0">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogisticsEntry;
