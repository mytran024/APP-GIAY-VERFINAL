
import React, { useState, useMemo, useEffect } from 'react';
import { ResourceMember, ResourceType } from '../types';
import { ICONS } from '../constants';

interface ResourceManagementProps {
  resources: ResourceMember[];
  onUpdateResources: (r: ResourceMember[]) => void;
}

const ResourceManagement: React.FC<ResourceManagementProps> = ({ resources, onUpdateResources }) => {
  const [activeType, setActiveType] = useState<ResourceType>(ResourceType.LABOR);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const [formData, setFormData] = useState<Partial<ResourceMember>>({
    name: '', phone: '', department: 'KHO', type: ResourceType.LABOR, isOutsourced: false, unitName: ''
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filtered = useMemo(() => resources.filter(r => r.type === activeType), [resources, activeType]);
  const laborCount = useMemo(() => resources.filter(r => r.type === ResourceType.LABOR).length, [resources]);
  const mechCount = useMemo(() => resources.filter(r => r.type === ResourceType.MECHANICAL).length, [resources]);
  const extCount = useMemo(() => resources.filter(r => r.type === ResourceType.EXTERNAL_UNIT).length, [resources]);

  const handleAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return; // Only name is strictly required for all types
    if (activeType !== ResourceType.EXTERNAL_UNIT && !formData.phone) return; // Phone required for internal

    // Chuẩn hóa dữ liệu sang chữ hoa khi lưu
    const finalData = {
      ...formData,
      name: (formData.name || '').toUpperCase().trim(),
      unitName: (formData.unitName || '').toUpperCase().trim(),
    };

    if (editingId) {
      onUpdateResources(resources.map(r => r.id === editingId ? { ...r, ...finalData } as ResourceMember : r));
      setToast({ message: `Đã cập nhật: ${finalData.name}`, type: 'success' });
    } else {
      const newResource: ResourceMember = {
        id: Math.random().toString(36).substr(2, 9),
        ...finalData,
        type: activeType
      } as ResourceMember;
      onUpdateResources([...resources, newResource]);
      setToast({ message: `Đã thêm: ${finalData.name}`, type: 'success' });
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', department: 'KHO', type: activeType, isOutsourced: activeType === ResourceType.EXTERNAL_UNIT, unitName: '' });
  };

  const startEdit = (r: ResourceMember) => {
    setEditingId(r.id);
    setFormData({ ...r });
    setShowModal(true);
  };

  const handleDelete = (member: ResourceMember) => {
    onUpdateResources(resources.filter(r => r.id !== member.id));
    setToast({ message: `Đã xóa: ${member.name}`, type: 'warning' });
  };

  return (
    <div className="flex flex-col gap-5 animate-fadeIn h-full relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-8 z-[9999] animate-slideIn">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
            <div className="shrink-0">
              {toast.type === 'success' ? <ICONS.CheckCircle className="w-4 h-4" /> : <ICONS.AlertTriangle className="w-4 h-4" />}
            </div>
            <span className="font-semibold text-xs uppercase tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-center no-print px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Quản lý nguồn lực</h2>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Danh sách nhân sự và cơ giới</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveType(ResourceType.LABOR)} className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase transition-all tracking-wider ${activeType === ResourceType.LABOR ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>CÔNG NHÂN ({laborCount})</button>
            <button onClick={() => setActiveType(ResourceType.MECHANICAL)} className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase transition-all tracking-wider ${activeType === ResourceType.MECHANICAL ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>CƠ GIỚI ({mechCount})</button>
            <button onClick={() => setActiveType(ResourceType.EXTERNAL_UNIT)} className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase transition-all tracking-wider ${activeType === ResourceType.EXTERNAL_UNIT ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>CƠ GIỚI NGOÀI ({extCount})</button>
          </div>

          <button onClick={() => { setShowModal(true); setFormData({ ...formData, type: activeType, isOutsourced: activeType === ResourceType.EXTERNAL_UNIT }); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            {activeType === ResourceType.EXTERNAL_UNIT ? 'Thêm đơn vị' : 'Thêm mới'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-20 border-b border-slate-200">
              <tr className="text-slate-400">
                <th className="px-6 py-4 font-bold uppercase text-[9px] tracking-wider w-[8%] text-center">STT</th>
                <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[35%]">Thông tin</th>
                <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[22%] text-center">Liên hệ</th>
                {activeType !== ResourceType.EXTERNAL_UNIT && (
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-wider w-[15%] text-center">Bộ phận</th>
                )}
                <th className="px-6 py-4 font-bold uppercase text-[9px] tracking-wider w-[20%] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-center"><span className="text-xs font-medium text-slate-400">{idx + 1}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-sm tracking-tight">{r.name}</span>
                      {r.type === ResourceType.EXTERNAL_UNIT && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Đơn vị thuê ngoài</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center"><span className="text-xs font-semibold text-slate-500 tracking-tight">{r.phone || '---'}</span></td>
                  {activeType !== ResourceType.EXTERNAL_UNIT && (
                    <td className="px-4 py-4 text-center"><span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-tight border border-slate-200">{r.department || '---'}</span></td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(r)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Chỉnh sửa"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                      <button onClick={() => handleDelete(r)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Xóa"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-slideUp">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{editingId ? 'Cập nhật thông tin' : 'Thêm mới nguồn lực'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleAddEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">
                  {activeType === ResourceType.EXTERNAL_UNIT ? 'Tên đơn vị thuê ngoài' : 'Họ tên / Tên đội'}
                </label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase" placeholder={activeType === ResourceType.EXTERNAL_UNIT ? "NHẬP TÊN CÔNG TY..." : "NHẬP TÊN..."} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">
                  {activeType === ResourceType.EXTERNAL_UNIT ? 'Thông tin liên hệ' : 'Số điện thoại'}
                </label>
                <input required={activeType !== ResourceType.EXTERNAL_UNIT} type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder={activeType === ResourceType.EXTERNAL_UNIT ? "Người liên hệ / SĐT..." : "090..."} />
              </div>

              {activeType !== ResourceType.EXTERNAL_UNIT && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">Bộ phận</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer"><option value="KHO">KHO DANALOG</option><option value="ĐIỀU ĐỘ">ĐIỀU ĐỘ</option><option value="GIAO NHẬN">GIAO NHẬN</option></select>
                </div>
              )}
              <div className="pt-4"><button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold uppercase text-[11px] tracking-[0.2em] shadow-md hover:bg-blue-700 transition-all active:scale-[0.98]">Lưu thông tin</button></div>
            </form>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } @keyframes slideIn { from { opacity: 0; transform: translateX(15px); } to { opacity: 1; transform: translateX(0); } } .animate-slideUp { animation: slideUp 0.3s ease-out forwards; } .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }`}</style>
    </div>
  );
};

export default ResourceManagement;
