
import React from 'react';
import { ICONS } from '../constants';
import { Container, Vessel, ContainerStatus, DetentionConfig } from '../types';
import { checkDetentionStatus } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  containers: Container[];
  vessels: Vessel[];
  detentionConfig: DetentionConfig;
}

const Dashboard: React.FC<DashboardProps> = ({ containers, vessels, detentionConfig }) => {
  const stats = {
    total: containers.length,
    ready: containers.filter(c => c.status === ContainerStatus.READY).length,
    urgentDet: containers.filter(c => checkDetentionStatus(c.detExpiry, detentionConfig) === 'urgent' && c.status !== ContainerStatus.COMPLETED).length,
    completed: containers.filter(c => c.status === ContainerStatus.COMPLETED).length,
  };

  const chartData = [
    { name: 'Sẵn sàng', count: stats.ready, fill: '#3B82F6' },
    { name: 'Đang khai thác', count: containers.filter(c => c.status === ContainerStatus.IN_PROGRESS).length, fill: '#F59E0B' },
    { name: 'Hoàn tất', count: stats.completed, fill: '#10B981' },
    { name: 'Chờ TK', count: containers.filter(c => c.status === ContainerStatus.PENDING).length, fill: '#94A3B8' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Tổng Container" 
          value={stats.total} 
          icon={<ICONS.Ship className="text-blue-600" />} 
          trend="+5% từ tuần trước"
          bgColor="bg-blue-50"
        />
        <MetricCard 
          title="Sẵn sàng khai thác" 
          value={stats.ready} 
          icon={<ICONS.CheckCircle className="text-green-600" />} 
          trend="Dựa trên tờ khai"
          bgColor="bg-green-50"
        />
        <MetricCard 
          title="Cảnh báo DET (Gấp)" 
          value={stats.urgentDet} 
          icon={<ICONS.AlertTriangle className="text-red-600" />} 
          trend={`Hết hạn < ${detentionConfig.urgentDays} ngày`}
          bgColor="bg-red-50"
        />
        <MetricCard 
          title="Hoàn tất trong ngày" 
          value={stats.completed} 
          icon={<ICONS.FileText className="text-indigo-600" />} 
          trend="Cập nhật 2 phút trước"
          bgColor="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Trạng thái Container toàn hệ thống</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vessel Activity List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Chuyến tàu đang xử lý</h3>
          <div className="space-y-4">
            {vessels.map(v => (
              <div key={v.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-left">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{v.vesselName}</h4>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border">{v.voyageNo}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                  <p className="truncate text-blue-600">Hàng: {v.commodity}</p>
                  <p>Sản lượng: {v.totalWeight.toFixed(1)} Tấn</p>
                </div>
                <div className="mt-3 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full w-[65%]"></div>
                </div>
              </div>
            ))}
            {vessels.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Chưa có chuyến tàu nào</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{title: string; value: number | string; icon: React.ReactNode; trend: string; bgColor: string}> = ({
  title, value, icon, trend, bgColor
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow text-left">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        {icon}
      </div>
    </div>
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{trend}</p>
    </div>
  </div>
);

export default Dashboard;
