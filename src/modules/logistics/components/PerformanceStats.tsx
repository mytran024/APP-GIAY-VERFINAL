
import React from 'react';
import { Invoice } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';

const PerformanceStats: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
  // Dữ liệu giả lập tinh gọn
  const monthlyData = [
    { name: 'T.1', revenue: 450, cost: 210 },
    { name: 'T.2', revenue: 520, cost: 240 },
    { name: 'T.3', revenue: 380, cost: 180 },
    { name: 'T.4', revenue: 610, cost: 290 },
    { name: 'T.5', revenue: 750, cost: 350 },
    { name: 'T.6', revenue: 480, cost: 230 },
  ];

  const vesselPerformance = [
    { name: 'STEP FORWARD', weight: 8010, revenue: 152000000, efficiency: 95 },
    { name: 'DANALOG PIONEER', weight: 4200, revenue: 85000000, efficiency: 92 },
    { name: 'GLORY OCEAN', weight: 3800, revenue: 72000000, efficiency: 85 },
    // Removed WAN HAI
  ];

  const operationData = [
    { name: 'Rút ruột', value: 65, color: '#3B82F6' },
    { name: 'Đóng xuất', value: 20, color: '#10B981' },
    { name: 'Nội bộ', value: 15, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-left pb-10">
      {/* Top 3 Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TỔNG DOANH THU</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">1.250.000</span>
            <span className="text-sm font-bold text-blue-600 uppercase">vnđ</span>
          </div>
          <p className="text-[10px] font-bold text-emerald-500 mt-4 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            Tăng 12.5% so với kỳ trước
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CHI PHÍ VẬN HÀNH</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">485.200</span>
            <span className="text-sm font-bold text-slate-400 uppercase">vnđ</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">Tỉ lệ lợi nhuận: 61.2%</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SẢN LƯỢNG THÔNG QUA</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600 tracking-tighter">21.450</span>
            <span className="text-sm font-bold text-slate-400 uppercase">tấn</span>
          </div>
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[78%]"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Doanh thu vs Chi phí */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Biên lợi nhuận theo tháng</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Đơn vị: Triệu VNĐ</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3B82F6" strokeWidth={3} fill="url(#blueGrad)" />
                <Area type="monotone" dataKey="cost" name="Chi phí" stroke="#F43F5E" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cơ cấu tác nghiệp */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="w-full text-left mb-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cơ cấu tác nghiệp</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={operationData} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                  {operationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-2 mt-4">
            {operationData.map((op) => (
              <div key={op.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">{op.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900">{op.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tàu & Sản lượng - Business Focus Table */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Hiệu quả kinh doanh theo tàu</h3>
          <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Quý 1 - 2026</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">
                <th className="pb-4">TÊN TÀU / CHUYẾN</th>
                <th className="pb-4 text-center">SẢN LƯỢNG (TẤN)</th>
                <th className="pb-4 text-center">DOANH THU DỰ KIẾN</th>
                <th className="pb-4 text-right">CHỈ SỐ HIỆU QUẢ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vesselPerformance.map((v, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                  <td className="py-4">
                    <span className="font-black text-slate-800 text-[12px] uppercase">{v.name}</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">VOYAGE: V{24 + i}</p>
                  </td>
                  <td className="py-4 text-center font-black text-slate-600 text-[12px]">{v.weight.toLocaleString()}</td>
                  <td className="py-4 text-center font-black text-blue-600 text-[12px]">{v.revenue.toLocaleString()} ₫</td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${v.efficiency}%` }}></div>
                      </div>
                      <span className="text-[11px] font-black text-emerald-600">{v.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
