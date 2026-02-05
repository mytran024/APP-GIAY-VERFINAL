import React from 'react';
import { LayoutDashboard, Anchor, ShieldCheck, Truck, Settings } from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentRole: Role;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, onNavigate, currentView }) => {
  const getMenuItems = () => {
    const common = [
      { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    ];

    if (currentRole === Role.DEPOT) {
      return [
        { id: 'dashboard', label: 'Quản lý Cont', icon: LayoutDashboard },
      ];
    }
    if (currentRole === Role.CUSTOMS) {
      return [
        { id: 'customs-management', label: 'Quản lý tờ khai và seal', icon: ShieldCheck },
      ];
    }
    if (currentRole === Role.TRANSPORT) {
      // Transport role only sees Vehicle Plan
      return [
        { id: 'vehicle-plan', label: 'Điều phối xe', icon: Truck },
      ];
    }
    return common;
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">DANALOG</h1>
        <p className="text-xs text-slate-400 mt-1">Bonded Warehouse System</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {currentRole.substring(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium">{currentRole}</p>
            <p className="text-xs text-slate-500">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};