import React, { useState } from 'react';
import { Vessel, Vehicle, VesselStatus } from '../types';
import { MOCK_EXPORT_TALLIES } from '../constants';
import { Truck, Plus, User, Edit2, Trash2, X, Save, FileSpreadsheet, Ban, CheckCircle, RotateCcw, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { StorageService } from '../../../services/storage';
import { db } from '../../../services/db'; // Import DB
import { Role } from '../../../types';

interface TransportViewProps {
  vessels: Vessel[];
}

interface ConfirmModalState {
  isOpen: boolean;
  type: 'DELETE' | 'DEACTIVATE' | 'REACTIVATE';
  vehicle: Vehicle;
  computedTrips: number; // Pass the calculated trips to the modal
  title: string;
  content: React.ReactNode;
}

export const TransportView: React.FC<TransportViewProps> = ({ vessels }) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(vessels.find(v => v.status === VesselStatus.OUTBOUND)?.id || "");

  // Note: tripsCompleted in the initial state is now ignored/legacy.
  // The UI calculates it dynamically from MOCK_EXPORT_TALLIES.
  // Load Global Vehicles
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  React.useEffect(() => {
    db.getTransportVehicles().then(setAllVehicles);
  }, []);

  // Filter for current vessel
  const vehicles = allVehicles.filter(v => v.vesselId === selectedVesselId);

  const [newPlate, setNewPlate] = useState("");
  const [newTrailer, setNewTrailer] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for Custom Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // Helper to calculate trips dynamically
  const getTripCount = (vehicleId: string) => {
    return MOCK_EXPORT_TALLIES.filter(t => t.vehicleId === vehicleId && t.vesselId === selectedVesselId).length;
  };

  const handleSaveVehicle = () => {
    if (!newPlate) return;

    let updatedList: Vehicle[];

    if (editingId) {
      // Update existing vehicle
      updatedList = allVehicles.map(v =>
        v.id === editingId
          ? { ...v, plateNumber: newPlate, trailerNumber: newTrailer, driverName: newDriverName }
          : v
      );
      handleCancelEdit();
    } else {
      // Add new vehicle
      const newVehicle: Vehicle = {
        id: Date.now().toString(),
        vesselId: selectedVesselId,
        plateNumber: newPlate,
        trailerNumber: newTrailer,
        driverName: newDriverName,
        tripsCompleted: 0,
        status: 'ACTIVE'
      };
      updatedList = [...allVehicles, newVehicle];
      setNewPlate("");
      setNewTrailer("");
      setNewDriverName("");

      // Notify Inspector
      const vessel = vessels.find(v => v.id === selectedVesselId);
      StorageService.addNotification({
        title: "DANH SÁCH XE (HÀNG XUẤT)",
        message: `Vận tải đã thêm xe ${newPlate} cho tàu ${vessel?.name || 'Unknown'}.`,
        type: 'INFO',
        targetRoles: [Role.INSPECTOR]
      });
    }

    setAllVehicles(updatedList);
    setAllVehicles(updatedList);
    // Auto save the specific one being modified/added to DB
    if (editingId) {
      const vehicle = updatedList.find(v => v.id === editingId);
      if (vehicle) db.upsertTransportVehicle(vehicle);
    } else {
      // Find the new one (last one) or just save the one we created
      const newVehicle = updatedList[updatedList.length - 1]; // Naive but works as we just appended
      if (newVehicle) db.upsertTransportVehicle(newVehicle);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    if (vehicle.status === 'INACTIVE') return;

    setEditingId(vehicle.id);
    setNewPlate(vehicle.plateNumber);
    setNewTrailer(vehicle.trailerNumber || "");
    setNewDriverName(vehicle.driverName || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewPlate("");
    setNewTrailer("");
    setNewDriverName("");
  };

  const initiateDeactivate = (vehicle: Vehicle) => {
    const computedTrips = getTripCount(vehicle.id);
    setConfirmModal({
      isOpen: true,
      type: 'DEACTIVATE',
      vehicle,
      computedTrips,
      title: 'Vô hiệu hóa phương tiện',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-800 text-sm flex items-start">
            <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              {computedTrips > 0
                ? `Xe này đã chạy ${computedTrips} chuyến (theo dữ liệu Kiểm viên). Lịch sử sẽ được bảo lưu.`
                : `Xe này chưa chạy chuyến nào.`}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            Bạn có chắc chắn muốn chuyển sang trạng thái <strong>Ngưng hoạt động</strong>? Xe sẽ không thể nhận lệnh mới.
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-1">
            <p><span className="text-slate-500 inline-block w-20">Tài xế:</span> <span className="font-medium text-slate-800">{vehicle.driverName}</span></p>
            <p><span className="text-slate-500 inline-block w-20">Đầu kéo:</span> <span className="font-mono font-medium text-slate-800">{vehicle.plateNumber}</span></p>
            <p><span className="text-slate-500 inline-block w-20">Rơ-mooc:</span> <span className="font-mono text-slate-800">{vehicle.trailerNumber}</span></p>
          </div>
        </div>
      )
    });
  };

  const initiateDelete = (vehicle: Vehicle) => {
    const computedTrips = getTripCount(vehicle.id);
    setConfirmModal({
      isOpen: true,
      type: 'DELETE',
      vehicle,
      computedTrips,
      title: 'Xóa phương tiện',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-sm flex items-start">
            <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Hành động này sẽ xóa hoàn toàn xe khỏi danh sách và <strong>không thể hoàn tác</strong>.
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-1">
            <p><span className="text-slate-500 inline-block w-20">Tài xế:</span> <span className="font-medium text-slate-800">{vehicle.driverName}</span></p>
            <p><span className="text-slate-500 inline-block w-20">Đầu kéo:</span> <span className="font-mono font-medium text-slate-800">{vehicle.plateNumber}</span></p>
          </div>
        </div>
      )
    });
  };

  const handleReactivate = (vehicle: Vehicle) => {
    setConfirmModal({
      isOpen: true,
      type: 'REACTIVATE',
      vehicle,
      computedTrips: getTripCount(vehicle.id),
      title: 'Kích hoạt lại xe',
      content: (
        <div>
          <p className="text-slate-600 text-sm mb-3">Bạn muốn đưa xe này quay lại danh sách khai thác?</p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-1">
            <p><span className="text-slate-500 inline-block w-20">Tài xế:</span> <span className="font-medium text-slate-800">{vehicle.driverName}</span></p>
            <p><span className="text-slate-500 inline-block w-20">Đầu kéo:</span> <span className="font-mono font-medium text-slate-800">{vehicle.plateNumber}</span></p>
          </div>
        </div>
      )
    });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const { type, vehicle } = confirmModal;

    let updatedList = [...allVehicles];

    if (type === 'DELETE') {
      updatedList = updatedList.filter(v => v.id !== vehicle.id);
      if (editingId === vehicle.id) handleCancelEdit();
    } else if (type === 'DEACTIVATE') {
      updatedList = updatedList.map(v =>
        v.id === vehicle.id ? { ...v, status: 'INACTIVE' } : v
      );
      if (editingId === vehicle.id) handleCancelEdit();
    } else if (type === 'REACTIVATE') {
      updatedList = updatedList.map(v =>
        v.id === vehicle.id ? { ...v, status: 'ACTIVE' } : v
      );
    }

    setAllVehicles(updatedList);
    setAllVehicles(updatedList);

    if (type === 'DELETE') {
      db.deleteTransportVehicle(vehicle.id);
    } else {
      const updated = updatedList.find(v => v.id === vehicle.id);
      if (updated) db.upsertTransportVehicle(updated);
    }

    setConfirmModal(null);
  };

  const handleDownloadTemplate = () => {
    const BOM = "\uFEFF";
    const headers = ["Tên Tài Xế", "Biển Số Đầu Kéo", "Biển Số Rơ-mooc"];
    const exampleRow = ["Nguyễn Văn A", "51C-123.45", "51R-001.00"];

    const csvContent = BOM + headers.join(",") + "\n" + exampleRow.join(",");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_danh_sach_xe.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredVehicles = vehicles.filter(v => v.vesselId === selectedVesselId);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '??';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="space-y-6 relative">
      {/* Custom Modal Overlay */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className={`text-lg font-bold ${confirmModal.type === 'DELETE' ? 'text-red-600' :
                confirmModal.type === 'DEACTIVATE' ? 'text-orange-600' : 'text-blue-600'
                }`}>
                {confirmModal.title}
              </h3>
              <button onClick={() => setConfirmModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {confirmModal.content}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center ${confirmModal.type === 'DELETE' ? 'bg-red-600 hover:bg-red-700' :
                  confirmModal.type === 'DEACTIVATE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {confirmModal.type === 'DELETE' && <Trash2 size={16} className="mr-2" />}
                {confirmModal.type === 'DEACTIVATE' && <Ban size={16} className="mr-2" />}
                {confirmModal.type === 'REACTIVATE' && <CheckCircle size={16} className="mr-2" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Điều phối Vận tải (Hàng Xuất)</h2>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[300px]"
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
          >
            <option value="">-- Chọn chuyến tàu xuất --</option>
            {vessels.filter(v => v.status === VesselStatus.OUTBOUND).map(v => (
              <option key={v.id} value={v.id}>
                {v.name} | {formatDate(v.eta)} - {formatDate(v.etd)}
              </option>
            ))}
          </select>
        </div>

        {selectedVesselId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Form */}
            <div className={`lg:col-span-1 p-5 rounded-xl border h-fit transition-colors ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-semibold mb-4 flex items-center ${editingId ? 'text-blue-800' : 'text-slate-800'}`}>
                {editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                {editingId ? 'Cập nhật thông tin xe' : 'Đăng ký xe vào Kế hoạch'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tên tài xế</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Nhập tên tài xế"
                      value={newDriverName}
                      onChange={e => setNewDriverName(e.target.value)}
                    />
                    <User size={16} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Biển số đầu kéo</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="VD: 51C-123.45"
                    value={newPlate}
                    onChange={e => setNewPlate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Biển số rơ-mooc</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="VD: 51R-001.00"
                    value={newTrailer}
                    onChange={e => setNewTrailer(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleSaveVehicle}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                  >
                    {editingId ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                    {editingId ? 'Lưu thay đổi' : 'Thêm xe'}
                  </button>
                  {editingId ? (
                    <button
                      onClick={handleCancelEdit}
                      className="flex-none px-3 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hủy bỏ"
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <button className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                      Import Excel
                    </button>
                  )}
                </div>

                {/* Download Template Link - Only show when not editing */}
                {!editingId && (
                  <div className="text-center">
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-xs text-slate-400 hover:text-blue-600 flex items-center justify-center w-full transition-colors"
                    >
                      <FileSpreadsheet size={14} className="mr-1.5" />
                      Tải file excel mẫu
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-end mb-3">
                <h3 className="font-semibold text-slate-700">Danh sách phương tiện ({filteredVehicles.length})</h3>
                <span className="text-xs text-slate-500 italic">Dữ liệu được đồng bộ từ Tally Xuất (Kiểm viên)</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">STT</th>
                      <th className="px-4 py-3">Tài xế</th>
                      <th className="px-4 py-3">Đầu kéo</th>
                      <th className="px-4 py-3">Rơ-mooc</th>
                      <th className="px-4 py-3 text-center group relative cursor-help">
                        <span className="flex items-center justify-center">
                          Số chuyến <Info size={12} className="ml-1 text-slate-400" />
                        </span>
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-10">
                          Tính theo lượt Tally Xuất
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Tác vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVehicles.map((v, i) => {
                      const isActive = v.status !== 'INACTIVE';
                      const calculatedTrips = getTripCount(v.id);

                      return (
                        <tr key={v.id} className={`transition-colors ${editingId === v.id ? 'bg-blue-50/50' : isActive ? 'hover:bg-slate-50' : 'bg-slate-50 text-slate-400'}`}>
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className={`px-4 py-3 font-medium ${isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{v.driverName || '--'}</td>
                          <td className={`px-4 py-3 font-mono ${isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{v.plateNumber}</td>
                          <td className="px-4 py-3">{v.trailerNumber || '--'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                              {calculatedTrips}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isActive ? (
                              <span className="text-xs text-green-600 font-medium flex items-center justify-center">
                                <CheckCircle size={12} className="mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium bg-slate-200 px-2 py-0.5 rounded">Ngưng HĐ</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end space-x-2">
                              {/* Edit Button - Disabled if Inactive */}
                              <button
                                onClick={() => handleEdit(v)}
                                disabled={!isActive}
                                className={`p-1.5 rounded transition-colors ${isActive ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-200 cursor-not-allowed'}`}
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={16} />
                              </button>

                              {/* Deactivate Button - Available if Active */}
                              {isActive && (
                                <button
                                  onClick={() => initiateDeactivate(v)}
                                  className="p-1.5 rounded transition-colors text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                                  title="Ngưng hoạt động"
                                >
                                  <Ban size={16} />
                                </button>
                              )}

                              {/* Delete Button - Available if Trips == 0 (Calculated) */}
                              {calculatedTrips === 0 && (
                                <button
                                  onClick={() => initiateDelete(v)}
                                  className="p-1.5 rounded transition-colors text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Xóa vĩnh viễn"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}

                              {/* Reactivate Button - Available if Inactive */}
                              {!isActive && (
                                <button
                                  onClick={() => handleReactivate(v)}
                                  className="p-1.5 text-slate-300 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Kích hoạt lại"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVehicles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">Chưa có xe nào trong kế hoạch</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <Truck size={40} className="mx-auto mb-3 text-slate-300" />
            <p>Vui lòng chọn chuyến tàu xuất khẩu để bắt đầu điều phối.</p>
          </div>
        )}
      </div>
    </div>
  );
};