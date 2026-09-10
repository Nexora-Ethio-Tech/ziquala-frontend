import { uiText } from "../localization";
import { useParams, Link } from 'react-router-dom';
import { mockStudents } from '../data/mockData';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  TrendingUp,
  Clock,
  FileText,
  Mail,
  Heart,
  ShieldAlert,
  Printer,
  FileUp,
  AlertTriangle,
  X,
  Edit2,
  Save,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import * as sectionService from '../services/sectionService';
import { getGradingConfigsForGrade } from '../services/studentPortalService';

export const StudentProfile = () => {
  const { id } = useParams();
  const { role } = useUser();
  const [showTranscript, setShowTranscript] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [selectedHistoryYear, setSelectedHistoryYear] = useState('all');

  // Section assignment state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [availableSections, setAvailableSections] = useState<sectionService.SectionInfo[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionAssigning, setSectionAssigning] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const student = mockStudents.find(s => s.id === id) as any;
  const gradeLevel = student?.grade?.replace(/[A-Z]/g, '');

  // Grading methods: load from backend, fallback to empty
  const [gradingMethods, setGradingMethods] = useState<Array<{ id: string; label: string; maxWeight: number }>>([]);
  useEffect(() => {
    if (gradeLevel) {
      getGradingConfigsForGrade(gradeLevel)
        .then((methods) => setGradingMethods(methods || []))
        .catch(() => setGradingMethods([]));
    }
  }, [gradeLevel]);

  const isParent = role === 'parent';
  const isSchoolAdmin = role === 'school-admin';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch available sections when modal opens
  useEffect(() => {
    if (showSectionModal && student?.grade) {
      fetchAvailableSections();
    }
  }, [showSectionModal, student?.grade]);

  const fetchAvailableSections = async () => {
    try {
      setLoadingSections(true);
      const sections = await sectionService.getAvailableSections(student.grade);
      setAvailableSections(sections);
      if (sections.length > 0 && !selectedSection) {
        setSelectedSection(sections[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch sections:', err);
      showToast(uiText(err.response?.data?.error || 'Failed to fetch sections'), 'error');
    } finally {
      setLoadingSections(false);
    }
  };

  const handleAssignSection = async () => {
    if (!selectedSection || !id) return;
    try {
      setSectionAssigning(true);
      const result = await sectionService.assignStudentToSection(id, selectedSection, 'Admin assignment');
      showToast(uiText(result.message), 'success');
      setShowSectionModal(false);
      // In a real app, would refresh student data here
    } catch (err: any) {
      showToast(uiText(err.response?.data?.error || err.message || 'Failed to assign section'), 'error');
    } finally {
      setSectionAssigning(false);
    }
  };

  if (!student) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{uiText("Student not found")}</h2>
        <Link to="/students" className="text-blue-600 hover:underline mt-4 inline-block">{uiText("Back to Students List")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <div className="flex items-center gap-4">
          <Link to="/students" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{uiText("Student Profile")}</h2>
            <p className="text-sm text-slate-500">{uiText("Detailed overview of academic performance and records.")}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 -mx-4 sm:mx-0">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-4xl mx-auto mb-6">
              {uiText(student.name.charAt(0))}
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{student.name}</h3>
            <p className="text-slate-500 font-medium mb-6">{uiText("Grade ")}{uiText(student.grade)}{uiText(" Student")}</p>

            <div className="flex justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                {uiText(student.status)}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">{uiText("#")}{uiText(student.id.padStart(4, '0'))}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2">{uiText("Personal Information")}</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={18} className="text-slate-400" />
                <div className="text-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Date of Birth")}</p>
                  <p className="font-medium">{uiText(student.dob || 'May 15, 2010')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <User size={18} className="text-slate-400" />
                <div className="text-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Gender")}</p>
                  <p className="font-medium">{uiText(student.gender || 'Male')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-slate-400" />
                <div className="text-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Address")}</p>
                  <p className="font-medium">{uiText(student.address || 'Addis Ababa, Ethiopia')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2">{uiText("Parent/Guardian")}</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <User size={18} className="text-slate-400" />
                <div className="text-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Name")}</p>
                  <p className="font-medium">{uiText(student.parentName)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-slate-400" />
                <div className="text-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Phone Number")}</p>
                  <p className="font-medium">{uiText(student.parentPhone)}</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-2 flex items-center justify-center gap-2 py-2 border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors text-sm font-bold">
              <Mail size={16} />{uiText("Contact Parent")}</button>
          </div>

          {/* Section Assignment (School Admin Only) */}
          {isSchoolAdmin && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-600" />{uiText("Section Assignment")}</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{uiText("Current Section")}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {uiText(student.section || 'Not Assigned')}
                  </p>
                </div>
                {uiText(student.previousSection && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{uiText("Previous Section")}</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      {uiText(student.previousSection)}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowSectionModal(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold"
              >
                <Edit2 size={16} />{uiText("Change Section")}</button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <Heart size={16} className="text-rose-500" />{uiText("Medical Records")}</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{uiText("Blood Group")}</span>
                <span className="font-bold text-slate-700">{uiText(student.bloodGroup || 'N/A')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{uiText("Allergies")}</span>
                <span className="font-bold text-slate-700">{uiText(student.allergies || 'None')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{uiText("Chronic Conditions")}</span>
                <span className="font-bold text-slate-700 text-right">{uiText(student.chronicConditions || 'None')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{uiText("Vaccination")}</span>
                <span className="font-bold text-emerald-600">{uiText(student.vaccinationStatus || 'Verified')}</span>
              </div>
              <div className="pt-2 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{uiText("Home Medications")}</p>
                <p className="text-xs font-bold text-slate-700">{uiText(student.homeMedications || 'None')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldAlert size={16} className="text-orange-500" />{uiText("Emergency Contact")}</h4>
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{(student.emergencyContact?.name || uiText(student.parentName))}</p>
              <p className="text-xs text-slate-500">{uiText(student.emergencyContact?.relation || 'Parent')}</p>
              <p className="text-sm font-medium text-blue-600 mt-1">{uiText(student.emergencyContact?.phone || student.parentPhone)}</p>
            </div>
          </div>
        </div>

        {/* Content Tabs/Details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Bio Section */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <User size={120} />
            </div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />{uiText("Student Biography")}</h4>
              {isParent && (
                <button
                  onClick={() => {
                    if (isEditing) {
                      // Save logic here
                      student.bio = editedBio;
                      setIsEditing(false);
                    } else {
                      setEditedBio(student.bio || '');
                      setIsEditing(true);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isEditing ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'
                    }`}
                >
                  {isEditing ? <Save size={14} /> : <Edit2 size={14} />}
                  {uiText(isEditing ? 'Save Bio' : 'Edit Bio')}
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-blue-100 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none h-32"
                placeholder={uiText("Write something about the student...")}
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">{uiText("\"")}{uiText(student.bio || 'No biography provided for this student.')}{uiText("\"")}</p>
            )}
          </div>
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-0">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.riskLevel === 'High' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                student.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                  'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
              <AlertTriangle size={20} />
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">{uiText("AI Academic Health Monitor")}</p>
                <p className="text-sm font-bold">{uiText(student.riskLevel)}{uiText(" Risk Status")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranscript(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm font-bold"
              >
                <Printer size={18} />{uiText("Generate Transcript")}</button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 sm:px-0">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <Clock size={20} />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase">{uiText("Attendance")}</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white">{uiText("96.4%")}</h4>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp size={20} />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase">{uiText("Average")}</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white">{uiText("92.8%")}</h4>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="bg-purple-100 text-purple-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap size={20} />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase">{uiText("Rank")}</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white">{uiText("4 / 45")}</h4>
            </div>
          </div>

          {/* Academic History */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />{uiText("Academic History")}</h4>
              <div className="flex items-center gap-2">
                <label htmlFor="history-filter-year" className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{uiText("Filter Year:")}</label>
                <select
                  id="history-filter-year"
                  title={uiText("Filter academic history year")}
                  aria-label={uiText("Filter academic history year")}
                  value={selectedHistoryYear}
                  onChange={(e) => setSelectedHistoryYear(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{uiText("All Academic Years")}</option>
                  {Array.from(new Set((student.academicHistory || []).map((h: any) => h.year))).map((y: any) => (
                    <option key={y} value={y}>{uiText("EC ")}{uiText(y)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(student.academicHistory || [])
                .filter((h: any) => selectedHistoryYear === 'all' || h.year === selectedHistoryYear)
                .map((record: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-blue-100">
                        {uiText(record.grade)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{uiText("Grade ")}{uiText(record.grade)}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{uiText("Academic Year EC ")}{uiText(record.year)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{uiText("Avg Score")}</p>
                        <p className="text-sm font-black text-blue-600">{uiText(record.average)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{uiText("Rank")}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{uiText(record.rank)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {(!student.academicHistory || student.academicHistory.length === 0) && (
                <div className="py-12 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">{uiText("No historical records available for this student.")}</div>
              )}
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Clock size={20} className="text-emerald-600" />{uiText("Attendance Trend (Current Year)")}</h4>
            <div className="flex items-end justify-between h-40 gap-2">
              {(student.attendanceHistory || [
                { month: 'Sep', rate: 90 },
                { month: 'Oct', rate: 85 },
                { month: 'Nov', rate: 95 },
                { month: 'Dec', rate: 88 },
                { month: 'Jan', rate: 92 },
                { month: 'Feb', rate: 96 },
              ]).map((data: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative">
                    <div
                      className="w-full bg-emerald-100 rounded-t-lg group-hover:bg-emerald-200 transition-colors"
                      style={{ height: `${data.rate}%` }}
                    ></div>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
                      {uiText(data.rate)}{uiText("%")}</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{uiText(data.month)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Vault */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileUp size={20} className="text-blue-600" />{uiText("Encrypted Document Vault")}</h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{uiText("2MB LIMIT")}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{uiText("Birth Certificate.pdf")}</p>
                  <p className="text-xs text-slate-400">{uiText("Verified • 1.2 MB")}</p>
                </div>
              </div>
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer">
                <FileUp size={20} />
                <span className="text-sm font-bold">{uiText("Upload Document")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Assignment Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <GraduationCap size={24} />{uiText("Assign Section")}</h3>
                  <p className="text-blue-100 text-xs font-medium mt-1">{uiText("For ")}{student.name}</p>
                </div>
                <button
                  onClick={() => setShowSectionModal(false)}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                  title={uiText("Close")}
                  aria-label={uiText("Close modal")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {loadingSections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="profile-section-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{uiText("Select Section")}</label>
                    <select
                      id="profile-section-select"
                      title={uiText("Select Section")}
                      aria-label={uiText("Select Section")}
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                      <option value="">{uiText("-- Select a section --")}</option>
                      {availableSections.map(section => (
                        <option key={section.id} value={section.id}>
                          {section.name}{uiText(" (")}{section.current_count}{uiText("/")}{section.capacity}{uiText(" students)")}</option>
                      ))}
                    </select>
                  </div>

                  {uiText(selectedSection && availableSections.find(s => s.id === selectedSection) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{uiText("Available Slots: ")}{availableSections.find(s => s.id === selectedSection)?.available_slots}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6 flex gap-3">
              <button
                onClick={() => setShowSectionModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
              >{uiText("Cancel")}</button>
              <button
                onClick={handleAssignSection}
                disabled={!selectedSection || sectionAssigning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-bold text-sm"
              >
                {sectionAssigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />{uiText("Assigning...")}</>
                ) : (
                  <>
                    <Save size={16} />{uiText("Assign Section")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{uiText("Academic Transcript")}</h3>
              <div className="flex items-center gap-2">
                <button type="button" title={uiText("Print transcript")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold">
                  <Printer size={18} />{uiText("Print Now")}</button>
                <button
                  type="button"
                  title={uiText("Close transcript modal")}
                  aria-label={uiText("Close transcript modal")}
                  onClick={() => setShowTranscript(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-12 space-y-8" id="transcript-content">
              {/* Transcript Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">{uiText("AA")}</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{uiText("ZIQUALA ABO SCHOOL")}</h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{uiText("Official Academic Record")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{uiText("Date Issued: April 25, 2026")}</p>
                  <p className="text-xs text-slate-400">{uiText("Ref: AA-TR-")}{uiText(student.id)}{uiText("-")}{new Date().getFullYear()}</p>
                </div>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-8 py-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Student Name")}</p>
                  <p className="text-lg font-bold text-slate-800">{student.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Student ID")}</p>
                  <p className="text-lg font-bold text-slate-800">{uiText("AA-2026-")}{uiText(student.id.padStart(4, '0'))}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Current Grade")}</p>
                  <p className="text-lg font-bold text-slate-800">{uiText("Grade ")}{uiText(student.grade)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Academic Year")}</p>
                  <p className="text-lg font-bold text-slate-800">{uiText("2026 EC")}</p>
                </div>
              </div>

              {/* Results Table */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-widest border-l-4 border-slate-800 pl-3 flex items-center justify-between">{uiText("Summary of Results")}<span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{uiText("Configured for Grade ")}{uiText(student.grade)}</span>
                </h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">{uiText("Subject")}</th>
                      {gradingMethods.map(m => (
                        <th key={m.id} className="py-3 px-2 text-[9px] font-black text-slate-400 uppercase text-center">
                          {uiText(m.label)}<br />{uiText("(")}{m.maxWeight}{uiText(")")}</th>
                      ))}
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-center">{uiText("Total")}</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">{uiText("Grade")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {['Mathematics', 'Physics', 'Biology', 'Chemistry', 'English', 'Amharic', 'History'].map((subject) => (
                      <tr key={subject}>
                        <td className="py-3 px-4 font-bold text-slate-700 text-xs">{uiText(subject)}</td>
                        {gradingMethods.map(m => (
                          <td key={m.id} className="py-3 px-2 text-center text-xs font-medium text-slate-600">
                            {Math.floor(m.maxWeight * 0.9)}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center text-xs font-black text-blue-600">{uiText("90%")}</td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 text-xs">{uiText("A+")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white">
                      <td className="py-4 px-4 font-bold rounded-bl-2xl">{uiText("CUMULATIVE AVERAGE")}</td>
                      <td className="py-4 px-4 text-center font-black text-lg">{uiText("94.2%")}</td>
                      <td className="py-4 px-4 text-center font-bold">{uiText("A+")}</td>
                      <td className="py-4 px-4 text-right font-bold rounded-br-2xl">{uiText("4.0 GPA")}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Verification Section */}
              <div className="pt-12 flex items-end justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300">
                      <Printer size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Verification QR Code")}</p>
                      <p className="text-xs text-slate-600">{uiText("Scan to verify authenticity online")}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">{uiText("This is a computer-generated transcript, no physical signature required for internal use.")}</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-32 h-1 bg-slate-800 mx-auto"></div>
                  <p className="text-sm font-bold text-slate-800">{uiText("School Registrar")}</p>
                  <div className="w-24 h-24 border-4 border-double border-blue-600/20 rounded-full flex items-center justify-center mx-auto opacity-50">
                    <div className="text-[10px] font-black text-blue-600 uppercase text-center rotate-12">{uiText("OFFICIAL")}<br />{uiText("SEAL")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-[200] animate-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            ) : (
              <XCircle className="text-red-600 dark:text-red-400" size={20} />
            )}
            <p className={`text-sm font-bold ${toast.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
              }`}>
              {uiText(toast.message)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
