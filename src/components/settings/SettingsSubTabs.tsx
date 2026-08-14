import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type SettingsSubTab = { id: string; label: string };

type Props = {
  tabs: SettingsSubTab[];
  active: string;
  onChange: (id: string) => void;
};

export const SettingsSubTabs = ({ tabs, active, onChange }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            active === tab.id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50 dark:shadow-none'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {t(`settings.subtabs.${tab.id}`, tab.label)}
        </button>
      ))}
    </div>
  );
};

export const SettingsPanel = ({ children }: { children: ReactNode }) => (
  <div className="max-h-[min(68vh,680px)] overflow-y-auto pr-1 space-y-6">{children}</div>
);
