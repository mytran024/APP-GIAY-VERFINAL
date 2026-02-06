
import React, { useState } from 'react';
import { Container, TallyReport } from '../types';
import { MOCK_CONTAINERS, MOCK_VESSELS } from '../constants';

interface ContainerListViewProps {
  reports: TallyReport[];
}

const ContainerListView: React.FC<ContainerListViewProps> = ({ reports }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Tổng hợp dữ liệu từ các tàu
  const allConts: (Container & { vesselName: string })[] = [];
  MOCK_VESSELS.forEach(v => {
    (MOCK_CONTAINERS[v.id] || []).forEach(c => {
      allConts.push({ ...c, vesselName: v.vesselName });
    });
  });

  const filteredConts = allConts.filter(c =>
    c.contNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTallyInfo = (contId: string) => {
    return reports.find(r => r.items.some(i => i.contId === contId));
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-gray-50 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm số Cont (VD: MSCU...)"
            className="w-full p-4 pl-12 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {filteredConts.map(c => {
          const tallyReport = getTallyInfo(c.id);
          const isFinished = !!tallyReport;
          const displaySize = c.size.includes('40') ? 'Size 40' : (c.size.includes('20') ? 'Size 20' : c.size);

          return (
            <div key={c.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${isFinished ? 'border-green-200 ring-1 ring-green-50' : 'border-gray-100'}`}>
              <div className={`p-3 flex justify-between items-center ${isFinished ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-12 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs ${isFinished ? 'bg-green-600' : 'bg-blue-600'}`}>
                    {displaySize}
                  </div>
                  <span className="font-black text-gray-900 text-base">{c.contNo}</span>
                </div>
                {isFinished ? (
                  <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase">Đã kiểm: {tallyReport.id}</span>
                ) : (
                  <span className="bg-gray-200 text-gray-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">Chờ kiểm hàng</span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  <div>
                    <p className="text-gray-400 font-bold uppercase tracking-tighter">Số chì (Seal)</p>
                    <p className="font-black text-gray-800">{c.sealNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold uppercase tracking-tighter">Vendor</p>
                    <p className="font-black text-gray-800">{c.vendor}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold uppercase tracking-tighter">TK Nhà VC</p>
                    <p className="font-black text-blue-600">{c.tkHouse || '---'}</p>
                    <p className="text-[9px] text-gray-400">{c.tkHouseDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold uppercase tracking-tighter">TK DNL</p>
                    <p className="font-black text-blue-600">{c.tkDnl || '---'}</p>
                    <p className="text-[9px] text-gray-400">{c.tkDnlDate}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Hạn DET</p>
                    <p className="font-black text-red-600 text-sm">{c.detLimit || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{c.vesselName}</p>
                    <p className="text-[10px] font-black text-gray-700">{c.owner}</p>
                  </div>
                </div>

                {isFinished && (
                  <div className="mt-2 p-2 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-green-700 uppercase">Kiểm viên thực hiện</span>
                      {/* Fixed: Replaced non-existent workerGroup with workerNames */}
                      <span className="text-xs font-black text-green-900">{tallyReport.workerNames} (CA {tallyReport.shift})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-green-700 uppercase">Ngày làm</span>
                      <span className="text-xs font-black text-green-900">{tallyReport.workDate}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-20"></div>
    </div>
  );
};

export default ContainerListView;
