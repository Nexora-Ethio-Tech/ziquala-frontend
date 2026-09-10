import { uiText } from "../localization";
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { parseEthiopianDateString } from '../utils/ethiopianCalendar';

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

interface EthiopianDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  id?: string;
}

export const EthiopianDatePicker: React.FC<EthiopianDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  className = '',
  title,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive initial visible year/month from value, or default to current Ethiopian year/month
  const [viewYear, setViewYear] = useState(2018);
  const [viewMonth, setViewMonth] = useState(1); // 1-indexed (1 to 13)

  useEffect(() => {
    const parsed = parseEthiopianDateString(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    } else {
      // Default to a sensible default year (2018/2026 Gregorian is ~2018 Ethiopian)
      setViewYear(2018);
      setViewMonth(9);
    }
  }, [value, isOpen]);

  // Click outside listener to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format keystrokes: only allow digits and hyphens, auto-format to YYYY-MM-DD
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9-]/g, '');

    // Auto-hyphenate logic
    if (input.length > 10) {
      input = input.substring(0, 10);
    }

    // Auto insert first hyphen
    if (input.length === 4 && !input.includes('-')) {
      input = input + '-';
    }
    // Auto insert second hyphen
    if (input.length === 7 && input.split('-').length === 2) {
      input = input + '-';
    }

    onChange(input);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(13);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 13) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const paddedMonth = String(viewMonth).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    onChange(`${viewYear}-${paddedMonth}-${paddedDay}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (month: number, year: number): number => {
    if (month === 13) {
      // Leap year check for Pagume (occurs every 4 years in Ethiopian calendar: year % 4 === 3)
      return (year % 4 === 3) ? 6 : 5;
    }
    return 30; // Every other Ethiopian month is exactly 30 days
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const parsedValue = parseEthiopianDateString(value);

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          id={id}
          placeholder={uiText(placeholder)}
          title={uiText(title)}
          value={value}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${className}`}
        />
        <CalendarIcon
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        />
        {uiText(value && (
          <button
            type="button"
            title={uiText("Clear selected date")}
            aria-label={uiText("Clear selected date")}
            onClick={() => onChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        ))}
      </div>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 z-50 w-72 p-4 bg-white/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-850 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              title={uiText("Previous month")}
              aria-label={uiText("Previous month")}
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {uiText(ETHIOPIAN_MONTHS[viewMonth - 1])}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <select
                  title={uiText("Select Year")}
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-none p-0 focus:ring-0 cursor-pointer outline-none"
                >
                  {Array.from({ length: 36 }, (_, i) => 2000 + i).map((yr) => (
                    <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white font-bold">
                      {yr}{uiText(" E.C.")}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              title={uiText("Next month")}
              aria-label={uiText("Next month")}
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected = parsedValue &&
                                 parsedValue.year === viewYear &&
                                 parsedValue.month === viewMonth &&
                                 parsedValue.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <span>{uiText("Ethiopian Calendar")}</span>
            <button
              type="button"
              onClick={() => {
                // Default to current date (derived from today's Gregorian equivalent)
                const todayEth = new Date();
                // A quick approximate shift for today
                const jdn = Math.floor(todayEth.getTime() / 86400000) + 2440588;
                const r = jdn - 1723856;
                const year = Math.floor(r / 1461) * 4 + Math.floor((r % 1461) / 365) + 1;
                const month = Math.floor(((r % 1461) % 365) / 30) + 1;
                const day = (((r % 1461) % 365) % 30) + 1;
                onChange(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                setIsOpen(false);
              }}
              className="text-blue-600 hover:text-blue-700"
            >{uiText("Today")}</button>
          </div>
        </div>
      )}
    </div>
  );
};
