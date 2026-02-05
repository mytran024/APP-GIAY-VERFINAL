
import { Container, Vessel, ContainerStatus, DetentionConfig, UnitType, Consignee } from '../types';

/**
 * Hàm chuẩn hóa ngày tháng về định dạng chuẩn quốc tế YYYY-MM-DD
 */
export const normalizeDate = (input: any): string => {
  if (!input) return '';

  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    // Basic Handling for Excel Serial Dates (approximate if raw number passed)
    // Excel base date Dec 30 1899. 
    // But usually better to rely on cellDates: true option in XLSX read
    date = new Date((input - 25569) * 86400 * 1000);
  } else {
    const dateStr = String(input).trim();
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${d}`;
      }
    }
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const displayDate = (isoDate: string | undefined): string => {
  if (!isoDate) return '-';
  // Handle ISO string with time "2023-11-20T14:..."
  const datePart = isoDate.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return isoDate;
  // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * Logic: Xử lý xóa trùng lặp và Sum dữ liệu khi Import
 * QUY TẮC: Chỉ khi có ĐỦ tkNhaVC và tkDnlOla mới được coi là READY/COMPLETED
 */
export const processImportData = (
  rawInput: any[],
  currentVesselId: string,
  existingContainers: Container[]
): { containers: Container[]; summary: { totalPkgs: number; totalWeight: number } } => {

  const containerMap = new Map<string, Container>();

  existingContainers.forEach(c => {
    if (c.vesselId === currentVesselId) {
      containerMap.set(c.containerNo, c);
    }
  });

  const detectUnitType = (id: string): UnitType => {
    if (!id) return UnitType.CONTAINER;
    const cleanId = id.toString().trim().toUpperCase();
    if (cleanId.includes('/')) return UnitType.VEHICLE;
    const containerPattern = new RegExp('^[A-Z]{4}\\d{7}$');
    const cleanNo = cleanId.replace(new RegExp('[\\s\\.-]', 'g'), '');
    if (containerPattern.test(cleanNo)) return UnitType.CONTAINER;
    return UnitType.VEHICLE;
  };

  const getValue = (row: any, candidates: string[]): any => {
    if (!row) return undefined;
    const keys = Object.keys(row);
    // Optimization: Create map once if needed, but for small row count loop is fine
    for (const cand of candidates) {
      const uCand = cand.toUpperCase().trim();
      const match = keys.find(k => k.toUpperCase().trim() === uCand);
      if (match && row[match] !== undefined && row[match] !== null) {
        return row[match];
      }
    }
    return undefined;
  };

  // --- PRE-PROCESS: NORMALIZE INPUT TO OBJECTS ---
  let processedRows: any[] = [];

  // Check if input is Array of Arrays (from sheet_to_json header:1)
  if (rawInput.length > 0 && Array.isArray(rawInput[0])) {
    const rows = rawInput as any[][];
    let headerIdx = -1;

    // Scan first 20 rows for header
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const rowStr = row.map(c => String(c || '').toUpperCase()).join(' ');

      // Simple Check: Look for reliable ID column
      if (rowStr.includes('CONTAINER NO') || rowStr.includes('SỐ CONT') || rowStr.includes('CONT NO') || rowStr.includes('SỐ XE')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx !== -1) {
      const headers = rows[headerIdx].map(h => String(h || '').trim());
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const rowData = rows[i];
        if (!rowData || rowData.length === 0) continue;

        const obj: any = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = rowData[idx];
        });
        processedRows.push(obj);
      }
    } else {
      // Fallback: Use first row as header if no keywords found
      // Or just map assuming Index 0, 1 etc? No, dangerous.
      // We'll treat row 0 as header.
      if (rows.length > 0) {
        const headers = rows[0].map(h => String(h || '').trim());
        for (let i = 1; i < rows.length; i++) {
          const obj: any = {};
          headers.forEach((h: string, idx: number) => { if (h) obj[h] = rows[i][idx]; });
          processedRows.push(obj);
        }
      }
    }
  } else {
    // Assume already Objects (header:0 or default)
    processedRows = rawInput;
  }

  // --- PROCESS ROWS ---
  processedRows.forEach(row => {
    // Skip likely garbage rows
    if (!row || Object.keys(row).length === 0) return;

    const rawNo = getValue(row, ['containerNo', 'SỐ CONT/SỐ MOOC', 'SỐ CONT', 'SỐ CONTAINER', 'CONTAINER NO', 'SỐ XE', 'TRUCK NO', 'CONT NO']);
    if (!rawNo || String(rawNo).trim().toUpperCase() === 'NO' || String(rawNo).trim().toUpperCase() === 'STT') return;

    const containerNo = String(rawNo).trim().toUpperCase();



    // Extract Fields
    const carrier = getValue(row, ['carrier', 'HÃNG TÀU', 'HÃNG', 'CARRIER']) || 'N/A';
    const pkgs = Number(getValue(row, ['pkgs', 'SỐ KIỆN', 'KIỆN', 'SỐ LƯỢNG', 'NUMBER OF PACKING', 'SỐ BAO', 'QUANTITY'])) || 0;
    const weight = Number(getValue(row, ['weight', 'SỐ KÝ', 'TRỌNG LƯỢNG', 'TRỌNG LƯỢNG', 'GW', 'GROSS WEIGHT', 'QTY', 'SỐ TẤN'])) || 0;

    const detExpiryRaw = getValue(row, ['detExpiry', 'HẠN DET', 'DET DEADLINE TIME', 'DET']);
    const detExpiry = normalizeDate(detExpiryRaw || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    const ngayKeHoachRaw = getValue(row, ['ngayKeHoach', 'dayOfLoading', 'NGÀY BỐC CONT', 'NGÀY KẾ HOẠCH', 'DAY OF LOADING']);
    const ngayKeHoach = normalizeDate(ngayKeHoachRaw || new Date().toISOString());

    const billNo = getValue(row, ['billNo', 'BILL NHẬP', 'BILL OF LADING NO', 'BILL', 'VẬN ĐƠN']) || '';
    const vendor = getValue(row, ['vendor', 'VENDOR', 'CHỦ KHAI THÁC']) || '';
    const noiHaRong = getValue(row, ['noiHaRong', 'NƠI HẠ RỖNG', 'PLACE OF EMTY CONT RETURN', 'NƠI HẠ']) || 'TIEN SA';

    // Declarations
    const vcDeclaration = getValue(row, ['tkNhaVC', 'toKhai', 'TỜ KHAI', 'CUSTOM DECLARATION', 'SỐ TỜ KHAI']) || '';
    const dnlDeclaration = getValue(row, ['tkDnlOla', 'TO_KHAI_DNL', 'TỜ KHAI DNL']) || '';
    const isFullyDocumented = !!(vcDeclaration && dnlDeclaration);

    const unitType = detectUnitType(containerNo);
    const sizeRaw = getValue(row, ['size', 'KÍCH CỠ', 'SIZE', 'LOẠI CONT']);
    const size = sizeRaw || (unitType === UnitType.VEHICLE ? "XE THỚT" : "40HC");

    // Check for existing container to PRESERVE ID (Update instead of Insert)
    const existingContainer = containerMap.get(containerNo);
    const id = existingContainer ? existingContainer.id : (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }));

    const newContainer: Container = {
      id,
      vesselId: currentVesselId,
      unitType,
      containerNo,
      size: String(size).toUpperCase(),
      sealNo: String(getValue(row, ['sealNo', 'SỐ SEAL', 'SEAL NO', 'SEAL']) || '').toUpperCase(),
      carrier,
      pkgs,
      weight,
      // Optional Customs Comparison Columns
      customsPkgs: row.customsPkgs ? Number(row.customsPkgs) : undefined,
      customsWeight: row.customsWeight ? Number(row.customsWeight) : undefined,

      billNo,
      vendor,
      detExpiry,
      tkNhaVC: String(vcDeclaration).toUpperCase(),
      ngayTkNhaVC: normalizeDate(getValue(row, ['ngayTkNhaVC', 'THỜI GIAN KHAI HQ', 'NGÀY TỜ KHAI', 'NGÀY TK']) || ''),
      tkDnlOla: String(dnlDeclaration).toUpperCase(),
      ngayTkDnl: normalizeDate(getValue(row, ['ngayTkDnl', 'NGÀY TK DNL', 'THỜI GIAN DNL']) || ''),
      ngayKeHoach,
      ngayNhapKho: normalizeDate(getValue(row, ['ngayNhapKho', 'NGÀY NHẬP KHO']) || ''),
      noiHaRong,
      status: isFullyDocumented ? ContainerStatus.READY : ContainerStatus.PENDING,
      updatedAt: new Date().toISOString(),
      remarks: getValue(row, ['remarks', 'GHI CHÚ', 'NOTE']) || ''
    };

    containerMap.set(containerNo, newContainer);
  });

  const finalContainers = Array.from(containerMap.values());
  const totalPkgs = finalContainers.reduce((sum, c) => sum + c.pkgs, 0);
  const totalWeight = finalContainers.reduce((sum, c) => sum + c.weight, 0);

  return { containers: finalContainers, summary: { totalPkgs, totalWeight } };
};

export const checkDetentionStatus = (
  expiryDate: string,
  config: DetentionConfig = { urgentDays: 2, warningDays: 5 }
): 'urgent' | 'warning' | 'safe' => {
  const expiry = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= config.urgentDays) return 'urgent';
  if (diffDays <= config.warningDays) return 'warning';
  return 'safe';
};

export const MOCK_CONSIGNEES: Consignee[] = [
  { id: 'c1', name: 'DNP TIÊN SA', taxCode: '123456789', address: 'KCN Liên Chiểu' },
  { id: 'c2', name: 'SME LOGISTICS', taxCode: '987654321', address: 'Hà Nội' },
  { id: 'c3', name: 'CONG TY GIAY AN HOA', taxCode: '555555555', address: 'Quảng Ngãi' }
];


