import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { DepotView } from './components/DepotView';
import { CustomsView } from './components/CustomsView';
import { TransportView } from './components/TransportView';
// Login import removed (duplicate)
import { Login } from './components/Login';
import { Role, User, ContainerCS, ContainerStatus as PaperContainerStatus } from './types';
import NotificationDropdown from '../../components/NotificationDropdown';
import { MOCK_VESSELS } from './constants';

import { Bell, Check, Trash2, LogOut } from 'lucide-react';
import { User as GlobalUser, Role as GlobalRole } from '../../types';
import { StorageService } from '../../services/storage';
import { Container as GlobalContainer, ContainerStatus } from '../../modules/logistics/types';

interface PaperProps {
  user: GlobalUser;
  onLogout: () => void;
}

const PaperEntry: React.FC<PaperProps> = ({ user: globalUser, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    // Map global user to local user type
    if (globalUser) {
      setUser({
        username: globalUser.username,
        role: globalUser.role as unknown as Role,
        name: globalUser.name
      });
    }
  }, [globalUser]);

  // Use Real Data from Storage
  const [globalContainers, setGlobalContainers] = useState<GlobalContainer[]>([]);
  const [globalVessels, setGlobalVessels] = useState<any[]>([]); // Using any for now or Import Global Vessel Type

  useEffect(() => {
    // Load initial data
    const loadData = () => {
      setGlobalContainers(StorageService.getContainers());

      const vessels = StorageService.getVessels();
      const mappedVessels = vessels.map(v => ({
        id: v.id,
        name: v.vesselName,
        voyageNo: v.voyageNo || '',
        eta: v.eta,
        etd: v.etd,
        shippingLine: v.consignee || '',
        status: v.exportPlanActive ? 'XUAT' as any : 'NHAP' as any
      }));
      setGlobalVessels(mappedVessels.length > 0 ? mappedVessels : MOCK_VESSELS);
    };

    loadData();

    // Real-time Sync Listeners
    const handleStorageUpdate = (e: CustomEvent) => {
      if (e.detail.key === 'danalog_containers' || e.detail.key === 'danalog_vessels') {
        loadData();
      }
    };

    // Cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'danalog_containers' || e.key === 'danalog_vessels') {
        loadData();
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Map to Paper Types (ContainerCS)
  const containers: ContainerCS[] = useMemo(() => {
    return globalContainers.map(c => ({
      id: c.containerNo, // Use Container Number as ID for Customs/Depot view (legacy mapping)
      realId: c.id, // Keep real ID reference
      vesselId: c.vesselId,
      owner: c.vendor,
      packages: c.pkgs,
      tons: c.weight,
      demDetDate: c.detExpiry,
      emptyReturnLocation: c.noiHaRong,
      status: c.status as unknown as PaperContainerStatus,
      yardPosition: '',
      sealNumber: c.sealNo,
      transportDeclNo: c.tkNhaVC,
      transportDeclDate: c.ngayTkNhaVC,

      // Synced Data
      dnlDeclNo: c.tkDnlOla,
      dnlDeclDate: c.ngayTkDnl,
      customsPkgs: c.customsPkgs,
      customsWeight: c.customsWeight,

      discrepancyReason: '' // Could map remarks?
    }));
  }, [globalContainers]);

  // Notification State Removed (Handled by NotificationDropdown)

  // Reset view when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === Role.DEPOT) setCurrentView('dashboard');
      if (user.role === Role.CUSTOMS) setCurrentView('customs-management');
      if (user.role === Role.TRANSPORT) setCurrentView('vehicle-plan');
    }
  }, [user]);

  // Handler for Customs saving data
  const handleSaveCustomsData = (dataMap: Record<string, any>) => {
    const updatedGlobalContainers = globalContainers.map(c => {
      // Find update by containerNo (since containers[].id is containerNo)
      const update = dataMap[c.containerNo]; // Map using Container No
      if (update) {
        return {
          ...c,
          sealNo: update.sealNo,
          tkDnlOla: update.dnlDeclNo,
          ngayTkDnl: update.dnlDeclDate,
          tkNhaVC: update.transportDeclNo, // Save Number
          ngayTkNhaVC: update.ngayTkNhaVC, // Save Date
          customsPkgs: update.packages ? Number(update.packages) : undefined,
          customsWeight: update.tons ? Number(update.tons) : undefined
        };
      }
      return c;
    });

    setGlobalContainers(updatedGlobalContainers);
    StorageService.saveContainers(updatedGlobalContainers);
  };



  // Handler for CustomsView to report discrepancies
  const handleSyncDiscrepancy = (containerId: string, reason: string) => {
    // Note: Since we use globalContainers, we should strictly update the global state or rely on the fact that CustomsView manages its own highlight state locally via props comparison.
    // However, if we want to persist the "ISSUE" status back to Logistics:

    setGlobalContainers(prev => prev.map(c => {
      if (c.containerNo === containerId) { // Match by Container No
        return {
          ...c,
          status: ContainerStatus.ISSUE, // Mark as ISSUE
          // remarks: reason // Optional: save reason to remarks?
        };
      }
      return c;
    }));

    // Notification Logic
    if (user?.role !== Role.CUSTOMS) {
      StorageService.addNotification({
        title: "Cảnh báo từ Hải quan",
        message: `Container ${containerId} bị đánh dấu ISSUE: ${reason}`,
        type: 'WARNING',
        targetRoles: [GlobalRole.CS, GlobalRole.INSPECTOR, GlobalRole.TRANSPORT] // Notify other roles
      });
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  // Removed markAsRead, clearNotifications, unreadCount

  const renderContent = () => {
    if (!user) return null;

    if (currentView === 'dashboard') {
      if (user.role === Role.DEPOT || currentView === 'containers' || currentView === 'yard-plan') return <DepotView vessels={globalVessels} containers={containers} />;
      if (user.role === Role.CUSTOMS) return <CustomsView vessels={globalVessels} csContainers={containers} onSyncDiscrepancy={handleSyncDiscrepancy} onSaveCustomsData={handleSaveCustomsData} />;
      if (user.role === Role.TRANSPORT) return <TransportView vessels={globalVessels} />;
    }

    if (currentView === 'customs-management') return <CustomsView vessels={globalVessels} csContainers={containers} onSyncDiscrepancy={handleSyncDiscrepancy} onSaveCustomsData={handleSaveCustomsData} />;
    if (currentView === 'vehicle-plan') return <TransportView vessels={globalVessels} />;

    // Fallback
    if (user.role === Role.DEPOT) return <DepotView vessels={globalVessels} containers={containers} />;
    if (user.role === Role.CUSTOMS) return <CustomsView vessels={globalVessels} csContainers={containers} onSyncDiscrepancy={handleSyncDiscrepancy} onSaveCustomsData={handleSaveCustomsData} />;
    if (user.role === Role.TRANSPORT) return <TransportView vessels={globalVessels} />;

    return <div>Select a view</div>;
  };

  if (!user) {
    return <div>Loading user...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        currentRole={user.role}
        onNavigate={setCurrentView}
        currentView={currentView}
      />

      <main className="flex-1 ml-64 relative">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center text-slate-800">
            <h2 className="font-semibold text-lg tracking-tight">
              {user.role === Role.DEPOT && "Khu vực Điều hành Bãi"}
              {user.role === Role.CUSTOMS && "Khu vực Thủ tục Hải quan"}
              {user.role === Role.TRANSPORT && "Phòng Vận tải"}
            </h2>
          </div>

          <div className="flex items-center space-x-6">



            {/* Notification Bell */}
            <div className="relative z-50">
              <NotificationDropdown userRole={user.role as unknown as GlobalRole} />
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-800 block">{user.name}</span>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>

        {/* Global Toast - Removed (Handled by NotificationDropdown) */}
      </main>
    </div>
  );
};

export default PaperEntry;