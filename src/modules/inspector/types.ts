
export enum Shift {
  SHIFT_1 = '1',
  SHIFT_2 = '2',
  SHIFT_3 = '3',
  SHIFT_4 = '4'
}

export interface Container {
  id: string;
  contNo: string;
  size: string;
  expectedUnits: number;
  expectedWeight: number;
  owner: string;
  sealNo: string;
  tkHouse?: string;      // Số TK Nhà VC
  tkHouseDate?: string;  // Ngày TK Nhà VC
  tkDnl?: string;        // Số TK DNL
  tkDnlDate?: string;    // Ngày TK DNL
  vendor?: string;
  detLimit?: string;     // Hạn DET
}

export interface TallyItem {
  contId: string;
  contNo: string;
  size?: string; // Kích thước/Loại xe
  commodityType: string;
  sealNo: string;
  targetUnits?: number;
  actualUnits: number;
  targetWeight?: number;
  actualWeight: number;
  isScratchedFloor: boolean;
  tornUnits: number;
  notes: string;
  transportVehicle?: string; // Biển số xe vận tải (dành cho Tally Xuất)
  sealCount?: number;
  photos: string[]; // Danh sách ảnh (Base64 hoặc URL)
}

export interface MechanicalDetail {
  name: string;
  task: string; // Phương án bốc dỡ
  isExternal: boolean; // Cơ giới ngoài hay nội bộ
}

export interface TallyReport {
  id: string;
  vesselId: string;
  mode: 'NHAP' | 'XUAT';
  shift: Shift;
  workDate: string;
  owner: string;
  workerCount: number;
  workerNames: string;
  workerHandlingMethod?: string; // Phương án bốc dỡ công nhân

  // Cơ giới nội bộ
  mechanicalCount: number;
  mechanicalNames: string; // Giữ lại để backward compatibility hiển thị

  // Ảnh báo cáo minh chứng (toàn phiếu)
  proofImageUrl?: string;

  // Cơ giới ngoài
  externalMechanicalCount?: number;

  // Chi tiết phương án bốc dỡ của từng cơ giới
  mechanicalDetails?: MechanicalDetail[];

  equipment: string;
  vehicleNo: string;
  vehicleType: string;
  items: TallyItem[];
  createdAt: number;
  createdBy?: string; // Tên kiểm viên tạo phiếu
  status: 'NHAP' | 'HOAN_TAT';

  // Metadata để biết report này thuộc loại xe gì (dùng khi tách report)
  vehicleCategory?: 'CONTAINER' | 'XE_THOT';
}

export interface WorkOrder {
  id: string;
  reportId: string;
  vesselId: string;
  type: 'LABOR' | 'MECHANICAL'; // Aligned with WorkOrderType
  businessType?: 'IMPORT' | 'EXPORT';
  containerIds?: string[];
  containerNos?: string[];
  teamName?: string;
  organization: string;
  personCount: number;
  peopleCount: number;
  vehicleType: string;
  vehicleNo: string;
  handlingMethod: string;
  commodityType: string;
  specification: string;
  quantity: number;
  weight: number;
  dayLaborerCount: number;
  note: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; // Aligned with WorkOrderStatus
  isHoliday?: boolean;
  isWeekend?: boolean;
  isOutsourced?: boolean;
  date?: string;
  shift?: string;
  workerNames?: string[];
  vehicleNos?: string[];
  items?: any[];
}

export interface Vessel {
  id: string;
  vesselName: string;
  voyage: string;
  eta: string;
  etd?: string;
  customerName: string; // Tên khách hàng từ CS
  totalConts: number;
  totalUnitsExpected: number;
  totalWeightExpected: number;
  isExport?: boolean;
  isBlocked?: boolean;
  blockReason?: string;
}
