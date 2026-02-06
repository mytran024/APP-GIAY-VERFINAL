
import { Vessel, Shift, Container } from './types';

// Phương án bốc dỡ
export const HANDLING_METHODS = {
  MECHANICAL_IMPORT: [
    "Cont -> Cửa kho",
    "Cửa kho -> Xếp lô"
  ],
  MECHANICAL_EXPORT: [
    "Trong kho -> Cửa kho",
    "Cửa kho -> Lên xe"
  ],
  WORKER_IMPORT_CONT: "Đóng mở cont, bấm seal",
  WORKER_IMPORT_FLATBED: "Đóng mở cont, bấm seal, gấp bạt",
  WORKER_EXPORT: "Bấm seal" // Dành cho xuất giấy xe thớt theo yêu cầu
};

export const MOCK_VESSELS: Vessel[] = [
  {
    id: 'v1',
    vesselName: 'TÀU S30',
    voyage: 'V2026-05',
    eta: '05/01/2026',
    etd: '07/01/2026',
    customerName: 'EASY SUCCUESS SHIPPING PTE LTD',
    totalConts: 15,
    totalUnitsExpected: 240,
    totalWeightExpected: 432
  },
  // Removed Wan Hai

  {
    id: 'v3',
    vesselName: 'GLORY OCEAN',
    voyage: '2403N',
    eta: '15/01/2026',
    etd: '16/01/2026',
    customerName: 'DA NANG PORT LOGISTICS (DPL)',
    totalConts: 8,
    totalUnitsExpected: 128,
    totalWeightExpected: 230
  },
  {
    id: 'v4',
    vesselName: 'TÀU MIXED TEST',
    voyage: 'TEST-01',
    eta: '20/01/2026',
    etd: '21/01/2026',
    customerName: 'TEST LOGISTICS',
    totalConts: 4,
    totalUnitsExpected: 58,
    totalWeightExpected: 104.4
  }
];

