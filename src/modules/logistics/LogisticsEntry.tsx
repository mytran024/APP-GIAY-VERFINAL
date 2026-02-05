
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
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>(() => StorageService.getPrices(INITIAL_PRICES));
  const [resourceMembers, setResourceMembers] = useState<ResourceMember[]>(() => StorageService.getResources(INITIAL_RESOURCES));
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicle[]>(INITIAL_TRANSPORT_VEHICLES);

  const [vessels, setVessels] = useState<Vessel[]>(() => StorageService.getVessels([]));

  const [containers, setContainers] = useState<Container[]>(() => StorageService.getContainers([
    // ... initial data ...
  ])); // Note: We will reload this in useEffect

  // Listen for Storage Updates (Sync between Roles)
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


  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => StorageService.getWorkOrders([]));
  const [inspectorWorkOrders, setInspectorWorkOrders] = useState<InspectorWorkOrder[]>(() => StorageService.getInspectorWorkOrders([]));
  const [tallyReports, setTallyReports] = useState<TallyReport[]>(() => StorageService.getTallyReports([]));
  const [users, setUsers] = useState<SystemUser[]>(() => {
    return StorageService.getUsers(INITIAL_USERS);
  });


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

  useEffect(() => {
    StorageService.saveVessels(vessels);
  }, [vessels]);

  useEffect(() => {
    StorageService.saveContainers(containers);
  }, [containers]);

  useEffect(() => {
    StorageService.saveResources(resourceMembers);
  }, [resourceMembers]);

  useEffect(() => {
    StorageService.saveWorkOrders(workOrders);
  }, [workOrders]);

  useEffect(() => {
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.savePrices(servicePrices);
  }, [servicePrices]);

  const [consignees, setConsignees] = useState<Consignee[]>(() => StorageService.getConsignees(MOCK_CONSIGNEES));

  useEffect(() => {
    StorageService.saveConsignees(consignees);
  }, [consignees]);

  // Reload Tally reports and Work Orders when tab is active (basic sync)
  useEffect(() => {
    if (activeTab === 'tally' || activeTab === 'stats' || activeTab === 'debit') {
      const wos = StorageService.getWorkOrders();
      setWorkOrders(wos);

      const inspWos = StorageService.getInspectorWorkOrders();
      setInspectorWorkOrders(inspWos);

      const reports = StorageService.getTallyReports();
      setTallyReports(reports);
    }
  }, [activeTab]);

  const combinedWorkOrders = useMemo(() => {
    // Map Inspector WOs to Logistics WOs
    const mappedInspectorWOs: WorkOrder[] = inspectorWorkOrders.map(wo => {
      const report = tallyReports.find(tr => tr.id === wo.reportId);

      // Format Date to DD/MM/YYYY
      let dateStr = new Date().toLocaleDateString('en-GB');
      if (report && report.workDate) {
        const parts = report.workDate.split('-'); // YYYY-MM-DD
        if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      const isLabor = wo.type === 'CONG_NHAN';

      return {
        id: wo.id,
        type: isLabor ? WorkOrderType.LABOR : WorkOrderType.MECHANICAL,
        businessType: businessType, // Default to current context, or derive from report mode
        reportId: wo.reportId, // Keep reference for printing
        containerIds: [],
        containerNos: [],
        vesselId: vessels.find(v => v.id === (report?.vesselId || ''))?.id || '',
        teamName: wo.organization,
        workerNames: [wo.organization],
        peopleCount: wo.personCount,
        vehicleNos: [wo.vehicleNo].filter(Boolean),
        shift: report?.shift || '1',
        date: dateStr,
        items: [{
          start: '07:00', end: '11:00', // Dummy times
          cargoType: wo.commodityType,
          method: wo.handlingMethod,
          quantity: wo.quantity,
          weight: wo.weight,
          note: wo.note
        }],
        status: WorkOrderStatus.COMPLETED,
        isOutsourced: wo.type === 'CO_GIOI_NGOAI',
        vehicleType: wo.vehicleType
      } as WorkOrder;
    });

    return [...workOrders, ...mappedInspectorWOs];
  }, [workOrders, inspectorWorkOrders, vessels, tallyReports, businessType]);


  // if (!isLoggedIn) return <Login onLogin={handleLogin} users={users} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'vessels': return <VesselImport vessels={vessels} onUpdateVessels={setVessels} containers={containers} onUpdateContainers={setContainers} transportVehicles={transportVehicles} prices={servicePrices} consignees={consignees} />;
      case 'operations': return <Operations key={currentUser?.role} containers={containers} onUpdateContainers={setContainers} detentionConfig={{ urgentDays: 2, warningDays: 5 }} vessels={vessels} businessType={businessType} onSwitchBusinessType={setBusinessType} userRole={currentUser?.role} />;
      case 'pct_history': return <Statistics containers={containers} workOrders={combinedWorkOrders} vessels={vessels} businessType={businessType} onUpdateWorkOrders={setWorkOrders} reports={tallyReports} />;
      case 'tally': return <TallyReview containers={containers} vessels={vessels} onUpdateContainers={setContainers} reports={tallyReports} />;
      case 'stats': return <Statistics containers={containers} workOrders={combinedWorkOrders} vessels={vessels} businessType={businessType} onUpdateWorkOrders={setWorkOrders} reports={tallyReports} />;
      case 'reports': return <ReportsDashboard containers={containers} vessels={vessels} prices={servicePrices} />;
      case 'debit': return <DebitManagement vessels={vessels} containers={containers} workOrders={combinedWorkOrders} prices={servicePrices} onGoToPricing={() => setActiveTab('pricing')} />;
      case 'pricing': return <PricingConfigPage prices={servicePrices} onUpdatePrices={setServicePrices} consignees={consignees} onUpdateConsignees={setConsignees} />;
      case 'users': return <UserManagement users={users} onUpdateUsers={setUsers} resources={resourceMembers} onUpdateResources={setResourceMembers} currentUserRole={currentUser?.role} />;
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
