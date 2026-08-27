import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Loader2,
  User,
  HeartPulse,
  GraduationCap,
  Clock,
  Download,
  Upload,
  X,
  Users,
  MapPin,
  Building,
  Calendar,
  CreditCard,
  PhoneCall
} from 'lucide-react';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import api from '../services/api';
import { getStudentAdmissionRecord, type StudentAdmissionRecord } from '../services/schoolAdminService';

const displayValue = (value?: string | number | null) => {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  return String(value).trim();
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const formatted = formatEthiopianLabel(value);
  return formatted || value;
};

export const StudentRecordPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || '/students';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<StudentAdmissionRecord | null>(null);

  const [viewingDoc, setViewingDoc] = useState<{ applicationId: string; fileName: string } | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const triggerFileSelect = (appId: string) => {
    setReplacingDocId(appId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('transcript', file);

    setUploading(true);
    try {
      await api.post(`/school-admin/applications/${replacingDocId}/transcript/replace`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (studentId) {
        const data = await getStudentAdmissionRecord(studentId);
        setRecord(data);
      }
      alert('Document re-uploaded successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to replace document';
      alert(msg);
    } finally {
      setUploading(false);
      setReplacingDocId(null);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentAdmissionRecord(studentId);
        if (!cancelled) setRecord(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error?.message ||
              err.message ||
              'Failed to load student record'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchDoc = async () => {
      if (!viewingDoc) return;
      setDocLoading(true);
      setDocError(null);
      setDocUrl(null);
      try {
        const response = await api.get(
          `/school-admin/applications/${viewingDoc.applicationId}/transcript`,
          { responseType: 'blob' }
        );
        objectUrl = URL.createObjectURL(response.data);
        setDocUrl(objectUrl);
      } catch (err: any) {
        setDocError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load document'
        );
      } finally {
        setDocLoading(false);
      }
    };

    fetchDoc();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setDocUrl(null);
    };
  }, [viewingDoc]);

  const student = record?.student;
  const app = record?.application;
  const studentName = student?.name || app?.name || 'Student';
  const enrollmentStatus =
    student?.student_status ||
    (student?.status === 'Pending' ? 'Active' : student?.status) ||
    'Active';
  const applicationStatusLabel =
    app?.student_user_id || app?.registration_completed_at
      ? 'Enrolled / Active'
      : displayValue(app?.status).replace(/-/g, ' ');

  return (
    <div className="space-y-6 pb-12">
      <button
        type="button"
        onClick={() => navigate(returnTo)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Student Admission Record
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Complete admission details filled during student registration
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Enrollment Badge */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{studentName}</h2>
                  <p className="text-xs text-slate-400">Digital ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{displayValue(student?.digital_id || app?.digital_id)}</span></p>
                </div>
              </div>
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 w-fit">
                {enrollmentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Grade</p>
                <p className="font-bold dark:text-slate-200">{displayValue(student?.grade || app?.grade_applying)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Section</p>
                <p className="font-bold dark:text-slate-200">
                  {student?.section_label
                    ? `${student.section_name || ''} — Section ${student.section_label}`.trim()
                    : displayValue(student?.section_name)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Date</p>
                <p className="font-bold dark:text-slate-200">{formatDate(student?.enrolled_at)}</p>
              </div>
            </div>
          </div>

          {/* Detailed Admission Application Data */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Student Personal & Admission Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Data submitted during application for admission
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 w-fit">
                Status: {applicationStatusLabel}
              </span>
            </div>

            {/* 1. Student Personal Information */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <User size={14} className="text-indigo-500" />
                Personal Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.name || student?.name)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                  <p className="font-bold dark:text-slate-200">{formatDate(app?.dob)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.gender)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Digital ID</p>
                  <p className="font-bold dark:text-slate-200 font-mono">
                    {displayValue(student?.digital_id || app?.digital_id)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Place of Birth</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.place_of_birth)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Religion</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.religion)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Date Registered</p>
                  <p className="font-bold dark:text-slate-200">{formatDate(app?.date_registered || app?.created_at)}</p>
                </div>
              </div>
            </div>

            {/* 2. Family & Parent Information */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Users size={14} className="text-blue-500" />
                Parents & Family Background
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Father Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">Father's Information</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                      <p className="font-bold dark:text-slate-200">{displayValue(app?.father_name || app?.parent_name)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p>
                      <p className="font-bold dark:text-slate-200">{displayValue(app?.father_occupation)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                      <p className="font-bold dark:text-slate-200 flex items-center gap-1">
                        <PhoneCall size={12} className="text-slate-400" />
                        {displayValue(app?.father_phone || app?.parent_phone)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mother Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">Mother's Information</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                      <p className="font-bold dark:text-slate-200">{displayValue(app?.mother_name)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p>
                      <p className="font-bold dark:text-slate-200">{displayValue(app?.mother_occupation)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                      <p className="font-bold dark:text-slate-200 flex items-center gap-1">
                        <PhoneCall size={12} className="text-slate-400" />
                        {displayValue(app?.mother_phone)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Address & Residence Details */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-rose-500" />
                Address & Location Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Full Address</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.address)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Kebele</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.kebele)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Applicant Phone</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.applicant_phone || app?.phone)}</p>
                </div>
              </div>
            </div>

            {/* 4. Academic Background */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Building size={14} className="text-amber-500" />
                Academic History
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Grade Applying For</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.grade_applying || app?.grade)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Last Grade Completed</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.last_grade_completed || app?.grade)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Previous School</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.previous_school)}</p>
                </div>
              </div>
            </div>

            {/* 5. Medical Information */}
            {(app?.blood_group || app?.allergies || app?.chronic_conditions || app?.medications) && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <HeartPulse size={14} className="text-rose-500" />
                  Medical & Health Records
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Blood Group</span>
                    <p className="font-bold dark:text-slate-200">{displayValue(app?.blood_group)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Allergies</span>
                    <p className="font-bold dark:text-slate-200">{displayValue(app?.allergies)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Chronic Conditions</span>
                    <p className="font-bold dark:text-slate-200">{displayValue(app?.chronic_conditions)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Current Medications</span>
                    <p className="font-bold dark:text-slate-200">{displayValue(app?.medications)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Exam Info if present */}
            {(app?.exam_date || app?.exam_location) && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={12} /> Placement Exam Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase">Date</span>
                    <p className="font-bold text-amber-800 dark:text-amber-200">{formatDate(app?.exam_date)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase">Time</span>
                    <p className="font-bold text-amber-800 dark:text-amber-200">{displayValue(app?.exam_time)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase">Location</span>
                    <p className="font-bold text-amber-800 dark:text-amber-200">{displayValue(app?.exam_location)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase">Subjects</span>
                    <p className="font-bold text-amber-800 dark:text-amber-200">{displayValue(app?.exam_subjects)}</p>
                  </div>
                  {app?.exam_notes && (
                    <div className="md:col-span-4">
                      <span className="text-[10px] text-amber-500 font-bold uppercase">Notes</span>
                      <p className="font-bold text-amber-800 dark:text-amber-200">{app.exam_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. Finance & Registration completion if present */}
            {(app?.finance_status || app?.registration_completed_at) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Finance Status</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.finance_status)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Amount</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.payment_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Reference</p>
                  <p className="font-bold dark:text-slate-200">{displayValue(app?.payment_reference)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registration Completed</p>
                  <p className="font-bold dark:text-slate-200">{formatDate(app?.registration_completed_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* 8. Documents & Transcripts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <FileText size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Submitted Documents & Transcripts
              </h2>
            </div>

            {(!record?.documents || record.documents.length === 0) ? (
              <p className="text-sm text-slate-500">No documents were submitted with this application.</p>
            ) : (
              <div className="space-y-3">
                {record.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{doc.file_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Academic Transcript Document
                        {doc.uploaded_at ? ` · Uploaded ${formatDate(doc.uploaded_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.source === 'application' && app?.id && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({ applicationId: app.id, fileName: doc.file_name })
                            }
                            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-bold flex items-center gap-2"
                          >
                            <FileText size={14} /> View
                          </button>
                          <a
                            href={`/api/school-admin/applications/${app.id}/transcript`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              api
                                .get(`/school-admin/applications/${app.id}/transcript`, {
                                  responseType: 'blob'
                                })
                                .then((res) => {
                                  const url = URL.createObjectURL(res.data);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = doc.file_name;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                });
                            }}
                          >
                            <Download size={14} /> Download
                          </a>
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => triggerFileSelect(app.id)}
                            className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                          >
                            {uploading && replacingDocId === app.id ? (
                              <>
                                <Loader2 className="animate-spin" size={14} /> Re-uploading...
                              </>
                            ) : (
                              <>
                                <Upload size={14} /> Re-upload
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate pr-4">
                {viewingDoc.fileName}
              </h3>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="text-slate-400 hover:text-slate-600"
                title="Close document viewer"
                aria-label="Close document viewer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4">
              {docLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-blue-600" size={28} />
                </div>
              ) : docError ? (
                <p className="text-sm text-rose-500 text-center">{docError}</p>
              ) : docUrl ? (
                <iframe title={viewingDoc.fileName} src={docUrl} className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-700" />
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* Hidden file input for re-uploading documents */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default StudentRecordPage;
