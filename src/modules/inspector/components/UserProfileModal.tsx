
import React, { useState, useEffect } from 'react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onLogout: () => void; // Added onLogout prop
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, username, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'PASSWORD'>('INFO');
  const [isLoading, setIsLoading] = useState(false);

  // Mock Data Generator based on username
  const userInfo = {
    username: username,
    code: username === 'admin' ? 'NV-001' : `NV-${Math.floor(Math.random() * 900) + 100}`,
    fullName: username === 'admin' ? 'Quản Trị Viên' : 'Nguyễn Văn Kiểm',
    phone: '0905.123.456',
    email: `${username.toLowerCase()}@danalog.com.vn`,
    position: 'Kiểm viên kho bãi',
    department: 'Phòng Khai Thác'
  };

  // Password Form State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  // Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('INFO');
      setMessage(null);
      setPasswords({ current: '', new: '', confirm: '' });
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new || !passwords.confirm) {
        setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
        return;
    }
    if (passwords.new !== passwords.confirm) {
        setMessage({ type: 'error', text: 'Mật khẩu mới không khớp' });
        return;
    }
    
    setIsLoading(true);
    // Simulate API Call
    setTimeout(() => {
        setIsLoading(false);
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang đăng xuất...' });
        setPasswords({ current: '', new: '', confirm: '' });

        // Tự động đăng xuất sau 1.5s để người dùng đăng nhập lại
        setTimeout(() => {
            onClose();
            onLogout();
        }, 1500);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative z-10 overflow-hidden animate-fade-in-up">
        
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-500 relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                <div className="w-24 h-24 bg-white p-1.5 rounded-3xl shadow-lg">
                    <div className="w-full h-full bg-blue-100 rounded-2xl flex items-center justify-center text-3xl font-black text-blue-600 uppercase">
                        {userInfo.username.charAt(0)}
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-14 pb-8 px-6 text-center">
            <h2 className="text-xl font-black text-gray-800">{userInfo.fullName}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{userInfo.position}</p>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mt-6 mb-6">
                <button 
                    onClick={() => setActiveTab('INFO')}
                    className={`flex-1 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${activeTab === 'INFO' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Thông tin
                </button>
                <button 
                    onClick={() => setActiveTab('PASSWORD')}
                    className={`flex-1 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${activeTab === 'PASSWORD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Đổi mật khẩu
                </button>
            </div>

            {/* Content Info */}
            {activeTab === 'INFO' && (
                <div className="space-y-4 text-left animate-fade-in">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Mã nhân viên</span>
                            <span className="text-sm font-black text-gray-800">{userInfo.code}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Tên đăng nhập</span>
                            <span className="text-sm font-black text-gray-800">{userInfo.username}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại</span>
                            <span className="text-sm font-black text-gray-800">{userInfo.phone}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
                            <span className="text-sm font-black text-gray-800">{userInfo.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Phòng ban</span>
                            <span className="text-sm font-black text-gray-800">{userInfo.department}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Password */}
            {activeTab === 'PASSWORD' && (
                <form onSubmit={handlePasswordChange} className="space-y-4 text-left animate-fade-in">
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mật khẩu hiện tại</label>
                            <div className="relative">
                                <input 
                                    type={showCurrent ? "text" : "password"}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                                    placeholder="••••••••"
                                    value={passwords.current}
                                    onChange={e => setPasswords({...passwords, current: e.target.value})}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                >
                                    {showCurrent ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mật khẩu mới</label>
                            <div className="relative">
                                <input 
                                    type={showNew ? "text" : "password"}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                                    placeholder="••••••••"
                                    value={passwords.new}
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                                    onClick={() => setShowNew(!showNew)}
                                >
                                    {showNew ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Xác nhận mật khẩu mới</label>
                            <div className="relative">
                                <input 
                                    type={showConfirm ? "text" : "password"}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                                    placeholder="••••••••"
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                >
                                    {showConfirm ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`text-[11px] font-bold text-center p-2 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 uppercase text-[11px] tracking-widest active:scale-95 transition-all hover:bg-blue-700 flex justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Cập nhật mật khẩu'}
                    </button>
                </form>
            )}
        </div>
      </div>
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default UserProfileModal;
