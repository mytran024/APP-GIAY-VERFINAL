
import React, { useState, useRef, useMemo } from 'react';
import { ServicePrice, BusinessType, Consignee } from '../types';
import { ICONS } from '../constants';
import * as XLSX from 'xlsx';
import { Plus, Trash, Save, X, CheckCircle } from 'lucide-react';

interface PricingConfigProps {
  prices: ServicePrice[];
  onUpdatePrices: (prices: ServicePrice[]) => void;
  consignees: Consignee[];
  onUpdateConsignees: (consignees: Consignee[]) => void;
}

const PricingConfigPage: React.FC<PricingConfigProps> = ({ prices, onUpdatePrices, consignees, onUpdateConsignees }) => {
  const [activeGroup, setActiveGroup] = useState<'GENERAL' | 'METHOD' | 'CONSIGNEE'>('METHOD');
  const [businessFilter, setBusinessFilter] = useState<BusinessType>(BusinessType.IMPORT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ServicePrice>>({});

  const [editingConsigneeId, setEditingConsigneeId] = useState<string | null>(null);
  const [editConsigneeValues, setEditConsigneeValues] = useState<Partial<Consignee>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState({ type: 'PERCENT', value: 0, unit: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPrices = useMemo(() => {
    return prices.filter(p => {
      if (p.id === 'weight-factor') return false;
      if (p.group !== activeGroup) return false;
      if (activeGroup === 'METHOD' && p.businessType !== businessFilter) return false;
      return true;
    });
  }, [prices, activeGroup, businessFilter]);

  const weightFactorItem = prices.find(p => p.id === 'weight-factor');

  const handleDownloadTemplate = () => {
    let templateData: any[][] = [];
    let fileName = "";

    if (activeGroup === 'GENERAL') {
      fileName = "Mau_Don_Gia_Chung_Danalog.xlsx";
      templateData = [
        ["ID (Để trống nếu thêm mới)", "Tên dịch vụ", "Đơn vị tính", "Đơn giá", "Phân loại (Tấn / Cont)"],
        ["", "Phí vệ sinh container", "đồng/cont", "150000", "Cont"],
        ["", "Phí khai thác hàng nhập kho", "đồng/tấn", "9000", "Tấn"]
      ];
    } else if (activeGroup === 'CONSIGNEE') {
      fileName = "Mau_Danh_Sach_Chu_Hang.xlsx";
      templateData = [
        ["ID (Để trống nếu thêm mới)", "Tên Chủ Hàng", "Mã Số Thuế", "Địa Chỉ", "Email", "SĐT"],
        ["", "CÔNG TY ABC", "0123456789", "Đà Nẵng", "contact@abc.com", "0905123456"]
      ];
    } else {
      fileName = "Mau_Phuong_An_PCT_Danalog.xlsx";
      templateData = [
        ["ID (Để trống nếu thêm mới)", "Tên phương án", "Đơn vị tính", "Đơn giá", "Nghiệp vụ (Hàng nhập / Hàng xuất)", "Thực hiện (Công nhân / Cơ giới)"],
        ["", "Cont -> Cửa kho", "đồng/tấn", "12000", "Hàng nhập", "Cơ giới"],
        ["", "Đóng mở cont, bấm seal", "đồng/cont", "250000", "Hàng nhập", "Công nhân"]
      ];
    }

    try {
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Lỗi khi tạo file Excel:", error);
      alert("Có lỗi xảy ra khi tạo file mẫu.");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const newItems: ServicePrice[] = [];
        const rows = data.slice(1);

        rows.forEach((row) => {
          if (!row[1]) return;

          if (activeGroup === 'GENERAL') {
            const rawCategory = row[4]?.toString().trim().toLowerCase();
            const category = rawCategory === 'cont' ? 'UNIT' : 'WEIGHT';
            newItems.push({
              id: row[0] || `gen_${Math.random().toString(36).substr(2, 5)}`,
              name: row[1],
              unit: row[2] || 'đồng',
              price: Number(row[3]) || 0,
              category: category as 'UNIT' | 'WEIGHT',
              group: 'GENERAL'
            });
          } else {
            const rawBiz = row[4]?.toString().trim().toLowerCase();
            const rawSub = row[5]?.toString().trim().toLowerCase();

            newItems.push({
              id: row[0] || `meth_${Math.random().toString(36).substr(2, 5)}`,
              name: row[1],
              unit: row[2] || 'đồng',
              price: Number(row[3]) || 0,
              category: (row[2]?.toString().toLowerCase().includes('tấn') ? 'WEIGHT' : 'UNIT'),
              group: 'METHOD',
              businessType: (rawBiz === 'hàng xuất' || rawBiz === 'export') ? BusinessType.EXPORT : BusinessType.IMPORT,
              subGroup: (rawSub === 'cơ giới' || rawSub === 'mechanical') ? 'MECHANICAL' : 'LABOR'
            });
          }
        });

        const updatedPrices = [...prices];
        newItems.forEach(item => {
          const idx = updatedPrices.findIndex(p => p.id === item.id);
          if (idx > -1) updatedPrices[idx] = item;
          else updatedPrices.push(item);
        });

        onUpdatePrices(updatedPrices);
        alert(`Đã cập nhật ${newItems.length} mục thành công!`);
      } catch (err) {
        alert("Lỗi khi đọc file Excel.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPrices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredPrices.map(p => p.id)));
  };

  const applyBatchEdit = () => {
    const updated = prices.map(p => {
      if (!selectedIds.has(p.id)) return p;
      let newPrice = p.price;
      if (batchAction.type === 'PERCENT') newPrice = Math.round(p.price * (1 + batchAction.value / 100));
      else if (batchAction.type === 'FIXED') newPrice = p.price + batchAction.value;

      return { ...p, price: newPrice, unit: batchAction.unit || p.unit };
    });

    onUpdatePrices(updated);
    setShowBatchModal(false);
    setSelectedIds(new Set());
    setBatchAction({ type: 'PERCENT', value: 0, unit: '' });
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    onUpdatePrices(prices.map(p => p.id === id ? { ...p, price: newPrice } : p));
  };

  const startEdit = (p: ServicePrice) => {
    setEditingId(p.id);
    setEditValues({ ...p });
  };

  const saveEdit = () => {
    if (editingId && editValues) {
      onUpdatePrices(prices.map(p => p.id === editingId ? { ...p, ...editValues } as ServicePrice : p));
      setEditingId(null);
    }
  };

  const deletePrice = (id: string) => {
    if (confirm("Chắc chắn xoá phương án này?")) {
      onUpdatePrices(prices.filter(p => p.id !== id));
    }
  };

  /* Consignee Handlers */
  const handleAddConsignee = () => {
    const newConsignee: Consignee = {
      id: `c_${Math.random().toString(36).substr(2, 6)}`,
      name: '',
      taxCode: '',
      address: ''
    };
    onUpdateConsignees([newConsignee, ...consignees]);
    setEditingConsigneeId(newConsignee.id);
    setEditConsigneeValues(newConsignee);
  };

  const startEditConsignee = (c: Consignee) => {
    setEditingConsigneeId(c.id);
    setEditConsigneeValues({ ...c });
  };

  const saveEditConsignee = () => {
    if (editingConsigneeId && editConsigneeValues) {
      if (!editConsigneeValues.name) return alert("Tên chủ hàng không được để trống!");
      onUpdateConsignees(consignees.map(c => c.id === editingConsigneeId ? { ...c, ...editConsigneeValues } as Consignee : c));
      setEditingConsigneeId(null);
    }
  };

  const deleteConsignee = (id: string) => {
    if (confirm("Chắc chắn xoá chủ hàng này?")) {
      onUpdateConsignees(consignees.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left h-full flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls,.csv" />

      {/* Header Title */}
      <div className="flex items-center gap-3 no-print ml-1">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">CẤU HÌNH CHUNG</h3>
      </div>

      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 shrink-0">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button onClick={() => { setActiveGroup('GENERAL'); setSelectedIds(new Set()); }} className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider ${activeGroup === 'GENERAL' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Đơn giá chung</button>
          <button onClick={() => { setActiveGroup('METHOD'); setSelectedIds(new Set()); }} className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider ${activeGroup === 'METHOD' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Phương án PCT</button>
          <button onClick={() => { setActiveGroup('CONSIGNEE'); setSelectedIds(new Set()); }} className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider ${activeGroup === 'CONSIGNEE' ? 'bg-white shadow-md text-purple-600' : 'text-slate-400'}`}>QUẢN LÝ CHỦ HÀNG</button>
        </div>

        <div className="flex items-center gap-3">
          {activeGroup === 'METHOD' && (
            <div className="flex bg-slate-50 p-1 rounded-xl mr-4 border">
              <button onClick={() => { setBusinessFilter(BusinessType.IMPORT); setSelectedIds(new Set()); }} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${businessFilter === BusinessType.IMPORT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Hàng Nhập</button>
              <button onClick={() => { setBusinessFilter(BusinessType.EXPORT); setSelectedIds(new Set()); }} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${businessFilter === BusinessType.EXPORT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Hàng Xuất</button>
            </div>
          )}
          <button onClick={handleDownloadTemplate} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all">Tải mẫu</button>

          {activeGroup === 'CONSIGNEE' ? (
            <button onClick={handleAddConsignee} className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-purple-700 shadow-xl flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> THÊM CHỦ HÀNG
            </button>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-xl flex items-center gap-2 transition-all">Import Excel</button>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between animate-slideUp">
          <div className="flex items-center gap-6 px-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center font-black text-[11px]">{selectedIds.size}</div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Đã chọn</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowBatchModal(true)} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">CHỈNH SỬA HÀNG LOẠT</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">HUỶ</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeGroup === 'CONSIGNEE' ? (
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
                <tr className="text-slate-400">
                  <th className="px-6 py-6 font-black uppercase text-[10px] tracking-[0.2em] w-[30%]">Tên chủ hàng</th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] w-[15%]">Mã số thuế</th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] w-[25%]">Địa chỉ</th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] w-[15%]">Liên hệ</th>
                  <th className="px-8 py-6 font-black uppercase text-[10px] tracking-[0.2em] text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {consignees.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-5">
                      {editingConsigneeId === c.id ? (
                        <input type="text" autoFocus className="w-full border-2 border-purple-500 rounded-xl px-4 py-2 outline-none font-black text-slate-800 uppercase" value={editConsigneeValues.name || ''} onChange={(e) => setEditConsigneeValues({ ...editConsigneeValues, name: e.target.value })} placeholder="TÊN CHỦ HÀNG" />
                      ) : (
                        <span className="font-black text-[13px] uppercase tracking-tight text-slate-800">{c.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {editingConsigneeId === c.id ? (
                        <input type="text" className="w-full border-2 border-purple-500 rounded-xl px-3 py-2 outline-none font-bold text-slate-600 text-[11px]" value={editConsigneeValues.taxCode || ''} onChange={(e) => setEditConsigneeValues({ ...editConsigneeValues, taxCode: e.target.value })} placeholder="MST" />
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">{c.taxCode || '---'}</span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {editingConsigneeId === c.id ? (
                        <input type="text" className="w-full border-2 border-purple-500 rounded-xl px-3 py-2 outline-none font-medium text-slate-600 text-[11px]" value={editConsigneeValues.address || ''} onChange={(e) => setEditConsigneeValues({ ...editConsigneeValues, address: e.target.value })} placeholder="Địa chỉ" />
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 truncate block">{c.address || '---'}</span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {editingConsigneeId === c.id ? (
                        <div className="space-y-1">
                          <input type="text" className="w-full border-2 border-purple-500 rounded-lg px-2 py-1 outline-none text-[10px]" value={editConsigneeValues.phone || ''} onChange={(e) => setEditConsigneeValues({ ...editConsigneeValues, phone: e.target.value })} placeholder="SĐT" />
                          <input type="text" className="w-full border-2 border-purple-500 rounded-lg px-2 py-1 outline-none text-[10px]" value={editConsigneeValues.email || ''} onChange={(e) => setEditConsigneeValues({ ...editConsigneeValues, email: e.target.value })} placeholder="Email" />
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          <p>{c.phone}</p>
                          <p>{c.email}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      {editingConsigneeId === c.id ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={saveEditConsignee} className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingConsigneeId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditConsignee(c)} className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Sửa</button>
                          <button onClick={() => deleteConsignee(c.id)} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all"><Trash className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {consignees.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-20 text-slate-300 font-black uppercase text-sm tracking-widest">Chưa có dữ liệu chủ hàng</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
                <tr className="text-slate-400">
                  <th className="px-6 py-6 w-16 text-center"><input type="checkbox" checked={selectedIds.size === filteredPrices.length && filteredPrices.length > 0} onChange={toggleSelectAll} className="w-5 h-5 accent-blue-600 cursor-pointer" /></th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] w-[45%]">Dịch vụ / Phương án</th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] text-center w-32">Đơn vị</th>
                  <th className="px-4 py-6 font-black uppercase text-[10px] tracking-[0.2em] text-right w-44">Đơn giá</th>
                  <th className="px-8 py-6 font-black uppercase text-[10px] tracking-[0.2em] text-center w-32">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPrices.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr key={p.id} className={`transition-all group ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-6 py-5 text-center"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} className="w-5 h-5 accent-blue-600 cursor-pointer" /></td>
                      <td className="px-4 py-5">
                        {editingId === p.id ? (
                          <input type="text" className="w-full border-2 border-blue-500 rounded-xl px-4 py-2 outline-none font-black text-slate-800 uppercase" value={editValues.name || ''} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} />
                        ) : (
                          <div>
                            <p className={`font-black text-[13px] uppercase tracking-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{p.name}</p>
                            {p.subGroup && <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1 inline-block bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{p.subGroup === 'MECHANICAL' ? 'CƠ GIỚI' : 'CÔNG NHÂN'}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {editingId === p.id ? (
                          <input type="text" className="w-full border-2 border-blue-500 rounded-xl px-2 py-2 outline-none font-black text-center text-slate-800" value={editValues.unit || ''} onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })} />
                        ) : (
                          <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200">{p.unit}</span>
                        )}
                      </td>
                      <td className="px-4 py-5 text-right">
                        {editingId === p.id ? (
                          <input type="number" className="w-full border-2 border-blue-500 rounded-xl px-4 py-2 outline-none font-black text-right text-blue-600" value={editValues.price || 0} onChange={(e) => setEditValues({ ...editValues, price: parseInt(e.target.value) })} />
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className={`font-black text-lg tracking-tighter ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{p.price.toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {editingId === p.id ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={saveEdit} className="p-2 bg-emerald-600 text-white rounded-lg"><CheckCircle className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(p)} className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Sửa</button>
                            <button onClick={() => deletePrice(p.id)} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all"><Trash className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-slideUp">
            <div className="p-8 bg-blue-600 text-white">
              <h3 className="text-xl font-black uppercase">Điều chỉnh hàng loạt</h3>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">1. ĐIỀU CHỈNH GIÁ</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setBatchAction({ ...batchAction, type: 'PERCENT' })} className={`py-4 rounded-2xl font-black uppercase text-[10px] border-2 ${batchAction.type === 'PERCENT' ? 'border-blue-600 text-blue-600' : 'text-slate-400'}`}>Theo %</button>
                  <button onClick={() => setBatchAction({ ...batchAction, type: 'FIXED' })} className={`py-4 rounded-2xl font-black uppercase text-[10px] border-2 ${batchAction.type === 'FIXED' ? 'border-blue-600 text-blue-600' : 'text-slate-400'}`}>Số tiền (₫)</button>
                </div>
                <input type="number" value={batchAction.value} onChange={e => setBatchAction({ ...batchAction, value: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-3xl font-black text-slate-800 text-center shadow-inner" placeholder="0" />
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={applyBatchEdit} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em]">ÁP DỤNG</button>
                <button onClick={() => setShowBatchModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em]">HUỶ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default PricingConfigPage;
