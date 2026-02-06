
export enum Role {
  DEPOT = 'DEPOT',
  CUSTOMS = 'CUSTOMS', // Nhân viên thủ tục hải quan
  TRANSPORT = 'TRANSPORT', // Phòng vận tải
}

export interface User {
  username: string;
  name: string;
  role: Role;
}

export enum VesselStatus {
  INBOUND = 'NHAP', // Nhập khẩu
  OUTBOUND = 'XUAT', // Xuất khẩu
}

export enum ContainerStatus {
  PLANNING = 'Planning',
  YARD_UNSTACKED = 'Unstacked', // Chưa khai thác
  CLEARED = 'Cleared', // Đã khai thác
  GATE_OUT = 'Gate Out', // Đã rời bãi
  ISSUE = 'Issue' // Có vấn đề
}

export interface Vessel {
  id: string;
  name: string;
  shippingLine: string; // Hãng tàu
  eta: string; // Thời gian cập
  etd?: string; // Thời gian rời (dự kiến)
  status: VesselStatus;
  voyageNo: string;
}

// Dữ liệu gốc từ CS (Customer Service)
export interface ContainerCS {
  id: string; // Số Cont
  vesselId: string;
  owner: string; // Chủ hàng
  packages: number; // Số kiện
  tons: number; // Số tấn
  demDetDate: string; // Hạn lệnh
  emptyReturnLocation?: string; // Nơi hạ rỗng (cho hàng nhập)
  status: ContainerStatus;
  yardPosition?: string;

  // New fields for Customs view (Read-only from CS)
  sealNumber?: string;
  transportDeclNo?: string; // Số tờ khai vận chuyển (nhà vận chuyển)
  transportDeclDate?: string; // Ngày tờ khai vận chuyển

  // Customs Data (Synced)
  dnlDeclNo?: string; // tkDnlOla
  dnlDeclDate?: string; // ngayTkDnl
  customsPkgs?: number; // customsPkgs
  customsWeight?: number; // customsWeight
  actualPkgs?: number;
  actualWeight?: number;

  // Field to store specific issue reason (synced from Customs)
  discrepancyReason?: string;
}

// Dữ liệu tờ khai từ Hải quan (Import Excel)
export interface CustomsDeclaration {
  containerId: string;
  declarationNo: string; // Số tờ khai
  declarationDate: string; // Ngày tờ khai
  declaredPackages: number;
  declaredTons: number;
}

// Dữ liệu Seal (Hàng xuất)
export interface SealData {
  id: string;
  vesselId: string;
  serialNumber: string;
  status?: 'Available' | 'Used'; // Trạng thái seal
  assignedContainerId?: string;
}

// Dữ liệu Xe (Vận tải)
export interface Vehicle {
  id: string;
  vesselId: string;
  plateNumber: string; // Biển số xe
  trailerNumber?: string; // Số mooc
  driverName?: string;
  tripsCompleted: number; // Field này sẽ được tính toán động từ ExportTally
  status: 'ACTIVE' | 'INACTIVE'; // Trạng thái hoạt động
}

// Dữ liệu Tally Xuất (Từ Kiểm viên)
export interface ExportTally {
  id: string;
  vesselId: string;
  containerId: string;
  vehicleId: string; // Link tới xe
  tallyman: string; // Tên kiểm viên
  timestamp: string;
}

export interface Discrepancy {
  containerId: string;
  type: 'PACKAGES' | 'TONS' | 'MISSING_DECLARATION';
  csValue: number | string;
  declaredValue: number | string;
}

// Hệ thống thông báo
export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'warning' | 'success';
}