export const MOCK_CONTAINERS: Record<string, Container[]> = {
  'v1': [
    { id: '1', contNo: 'GESU6721400', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462426', tkHouse: '500592570963', tkDnl: '500592633150', detLimit: '7/1/2026' },
    { id: '2', contNo: 'MEDU8466699', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462427', tkHouse: '500592570964', tkDnl: '', detLimit: '7/1/2026' }, // Chưa đủ TK DNL
    { id: '3', contNo: 'MSMU4755070', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462430', tkHouse: '500592570967', tkDnl: '500592633150', detLimit: '7/1/2026' },
    { id: '4', contNo: 'TXGU5463840', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'SME', sealNo: 'H/25.0462432', tkHouse: '', tkDnl: '', detLimit: '7/1/2026' }, // Chưa đủ cả 2
  ],
  // Removed v2

  'v3': [
    { id: '201', contNo: '29D012.45/29R019.42', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'DPL', sealNo: 'H/25.999001', tkHouse: '500592571001', tkDnl: '500592634001', detLimit: '20/01/2026', vendor: 'Vận tải Thăng Long' },
    { id: '202', contNo: '43C123.45/43R001.23', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'DPL', sealNo: 'H/25.999002', tkHouse: '500592571002', tkDnl: '500592634002', detLimit: '20/01/2026', vendor: 'Vận tải Đà Nẵng' },
    { id: '203', contNo: '15C555.55/15R666.66', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'DPL', sealNo: 'H/25.999003', tkHouse: '500592571003', tkDnl: '500592634003', detLimit: '20/01/2026', vendor: 'Vận tải Hải Phòng' },
    { id: '204', contNo: '51D888.12/51R888.34', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'DPL', sealNo: 'H/25.999004', tkHouse: '500592571004', tkDnl: '', detLimit: '20/01/2026', vendor: 'Sài Gòn Trans' }, // Chưa đủ TK DNL
  ],
  'v4': [
    { id: '401', contNo: 'TEST100001', size: '40HC', expectedUnits: 16, expectedWeight: 28.8, owner: 'TEST', sealNo: 'H/26.000001', tkHouse: '500592572001', tkDnl: '500592635001', detLimit: '30/01/2026' },
    { id: '402', contNo: 'TEST200002', size: '20DC', expectedUnits: 10, expectedWeight: 18.0, owner: 'TEST', sealNo: 'H/26.000002', tkHouse: '500592572002', tkDnl: '500592635002', detLimit: '30/01/2026' },
    { id: '403', contNo: '43C-999.99/43R-888.88', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'TEST', sealNo: 'H/26.000003', tkHouse: '500592572003', tkDnl: '500592635003', detLimit: '30/01/2026', vendor: 'Vận tải Thăng Long' },
    { id: '404', contNo: '29H-777.77/29R-666.66', size: 'XE THỚT', expectedUnits: 16, expectedWeight: 28.8, owner: 'TEST', sealNo: 'H/26.000004', tkHouse: '500592572004', tkDnl: '500592635004', detLimit: '30/01/2026', vendor: 'Vận tải Hải Phòng' },
  ]
};

export const SHIFT_OPTIONS = Object.values(Shift);

// Danh sách giả lập từ CS (Customer Service / HR System)
export const MOCK_WORKERS = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Minh Đức",
  "Hoàng Văn Em", "Vũ Thị Giang", "Đặng Văn Hùng", "Bùi Thị Lan",
  "Đỗ Văn Minh", "Hồ Thị Ngọc", "Ngô Văn Phát", "Dương Thị Quyên",
  "Lý Văn Sang", "Vương Thị Thúy", "Trịnh Văn Uy", "Phan Thị Vy",
  "Lâm Văn Xinh", "Châu Thị Yến", "Trương Văn Dũng", "Nguyễn Thành Nam"
];

// Cleaned names without vehicle type in parenthesis
export const MOCK_DRIVERS = [
  "Nguyễn Văn Tài", "Lê Văn Xế",
  "Trần Văn Cẩu", "Phạm Văn Móc",
  "Hoàng Văn Kéo", "Vũ Văn Nâng",
  "Đặng Văn Chuyển", "Bùi Văn Vận"
];

// Danh sách xe vận tải (nhà xe) - có trạng thái
export const MOCK_TRANSPORT_VEHICLES = [
  { plate: "43C-123.45/43R-012.34", status: 'ACTIVE' },
  { plate: "43C-567.89/43R-056.78", status: 'ACTIVE' },
  { plate: "92C-999.99/92R-099.99", status: 'STOPPED' }, // Đã ngừng hoạt động
  { plate: "92C-888.88/92R-088.88", status: 'ACTIVE' },
  { plate: "29C-111.11/29R-011.11", status: 'ACTIVE' },
  { plate: "29C-222.22/29R-022.22", status: 'ACTIVE' },
  { plate: "51D-333.33/51R-033.33", status: 'STOPPED' }, // Đã xóa/ngừng
  { plate: "51D-444.44/51R-044.44", status: 'ACTIVE' },
  { plate: "75C-555.55/75R-055.55", status: 'ACTIVE' },
  { plate: "75C-666.66/75R-066.66", status: 'ACTIVE' },
  { plate: "43H-121.21/43R-021.21", status: 'ACTIVE' },
  { plate: "43H-343.43/43R-043.43", status: 'ACTIVE' }
];

export const MOCK_EXTERNAL_UNITS = [
  "Vận tải Thăng Long",
  "Vận tải Đà Nẵng",
  "Vận tải Hải Phòng",
  "Sài Gòn Trans",
  "Logistics Tiên Sa",
  "Vận tải Biển Đông",
  "Hợp tác xã Vận tải số 1"
];

// Danh sách Seal Hải quan
export const MOCK_CUSTOMS_SEALS = [
  "HPH-00123", "HPH-00124", "HPH-00125", "HPH-00126",
  "DN-999001", "DN-999002", "DN-999003", "DN-999004",
  "HQ-555123", "HQ-555124", "HQ-555125", "HQ-555126"
];

// Placeholder logo (reverted from large Base64)
export const COMPANY_LOGO_URL = "https://i.imgur.com/f7pNWx6.jpeg";
