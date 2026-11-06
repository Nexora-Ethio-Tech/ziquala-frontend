import { StaffProfileEditor } from './StaffProfileEditor';

interface StaffProfileModalProps {
  open: boolean;
  title: string;
  staff: any;
  onClose: () => void;
  onRefresh?: () => void;
  onSaved?: (user: any) => void;
}

export const StaffProfileModal = ({ open, title, staff, onClose, onRefresh, onSaved }: StaffProfileModalProps) => {
  if (!open || !staff) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <StaffProfileEditor key={staff.userId || staff.user_id || staff.id} staff={staff} title={title} onClose={onClose} onRefresh={onRefresh} onSaved={user => onSaved?.(user)} />
    </div>
  </div>;
};
