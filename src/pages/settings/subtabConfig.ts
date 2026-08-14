import type { SettingsSubTab } from '../../components/settings/SettingsSubTabs';

export const SUPER_ADMIN_SUBTABS: Record<string, SettingsSubTab[]> = {
  General: [
    { id: 'branding', label: 'Branding' },
    { id: 'contact', label: 'Contact' },
  ],
  Security: [
    { id: 'password', label: 'Password' },
    { id: 'smtp', label: 'Email / SMTP' },
  ],
};

export const getDefaultSubTab = (mainTab: string): string =>
  SUPER_ADMIN_SUBTABS[mainTab]?.[0]?.id ?? '';

export const getSubTabLabel = (mainTab: string, subTabId: string): string =>
  SUPER_ADMIN_SUBTABS[mainTab]?.find((t) => t.id === subTabId)?.label ?? mainTab;
