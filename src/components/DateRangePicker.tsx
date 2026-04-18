import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useDateRange, PRESET_LABELS, type DatePreset, type DateRange } from './DateRangeContext';

const PRESETS: { key: DatePreset | 'today_yesterday'; label: string }[] = [
  { key: 'last_7d', label: 'ใช้ล่าสุด' },
  { key: 'this_month', label: 'เดือนนี้' },
  { key: 'today', label: 'วันนี้' },
  { key: 'yesterday', label: 'เมื่อวานนี้' },
  { key: 'today_yesterday', label: 'วันนี้และเมื่อวานนี้' },
  { key: 'last_7d', label: '7 วันที่ผ่านมา' },
  { key: 'last_14d', label: '14 วันที่ผ่านมา' },
  { key: 'last_28d', label: '28 วันที่ผ่านมา' },
  { key: 'last_30d', label: '30 วันที่ผ่านมา' },
  { key: 'this_week_sun_today', label: 'สัปดาห์นี้' },
  { key: 'last_week_sun_sat', label: 'สัปดาห์ที่แล้ว' },
  { key: 'this_month', label: 'เดือนนี้' },
  { key: 'last_month', label: 'เดือนที่แล้ว' },
  { key: 'maximum', label: 'มากที่สุด' },
];

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function formatThaiDate(d: Date) {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatDisplayRange(range: DateRange): string {
  if (range.preset) return PRESET_LABELS[range.preset] || range.preset;
  if (range.since && range.until) {
    return `${formatThaiDate(new Date(range.since + 'T00:00:00'))} — ${formatThaiDate(new Date(range.until + 'T00:00:00'))}`;
  }
  return '7 วันที่ผ่านมา';
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function MonthCalendar({ year, month, startDate, endDate, onSelect }: {
  year: number; month: number; startDate: string | null; endDate: string | null;
  onSelect: (date: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const inRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    const isToday = dateStr === today;

    cells.push(
      <button
        key={d}
        onClick={() => onSelect(dateStr)}
        className={`w-8 h-8 rounded-full text-xs transition-colors ${
          isStart || isEnd ? 'bg-primary text-white font-bold' :
          inRange ? 'bg-primary/20 text-primary-light' :
          isToday ? 'ring-1 ring-primary text-primary-light' :
          'hover:bg-surface-lighter text-text'
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div>
      <div className="text-center text-sm font-medium mb-2">{THAI_MONTHS[month]} {year + 543}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {THAI_DAYS.map((d) => <div key={d} className="text-[10px] text-text-muted py-1">{d}</div>)}
        {cells}
      </div>
    </div>
  );
}

export default function DateRangePicker() {
  const { dateRange, setDateRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(dateRange.preset || 'custom');
  const [customStart, setCustomStart] = useState(dateRange.since || '');
  const [customEnd, setCustomEnd] = useState(dateRange.until || '');
  const [selectingStart, setSelectingStart] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Calendar months
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handlePreset = (key: DatePreset | 'today_yesterday') => {
    if (key === 'today_yesterday') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedPreset('custom');
      setCustomStart(toDateStr(yesterday));
      setCustomEnd(toDateStr(today));
      return;
    }
    setSelectedPreset(key);
    setCustomStart('');
    setCustomEnd('');
  };

  const handleCalendarSelect = (dateStr: string) => {
    setSelectedPreset('custom');
    if (selectingStart || (customStart && dateStr < customStart)) {
      setCustomStart(dateStr);
      setCustomEnd('');
      setSelectingStart(false);
    } else {
      setCustomEnd(dateStr);
      setSelectingStart(true);
    }
  };

  const handleApply = () => {
    if (selectedPreset && selectedPreset !== 'custom') {
      setDateRange({ preset: selectedPreset as DatePreset, since: null, until: null });
    } else if (customStart && customEnd) {
      setDateRange({ preset: null, since: customStart, until: customEnd });
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedPreset(dateRange.preset || 'custom');
    setCustomStart(dateRange.since || '');
    setCustomEnd(dateRange.until || '');
    setOpen(false);
  };

  const goNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); };
  const goPrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-surface border border-surface-lighter rounded-lg px-3 py-2 text-sm hover:bg-surface-light transition-colors"
      >
        <Calendar className="w-4 h-4 text-text-muted" />
        <span className="max-w-[200px] truncate">{formatDisplayRange(dateRange)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-surface-lighter rounded-xl shadow-2xl flex animate-in fade-in slide-in-from-top-2 duration-150" style={{ width: 620 }}>
          {/* Left: Presets */}
          <div className="w-48 border-r border-surface-lighter py-3 shrink-0">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  selectedPreset === key ? 'text-primary-light bg-primary/5 font-medium' : 'text-text hover:bg-surface-light'
                }`}
              >
                <span className={`w-3 h-3 rounded-full border-2 ${selectedPreset === key ? 'border-primary bg-primary' : 'border-surface-lighter'}`} />
                {label}
              </button>
            ))}
            <div className="border-t border-surface-lighter my-2" />
            <button
              onClick={() => { setSelectedPreset('custom'); setSelectingStart(true); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                selectedPreset === 'custom' ? 'text-primary-light bg-primary/5 font-medium' : 'text-text hover:bg-surface-light'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 ${selectedPreset === 'custom' ? 'border-primary bg-primary' : 'border-surface-lighter'}`} />
              กำหนดเอง
            </button>
          </div>

          {/* Right: Calendar */}
          <div className="flex-1 p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={goPrev} className="p-1 rounded hover:bg-surface-light"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium">{THAI_MONTHS[prevMonth]} — {THAI_MONTHS[viewMonth]} {viewYear + 543}</span>
              <button onClick={goNext} className="p-1 rounded hover:bg-surface-light"><ChevronRight className="w-4 h-4" /></button>
            </div>

            {/* Two month calendars */}
            <div className="grid grid-cols-2 gap-4">
              <MonthCalendar year={prevYear} month={prevMonth} startDate={customStart} endDate={customEnd} onSelect={handleCalendarSelect} />
              <MonthCalendar year={viewYear} month={viewMonth} startDate={customStart} endDate={customEnd} onSelect={handleCalendarSelect} />
            </div>

            {/* Selected range display */}
            <div className="mt-3 text-xs text-text-muted text-center">
              {customStart && customEnd ? (
                `${formatThaiDate(new Date(customStart + 'T00:00:00'))} — ${formatThaiDate(new Date(customEnd + 'T00:00:00'))}`
              ) : customStart ? (
                `${formatThaiDate(new Date(customStart + 'T00:00:00'))} — เลือกวันสิ้นสุด`
              ) : selectedPreset && selectedPreset !== 'custom' ? (
                PRESETS.find((p) => p.key === selectedPreset)?.label
              ) : 'เลือกช่วงเวลา'}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-surface-lighter">
              <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-surface-light">ยกเลิก</button>
              <button onClick={handleApply} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium">อัพเดต</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
