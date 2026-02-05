
import React, { useState, useEffect } from 'react';
import { MOCK_VESSELS, SHIFT_OPTIONS } from '../constants';
import { Vessel, Shift } from '../types';

interface VesselSelectionViewProps {
  vessels: Vessel[];
  onSelect: (vessel: Vessel, shift: Shift, date: string, isHoliday: boolean, isWeekend: boolean) => void;
}

const VesselSelectionView: React.FC<VesselSelectionViewProps> = ({ vessels = [], onSelect }) => {
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '??';

    // Handle corrupted legacy format (e.g. 02T00:00:00+00:00/02/2026)
    if (dateStr.includes('T') && dateStr.includes('/') && dateStr.length > 20) {
      const match = dateStr.match(/^(\d{2})T.*\/(\d{2})\/(\d{4})$/);
      if (match) {
        return `${match[1]}/${match[2]}/${match[3]}`;
      }
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getCurrentShift = (): Shift => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) return Shift.SHIFT_1;
    if (hour >= 6 && hour < 12) return Shift.SHIFT_2;
    if (hour >= 12 && hour < 18) return Shift.SHIFT_3;
    return Shift.SHIFT_4;
  };

  const [selectedShift, setSelectedShift] = useState<Shift>(getCurrentShift());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [isWeekend, setIsWeekend] = useState<boolean>(false);

  useEffect(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    // 0 is Sunday, 6 is Saturday
    const weekend = day === 0 || day === 6;
    setIsWeekend(weekend);
    // Nếu là cuối tuần, tự động tắt ngày lễ để đảm bảo chỉ chọn 1 trong 2
    if (weekend) {
      setIsHoliday(false);
    }
  }, [selectedDate]);

  const handleWeekendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsWeekend(checked);
    if (checked) {
      setIsHoliday(false);
    }
  };

  const handleHolidayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsHoliday(checked);
    if (checked) {
      setIsWeekend(false);
    }
  };

  const handleStart = () => {
    const v = vessels.find(v => v.id === selectedVesselId);
    if (v) {
      onSelect(v, selectedShift, selectedDate, isHoliday, isWeekend);
    }
  };

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Chọn tàu khai thác
          </h3>

          <div className="flex-1">
            <label className="text-[10px] font-black text-gray-300 uppercase ml-1">Tên tàu</label>
            <div className="relative mt-1">
              <select
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-900 text-sm outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
              >
                <option value="" disabled>-- Bấm để chọn tàu --</option>
                {vessels.map(v => (
                  <option key={v.id} value={v.id} disabled={v.isBlocked}>
                    {v.name} {v.isBlocked ? `(ĐANG CHỜ DỮ LIỆU: ${v.blockReason})` : `| ${formatDate(v.eta)} - ${formatDate(v.etd)}`}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>

            {selectedVessel && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Thông tin khách hàng:</span>
                  <span className="text-sm font-black text-blue-900 uppercase leading-tight">{selectedVessel.customerName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Thời gian làm việc</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight group-active:text-blue-600 transition-colors">Cuối tuần</span>
                <input
                  type="checkbox"
                  checked={isWeekend}
                  onChange={handleWeekendChange}
                  className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight group-active:text-blue-600 transition-colors">Ngày lễ</span>
                <input
                  type="checkbox"
                  checked={isHoliday}
                  onChange={handleHolidayChange}
                  className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-300 uppercase ml-1">Ngày tháng</label>
              <input
                type="date"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 outline-none mt-1"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-300 uppercase ml-1">Ca làm</label>
              <div className="relative mt-1">
                <select
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 outline-none appearance-none"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as Shift)}
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Ca {s}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          disabled={!selectedVesselId}
          onClick={handleStart}
          className={`w-full md:max-w-xs py-4 rounded-2xl font-black shadow-xl transition-all uppercase tracking-widest ${selectedVesselId
            ? 'bg-blue-600 text-white active:scale-95 hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          TIẾP THEO
        </button>
      </div>
    </div>
  );
};

export default VesselSelectionView;
