
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
      } catch (err) {
        console.error("Failed to load data from Supabase", err);
      }
    };
    fetchData();
  }, []);

  // --- SUPABASE REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    const vSub = db.subscribeToTable('vessels', () => db.getVessels().then(setVessels));
    const cSub = db.subscribeToTable('containers', () => db.getContainers().then(setContainers));
    const tSub = db.subscribeToTable('tally_reports', () => db.getTallyReports().then(setTallyReports));
    const wSub = db.subscribeToTable('work_orders', () => db.getWorkOrders().then(setWorkOrders));
    const uSub = db.subscribeToTable('system_users', () => db.getSystemUsers().then(setUsers));
    const rSub = db.subscribeToTable('resource_members', () => db.getResourceMembers().then(setResourceMembers));

    return () => {
      vSub.unsubscribe();
      cSub.unsubscribe();
      tSub.unsubscribe();
      wSub.unsubscribe();
      uSub.unsubscribe();
      rSub.unsubscribe();
    };
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



  // Reload Tally reports and Work Orders when tab is active (redundant now with Realtime, but kept for double-check)
  useEffect(() => {
    const syncWithDB = async () => {
      if (['tally', 'stats', 'debit', 'pct_history', 'reports'].includes(activeTab)) {
        try {
          const [reports, wos] = await Promise.all([
            db.getTallyReports(),
            db.getWorkOrders()
          ]);
          setTallyReports(reports);
          setWorkOrders(wos);
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

    const isLabor = wo.type === 'CONG_NHAN' || wo.type === 'LABOR' || wo.type === WorkOrderType.LABOR;
    const totalUnits = wo.quantity || (report?.items.reduce((sum: number, i: any) => sum + i.actualUnits, 0)) || 0;
    const totalWeight = wo.weight || (report?.items.reduce((sum: number, i: any) => sum + i.actualWeight, 0)) || 0;

    const normalizedWorkerNames = (() => {
      // 1. Try existing workerNames array (from DB)
      if (Array.isArray(wo.workerNames) && wo.workerNames.length > 0) return wo.workerNames;

      // 2. Fallback to teamName/organization string (from Inspector/Legacy)
      const rawName = wo.teamName || (wo as any).organization || 'N/A';
      // Split by comma if present (assuming Inspector sends "Name A, Name B")
      return rawName.split(',').map((s: string) => s.trim()).filter(Boolean);
    })();

    // Ensure we have at least one name if list is empty
    const finalWorkerNames = normalizedWorkerNames.length > 0 ? normalizedWorkerNames : ['N/A'];

    // Also update teamName if it was generic but we have names (optional, but good for display)
    const finalTeamName = wo.teamName || (wo as any).organization || finalWorkerNames.join(', ');

    return {
      ...wo,
      id: wo.id,
      type: isLabor ? WorkOrderType.LABOR : WorkOrderType.MECHANICAL,
      businessType: businessType,
      vesselId: wo.vesselId || report?.vesselId || '',
      teamName: finalTeamName,
      workerNames: finalWorkerNames,
      peopleCount: wo.quantity || wo.personCount || wo.peopleCount || finalWorkerNames.length || 0, // Fallback chain
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
    // Normalize DB WOs
    const normalized = workOrders.map(normalizeWO);

    // Sort and return (Deduplication not strictly needed if we only use DB source, but ID unique map is safer)
    const uniqueMap = new Map<string, WorkOrder>();
    normalized.forEach(wo => uniqueMap.set(wo.id, wo));

    return Array.from(uniqueMap.values());
  }, [workOrders, tallyReports, businessType, vessels]);


  // if (!isLoggedIn) return <Login onLogin={handleLogin} users={users} />;

  // --- DB SYNC HANDLERS ---
  const handleUpdatePrices = async (newPrices: ServicePrice[]) => {
    const prev = [...servicePrices];
    setServicePrices(newPrices);
    try {
      const deleted = prev.filter(p => !newPrices.find(np => np.id === p.id));
      const changed = newPrices.filter(np => {
        const op = prev.find(p => p.id === np.id);
        return !op || JSON.stringify(op) !== JSON.stringify(np);
      });
      await Promise.all([
        ...deleted.map(d => db.deleteServicePrice(d.id)),
        ...changed.map(p => db.upsertServicePrice(p))
      ]);
    } catch (err) {
      setServicePrices(prev);
      alert("Lỗi đồng bộ Đơn giá!");
    }
  };

  const handleUpdateConsignees = async (newConsignees: Consignee[]) => {
    const prev = [...consignees];
    setConsignees(newConsignees);
    try {
      const deleted = prev.filter(c => !newConsignees.find(nc => nc.id === c.id));
      const changed = newConsignees.filter(nc => {
        const oc = prev.find(c => c.id === nc.id);
        return !oc || JSON.stringify(oc) !== JSON.stringify(nc);
      });
      await Promise.all([
        ...deleted.map(d => db.deleteConsignee(d.id)),
        ...changed.map(c => db.upsertConsignee(c))
      ]);
    } catch (err) {
      setConsignees(prev);
      alert("Lỗi đồng bộ Chủ hàng!");
    }
  };

  const handleUpdateUsers = async (newUsers: SystemUser[]) => {
    const prev = [...users];
    setUsers(newUsers);
    try {
      const deleted = prev.filter(u => !newUsers.find(nu => nu.id === u.id));
      const changed = newUsers.filter(nu => {
        const ou = prev.find(u => u.id === nu.id);
        return !ou || JSON.stringify(ou) !== JSON.stringify(nu);
      });
      await Promise.all([
        ...deleted.map(d => db.deleteSystemUser(d.id)),
        ...changed.map(u => db.upsertSystemUser(u))
      ]);
    } catch (err) {
      setUsers(prev);
      alert("Lỗi đồng bộ Người dùng!");
    }
  };

  const handleUpdateResources = async (newResources: ResourceMember[]) => {
    const prev = [...resourceMembers];
    setResourceMembers(newResources);
    try {
      const deleted = prev.filter(r => !newResources.find(nr => nr.id === r.id));
      const changed = newResources.filter(nr => {
        const or = prev.find(r => r.id === nr.id);
        return !or || JSON.stringify(or) !== JSON.stringify(nr);
      });
      await Promise.all([
        ...deleted.map(d => db.deleteResourceMember(d.id)),
        ...changed.map(r => db.upsertResourceMember(r))
      ]);
    } catch (err) {
      setResourceMembers(prev);
      alert("Lỗi đồng bộ Nhân sự!");
    }
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
