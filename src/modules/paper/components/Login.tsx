import React, { useState } from 'react';
import { User, Role } from '../types';
import { Lock, User as UserIcon, LogIn, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, role: Role, name: string) => void;
}

// Shortened users for easy testing
export const USERS = [
  { username: 'dp', password: '1', role: Role.DEPOT, name: 'Trưởng Ca Bãi', label: 'Depot' },
  { username: 'hq', password: '1', role: Role.CUSTOMS, name: 'Nhân viên TTHQ', label: 'Hải Quan' },
  { username: 'vt', password: '1', role: Role.TRANSPORT, name: 'Điều phối Vận tải', label: 'Vận Tải' },
];

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = USERS.find(u => u.username === username && u.password === password);

    if (user) {
      onLogin(user.username, user.role, user.name);
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  const fillCredential = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <h1 className="text-3xl font-bold tracking-wider text-blue-400 mb-2">DANALOG</h1>
          <p className="text-slate-400 text-sm">Bonded Warehouse Management System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2 text-center">Đăng nhập</h2>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tài khoản</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Đăng nhập
          </button>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-center text-xs text-slate-400 mb-3">
               <Info size={12} className="mr-1" /> Tài khoản Demo (Click để điền nhanh)
             </div>
             <div className="grid grid-cols-3 gap-2">
               {USERS.map(u => (
                 <button
                   key={u.username}
                   type="button"
                   onClick={() => fillCredential(u.username, u.password)}
                   className="text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded p-2 transition-colors text-center"
                 >
                   <span className="block font-bold text-slate-700">{u.label}</span>
                   <span className="block text-slate-400 scale-90">{u.username} / {u.password}</span>
                 </button>
               ))}
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};