
import React, { useState, useEffect, useRef } from 'react';
import { WorkOrder, TallyReport } from '../types';
import { MOCK_VESSELS } from '../constants';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';
import TallyPrintTemplate from '../components/TallyPrintTemplate';
import { generatePDF } from '../../../utils/pdfUtils';

interface CompletionViewProps {
  workOrders: WorkOrder[];
  reports: TallyReport[];
  onDone: () => void;
}

const CompletionView: React.FC<CompletionViewProps> = ({ workOrders, reports, onDone }) => {
  const [previewType, setPreviewType] = useState<'NONE' | 'TALLY' | 'WO'>('NONE');
  const printRef = useRef<HTMLDivElement>(null);
  // Use the first report for vessel info
  const report = reports[0];
  const vessel = MOCK_VESSELS.find(v => v.id === report?.vesselId) || MOCK_VESSELS[0];

  // Logic tự động xuất file khi người dùng chọn loại phiếu
  useEffect(() => {
    if (previewType !== 'NONE') {
      // Đặt tên file gợi ý cho trình duyệt khi lưu PDF
      const originalTitle = document.title;
      const cleanContNo = report?.items?.[0]?.contNo.replace(/[/\\?%*:|"<>]/g, '-') || report?.id;
      const fileName = previewType === 'TALLY'
        ? `Phieu_Tally_${cleanContNo}`
        : `Phieu_Cong_Tac_${report?.id}`;

      document.title = fileName;

      // Note: Auto-print disabled to allow user to choose between Print and Excel Export

      return () => {
        document.title = originalTitle;
      };
    }
  }, [previewType, report]);

  const handleExport = (type: 'TALLY' | 'WO') => {
    setPreviewType(type);
  };

  // Dynamic CSS to force landscape/portrait based on current preview
  // This ensures that when the user clicks "Print" (and chooses Save to PDF), the browser defaults to the correct paper size.
  const printOrientationStyle = `
    @media print {
      @page {
        size: ${previewType === 'WO' ? 'landscape' : 'portrait'};
        margin: 0;
      }
    }
  `;

  const handleExcelExport = () => {
    const typeText = previewType === 'TALLY' ? 'Tally' : 'Phiếu Công Tác';
    // Mock functionality for Excel export
    alert(`Đang xuất file Excel cho ${typeText}... (Tính năng Demo)`);
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* Success Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-32 h-32 bg-[#e6fcf5] rounded-full flex items-center justify-center mb-10 shadow-inner">
          <div className="w-16 h-16 bg-[#20c997] rounded-full flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-[26px] font-black text-[#1a1c1e] leading-tight mb-3 uppercase tracking-tight">Gửi dữ liệu thành công!</h2>
        <p className="text-[#6c757d] font-bold text-[15px] leading-relaxed max-w-[300px] mb-12">
          {reports.length} Báo cáo Tally và {workOrders.length} Phiếu công tác đã được ghi nhận vào hệ thống.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleExport('TALLY')}
            className="w-full py-4.5 py-4 bg-[#2563eb] text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase text-[13px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            XUẤT PHIẾU TALLY ({reports.length} BẢN)
          </button>

          <button
            onClick={() => handleExport('WO')}
            className="w-full py-4 bg-[#2563eb] text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase text-[13px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            XUẤT PHIẾU CÔNG TÁC
          </button>

          <button
            onClick={onDone}
            className="w-full py-4 bg-[#f1f3f5] text-[#495057] font-black rounded-2xl uppercase text-[13px] tracking-widest active:scale-95 transition-all"
          >
            VỀ TRANG CHỦ
          </button>
        </div>
      </div>

      {/* Print Preview Overlay */}
      {previewType !== 'NONE' && (
        <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto">
          <div className="sticky top-0 p-4 bg-gray-800 text-white flex justify-between items-center shadow-lg print:hidden">
            <button
              onClick={() => setPreviewType('NONE')}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight hover:text-blue-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              QUAY LẠI
            </button>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {previewType === 'TALLY' ? `Xem trước ${reports.length} Phiếu Tally` : `Xem trước ${workOrders.length} Phiếu CT`}
            </div>

            {/* Inject dynamic print styles */}
            <style>{printOrientationStyle}</style>

            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!printRef.current) return;
                  const cleanId = report?.items?.[0]?.contNo?.replace(/[/\\?%*:|"<>\s]/g, '-') || report?.id || 'tally';
                  const filename = previewType === 'TALLY'
                    ? `Phieu_Tally_${cleanId}`
                    : `Phieu_Cong_Tac_${report?.id || 'wo'}`;
                  const orientation = previewType === 'WO' ? 'landscape' : 'portrait';
                  await generatePDF(printRef.current, { filename, orientation, margin: 0 });
                }}
                className="bg-emerald-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2"
                title="Tải file PDF về máy"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                TẢI FILE PDF
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col items-center gap-8 bg-gray-700 min-h-screen">
            {/* Print Wrapper: Max-width matches A4 Portait (210mm) or Landscape (297mm) */}
            <div ref={printRef} className={`bg-white w-full p-0 m-0 ${previewType === 'WO' ? 'max-w-[297mm]' : 'max-w-[210mm]'}`}>
              {previewType === 'TALLY' ? (
                reports.map((r, idx) => (
                  <div key={r.id} className="relative group" style={{ pageBreakAfter: idx < reports.length - 1 ? 'always' : 'avoid' }}>
                    {reports.length > 1 && (
                      <div className="absolute -left-12 top-0 print:hidden text-white/20 font-black text-4xl rotate-90 origin-top-left pointer-events-none uppercase">
                        Bản {idx + 1}
                      </div>
                    )}
                    <TallyPrintTemplate report={r} vessel={vessel} isPreview={true} />
                    {/* Visual spacer for screen only, hidden in print/PDF */}
                    {idx < reports.length - 1 && <div className="h-1 bg-gray-200 w-full rounded-full mt-4 mb-4 print:hidden html2pdf__page-break"></div>}
                  </div>
                ))
              ) : (
                workOrders.map((wo, idx) => (
                  <div key={wo.id} className="relative group" style={{ pageBreakAfter: idx < workOrders.length - 1 ? 'always' : 'avoid' }}>
                    <div className="absolute -left-12 top-0 print:hidden text-white/20 font-black text-4xl rotate-90 origin-top-left pointer-events-none uppercase">
                      Bản {idx + 1}
                    </div>
                    <WorkOrderPrintTemplate wo={wo} report={report} isPreview={true} />
                    {/* Visual spacer for screen only */}
                    {idx < workOrders.length - 1 && <div className="h-1 bg-gray-200 w-full rounded-full mt-4 mb-4 print:hidden html2pdf__page-break"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          .print\\:hidden { display: none !important; }
          .print-wo-document, .print-document { 
            display: block !important; 
            width: 100% !important; 
            page-break-after: always;
            margin-bottom: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CompletionView;
