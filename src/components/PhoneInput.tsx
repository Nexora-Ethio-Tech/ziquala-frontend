import { uiError, uiText } from "../localization";
import React from 'react';

type PhoneInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

const PhoneInput: React.FC<PhoneInputProps> = ({ label, value, onChange, error, placeholder = "9XXXXXXXX or 7XXXXXXXX" }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, max 9 digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange(digits);
  };

  return (
    <div className="flex flex-col space-y-1 w-full min-w-0">
      <label className="text-xs font-bold text-slate-500 uppercase">{uiText(label)}</label>
      <div className="flex items-center space-x-0 w-full min-w-0">
        <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-2 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg text-slate-600 dark:text-slate-300 text-sm font-semibold select-none shrink-0">{uiText("+251")}</span>
        <input
          type="text"
          maxLength={9}
          value={value}
          onChange={handleChange}
          className={`flex-1 min-w-0 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder={uiText(placeholder)}
        />
      </div>
      {uiText(error && <p className="text-red-500 text-[11px] font-semibold mt-0.5">{uiError(error)}</p>)}
    </div>
  );
};

export default PhoneInput;
