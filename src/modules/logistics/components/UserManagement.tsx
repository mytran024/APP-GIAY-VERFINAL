
import React, { useState, useMemo } from 'react';
import { SystemUser, ResourceMember, UserRole } from '../types';
import { ICONS } from '../constants';
import ResourceManagement from './ResourceManagement';

interface UserManagementProps {
  users: SystemUser[];
  onUpdateUsers: (u: SystemUser[]) => void;
  resources: ResourceMember[];
  onUpdateResources: (r: ResourceMember[]) => void;
  currentUserRole?: UserRole;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUpdateUsers, resources, onUpdateResources, currentUserRole }) => {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'RESOURCE'>(currentUserRole === UserRole.CS ? 'RESOURCE' : 'SYSTEM');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [userFormData, setUserFormData] = useState<Partial<SystemUser>>({
    name: '',
    username: '',
    role: UserRole.CS,
    isActive: true,
    employeeId: '',
    phone: '',
    email: '',
    department: 'KHO'
  });

  const isCS = currentUserRole === UserRole.CS;

  const handleRoleChange = (role: UserRole) => {
    let dept = 'KHO';
    if (role === UserRole.TRANSPORT) dept = 'VẬN TẢI';
    else if (role === UserRole.DEPOT) dept = 'DEPOT';
    // CS và INSPECTOR mặc định là KHO theo yêu cầu

    setUserFormData({ ...userFormData, role, department: dept });
  };

  const handleAddEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...userFormData,
      name: (userFormData.name || '').toUpperCase().trim(),
      username: (userFormData.username || '').toLowerCase().trim(),
      employeeId: (userFormData.employeeId || '').toUpperCase().trim(),
      email: (userFormData.email || '').toLowerCase().trim(),
      department: (userFormData.department || 'KHO').toUpperCase().trim(),
    };

    if (editingUserId) {
      onUpdateUsers(users.map(u => u.id === editingUserId ? { ...u, ...finalData } as SystemUser : u));
    } else {
      const newUser: SystemUser = {
        ...finalData,
        id: Math.random().toString(36).substr(2, 9),
        isActive: true,
      } as SystemUser;
      onUpdateUsers([...users, newUser]);
    }

    setShowUserModal(false);
    setEditingUserId(null);
    setUserFormData({ name: '', username: '', role: UserRole.CS, isActive: true, employeeId: '', phone: '', email: '', department: 'KHO' });
  };

  const startEdit = (user: SystemUser) => {
    setEditingUserId(user.id);
    setUserFormData({ ...user });
    setShowUserModal(true);
  };

  const toggleUserStatus = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    onUpdateUsers(updated);
  };

  return (
    <div className="space-y-5 animate-fadeIn text-left h-full flex flex-col relative">
      {/* Header Title */}
      <div className="flex items-center gap-3 no-print ml-1">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">QUẢN LÝ NHÂN SỰ</h3>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-between items-center no-print px-1">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('RESOURCE')}
            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider ${activeTab === 'RESOURCE' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Quản lý nguồn lực
          </button>
          {!isCS && (
            <button
              onClick={() => setActiveTab('SYSTEM')}
              className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider ${activeTab === 'SYSTEM' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tài khoản hệ thống
            </button>
          )}
        </div>

        {!isCS && activeTab === 'SYSTEM' && (
          <button
            onClick={() => { setEditingUserId(null); setUserFormData({ name: '', username: '', role: UserRole.CS, isActive: true, employeeId: '', phone: '', email: '', department: 'KHO' }); setShowUserModal(true); }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            THÊM MỚI
          </button>
        )}
      </div>

      {activeTab === 'RESOURCE' ? (
        <ResourceManagement resources={resources} onUpdateResources={onUpdateResources} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
                <tr className="text-slate-400">
                  <th className="px-6 py-4 font-bold uppercase text-[9px] tracking-wider w-[6%] text-center">STT</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[24%]">Người dùng</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[18%]">Thông tin NV</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[22%]">Liên hệ</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[12%] text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-bold uppercase text-[9px] tracking-wider w-[18%] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u, idx) => (
                  <tr key={u.id} className={`group hover:bg-slate-50/50 transition-colors ${!u.isActive ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-medium text-slate-400">{idx + 1}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 ${u.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 text-sm tracking-tight truncate uppercase">{u.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{u.role}</span>
                            <span className="text-[9px] font-bold text-slate-300">|</span>
                            <span className="text-[9px] font-bold text-slate-400">@{u.username}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[11px] font-black text-slate-600 uppercase tracking-tight truncate">{u.department}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Mã: {u.employeeId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[11px] font-bold text-slate-700 tracking-tight">{u.phone || '---'}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{u.email || '---'}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-400'}`}></div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${u.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(u)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={`p-2 transition-all rounded-lg ${u.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                          title={u.isActive ? "Khóa tài khoản" : "Mở khóa"}
                        >
                          {u.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Hệ thống tài khoản - Cấu trúc 2 cột tinh gọn */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-slideUp">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {editingUserId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddEditUser} className="p-8 space-y-5 text-left">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Họ và tên</label>
                  <input
                    required
                    type="text"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase"
                    placeholder="NGUYỄN VĂN A..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Tên đăng nhập</label>
                  <input
                    required
                    type="text"
                    disabled={!!editingUserId}
                    value={userFormData.username}
                    onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all lowercase ${editingUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="username..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Mã nhân viên</label>
                  <input
                    required
                    type="text"
                    value={userFormData.employeeId}
                    onChange={e => setUserFormData({ ...userFormData, employeeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase"
                    placeholder="NV-001..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Số điện thoại</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="0905..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Email</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all lowercase"
                    placeholder="email@danalog.com.vn"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Vai trò hệ thống</label>
                  <select
                    value={userFormData.role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value={UserRole.CS}>NHÂN VIÊN CS</option>
                    <option value={UserRole.INSPECTOR}>KIỂM VIÊN</option>
                    <option value={UserRole.DEPOT}>NHÂN VIÊN DEPOT</option>
                    <option value={UserRole.TRANSPORT}>VẬN TẢI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Phòng ban</label>
                  <select
                    value={userFormData.department}
                    onChange={e => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="KHO">KHO</option>
                    <option value="VẬN TẢI">VẬN TẢI</option>
                    <option value="DEPOT">DEPOT</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  {editingUserId ? 'Lưu cập nhật tài khoản' : 'Xác nhận khởi tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};
export default UserManagement;
