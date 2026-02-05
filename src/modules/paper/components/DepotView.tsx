import React, { useMemo, useState } from 'react';
import { Vessel, ContainerCS, ContainerStatus, VesselStatus } from '../types';
import { AlertTriangle, Clock, MapPin, Search, Megaphone, Check, Loader2, Zap, Anchor, Ban, CheckCircle2, Filter, X } from 'lucide-react';

interface DepotViewProps {
  vessels: Vessel[];
  containers: ContainerCS[];
}

export const DepotView: React.FC<DepotViewProps> = ({ vessels, containers }) => {
  const [selectedVesselId, setSelectedVesselId] = React.useState<string>(vessels[0]?.id || "");
  const [filterText, setFilterText] = React.useState("");

  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDemDet, setFilterDemDet] = useState<string>('ALL'); // 'ALL' | 'EXPIRED' | 'URGENT' | 'NORMAL'
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [filterShippingLine, setFilterShippingLine] = useState<string>('ALL');

  // State to track urge status per container: 'idle' | 'sending' | 'sent'
  const [urgeStatus, setUrgeStatus] = useState<Record<string, 'sending' | 'sent'>>({});

  // Get unique Empty Return Locations for the dropdown
  const uniqueLocations = useMemo(() => {
    const locs = new Set(
      containers
        .filter(c => c.vesselId === selectedVesselId && c.emptyReturnLocation)
        .map(c => c.emptyReturnLocation)
    );
    return Array.from(locs);
  }, [containers, selectedVesselId]);

  // Get unique Shipping Lines for the dropdown
  const uniqueShippingLines = useMemo(() => {
    const lines = new Set(
      containers
        .filter(c => c.vesselId === selectedVesselId)
        .map(c => vessels.find(v => v.id === c.vesselId)?.shippingLine)
        .filter(l => l)
    );
    return Array.from(lines) as string[];
  }, [containers, selectedVesselId, vessels]);

  const filteredContainers = useMemo(() => {
    const today = new Date("2026-05-21"); // Mock "Today"

    const result = containers.filter(c => {
      // 1. Vessel Filter (Base)
      if (c.vesselId !== selectedVesselId) return false;

      // 2. Text Search (ID Only - Owner removed)
      const matchesText = c.id.toLowerCase().includes(filterText.toLowerCase());
      if (!matchesText) return false;

      // 3. Status Filter
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;

      // 4. Location Filter
      if (filterLocation !== 'ALL' && c.emptyReturnLocation !== filterLocation) return false;

      // 5. Shipping Line Filter
      const sLine = vessels.find(v => v.id === c.vesselId)?.shippingLine;
      if (filterShippingLine !== 'ALL' && sLine !== filterShippingLine) return false;

      // 6. DEM/DET Filter
      if (filterDemDet !== 'ALL') {
        const demDate = new Date(c.demDetDate);
        const diffTime = demDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Logic must match getDemDetStatus
        if (filterDemDet === 'EXPIRED' && diffDays >= 0) return false;
        if (filterDemDet === 'URGENT' && (diffDays < 0 || diffDays > 2)) return false;
        if (filterDemDet === 'NORMAL' && diffDays <= 2) return false;
      }

      return true;
    });

    // Sorting Logic
    return result.sort((a, b) => {
      // 1. "Đã khai thác" (CLEARED) moved to bottom
      const isACleared = a.status === ContainerStatus.CLEARED;
      const isBCleared = b.status === ContainerStatus.CLEARED;

      if (isACleared && !isBCleared) return 1;
      if (!isACleared && isBCleared) return -1;

      // 2. Urgent DEM/DET (Earlier dates) moved to top
      const dateA = new Date(a.demDetDate).getTime();
      const dateB = new Date(b.demDetDate).getTime();

      return dateA - dateB;
    });
  }, [containers, selectedVesselId, filterText, filterStatus, filterDemDet, filterLocation, filterShippingLine, vessels]);

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  const totalStats = useMemo(() => {
    return filteredContainers.reduce((acc, curr) => ({
      packages: acc.packages + curr.packages,
      tons: acc.tons + curr.tons
    }), { packages: 0, tons: 0 });
  }, [filteredContainers]);

  // Helper to determine row color based on DEM/DET
  const getDemDetStatus = (dateStr: string, status: ContainerStatus) => {
    // If cleared or issue, we don't need urgent warnings in the same way
    if (status === ContainerStatus.CLEARED) {
      return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Hoàn tất', urgent: false };
    }

    if (status === ContainerStatus.ISSUE) {
      return { color: 'text-slate-400 bg-slate-100 border-slate-200', label: 'Tạm dừng', urgent: false };
    }

    const today = new Date("2026-05-21"); // Mock "Today"
    const demDate = new Date(dateStr);
    const diffTime = demDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-red-50 border-red-200 text-red-700', label: `Quá hạn ${Math.abs(diffDays)} ngày`, urgent: true };
    if (diffDays <= 2) return { color: 'bg-amber-50 border-amber-200 text-amber-700', label: `Hết hạn trong ${diffDays} ngày`, urgent: true };
    return { color: 'text-slate-600', label: `${diffDays} ngày còn lại`, urgent: false };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '??';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const getStatusDisplay = (status: ContainerStatus) => {
    switch (status) {
      case ContainerStatus.PLANNING:
        return { label: 'Kế hoạch', className: 'bg-slate-100 text-slate-600' };
      case ContainerStatus.YARD_UNSTACKED:
        return { label: 'Chưa khai thác', className: 'bg-purple-100 text-purple-800' };
      case ContainerStatus.ISSUE:
        return { label: 'Có vấn đề', className: 'bg-red-100 text-red-800 font-bold border border-red-200' };
      case ContainerStatus.CLEARED:
        return { label: 'Đã khai thác', className: 'bg-green-100 text-green-800' };
      case ContainerStatus.GATE_OUT:
        return { label: 'Đã rời bãi', className: 'bg-gray-100 text-gray-600' };
      default:
        return { label: status, className: 'bg-slate-100 text-slate-600' };
    }
  };

  const handleUrgeInspector = (containerId: string) => {
    // 1. Set status to sending
    setUrgeStatus(prev => ({ ...prev, [containerId]: 'sending' }));

    // 2. Simulate API delay (800ms)
    setTimeout(() => {
      setUrgeStatus(prev => ({ ...prev, [containerId]: 'sent' }));
    }, 800);
  };

  const resetFilters = () => {
    setFilterStatus('ALL');
    setFilterDemDet('ALL');
    setFilterLocation('ALL');
    setFilterShippingLine('ALL');
    setFilterText('');
  };

  return (
    <div className="space-y-6">
      {/* Vessel Selector Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Theo dõi Khai thác Bãi</h2>
          <div className="flex space-x-3">
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[250px]"
              value={selectedVesselId}
              onChange={(e) => setSelectedVesselId(e.target.value)}
            >
              {vessels.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} | {formatDate(v.eta)} - {formatDate(v.etd)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedVessel && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Tàu</span>
              <span className="font-semibold text-slate-900">{selectedVessel.name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Lịch ETA - ETD</span>
              <span className="font-semibold text-slate-900">
                {formatDate(selectedVessel.eta)} - {formatDate(selectedVessel.etd)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Tổng Cont / Xe thớt</span>
              <span className="font-semibold text-slate-900">{filteredContainers.length}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Tổng số kiện/số tấn</span>
              <span className="font-semibold text-slate-900">
                {totalStats.packages.toLocaleString()} kiện / {totalStats.tons.toLocaleString()} tấn
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Operations Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
              Danh sách Container
            </h3>
            <div className="flex space-x-2">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Tìm số Container..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter size={16} className="mr-2" />
                Bộ lọc
              </button>
            </div>
          </div>

          {/* Advanced Filters Section */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tình trạng DEM/DET</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  value={filterDemDet}
                  onChange={(e) => setFilterDemDet(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="EXPIRED">Đã quá hạn</option>
                  <option value="URGENT">Sắp hết hạn (≤ 2 ngày)</option>
                  <option value="NORMAL">Trong hạn (&gt; 2 ngày)</option>
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Trạng thái</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value={ContainerStatus.YARD_UNSTACKED}>Chưa khai thác</option>
                  <option value={ContainerStatus.CLEARED}>Đã khai thác</option>
                  <option value={ContainerStatus.ISSUE}>Có vấn đề</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nơi hạ rỗng</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc || ''}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Hãng tàu</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  value={filterShippingLine}
                  onChange={(e) => setFilterShippingLine(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  {uniqueShippingLines.map(line => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </select>
              </div>

              <div className="flex-none">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors flex items-center h-[38px] whitespace-nowrap"
                >
                  <X size={16} className="mr-2" />
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Số Container</th>
                <th className="px-6 py-4">Hãng tàu</th>
                {/* Chủ hàng column removed */}
                <th className="px-6 py-4">Sản lượng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Hạn DEM/DET</th>
                <th className="px-6 py-4">Nơi hạ rỗng</th>
                <th className="px-6 py-4 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContainers.map(container => {
                const demStatus = getDemDetStatus(container.demDetDate, container.status);
                const status = urgeStatus[container.id];
                const statusInfo = getStatusDisplay(container.status);

                const isIssue = container.status === ContainerStatus.ISSUE;
                const isCleared = container.status === ContainerStatus.CLEARED;

                // Visual styling for Issue rows
                const rowClass = isIssue
                  ? "bg-red-50 text-slate-700"
                  : "hover:bg-slate-50 transition-colors text-slate-700";

                return (
                  <tr key={container.id} className={rowClass}>
                    <td className="px-6 py-4 font-mono font-medium">{container.id}</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center space-x-1.5 font-semibold ${isIssue ? 'text-slate-500' : 'text-blue-700'}`}>
                        <Anchor size={14} className={isIssue ? "text-slate-400" : "text-blue-400"} />
                        <span>{selectedVessel?.shippingLine}</span>
                      </div>
                    </td>
                    {/* Chủ hàng cell removed */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs">
                        <span>{container.packages} kiện</span>
                        <span className={isIssue ? "text-slate-500" : "text-slate-500"}>{container.tons} tấn</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center space-x-2 px-2 py-1 rounded-md w-fit ${demStatus.color}`}>
                        {demStatus.urgent && <AlertTriangle size={14} />}
                        <span className="font-medium text-xs">{demStatus.label}</span>
                      </div>
                      {!isCleared && !isIssue && (
                        <div className="text-xs text-slate-400 mt-1 flex items-center">
                          <Clock size={12} className="mr-1" /> {formatDate(container.demDetDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {container.emptyReturnLocation ? (
                        <div className={`flex items-center ${isIssue ? 'text-slate-500' : 'text-slate-600'}`}>
                          <MapPin size={14} className="mr-1 opacity-50" />
                          {container.emptyReturnLocation}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isIssue && (
                        <span className="inline-flex items-center text-xs font-bold text-red-500 bg-white border border-red-200 px-2 py-1 rounded">
                          <Ban size={14} className="mr-1" />
                          Dừng khai thác
                        </span>
                      )}

                      {isCleared && (
                        <span className="inline-flex items-center text-xs font-bold text-green-600">
                          <CheckCircle2 size={14} className="mr-1" />
                          Đã xong
                        </span>
                      )}

                      {!isIssue && !isCleared && demStatus.urgent ? (
                        <button
                          onClick={() => handleUrgeInspector(container.id)}
                          disabled={!!status}
                          className={`
                            inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border shadow-sm
                            ${!status
                              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:shadow-md' // Red style for urgency
                              : status === 'sending'
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-wait'
                                : 'bg-green-50 border-green-200 text-green-700 cursor-default'
                            }
                          `}
                          title={status === 'sent' ? 'Đã gửi thông báo cho kiểm viên' : 'Sắp hết hạn: Gửi yêu cầu ưu tiên xử lý'}
                        >
                          {status === 'sending' && (
                            <>
                              <Loader2 size={14} className="mr-1.5 animate-spin" />
                              Đang gửi...
                            </>
                          )}
                          {status === 'sent' && (
                            <>
                              <Check size={14} className="mr-1.5" />
                              Đã báo
                            </>
                          )}
                          {!status && (
                            <>
                              <Megaphone size={14} className="mr-1.5" />
                              Đôn đốc
                            </>
                          )}
                        </button>
                      ) : (
                        !isIssue && !isCleared && <span className="text-xs text-slate-400 italic font-medium">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredContainers.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Không tìm thấy container nào cho bộ lọc này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};