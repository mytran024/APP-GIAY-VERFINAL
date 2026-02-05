
import React from 'react';
import { TallyReport, Vessel } from '../types';
import { COMPANY_LOGO_URL } from '../constants';

interface TallyPrintTemplateProps {
  report: TallyReport;
  vessel: Vessel;
  isPreview?: boolean;
}

const TallyPrintTemplate: React.FC<TallyPrintTemplateProps> = ({ report, vessel, isPreview }) => {
  // Normalize Vessel Name: Strip redundant "TÀU" prefix if present in the System Name
  const cleanVesselName = vessel.name?.replace(/^TÀU\s+/i, '') || vessel.name;

  const ITEMS_PER_PAGE = 10;
  const items = report.items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  const today = report.workDate ? new Date(report.workDate) : new Date(report.createdAt || Date.now());
  const dateStr = today.getDate().toString().padStart(2, '0');
  const monthStr = (today.getMonth() + 1).toString().padStart(2, '0');
  const yearStr = today.getFullYear().toString();

  // Extract base sequence number from ID (Format: MODE-VesselID-Seq, e.g. NHAP-v1-01)
  const idParts = report.id ? report.id.split('-') : [];
  const seqPart = idParts.length > 0 ? idParts[idParts.length - 1] : '01';
  let baseSeq = parseInt(seqPart);
  if (isNaN(baseSeq) || baseSeq > 999) baseSeq = 1;

  // Helper chuyển số sang chữ (Tiếng Việt)
  const numberToText = (n: number): string => {
    const basic = ['KHÔNG', 'MỘT', 'HAI', 'BA', 'BỐN', 'NĂM', 'SÁU', 'BẢY', 'TÁM', 'CHÍN'];
    const ten = 'MƯỜI';

    if (n < 10) return basic[n];
    if (n === 10) return ten;
    if (n < 20) {
      const digit = n % 10;
      if (digit === 1) return `${ten} MỘT`;
      if (digit === 5) return `${ten} LĂM`;
      return `${ten} ${basic[digit]}`;
    }
    if (n < 100) {
      const tenDigit = Math.floor(n / 10);
      const unitDigit = n % 10;
      let str = `${basic[tenDigit]} MƯƠI`;
      if (unitDigit === 0) return str;
      if (unitDigit === 1) return `${str} MỐT`;
      if (unitDigit === 5) return `${str} LĂM`;
      return `${str} ${basic[unitDigit]}`;
    }
    return n.toString();
  };

  const getNoteContent = (item: any) => {
    const parts = [];
    if (item.isScratchedFloor) parts.push('Sàn bị xước');
    if (item.tornUnits > 0) parts.push(`rách ${item.tornUnits} kiện`);
    if (item.notes && item.notes.trim()) parts.push(item.notes);
    return parts.join(', ');
  };

  return (
    <>
      <style>{`
        .tally-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Times New Roman', serif;
        }
        .tally-table th, .tally-table td {
          border: 1px solid black !important;
          padding: 2px 4px;
          vertical-align: middle;
        }
        .tally-table thead th {
          font-weight: bold;
          text-align: center;
          font-size: 10pt;
        }
        .tally-table td {
          font-size: 10pt;
        }
        @media print {
          @page { size: portrait; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .page-break { 
            page-break-after: always; 
          }
          .page-break:last-of-type {
            page-break-after: auto;
          }
        }
      `}</style>

      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const chunk = items.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
        const pageTotalUnits = chunk.reduce((sum, i) => sum + (i.actualUnits || 0), 0);
        const pageTotalWeight = chunk.reduce((sum, i) => sum + (i.actualWeight || 0), 0);

        const isFlatbedReport = report.vehicleCategory === 'XE_THOT' || (chunk.length > 0 && chunk[0].contNo.includes('/'));

        // Calculate size summary breakdown
        const sizeCounts = chunk.reduce((acc, item) => {
          let size = "40'F";
          // Determine size based on item data
          if (isFlatbedReport) {
            size = "XE";
          } else if (item.size) {
            if (item.size.includes('20')) size = "20'F";
            else if (item.size.includes('40')) size = "40'F";
            else size = item.size; // Fallback to raw size string
          } else {
            // Try to infer from cont number if size is missing (fallback)
            if (item.contNo.startsWith('20') || item.contNo.startsWith('40')) {
              size = item.contNo.startsWith('20') ? "20'F" : "40'F";
            }
          }

          acc[size] = (acc[size] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const summaryStr = Object.entries(sizeCounts)
          .map(([size, count]) => `${count} x ${size}`)
          .join('; ');

        // Calculate dynamic Report Number (No)
        const currentReportNumber = baseSeq.toString().padStart(2, '0');

        // --- MODE NHẬP: PHÂN TRANG (MẪU MỚI) ---
        if (report.mode === 'NHAP') {
          return (
            <div
              key={pageIndex}
              className={`font-serif text-black bg-white p-[10mm] w-[210mm] mx-auto relative ${isPreview ? 'shadow-lg mb-8 min-h-[280mm]' : 'print-document page-break h-[270mm] overflow-hidden'}`}
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-[55%] flex flex-col items-center justify-center text-center">
                  <img src={COMPANY_LOGO_URL} alt="Danalog" className="h-[70px] w-auto object-contain mb-2" />
                  <p className="font-bold text-[9pt]">KHO HÀNG: DANALOG</p>
                  <p className="italic text-[9pt]">Warehouse Division</p>
                  <p className="font-bold text-[10pt] mt-1">No: <span className="ml-2">{currentReportNumber} - {cleanVesselName}</span></p>
                </div>
                <div className="w-[45%] text-center">
                  <p className="font-bold text-[9pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="font-bold text-[8pt] italic uppercase">SOCIALIST REPUBLIC OF VIETNAM</p>
                  <p className="font-bold text-[9pt] underline">Độc lập - Tự do - Hạnh phúc</p>
                  <p className="text-[8pt] italic underline">Independence - Freedom - Happiness</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h1 className="text-[14pt] font-bold uppercase">PHIẾU KIỂM GIAO NHẬN HÀNG - TALLY REPORT</h1>
                <h2 className="text-[12pt] font-bold uppercase">TẠI BÃI CẢNG</h2>
              </div>

              {/* Info Section */}
              <div className="text-[10pt] mb-2 leading-tight">
                <div className="flex mb-1">
                  <span className="w-[180px]">1.Chủ hàng/Consignee:</span>
                  <span className="font-bold uppercase">{report.owner}</span>
                </div>
                <div className="flex mb-1">
                  <span className="w-[80px]">2.Ca/Shift:</span>
                  <span className="font-bold w-[40px]">{report.shift}</span>
                  <span className="w-[80px]">ngày/day:</span>
                  <span className="font-bold w-[40px]">{dateStr}</span>
                  <span className="w-[100px]">tháng/month:</span>
                  <span className="font-bold w-[40px]">{monthStr}</span>
                  <span className="w-[80px]">năm/year:</span>
                  <span className="font-bold">{yearStr}</span>
                </div>
                <div className="flex justify-between mb-1 gap-4">
                  <div className="flex">
                    <span className="mr-2">3.Tổ công nhân xếp dỡ/Stevedore:</span>
                    <span className="font-bold">{report.workerNames || 'CN Kho'}</span>
                  </div>
                  <div className="flex">
                    <span className="mr-2">Thiết bị sử dụng/Equipment:</span>
                    <span className="font-bold">{report.equipment}</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="tally-table mb-2">
                <thead>
                  <tr>
                    <th rowSpan={2} className="w-[40px]">STT<br /><span className="italic font-normal">No</span></th>
                    <th rowSpan={2} className="w-[50px]">Size<br />type</th>
                    <th colSpan={2}>Loại hàng/Description<br /><span className="italic font-normal">Ký mã hiệu/Marks</span></th>
                    <th className="w-[100px]">Số lượng<br /><span className="italic font-normal">Number of package</span></th>
                    <th className="w-[120px]">Ghi chú/<br /><span className="italic font-normal">Remarks</span></th>
                    <th className="w-[80px]">Số tờ khai</th>
                  </tr>
                  <tr>
                    <td colSpan={2} className="text-center font-bold bg-white h-[28px] uppercase text-[10pt]">
                      {chunk[0]?.commodityType || 'Giấy'}
                    </td>
                    <td className="text-center font-bold bg-white h-[28px] uppercase text-[10pt]">
                      {cleanVesselName}
                    </td>
                    <td className="text-center font-bold bg-white h-[28px] uppercase text-[10pt]">
                      VỊ TRÍ RÚT RUỘT:<br />KHO DANALOG
                    </td>
                    <td></td>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((item, idx) => (
                    <tr key={idx} className="h-[28px]">
                      <td className="text-center">{idx + 1}</td>
                      <td className="text-center font-bold">
                        {isFlatbedReport ? "" : (item.size?.includes('20') ? "20'" : "40'")}
                      </td>
                      <td className="font-bold text-center border-r-0 !border-r-0" style={{ borderRight: 'none' }}>{item.contNo}</td>
                      <td className="text-center border-l-0 !border-l-0" style={{ borderLeft: 'none' }}>{item.sealNo}</td>
                      <td className="text-center">{item.actualUnits} Kiện</td>
                      <td className="text-center text-[9pt]">{getNoteContent(item)}</td>
                      <td></td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - chunk.length) }).map((_, i) => (
                    <tr key={`pad-${i}`} className="h-[28px]">
                      <td></td><td></td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td style={{ borderLeft: 'none' }}></td>
                      <td></td><td></td><td></td>
                    </tr>
                  ))}

                  <tr className="font-bold">
                    <td colSpan={4} className="text-right px-2"></td>
                    <td className="text-center text-[10pt] whitespace-nowrap">
                      {pageTotalUnits} Kiện / {Number.isInteger(pageTotalWeight) ? pageTotalWeight : pageTotalWeight.toFixed(2).replace('.', ',')} Tấn
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* Footer Info */}
              <div className="border border-t-0 border-black px-2 py-1 text-[10pt] mt-[-9px] mb-2 border-l-1 border-r-1 border-b-1">
                <div className="flex mb-1">
                  <span className="font-bold mr-2">Ghi chú:</span>
                  <span></span>
                </div>
                <div className="flex mb-1">
                  <span className="mr-2 font-bold">Phương án dịch chuyển:</span>
                  <span className="font-bold"></span>
                </div>
                <div className="flex mb-1 border-t border-black pt-1 items-baseline">
                  <span className="font-bold mr-4">Tổng cộng: (Grand total)</span>
                  <span className="font-bold ml-4">
                    {summaryStr}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold italic mr-4">Viết bằng chữ: (In letter):</span>
                  <span className="font-bold uppercase">
                    {numberToText(chunk.length)} {isFlatbedReport ? "XE CÓ HÀNG NGUYÊN CHÌ" : "CONTAINER HÀNG NGUYÊN CHÌ"}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-2 text-center mt-6 text-[9pt]">
                <div>
                  <p className="font-bold uppercase">ĐẠI DIỆN CỦA TÀU/CHỦ HÀNG</p>
                  <p className="italic font-bold text-[8pt]">Ship's representative/ Consignee</p>
                </div>
                <div>
                  <p className="font-bold uppercase">HẢI QUAN GIÁM SÁT</p>
                  <p className="italic font-bold text-[8pt]">Customs Officer</p>
                </div>
                <div>
                  <p className="font-bold uppercase">ĐẠI DIỆN KHO HÀNG</p>
                  <p className="italic font-bold text-[8pt]">Warehouse Division's representative</p>
                  <p className="mt-16 font-bold uppercase text-[10pt]">
                    {report.createdBy || '........................'}
                  </p>
                </div>
              </div>

              <div className="absolute bottom-10 right-10 text-[9pt] italic">Trang {pageIndex + 1}/{totalPages}</div>
            </div>
          );
        }

        // --- MODE XUẤT: PHÂN TRANG (MẪU CŨ) ---
        return (
          <div
            key={pageIndex}
            className={`font-serif text-[11pt] leading-snug p-[10mm] bg-white text-black mx-auto relative ${isPreview ? 'mb-8 shadow-lg max-w-[210mm] min-h-[280mm]' : 'print-document page-break h-[270mm] overflow-hidden'
              }`}
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div className="w-[40%]">
                <div className="mb-2">
                  <img src={COMPANY_LOGO_URL} alt="Danalog" className="h-[70px] w-auto object-contain object-left" />
                </div>
                <p className="font-bold">KHO HÀNG: DANALOG</p>
                <p className="italic text-[9pt]">Docks Office</p>
                <p className="mt-1">Số: <span className="font-bold ml-2">{currentReportNumber}</span></p>
                <p className="italic text-[9pt]">No.</p>
              </div>
              <div className="w-[60%] text-center">
                <p className="font-bold uppercase text-[10pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold uppercase text-[8pt]">SOCIALIST REPUBLIC OF VIETNAM</p>
                <p className="font-bold text-[10pt]">Độc lập- Tự do- Hạnh phúc</p>
                <p className="italic text-[9pt]">Independence- Freedom-Happiness</p>

                <h1 className="font-bold text-[16pt] uppercase mt-4 mb-0">PHIẾU KIỂM GIAO/ NHẬN HÀNG</h1>
                <h2 className="font-bold text-[14pt] uppercase">TALLY REPORT</h2>
              </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11pt] mb-2">
              <div className="col-span-1">
                <div className="flex">
                  <span className="w-24">Tàu:</span>
                  <span className="font-bold uppercase">{cleanVesselName}</span>
                </div>
                <div className="italic text-[9pt] mb-1">Vehicle</div>

                <div className="flex">
                  <span className="w-24">Hàng:</span>
                  <span className="font-bold uppercase">{chunk[0]?.commodityType || 'BỘT GIẤY'}</span>
                </div>
                <div className="italic text-[9pt] mb-1">Cargo</div>

                <div className="flex items-center">
                  <span className="w-10">Ca:</span>
                  <span className="font-bold w-10 text-center">{report.shift}</span>
                  <span className="ml-2">ngày</span>
                  <span className="font-bold w-8 text-center">{dateStr}</span>
                  <span>tháng</span>
                  <span className="font-bold w-8 text-center">{monthStr}</span>
                  <span>năm</span>
                  <span className="font-bold w-12 text-center">{yearStr}</span>
                </div>
                <div className="italic text-[9pt] mb-1">Shift <span className="ml-16">day</span> <span className="ml-8">month</span> <span className="ml-8">year</span></div>

                <div className="flex">
                  <span className="whitespace-nowrap mr-2">Phương án xếp dỡ:</span>
                  <span className="font-bold">TỪ KHO LÊN Ô TÔ</span>
                </div>
                <div className="italic text-[9pt]">Loading/ Unloading Option</div>

                <div className="flex mt-1">
                  <span className="whitespace-nowrap mr-2">Tổng cộng xếp dỡ:</span>
                  <span className="font-bold text-red-600 uppercase">{report.workerNames || 'PHONG'}</span>
                </div>
                <div className="italic text-[9pt]">Stevedore team</div>
              </div>

              <div className="col-span-1">
                <div className="flex">
                  <span className="w-24">Đến:</span>
                  <span className="font-bold uppercase">TIÊN SA</span>
                </div>
                <div className="italic text-[9pt] mb-1">Arrived on</div>

                <div className="flex">
                  <span className="w-24">Hầm:</span>
                  <span className="font-bold"></span>
                </div>
                <div className="italic text-[9pt] mb-[2.5rem]">Hatch on</div>

                <div className="flex">
                  <span className="whitespace-nowrap mr-2">Địa điểm giao nhận:</span>
                  <span className="font-bold">KHO DNL</span>
                </div>
                <div className="italic text-[9pt]">Place of Receipt/ Delivery</div>

                <div className="flex mt-1">
                  <span className="whitespace-nowrap mr-2">Thiết bị sử dụng:</span>
                  <span className="font-bold">{report.equipment}</span>
                </div>
                <div className="italic text-[9pt]">Equipment</div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse tally-table mb-2">
              <thead>
                <tr>
                  <th className="w-[50px]">STT</th>
                  <th>Số xe/ mooc</th>
                  <th>Số seal hải quan</th>
                  <th className="w-[150px]">Số kiện/ tấn</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item, idx) => (
                  <tr key={idx} className="h-[32px] text-center">
                    <td>{idx + 1}</td>
                    <td className="font-bold">{item.contNo}</td>
                    <td className="text-left px-2">{item.sealNo}</td>
                    <td className="font-bold">{item.actualUnits}K = {item.actualWeight}T</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - chunk.length) }).map((_, i) => (
                  <tr key={`pad-${i}`} className="h-[32px]">
                    <td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mb-4">
              <p className="font-bold">
                Tổng cộng: (Grand total) <span className="ml-4">{summaryStr} = {pageTotalUnits} kiện = {Number.isInteger(pageTotalWeight) ? pageTotalWeight : pageTotalWeight.toFixed(2)} tấn</span>
              </p>
              <p className="italic font-bold">
                Viết bằng chữ: (Inletter): <span className="uppercase ml-2">
                  {numberToText(pageTotalUnits)} KIỆN
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 text-center font-bold text-[10pt] mt-8">
              <div>
                <p className="uppercase mb-0">ĐẠI DIỆN HẢI QUAN GIÁM SÁT</p>
                <p className="italic font-normal text-[9pt] mb-16">Họ, tên, kí</p>
              </div>
              <div>
                <p className="uppercase mb-0">ĐẠI DIỆN KHO HÀNG</p>
                <p className="italic font-normal text-[9pt] mb-16">Họ, tên, kí</p>
                <p className="uppercase text-[11pt]">{report.createdBy || ''}</p>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 text-[10px] italic">Trang {pageIndex + 1}/{totalPages}</div>
          </div>
        );
      })}
    </>
  );
};

export default TallyPrintTemplate;
