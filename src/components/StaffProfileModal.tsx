import { uiError, uiText } from "../localization";
import { X, FileText, Download, Upload, Loader2, Eye, User, Briefcase, Phone } from 'lucide-react';
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
  const [downloading, setDownloading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open || !staff) return null;

  const resolvedUserId = staff.userId || staff.user_id || staff.id;
  const profile = staff.staffProfile || staff.staff_profile || {};
  const dob = profile.dob || profile.dateOfBirth || profile.birthDate || staff.dob;
  const age = calculateAge(dob);
  const registeredAt = staff.createdAt || staff.created_at || profile.registeredAt || profile.dateRegistered;

  const isAcademicOrStockKeeper = ['academic-manager', 'storekeeper', 'stockkeeper', 'academicmanager', 'stock_keeper', 'store_keeper'].includes(
    String(staff.role || '').toLowerCase()
  );

  const docFileName = staff.document_file_name || staff.documentFileName;

  const handleView = async () => {
    setViewingDoc(true);
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
      alert(uiText("Failed to open document"));
    } finally {
      setViewingDoc(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/school-admin/users/${resolvedUserId}/document`, {
        responseType: 'blob'
      });
      const contentType = String(res.headers['content-type'] || 'application/octet-stream');
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docFileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert(uiText("Failed to download document"));
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(uiText("File size exceeds the 2MB limit."));
      return;
    }

    setUploading(true);
    try {
      await replaceUserDocument(resolvedUserId, file);
      alert(uiText("Document replaced successfully!"));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(uiError(err.response?.data?.error?.message || 'Failed to replace document'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Eye size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
                {uiText(title || "Registration Details")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {uiText("Complete information submitted during system registration")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={uiText("Close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Top Banner Card */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 rounded-xl border border-blue-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{staff.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold capitalize">
                    {uiText(staff.role)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    staff.status === 'Active' || staff.status === 'Approved'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    {uiText(staff.status)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{uiText("Digital ID")}</span>
              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{staff.digitalId || staff.digital_id || 'N/A'}</span>
            </div>
          </div>

          {/* Account & System Information */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User size={14} className="text-blue-500" />
              {uiText("Account & System Information")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Full Name")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatValue(staff.name)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Email Address")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatValue(staff.email)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Role")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{uiText(staff.role) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Digital ID")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{formatValue(staff.digitalId || staff.digital_id)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Registration Date")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {registeredAt
                    ? (new Date(registeredAt).toString() !== 'Invalid Date'
                        ? new Date(registeredAt).toLocaleString()
                        : registeredAt)
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">{uiText("Account Status")}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{uiText(staff.status) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Personal & Professional Profile - Hidden for Academic Manager and Storekeeper */}
          {!isAcademicOrStockKeeper && (
            <>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-500" />
                  {uiText("Personal & Professional Profile")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Phone Number")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.phoneNumber || profile.phone || profile.contactNumber || staff.phoneNumber)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Date of Birth")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(dob)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Age")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {age ? `${age} years` : 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Education Status")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.educationLevel || profile.educationStatus || staff.educationLevel)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Specialty / Course")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.specialty || profile.courseSpecialty || staff.specialty)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Previous School")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.previousSchool || staff.previousSchool)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Years of Experience")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.experienceYears || profile.experience || staff.experienceYears)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Phone size={14} className="text-emerald-500" />
                  {uiText("Emergency Contact")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Emergency Contact Name")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.emergencyContactName || staff.emergencyContactName)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">{uiText("Emergency Contact Phone")}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatValue(profile.emergencyContactPhone || staff.emergencyContactPhone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attached Document Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-500" />
                  {uiText("Attached Document")}
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-lg shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-xs sm:max-w-md">
                        {docFileName || uiText("No document uploaded")}
                      </span>
                      <span className="text-xs text-slate-400 font-medium block">
                        {docFileName
                          ? uiText("Document attached during registration")
                          : uiText("Optional staff file was not provided")}
                      </span>
                    </div>
                  </div>

                  {docFileName && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleView}
                        disabled={viewingDoc}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                        title={uiText("View / Open Document")}
                      >
                        {viewingDoc ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                        <span>{uiText("View")}</span>
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isAcademicOrStockKeeper && docFileName && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{downloading ? uiText("Downloading...") : uiText("Download Document")}</span>
              </button>
            )}
            {!isAcademicOrStockKeeper && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />{uiText(" Uploading...")}
                  </>
                ) : (
                  <>
                    <Upload size={15} />{uiText(docFileName ? "Reupload / Edit Document" : "Upload Document")}
                  </>
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {uiText("Close")}
          </button>
        </div>
      </div>
    </div>
  );
};
