
import { ContainerCS, ContainerStatus, Vessel, VesselStatus, ExportTally } from "./types";

export const MOCK_VESSELS: Vessel[] = [
  {
    id: "V001",
    name: "DANALOG PIONEER",
    shippingLine: "MAERSK",
    eta: "2026-05-20",
    etd: "2026-05-22",
    status: VesselStatus.INBOUND,
    voyageNo: "MSK-2405"
  },
  {
    id: "V002",
    name: "GLORY OCEAN",
    shippingLine: "COSCO",
    eta: "2026-05-25",
    etd: "2026-05-27",
    status: VesselStatus.OUTBOUND,
    voyageNo: "CSC-2405"
  }
];

export const MOCK_CONTAINERS: ContainerCS[] = [
  // V001 - Import Containers
  // Logic: Tons = Packages * 1.8
  {
    id: "MSKU1234567",
    vesselId: "V001",
    owner: "GIAY SAI GON",
    packages: 15,
    tons: 27.0, // 15 * 1.8
    demDetDate: "2026-05-18", // Expired
    emptyReturnLocation: "ICD PHUOC LONG",
    status: ContainerStatus.YARD_UNSTACKED,
    sealNumber: "HLE-112233",
    transportDeclNo: "1002998811", // Group A
    transportDeclDate: "2026-05-18" // Group A
  },
  {
    id: "MSKU8889990",
    vesselId: "V001",
    owner: "GIAY CHINH PHONG",
    packages: 20,
    tons: 36.0, // 20 * 1.8
    demDetDate: "2026-05-22", // Warning
    emptyReturnLocation: "CAT LAI",
    status: ContainerStatus.ISSUE, // Changed from PROCESSING to ISSUE for demo
    sealNumber: "HLE-445566",
    transportDeclNo: "1002998811", // Group A (Same as above to test auto-fill)
    transportDeclDate: "2026-05-18" // Group A
  },
  {
    id: "MSKU4445556",
    vesselId: "V001",
    owner: "AN BÌNH PAPER",
    packages: 16,
    tons: 28.8, // 16 * 1.8
    demDetDate: "2026-06-01", // OK
    emptyReturnLocation: "DEPOT DONG NAI",
    status: ContainerStatus.CLEARED, // Changed to CLEARED to test "Done" state
    sealNumber: "HLE-778899",
    transportDeclNo: "1002998813",
    transportDeclDate: "2026-05-19"
  },
  // V002 - Export Containers
  {
    id: "CSNU1112223",
    vesselId: "V002",
    owner: "XUAT KHAU GO",
    packages: 30,
    tons: 54.0, // 30 * 1.8
    demDetDate: "2026-05-28",
    status: ContainerStatus.PLANNING
  }
];

// Dữ liệu Tally Xuất (Mocking Inspector Data)
// Maps to the vehicles defined in TransportView (IDs: '1', '2', '3')
export const MOCK_EXPORT_TALLIES: ExportTally[] = [
  // Vehicle '1' (Nguyễn Văn A) - 2 trips
  { id: 'T001', vesselId: 'V002', containerId: 'CONT-A01', vehicleId: '1', tallyman: 'KiemVien01', timestamp: '2026-05-25T08:00:00' },
  { id: 'T002', vesselId: 'V002', containerId: 'CONT-A02', vehicleId: '1', tallyman: 'KiemVien01', timestamp: '2026-05-25T09:30:00' },
  
  // Vehicle '2' (Trần Văn B) - 4 trips
  { id: 'T003', vesselId: 'V002', containerId: 'CONT-B01', vehicleId: '2', tallyman: 'KiemVien02', timestamp: '2026-05-25T08:15:00' },
  { id: 'T004', vesselId: 'V002', containerId: 'CONT-B02', vehicleId: '2', tallyman: 'KiemVien02', timestamp: '2026-05-25T10:00:00' },
  { id: 'T005', vesselId: 'V002', containerId: 'CONT-B03', vehicleId: '2', tallyman: 'KiemVien02', timestamp: '2026-05-25T13:00:00' },
  { id: 'T006', vesselId: 'V002', containerId: 'CONT-B04', vehicleId: '2', tallyman: 'KiemVien02', timestamp: '2026-05-25T15:30:00' },
  
  // Vehicle '3' (Lê Văn C) - 0 trips
];