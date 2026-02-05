
import React, { useState, useEffect } from 'react';
import { ICONS, MOCK_USER } from '../constants';
import { SystemUser } from '../types';

interface LoginProps {
  onLogin: (user: SystemUser) => void;
  users: SystemUser[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load remembered credentials
  useEffect(() => {
    const saved = localStorage.getItem('danalog_remember');
    if (saved) {
      try {
        const { user, pass } = JSON.parse(saved);
        setUsername(user);
        setPassword(pass);
        setRememberMe(true);
      } catch (e) {
        console.error("Failed to parse remembered credentials", e);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const userFound = users.find(u => u.username === username);
      const isValidPassword = (username === MOCK_USER.username && password === MOCK_USER.password) || password === '123';

      if (userFound && isValidPassword) {
        if (!userFound.isActive) {
          setError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!');
          setLoading(false);
          return;
        }

        if (rememberMe) {
          localStorage.setItem('danalog_remember', JSON.stringify({ user: username, pass: password }));
        } else {
          localStorage.removeItem('danalog_remember');
        }
        onLogin(userFound);
      } else {
        setError('Tài khoản hoặc mật khẩu không chính xác!');
        setLoading(false);
      }
    }, 800);
  };

  const handleContactSupport = () => {
    alert("Vui lòng liên hệ bộ phận IT Danalog:\nHotline: 0236 3xxx xxx\nEmail: it-support@danalog.com.vn\nĐể được cấp lại mật khẩu mới.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full animate-fadeIn">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-3xl shadow-2xl mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <ICONS.Ship className="text-blue-400 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            DANALOG <span className="text-blue-600">LOGISTICS</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-2">Hệ thống quản lý khai thác giấy</p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên đăng nhập</label>
              <div className="relative">
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <ICONS.User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mật khẩu</label>
              <div className="relative">
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="Nhập password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <ICONS.Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-100' : 'bg-slate-50 border-slate-200 group-hover:border-blue-300'}`}>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {rememberMe && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>}
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 text-xs font-bold animate-shake">
                <ICONS.AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>Đăng nhập hệ thống <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg></>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button 
              type="button"
              onClick={handleContactSupport}
              className="text-[9px] font-black text-blue-500 uppercase tracking-[0.15em] hover:text-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Quên mật khẩu? Liên hệ kĩ thuật/IT hỗ trợ
            </button>
            <p className="text-slate-300 text-[8px] font-bold uppercase tracking-[0.3em] mt-4">Version 3.0 Enterprise</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Login;
