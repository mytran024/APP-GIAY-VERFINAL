import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { StorageService } from '../services/storage';
import { Notification, Role } from '../types';

interface NotificationDropdownProps {
    userRole: Role;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userRole }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load and subscribe
    useEffect(() => {
        const load = () => {
            const all = StorageService.getNotifications();
            // Filter by role or if targeted to ALL
            const filtered = all.filter(n =>
                n.targetRoles.includes(userRole) || (n.targetRoles as any[]).includes('ALL')
            );
            // Sort by timestamp desc
            filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(filtered);
        };

        load();

        const handleStorageUpdate = (e: CustomEvent) => {
            if (e.detail.key === 'danalog_notifications') load();
        };
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'danalog_notifications') load();
        };

        window.addEventListener('storage-update', handleStorageUpdate as EventListener);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
            window.removeEventListener('storage', handleStorage);
        };
    }, [userRole]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const all = StorageService.getNotifications();
        const newAll = all.map(n => n.id === id ? { ...n, isRead: true } : n);
        StorageService.saveNotifications(newAll);
    };

    const clearAll = () => {
        // Remove "my" notifications from storage
        const all = StorageService.getNotifications();
        const newAll = all.filter(n => !(n.targetRoles.includes(userRole) || (n.targetRoles as any[]).includes('ALL')));
        StorageService.saveNotifications(newAll);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const recentUnread = notifications.find(n => !n.isRead);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-slate-500 hover:text-slate-700 relative focus:outline-none p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-sm text-slate-700">Thông báo ({notifications.length})</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs text-slate-400 hover:text-red-500 flex items-center"
                            >
                                <Trash2 size={12} className="mr-1" /> Xóa hết
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Không có thông báo mới
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notifications.map((notif) => (
                                    <li
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm ${!notif.isRead ? 'font-semibold text-blue-900' : 'font-medium text-slate-700'}`}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                {new Date(notif.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-1 ${!notif.isRead ? 'text-blue-800' : 'text-slate-500'}`}>
                                            {notif.message}
                                        </p>
                                        {!notif.isRead && (
                                            <div className="mt-2 flex items-center text-[10px] text-blue-600 font-medium">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5"></div>
                                                Mới
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Global Toast for recent unread */}
            {recentUnread && !showDropdown && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-3 z-[100] animate-bounce-short cursor-pointer" onClick={() => setShowDropdown(true)}>
                    <div className="bg-blue-500 p-1.5 rounded-full shrink-0">
                        <Bell size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{recentUnread.title}</p>
                        <p className="text-xs text-slate-300 truncate max-w-[200px]">{recentUnread.message}</p>
                    </div>
                    <button onClick={(e) => markAsRead(recentUnread.id, e)} className="text-slate-400 hover:text-white shrink-0">
                        <Check size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
