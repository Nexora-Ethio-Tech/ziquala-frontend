import { X, FileText, Download, Upload, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../services/api';
import { replaceUserDocument } from '../services/schoolAdminService';

interface StaffProfileModalProps {
  open: boolean;
  title: string;
  staff: any;
  onClose: () => void;
  onRefresh?: () => void;
}

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
  return String(value);
};

const calculateAge = (dob?: string) => {
  if (!dob) return null;
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const StaffProfileModal = ({ open, title, staff, onClose, onRefresh }: StaffProfileModalProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open || !staff) return null;

  const resolvedUserId = staff.userId || staff.user_id || staff.id;
  const profile = staff.staffProfile || staff.staff_profile || {};
  const dob = profile.dob || profile.dateOfBirth || profile.birthDate;
  const age = calculateAge(dob);
  const registeredAt = staff.createdAt || staff.created_at || profile.registeredAt || profile.dateRegistered;

  const detailRows = [
    ['Name', staff.name],
    ['Email', staff.email],
    ['Phone Number', profile.phoneNumber || profile.phone || profile.contactNumber],
    ['Emergency Contact', profile.emergencyContactName],
    ['Emergency Contact Phone', profile.emergencyContactPhone],
    ['Education Status', profile.educationLevel || profile.educationStatus],
    ['Specialty / Course', profile.specialty || profile.courseSpecialty],
    ['Date of Birth', dob],
    ['Age', age ? `${age} years` : null],
    ['Previous School', profile.previousSchool],
    ['Years of Experience', profile.experienceYears || profile.experience],
    ['Date Registered', registeredAt],
    ['Digital ID', staff.digitalId || staff.digital_id],
    ['Status', staff.status],
  ];

  const handleView = async () => {
    try {
      const res = await api.get(`/school-admin/users/${resolvedUserId}/document`, {
        responseType: 'blob'
      });
      const contentType = String(res.headers['content-type'] || 'application/pdf');
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      alert('Failed to open document');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/school-admin/users/${resolvedUserId}/document`, {
        responseType: 'blob'
      });
      const contentType = String(res.headers['content-type'] || 'application/octet-stream');
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = staff.document_file_name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert('Failed to download document');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds the 2MB limit.');
      return;
    }

    setUploading(true);
    try {
      await replaceUserDocument(resolvedUserId, file);
      alert('Document replaced successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to replace document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wide text-sm">{title}</h3>
            <p className="text-xs text-slate-500">Detailed profile information</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {detailRows.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">{formatValue(value)}</div>
            </div>
          ))}
        </div>

        {/* Document Section */}
        <div className="mx-6 mb-6 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Uploaded Document</div>
          {staff.document_file_name ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {staff.document_file_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {staff.document_file_size ? `${(staff.document_file_size / (1024 * 1024)).toFixed(2)} MB` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleView}
                  className="px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <FileText size={14} /> View
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Re-uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Re-upload/Edit
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <span className="text-xs text-slate-400 italic mb-2">No document uploaded yet</span>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Upload Document
                  </>
                )}
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
};
