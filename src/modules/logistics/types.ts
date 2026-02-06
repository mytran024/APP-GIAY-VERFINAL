
export enum UserRole {
  ADMIN = 'ADMIN',
  CS = 'CS',
  INSPECTOR = 'Kiểm viên',
  DEPOT = 'Nhân viên Depot',
  TRANSPORT = 'Nhân viên Vận tải',
  CUSTOMS = 'Hải Quan'
}

export enum BusinessType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT'
}

export enum UnitType {
  CONTAINER = 'CONTAINER',
  VEHICLE = 'VEHICLE'
}

export enum ContainerStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  RESIDUAL = 'RESIDUAL',
  ISSUE = 'ISSUE',
  URGENT = 'URGENT',
  MISMATCH = 'MISMATCH'
}

export enum ResourceType {
  LABOR = 'LABOR',
  MECHANICAL = 'MECHANICAL',
  EXTERNAL_UNIT = 'EXTERNAL_UNIT'
}

export enum WorkOrderType {
  LABOR = 'LABOR',
  MECHANICAL = 'MECHANICAL'
}

export enum WorkOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Vessel {
  id: string;
  vesselName: string;
  commodity: string;
  consignee: string;
  totalContainers: number;
  totalPkgs: number;
  totalWeight: number;
  eta: string;
  etd: string;
  debitStatus?: 'PAID' | 'UNPAID';
  voyageNo?: string;
  // Các trường mới cho nghiệp vụ Xuất
  exportPlanActive?: boolean;
  exportArrivalTime?: string;
  exportOperationTime?: string;
  exportPlannedWeight?: number;
  exportNotifiedDepts?: string[]; // ['Transport', 'Depot', 'Inspector']
}

export interface TransportVehicle {
  id: string;
  vesselId: string;
  stt: number;
  truckNo: string;
  truckReg?: string;
  romocNo: string;
  romocReg?: string;
  driverName: string;
  idCard: string;
  phone: string;
  notes?: string;
}

export interface Container {
  id: string;
  vesselId: string;
  unitType: UnitType;
  containerNo: string;
  size: string;
  sealNo: string;
  carrier: string;
  pkgs: number;
  weight: number;
  actualPkgs?: number;
  actualWeight?: number;
  customsPkgs?: number;
  customsWeight?: number;
  billNo: string;
  vendor: string;
  detExpiry: string;
  tkNhaVC?: string;
  ngayTkNhaVC?: string;
  tkDnlOla?: string;
  ngayTkDnl?: string;
  ngayKeHoach?: string;
  ngayNhapKho?: string;
  noiHaRong?: string;
  status: ContainerStatus;
  updatedAt: string;
  tallyApproved?: boolean;
  workOrderApproved?: boolean;
  remarks?: string;
  workerNames?: string[];
  lastUrgedAt?: string;
  images?: any[];
  shift?: string;      // Ca khai thác (từ phiếu Tally)
  inspector?: string;  // Tên kiểm viên (người tạo phiếu Tally)
}

export interface WorkOrder {
  id: string;
  reportId?: string; // Link to Tally Report
  type: WorkOrderType;
  businessType: BusinessType;
  containerIds: string[];
  containerNos: string[];
  vesselId: string;
  teamName: string;
  workerNames: string[];
  peopleCount: number;
  vehicleNos: string[];
  shift: string;
  date: string;
  items: any[];

  // Specific Fields (Inspector)
  handlingMethod?: string;
  commodityType?: string;
  specification?: string;
  quantity?: number;
  weight?: number;
  dayLaborerCount?: number;
  note?: string;
  status: WorkOrderStatus;
  isHoliday?: boolean;
  isWeekend?: boolean;
  isOutsourced?: boolean;
  vehicleType?: string;
}

export interface SystemUser {
  id: string;
  username: string;
  password?: string; // Added for Supabase Auth Migration
  name: string;
  role: UserRole;
  isActive: boolean;
  employeeId: string;
  phone: string;
  email: string;
  department: string;
}

export interface ServicePrice {
  id: string;
  name: string;
  unit: string;
  price: number;
  category: 'WEIGHT' | 'UNIT';
  group: 'GENERAL' | 'METHOD';
  subGroup?: 'LABOR' | 'MECHANICAL';
  businessType?: BusinessType;
}

export interface DetentionConfig {
  urgentDays: number;
  warningDays: number;
}

export interface Invoice {
  id: string;
  vesselId: string;
  amount: number;
  date: string;
  status: 'PAID' | 'UNPAID';
}

export interface ResourceMember {
  id: string;
  name: string;
  phone: string;
  department: string;
  type: ResourceType;
  isOutsourced?: boolean;
  unitName?: string;
}

export interface Consignee {
  id: string;
  name: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
}
