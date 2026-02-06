
import React from 'react';
import { WorkOrder, TallyReport } from '../types';
import { COMPANY_LOGO_URL } from '../constants';

interface WorkOrderPrintTemplateProps {
  wo: WorkOrder;
  report: TallyReport;
  isPreview?: boolean;
}

const WorkOrderPrintTemplate: React.FC<WorkOrderPrintTemplateProps> = ({ wo, report, isPreview }) => {
  const today = new Date();
  const dateStr = today.getDate().toString().padStart(2, '0');
  const monthStr = (today.getMonth() + 1).toString().padStart(2, '0');
  const yearStr = today.getFullYear().toString();

  return (
    <div className={`font-serif text-black bg-white print-wo-document ${isPreview ? 'p-[10mm] w-[297mm] min-h-[210mm] mx-auto' : 'pt-[10mm] pl-[20mm] pr-[10mm] pb-[10mm]'}`}
      style={{ fontFamily: "'Times New Roman', Times, serif" }}>

      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .page-break-after-always { 
            page-break-after: always;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <img src={COMPANY_LOGO_URL} alt="Danalog" className="h-[70px] w-auto object-contain" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10pt] font-bold uppercase leading-tight">CÔNG TY CỔ PHẦN LOGISTICS CẢNG ĐÀ NẴNG</p>
          <p className="text-[9pt] leading-tight">97 Yết Kiêu, Phường Thọ Quang, Quận Sơn Trà, Tp Đà Nẵng</p>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center mb-4 mt-2">
        <h1 className="text-[20pt] font-bold uppercase mb-1">PHIẾU CÔNG TÁC</h1>
      </div>

      {/* Sub Info Row 1 & 2 */}
      <div className="space-y-2 mb-4 text-[11pt]">
        <div className="flex items-baseline">
          <span className="whitespace-nowrap italic">Tổ (Cá nhân):</span>
          <span className="flex-1 border-b border-black font-bold px-2 mx-1 min-h-[1.2rem]">{wo.organization}</span>
          <span className="whitespace-nowrap italic ml-4">Số người:</span>
          <span className="w-24 border-b border-black font-bold text-center px-2 mx-1 min-h-[1.2rem]">{wo.personCount}</span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex flex-1 items-baseline">
            <span className="whitespace-nowrap italic">Loại xe:</span>
            <span className="flex-1 border-b border-black font-bold px-2 mx-1 min-h-[1.2rem]">{wo.vehicleType || ''}</span>
            <span className="whitespace-nowrap italic ml-4">Số xe:</span>
            <span className="flex-1 border-b border-black font-bold px-2 mx-1 min-h-[1.2rem]">{wo.vehicleNo || ''}</span>
          </div>
          <div className="flex items-baseline ml-6">
            <span className="whitespace-nowrap italic">Ca:</span>
            <span className="w-12 border-b border-black font-bold text-center px-1 mx-1 min-h-[1.2rem]">{report.shift}</span>
            <span className="whitespace-nowrap italic">, ngày</span>
            <span className="w-12 border-b border-black font-bold text-center px-1 mx-1 min-h-[1.2rem]">{dateStr}</span>
            <span className="whitespace-nowrap italic">tháng</span>
            <span className="w-12 border-b border-black font-bold text-center px-1 mx-1 min-h-[1.2rem]">{monthStr}</span>
            <span className="whitespace-nowrap italic">năm</span>
            <span className="w-20 border-b border-black font-bold text-center px-1 mx-1 min-h-[1.2rem]">{yearStr}</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <table className="w-full border-collapse border-[1pt] border-black text-[10pt]">
        <thead>
          <tr className="text-center font-bold uppercase h-12">
            <th className="border border-black w-[20%] px-1">PHƯƠNG ÁN BỐC DỠ</th>
            <th className="border border-black w-[12%] px-1">LOẠI HÀNG</th>
            <th className="border border-black w-[12%] px-1">QUY CÁCH</th>
            <th className="border border-black w-[10%] px-1">KHỐI LƯỢNG</th>
            <th className="border border-black w-[10%] px-1">TRỌNG LƯỢNG</th>
            <th className="border border-black w-[12%] px-1">SỐ NGƯỜI LÀM CÔNG NHẬT</th>
            <th className="border border-black px-1">GHI CHÚ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-40 text-center align-middle">
            <td className="border border-black p-2 font-bold text-left align-top whitespace-pre-wrap">{wo.handlingMethod}</td>
            <td className="border border-black p-2">{wo.commodityType}</td>
            <td className="border border-black p-2">{wo.specification}</td>
            <td className="border border-black p-2 font-bold">{wo.quantity} Kiện</td>
            <td className="border border-black p-2 font-bold">{wo.weight} Tấn</td>
            <td className="border border-black p-2">{wo.dayLaborerCount || ''}</td>
            <td className="border border-black p-2 italic text-left align-top">{wo.note}</td>
          </tr>
          {/* Summary Row */}
          <tr className="font-bold h-10">
            <td colSpan={3} className="border border-black px-4 text-center italic">Tổng cộng</td>
            <td className="border border-black px-1 text-center"></td>
            <td className="border border-black px-1 text-center whitespace-nowrap">{wo.weight} tấn</td>
            <td className="border border-black px-1 text-center"></td>
            <td className="border border-black px-1 text-center"></td>
          </tr>
        </tbody>
      </table>

      {/* Signatures Section */}
      <div className="grid grid-cols-4 gap-2 text-center mt-6 text-[10pt]">
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase mb-0">PHÒNG KINH DOANH</p>
          <p className="italic text-[9pt] mb-8">(Ghi rõ họ tên)</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase mb-0">NGƯỜI THỰC HIỆN</p>
          <p className="italic text-[9pt] mb-8">(Ghi rõ họ tên)</p>
          <div className="mt-auto">
            <p className="font-bold">
              {wo.isOutsourced
                ? ''
                : (wo.type === 'LABOR' ? report.workerNames.split(',')[0] : report.mechanicalNames.split(',')[0])}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase mb-0">XÁC NHẬN NV CHỈ ĐẠO</p>
          <p className="italic text-[9pt] mb-8">(Ghi rõ họ tên)</p>
          <div className="mt-auto">
            <p className="font-bold uppercase">
              {report.createdBy || ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase mb-0">GIAO NHẬN</p>
          <p className="italic text-[9pt] mb-8">(Ghi rõ họ tên)</p>
        </div>
      </div>

      {/* Footer line spacing for print */}
      {!isPreview && <div className="h-10"></div>}
    </div>
  );
};

export default WorkOrderPrintTemplate;
