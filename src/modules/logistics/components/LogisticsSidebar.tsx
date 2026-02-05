import React from 'react';
import {
    LayoutDashboard,
    Ship,
    Anchor,
    ClipboardCheck,
    FileBarChart,
    CreditCard,
    Settings,
    Users,
    LogOut,
    FileText
} from 'lucide-react';
import { UserRole } from '../types';

interface LogisticsSidebarProps {
    activeTab: string;
    onNavigate: (tab: string) => void;
    onLogout: () => void;
    currentUser: { name: string; role: string } | null;
}

export const LogisticsSidebar: React.FC<LogisticsSidebarProps> = ({
    activeTab,
    onNavigate,
    onLogout,
    currentUser
}) => {
    const menuItems = [
        // { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'vessels', label: 'Quản lý Tàu', icon: Ship },
        { id: 'operations', label: 'Lịch sử khai thác', icon: Anchor },
        { id: 'tally', label: 'Lịch sử Tally', icon: ClipboardCheck },
        { id: 'pct_history', label: 'Lịch sử PCT', icon: FileText },
        { id: 'reports', label: 'Thống kê báo cáo', icon: FileBarChart },
        { id: 'debit', label: 'Tính hoá đơn debit', icon: CreditCard },
        { id: 'pricing', label: 'Cấu hình chung', icon: Settings },
        { id: 'users', label: 'Quản lý nhân sự', icon: Users },
    ];

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20">
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-xl font-bold tracking-wider text-blue-400">DANALOG</h1>
                <p className="text-xs text-slate-400 mt-1">Logistics Management</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="font-bold text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center space-x-3 px-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shadow-md">
                        {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{currentUser?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser?.role || 'CS'}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-bold text-sm">Đăng xuất</span>
                </button>
            </div>
        </div>
    );
};
