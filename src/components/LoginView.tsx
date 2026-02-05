import React, { useState } from 'react';
import { User, Role } from '../types';
import { Ship, Lock, User as UserIcon } from 'lucide-react';

interface LoginViewProps {
    onLogin: (user: User) => void;
}

const USERS: User[] = [
    { username: 'admin', name: 'Logistics Admin', role: Role.ADMIN },
    { username: 'cs', name: 'Logistics CS', role: Role.CS },
    { username: 'gd', name: 'Giám Định Viên', role: Role.INSPECTOR },
    { username: 'dp', name: 'Trưởng Ca Bãi', role: Role.DEPOT },
    { username: 'hq', name: 'Hải Quan', role: Role.CUSTOMS },
    { username: 'vt', name: 'Điều Phối Vận Tải', role: Role.TRANSPORT },
];

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        setTimeout(() => {
            // Global Password Rule: "1"
            if (password !== '1') {
                setError('Mật khẩu không đúng');
                setLoading(false);
                return;
            }

            const user = USERS.find(u => u.username === username);
            if (user) {
                onLogin(user);
            } else {
                setError('Tên đăng nhập không đúng');
            }
            setLoading(false);
        }, 500);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-0"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mb-4 shadow-lg border border-white/20">
                            <Ship className="text-blue-400 w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
                            DANALOG <span className="text-blue-400">UNIFIED</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Hệ thống quản lý hợp nhất</p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên đăng nhập</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder-slate-300"
                                    placeholder="Nhập tên đăng nhập..."
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mật khẩu (Mặc định: 1)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder-slate-300"
                                    placeholder="Nhập mật khẩu..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 text-xs font-bold animate-pulse">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
};

export default LoginView;
