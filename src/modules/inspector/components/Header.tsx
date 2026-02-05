
import React, { useState } from 'react';
import UserProfileModal from './UserProfileModal';
import NotificationDropdown from '../../../components/NotificationDropdown';
import { Role } from '../../../types';

interface HeaderProps {
  title: string;
  user: string | null;
  onNavigate: (target: any) => void;
}

const Header: React.FC<HeaderProps> = ({ title, user, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuItems = [
    {
      label: 'Tạo Tally Nhập', target: 'CREATE_IMPORT_TALLY', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
      )
    },
    {
      label: 'Tạo Tally Xuất', target: 'CREATE_EXPORT_TALLY', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
      )
    },
    {
      label: 'Lịch sử Tally', target: 'DANH_SACH_TALLY', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      )
    },
    {
      label: 'Lịch sử Phiếu công tác', target: 'DANH_SACH_WO', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      )
    },
  ];

  return (
    <>
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between w-full print:hidden">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 hover:bg-blue-700 rounded-xl transition-colors active:scale-90 flex items-center justify-center z-50"
            aria-label="Open Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight truncate max-w-[180px] md:max-w-none">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <NotificationDropdown userRole={Role.INSPECTOR} />

          {user && (
            <div
              className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-blue-700 rounded-xl transition-all active:scale-95"
              onClick={() => setIsProfileOpen(true)}
            >
              <span className="hidden md:inline text-xs font-bold opacity-80 mr-2">{user}</span>
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-blue-300 shadow-sm">
                {user.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm transition-opacity duration-300 print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-[110] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col print:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 bg-blue-600 text-white shadow-lg relative">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs font-bold uppercase opacity-60 tracking-widest mb-1">Kiểm viên đang trực</p>
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setIsOpen(false);
              setIsProfileOpen(true);
            }}
          >
            <h2 className="text-xl font-black">{user || 'Khách'}</h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onNavigate(item.target);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 font-bold text-sm text-left"
            >
              <div className="text-gray-400">
                {item.icon}
              </div>
              {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => {
                onNavigate('LOGOUT');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all active:scale-95 font-bold text-sm text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Đăng xuất
            </button>
          </div>
        </nav>

        <div className="p-6 text-center border-t border-gray-50">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Danalog Inspector v2.2</p>
        </div>
      </div>

      {/* User Profile Modal */}
      {user && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          username={user}
          onLogout={() => {
            setIsProfileOpen(false);
            onNavigate('LOGOUT');
          }}
        />
      )}
    </>
  );
};

export default Header;
