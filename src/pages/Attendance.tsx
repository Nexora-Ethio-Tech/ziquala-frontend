import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, ChevronDown, UserCheck, Users, ShieldAlert, ArrowRight, X, Send, Check, Loader2, ArrowLeft, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import attendanceService from '../services/attendanceService';
import studentService from '../services/studentService';
import { getTodayEthiopianDate, parseEthiopianDateString, formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import api from '../services/api';

const ETH_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

/** Format an already-Ethiopian YYYY-MM-DD string → "6 Meskerem 2018 E.C." */
function formatEthDateStr(ethStr: string): string {
  const p = parseEthiopianDateString(ethStr);
  if (!p) return ethStr;
  return `${p.day} ${ETH_MONTHS[p.month - 1]} ${p.year} E.C.`;
}

type AttendanceMode = 'student' | 'staff' | null;
type StaffAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Present (Late)' | 'Pending' | 'Weekend' | 'Holiday';

interface StaffAttendanceRecord {
  id: string;
  name: string;
  branch: string;
  department: string;
  subjects: string[];
  status: StaffAttendanceStatus;
  isLateArrival?: boolean;
  signInTime?: string;
  lunchOutTime?: string;
  lunchInTime?: string;
  signOutTime?: string;
  zkDeviceId?: number;
  role?: string;
  isBiometric?: boolean;
  classes?: number;
  date?: string;
}

export const Attendance = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';
  const isVP = role === 'vice-principal';
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayEthiopianDate());
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('staff');
  const [staffFilter, setStaffFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editRecord, setEditRecord] = useState<StaffAttendanceRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [absentTeacher, setAbsentTeacher] = useState<any>(null);
  const [isProxyAnalysisRunning, setIsProxyAnalysisRunning] = useState(false);
  const [proxySuggestions, setProxySuggestions] = useState<string[]>([]);
  const [absentReviewQueue, setAbsentReviewQueue] = useState<any[]>([]);
  const [gradeStats, setGradeStats] = useState<any[]>([]);
  const [studentAttendanceHistory, setStudentAttendanceHistory] = useState<Record<string, any>>({});
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(false);

  // Fetch students for selected grade
  useEffect(() => {
    if (attendanceMode !== 'student') {
      setStudents([]);
      setAttendance({});
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const data = await studentService.getAllStudents({ grade: selectedGrade });
        setStudents(data || []);
        // Initialize attendance state
        const initialAttendance: Record<string, 'present' | 'absent'> = {};
        data?.forEach((s: any) => {
          initialAttendance[s.id] = 'present';
        });
        setAttendance(initialAttendance);

        // Fetch attendance history for each student (for 30-day stats)
        if (isAdmin && data && data.length > 0) {
          const historyMap: Record<string, any> = {};
          for (const student of data) {
            try {
              const history = await attendanceService.getStudentAttendanceHistory(student.id, 30);
              if (history) {
                historyMap[student.id] = history;
              }
            } catch (err) {
              console.error(`Failed to fetch attendance history for student ${student.id}:`, err);
            }
          }
          setStudentAttendanceHistory(historyMap);
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedGrade, attendanceMode, isAdmin]);

  // Fetch staff attendance from backend (biometric & manually logged ZKTeco devices)
  useEffect(() => {
    if (attendanceMode !== 'staff') return;

    const fetchStaff = async () => {
      setLoading(true);
      try {
        const endpoint = isVP ? '/vice-principal/staff-attendance' : '/school-admin/staff-attendance';
        const response = await api.get(endpoint, {
          params: { date: selectedDate }
        });
        if (response.data && response.data.success) {
          const mappedRecords: StaffAttendanceRecord[] = response.data.data.map((item: any) => {
            const rawStatus = (item.attendance_status || '').toLowerCase();
            const isLateArrival = !!item.is_late_arrival;
            let status: StaffAttendanceStatus = 'Pending';
            if (rawStatus === 'present' && isLateArrival) status = 'Present (Late)';
            else if (rawStatus === 'present') status = 'Present';
            else if (rawStatus === 'late') status = 'Late';
            else if (rawStatus === 'half-day') status = 'Half Day';
            else if (rawStatus === 'absent') status = 'Absent';
            else if (item.day_off_type === 'Weekend') status = 'Weekend';
            else if (item.day_off_type === 'Holiday') status = 'Holiday';
            return {
              id: item.id,
              name: item.name,
              branch: item.branch_name || 'Main',
              department: item.department || (item.role === 'teacher' ? 'Academics' : item.role),
              subjects: item.subjects || [],
              status,
              isLateArrival,
              signInTime: item.sign_in_time || undefined,
              lunchOutTime: item.lunch_out_time || undefined,
              lunchInTime: item.lunch_in_time || undefined,
              signOutTime: item.sign_out_time || undefined,
              zkDeviceId: item.zk_device_id,
              role: item.role,
              isBiometric: item.is_biometric,
              classes: item.classes_count || 0,
              date: selectedDate,
            };
          });
          setStaffAttendance(mappedRecords);
        }
      } catch (error) {
        console.error('Failed to fetch staff attendance:', error);
        setStaffAttendance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [selectedDate, attendanceMode, isVP]);

  const handleSaveManualAttendance = async (userId: string, date: string, formData: {
    status?: string;
    sign_in_time?: string;
    lunch_out_time?: string;
    lunch_in_time?: string;
    sign_out_time?: string;
  }) => {
    setEditSaving(true);
    try {
      const response = await api.post('/school-admin/staff-attendance', {
        userId,
        date,
        ...formData
      });
      if (response.data && response.data.success) {
        const endpoint = isVP ? '/vice-principal/staff-attendance' : '/school-admin/staff-attendance';
        const refreshResponse = await api.get(endpoint, {
          params: { date: selectedDate }
        });
        if (refreshResponse.data && refreshResponse.data.success) {
          const mappedRecords: StaffAttendanceRecord[] = refreshResponse.data.data.map((item: any) => {
            const rawStatus = (item.attendance_status || '').toLowerCase();
            const isLateArrival = !!item.is_late_arrival;
            let status: StaffAttendanceStatus = 'Pending';
            if (rawStatus === 'present' && isLateArrival) status = 'Present (Late)';
            else if (rawStatus === 'present') status = 'Present';
            else if (rawStatus === 'late') status = 'Late';
            else if (rawStatus === 'half-day') status = 'Half Day';
            else if (rawStatus === 'absent') status = 'Absent';
            else if (item.day_off_type === 'Weekend') status = 'Weekend';
            else if (item.day_off_type === 'Holiday') status = 'Holiday';
            return {
              id: item.id,
              name: item.name,
              branch: item.branch_name || 'Main',
              department: item.department || (item.role === 'teacher' ? 'Academics' : item.role),
              subjects: item.subjects || [],
              status,
              isLateArrival,
              signInTime: item.sign_in_time || undefined,
              lunchOutTime: item.lunch_out_time || undefined,
              lunchInTime: item.lunch_in_time || undefined,
              signOutTime: item.sign_out_time || undefined,
              zkDeviceId: item.zk_device_id,
              role: item.role,
              isBiometric: item.is_biometric,
              classes: item.classes_count || 0,
              date: selectedDate,
            };
          });
          setStaffAttendance(mappedRecords);
        }
        setEditRecord(null);
      }
    } catch (error) {
      console.error('Failed to save manual attendance:', error);
      alert('Failed to save manual attendance. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveAllStaffAttendance = async () => {
    if (staffAttendance.length === 0) return;
    setStaffSaving(true);
    try {
      const records = staffAttendance.map((record) => {
        // Normalise display status → DB status
        // 'Present (Late)' → 'late', 'Present' → 'present', 'Absent' → 'absent', etc.
        let dbStatus = record.status.toLowerCase();
        if (dbStatus === 'present (late)') dbStatus = 'late';
        else if (dbStatus === 'half day') dbStatus = 'half-day';

        return {
          userId: record.id,
          status: dbStatus,
          sign_in_time: record.signInTime || undefined,
          lunch_out_time: record.lunchOutTime || undefined,
          lunch_in_time: record.lunchInTime || undefined,
          sign_out_time: record.signOutTime || undefined,
        };
      });
      await api.post('/school-admin/staff-attendance/bulk', {
        date: selectedDate,
        records,
      });
      alert(`Attendance records for ${formatEthDateStr(selectedDate)} saved successfully!`);
    } catch (error: any) {
      console.error('Failed to bulk-save staff attendance:', error);
      alert('Failed to save staff attendance: ' + (error?.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setStaffSaving(false);
    }
  };

  // Fetch attendance summary by grade for school admin
  useEffect(() => {
    if (!isAdmin || attendanceMode !== 'student') {
      setGradeStats([]);
      return;
    }

    const fetchAttendanceSummary = async () => {
      setAttendanceSummaryLoading(true);
      try {
        const summaryData = await attendanceService.getAttendanceSummary(selectedDate);
        if (summaryData && summaryData.summary) {
          // Transform backend data to match expected format
          const transformed = summaryData.summary.map((item: any) => {
            const percent = item.total_students > 0
              ? ((parseInt(item.present || 0, 10) / parseInt(item.total_students, 10)) * 100)
              : 0;

            // Normalize grade display: ensure "Grade " prefix
            let gradeText = item.grade;
            if (!gradeText.startsWith('Grade ') && /^\d+/.test(gradeText)) {
              gradeText = `Grade ${gradeText}`;
            }

            // Format grade display: "Grade 10" or "Grade 10 - Section A"
            let gradeDisplay = gradeText;
            if (item.section && item.section.trim()) {
              gradeDisplay = `${gradeText} - ${item.section}`;
            }

            // Extract just the number for the badge (e.g., "10" from "Grade 10 - Section A")
            const badgeNumber = gradeText.replace('Grade ', '').split('-')[0].trim();

            return {
              id: item.id,
              grade: gradeDisplay,
              badgeNumber: badgeNumber,
              enrollment: parseInt(item.total_students, 10),
              present: parseInt(item.present || 0, 10),
              percentage: percent.toFixed(1) + '%',
              percentageNumeric: percent.toFixed(1)
            };
          });
          setGradeStats(transformed);
        }
      } catch (error) {
        console.error('Failed to fetch attendance summary:', error);
        // Keep existing gradeStats if fetch fails
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };

    fetchAttendanceSummary();
  }, [selectedDate, attendanceMode, isAdmin]);

  const toggleStatus = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const newAttendance = { ...attendance };
    students.forEach((s: any) => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  const filteredStaff = staffAttendance.filter((record) => {
    if (staffFilter === 'all') return true;
    if (staffFilter === 'pending') {
      return !record.signInTime && record.status !== 'Weekend' && record.status !== 'Holiday';
    }
    return record.status.toLowerCase() === staffFilter;
  });

  const staffSummary = staffAttendance.reduce(
    (summary, record) => {
      summary.present += record.status === 'Present' ? 1 : 0;
      summary.absent += record.status === 'Absent' ? 1 : 0;
      summary.late += (record.status === 'Late' || record.status === 'Present (Late)') ? 1 : 0;
      summary.pendingSignIn += (record.signInTime || record.status === 'Weekend' || record.status === 'Holiday') ? 0 : 1;
      summary.total += 1;
      return summary;
    },
    { present: 0, absent: 0, late: 0, pendingSignIn: 0, total: 0 }
  );

  const handleAttendanceModeChange = (mode: AttendanceMode) => {
    setAttendanceMode(mode);
    setStaffFilter('all');
  };

  const handleStaffSignIn = (id: string) => {
    setStaffAttendance((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
            ...record,
            status: 'Present',
            signInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          : record
      )
    );
  };

  const handleStaffSignOut = (id: string) => {
    setStaffAttendance((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
            ...record,
            signOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          : record
      )
    );
  };

  const runProxyAnalysis = () => {
    setIsProxyAnalysisRunning(true);
    setProxySuggestions([]);
    window.setTimeout(() => {
      const suggestions = staffAttendance
        .filter((record) => record.status === 'Present' && record.role === 'teacher')
        .slice(0, 3)
        .map((record) => `${record.name} (${record.subjects.join(', ') || 'General'})`);
      setProxySuggestions(suggestions.length > 0 ? suggestions : ['No teachers currently checked in']);
      setIsProxyAnalysisRunning(false);
    }, 1200);
  };

  // Staff export date range state
  const [exportStartDate, setExportStartDate] = useState<string>(selectedDate);
  const [exportEndDate, setExportEndDate] = useState<string>(selectedDate);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Student export date range state
  const [studentExportStartDate, setStudentExportStartDate] = useState<string>(selectedDate);
  const [studentExportEndDate, setStudentExportEndDate] = useState<string>(selectedDate);
  const [isStudentExporting, setIsStudentExporting] = useState<boolean>(false);

  // 2. Add the function to fetch and export the CSV
  const handleExportReport = async () => {
    if (!exportStartDate || !exportEndDate) return;
    setIsExporting(true);

    try {
      const endpoint = isVP ? '/vice-principal/staff-attendance' : '/school-admin/staff-attendance';
      const response = await api.get(endpoint, {
        params: { startDate: exportStartDate, endDate: exportEndDate }
      });

      if (response.data && response.data.success) {
        const records = response.data.data;

        const csvRows = [];
        // 1. Detailed Report Headers
        csvRows.push(['--- DETAILED DAILY LOGS ---']);
        csvRows.push(['Date', 'Name', 'Department', 'Role', 'Status', 'Sign In Time', 'Lunch Out Time', 'Lunch In Time', 'Sign Out Time', 'Biometric/Manual']);

        // Object to hold our summary calculations
        const summaryMap: Record<string, any> = {};

        // Helper function to convert "HH:MM:SS" into total minutes for easy math
        const timeStrToMinutes = (timeStr?: string) => {
          if (!timeStr) return null;
          const parts = timeStr.split(':');
          if (parts.length < 2) return null;
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        };

        // Helper function to convert total minutes back to a readable "Xh Ym" format
        const formatMinutes = (totalMins: number) => {
          if (totalMins <= 0 || isNaN(totalMins)) return '--';
          const h = Math.floor(totalMins / 60);
          const m = Math.floor(totalMins % 60);
          return `${h}h ${m}m`;
        };

        records.forEach((item: any) => {
          const rawStatus = (item.attendance_status || '').toLowerCase();
          const isLateArrival = !!item.is_late_arrival;
          let status = 'Pending';

          if (rawStatus === 'present' && isLateArrival) status = 'Present (Late)';
          else if (rawStatus === 'present') status = 'Present';
          else if (rawStatus === 'late') status = 'Late';
          else if (rawStatus === 'half-day') status = 'Half Day';
          else if (rawStatus === 'absent') status = 'Absent';
          else if (item.day_off_type === 'Weekend') status = 'Weekend';
          else if (item.day_off_type === 'Holiday') status = 'Holiday';

          const department = item.department || (item.role === 'teacher' ? 'Academics' : item.role);
          const rowDate = item.attendance_date || exportStartDate;

          // -- CALCULATE DURATION WORKED TODAY --
          const signInMins = timeStrToMinutes(item.sign_in_time);
          const lunchOutMins = timeStrToMinutes(item.lunch_out_time);
          const lunchInMins = timeStrToMinutes(item.lunch_in_time);
          const signOutMins = timeStrToMinutes(item.sign_out_time);

          let dailyMinutesAttended = 0;
          if (signInMins !== null) {
            // Scenario 1: They have all 4 punches (subtract lunch time)
            if (signOutMins !== null && lunchOutMins !== null && lunchInMins !== null) {
              dailyMinutesAttended = (lunchOutMins - signInMins) + (signOutMins - lunchInMins);
            }
            // Scenario 2: Only sign in and sign out (no lunch taken/recorded)
            else if (signOutMins !== null) {
              dailyMinutesAttended = signOutMins - signInMins;
            }
            // Scenario 3: Only sign in and lunch out (forgot to come back or punch out)
            else if (lunchOutMins !== null) {
              dailyMinutesAttended = lunchOutMins - signInMins;
            }

            // Handle wrap-around just in case (overnight shift, etc.)
            if (dailyMinutesAttended < 0) dailyMinutesAttended += 24 * 60;
          }

          // Push Detailed Row
          csvRows.push([
            rowDate,
            `"${item.name}"`,
            `"${department}"`,
            `"${item.role}"`,
            status,
            item.sign_in_time || '--',
            item.lunch_out_time || '--',
            item.lunch_in_time || '--',
            item.sign_out_time || '--',
            item.is_biometric ? 'Biometric' : 'Manual'
          ]);

          // 2. Build Summary Data
          if (!summaryMap[item.id]) {
            summaryMap[item.id] = {
              name: item.name,
              department: department,
              role: item.role,
              present: 0,
              late: 0,
              absent: 0,
              halfDay: 0,
              offDays: 0, // Weekends & Holidays
              totalMinutesLogged: 0, // Track total minutes
              daysWithDuration: 0    // Track how many days they successfully punched in/out
            };
          }

          // Tally up the statuses
          if (status === 'Present') summaryMap[item.id].present += 1;
          else if (status === 'Present (Late)' || status === 'Late') summaryMap[item.id].late += 1;
          else if (status === 'Absent') summaryMap[item.id].absent += 1;
          else if (status === 'Half Day') summaryMap[item.id].halfDay += 1;
          else if (status === 'Weekend' || status === 'Holiday') summaryMap[item.id].offDays += 1;

          // Tally up time
          if (dailyMinutesAttended > 0) {
            summaryMap[item.id].totalMinutesLogged += dailyMinutesAttended;
            summaryMap[item.id].daysWithDuration += 1;
          }
        });

        // 3. Append Summary Section to the CSV
        csvRows.push([]); // Blank row for spacing
        csvRows.push([]); // Blank row for spacing
        csvRows.push(['--- EMPLOYEE ATTENDANCE SUMMARY ---']);
        // Added Average Time Attended to Headers
        csvRows.push(['Name', 'Department', 'Role', 'Total Present (On Time)', 'Total Late', 'Total Half Days', 'Total Absent', 'Total Off Days', 'Average Time Attended / Day']);

        Object.values(summaryMap).forEach((emp: any) => {
          // Calculate the average minutes per day they were present
          const averageMinutes = emp.daysWithDuration > 0 ? (emp.totalMinutesLogged / emp.daysWithDuration) : 0;
          const avgTimeDisplay = formatMinutes(averageMinutes);

          csvRows.push([
            `"${emp.name}"`,
            `"${emp.department}"`,
            `"${emp.role}"`,
            emp.present,
            emp.late,
            emp.halfDay,
            emp.absent,
            emp.offDays,
            avgTimeDisplay // Pushing calculated average (e.g., "8h 15m")
          ]);
        });

        // 4. Generate & Download CSV
        const csvString = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Staff_Attendance_${exportStartDate}_to_${exportEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to export staff attendance:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export student attendance as CSV for a date range
  const handleExportStudentAttendance = async () => {
    if (!studentExportStartDate || !studentExportEndDate) return;
    setIsStudentExporting(true);
    try {
      const response = await api.get('/school-admin/attendance', {
        params: { startDate: studentExportStartDate, endDate: studentExportEndDate }
      });

      if (response.data && response.data.success) {
        const records: any[] = response.data.data || [];

        const csvRows: (string | number)[][] = [];

        // ── Detailed Section ─────────────────────────────────────────────
        csvRows.push(['--- DETAILED DAILY LOGS ---']);
        csvRows.push(['Date', 'Student Name', 'Grade / Section', 'Status', 'Remarks']);

        // Summary accumulator keyed by studentId
        const summaryMap: Record<string, {
          name: string;
          grade: string;
          present: number;
          absent: number;
          late: number;
          excused: number;
          total: number;
        }> = {};

        records.forEach((item: any) => {
          const status = item.status || item.attendance_status || 'Unknown';
          const studentName = item.studentName || item.student_name || item.name || 'Unknown';
          const studentId = item.studentId || item.student_id || item.id;
          const grade = item.className || item.class_name || item.grade || '--';
          const rowDate = item.date || item.attendance_date || studentExportStartDate;
          const remarks = item.remarks || '--';

          // Detailed row
          csvRows.push([
            rowDate,
            `"${studentName}"`,
            `"${grade}"`,
            status,
            `"${remarks}"`
          ]);

          // Build summary
          if (!summaryMap[studentId]) {
            summaryMap[studentId] = { name: studentName, grade, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
          }
          summaryMap[studentId].total += 1;
          const normalised = status.toLowerCase();
          if (normalised === 'present') summaryMap[studentId].present += 1;
          else if (normalised === 'absent') summaryMap[studentId].absent += 1;
          else if (normalised === 'late') summaryMap[studentId].late += 1;
          else if (normalised === 'excused') summaryMap[studentId].excused += 1;
        });

        // ── Summary Section ──────────────────────────────────────────────
        csvRows.push([]);
        csvRows.push([]);
        csvRows.push(['--- STUDENT ATTENDANCE SUMMARY ---']);
        csvRows.push(['Student Name', 'Grade / Section', 'Total Days', 'Present', 'Absent', 'Late', 'Excused', 'Attendance Rate']);

        Object.values(summaryMap).forEach((s) => {
          const rate = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) + '%' : '0.0%';
          csvRows.push([
            `"${s.name}"`,
            `"${s.grade}"`,
            s.total,
            s.present,
            s.absent,
            s.late,
            s.excused,
            rate
          ]);
        });

        // ── Generate & Download ──────────────────────────────────────────
        const csvString = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Student_Attendance_${studentExportStartDate}_to_${studentExportEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to export student attendance:', error);
      alert('Failed to generate student attendance report. Please try again.');
    } finally {
      setIsStudentExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>
      {isVP && absentReviewQueue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 overflow-hidden shadow-xl shadow-rose-50 dark:shadow-none">
          <div className="bg-rose-50 dark:bg-rose-900/20 px-6 py-4 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-lg animate-pulse">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-black text-rose-900 dark:text-rose-100 text-sm uppercase tracking-wider">VP Attendance Review Queue</h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">Unexcused absences requiring escalation</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-black">
              {absentReviewQueue.length} PENDING
            </span>
          </div>
          <div className="divide-y divide-rose-50 dark:divide-rose-900/20">
            {absentReviewQueue.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-rose-600 font-black shadow-sm border border-rose-100 dark:border-rose-900/30">
                    {item.studentName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{item.studentName}</p>
                    <p className="text-xs text-slate-500 font-medium">Grade {item.grade} • Reported at {item.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAbsentReviewQueue(prev => prev.filter(q => q.id !== item.id))}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Check size={16} />
                    Pass (Excused)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Notifying parents of ${item.studentName}...`);
                      setAbsentReviewQueue(prev => prev.filter(q => q.id !== item.id));
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-100"
                  >
                    <Send size={16} />
                    Notify Parents
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isVP && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 shadow-2xl shadow-blue-500/5 dark:shadow-none overflow-hidden transition-all duration-500">
          <div className="p-8 border-b border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                  <UserCheck size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-blue-900 dark:text-blue-100">{t("attendance.staffCommandCenter","Staff Shortage Command Center")}</h3>
                  <p className="text-sm font-bold text-blue-600/70 dark:text-blue-400/70 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {staffAttendance.filter(t => t.status === 'Absent').length} ABSENT STAFF
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {staffAttendance.filter(t => t.status === 'Present').length} PRESENT
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={runProxyAnalysis}
                disabled={isProxyAnalysisRunning}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isProxyAnalysisRunning ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                {isProxyAnalysisRunning ? t('attendance.analyzing','Analyzing...') : t('attendance.autoMatchProxies','Auto-Match Proxies')}
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Absent Teachers List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t("attendance.currentlyMissing","Currently Missing")}</h4>
                  <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">{t("attendance.actionRequired","Action Required")}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {staffAttendance.filter(t => t.status === 'Absent').map((teacher) => (
                    <div key={teacher.id} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                            {teacher.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{teacher.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">{teacher.subjects[0] || teacher.department || 'Staff'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded text-[9px] font-black uppercase tracking-wider">Impact: {teacher.classes || 3} Classes</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAbsentTeacher(teacher); setShowSubModal(true); }}
                          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        >
                          Find Proxy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proxy Suggestions Panel */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t("attendance.proxyRecommendations","Proxy Recommendations")}</h4>
                  <span className="text-[10px] font-bold text-emerald-500">{t("attendance.liveAvailability","Live Availability")}</span>
                </div>

                <div className="min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 text-center bg-slate-50/50 dark:bg-slate-900/20">
                  {isProxyAnalysisRunning ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <Users size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Analyzing Schedule Matrix...</p>
                      <p className="text-xs text-slate-500">Matching subject expertise and free periods.</p>
                    </div>
                  ) : proxySuggestions.length > 0 ? (
                    <div className="w-full space-y-3">
                      {proxySuggestions.map((suggestion) => (
                        <div key={suggestion} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 text-white rounded-lg group-hover:rotate-12 transition-transform">
                              <CheckCircle size={18} />
                            </div>
                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{suggestion}</p>
                          </div>
                          <button type="button" className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest hover:underline">
                            Quick Assign
                          </button>
                        </div>
                      ))}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
                        Analysis Complete • Subject Match: High
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto">
                        <Clock size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-500">{t("attendance.runAnalysis")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isVP && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("attendance.oversight","Attendance Oversight")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                {t("attendance.oversightSubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleAttendanceModeChange('student')}
                className={`px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${attendanceMode === 'student'
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {t("attendance.studentTab")}
              </button>
              <button
                type="button"
                onClick={() => handleAttendanceModeChange('staff')}
                className={`px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${attendanceMode === 'staff'
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {t("attendance.staffTab")}
              </button>
            </div>
          </div>

          {!attendanceMode && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">No attendance view selected yet.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Tap a mode above to load student or staff attendance details.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl p-6 bg-slate-50 dark:bg-slate-800/60">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("attendance.studentTab","Student Attendance")}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Review grade section attendance and save today’s roll.</p>
                </div>
                <div className="rounded-3xl p-6 bg-slate-50 dark:bg-slate-800/60">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("attendance.staffTab","Staff Attendance")}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Monitor teacher biometric sign-in/out and attendance status.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isVP && attendanceMode === 'student' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("attendance.studentTab","Student Attendance")}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-bold text-sm">
              {t("attendance.attendanceReports", "Attendance Reports")}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const records = Object.entries(attendance).map(([studentId, status]) => ({
                    studentId,
                    status
                  }));
                  await api.post('/teacher/attendance', {
                    date: selectedDate,
                    attendanceRecords: records
                  });
                  alert('Attendance saved successfully!');
                } catch (error: any) {
                  alert('Failed to save attendance: ' + (error?.response?.data?.error?.message || error.message || 'Unknown error'));
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-100 dark:shadow-none">
              {t("attendance.saveTodayRecords", "Save Today's Records")}
            </button>
          </div>
        </div>
      )}

      {!isVP && attendanceMode === 'student' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label htmlFor="gradeSection" className="text-[10px] font-bold text-slate-500 uppercase">{t("attendance.selectGradeSection","Select Grade/Section")}</label>
              <div className="relative">
                <select
                  id="gradeSection"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all w-40"
                >
                  <option value="">-- {t("attendance.selectGradeOption", "Select Grade")} --</option>
                  {gradeStats.map((grade, idx) => (
                    <option key={idx} value={grade.grade}>{grade.grade}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="space-y-1">
              <label htmlFor="attendanceDate" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">{t("attendance.attendanceDateLabel","Attendance Date (Ethiopian)")}</label>
              <div className="flex flex-col gap-1 w-52">
                <EthiopianDatePicker
                  id="attendanceDate"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                  title="Select attendance date (Ethiopian calendar)"
                />
                <span className="text-[9px] text-slate-500 dark:text-slate-400">{formatEthDateStr(selectedDate)}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t("attendance.totalStudentsLabel","Total Students")}</label>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{students.length} Enrolled</p>
            </div>
          </div>

          {(role === 'teacher') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAll('present')}
                className="text-[10px] font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase tracking-wider"
              >
                {t("attendance.markAllPresent", "Mark All Present")}
              </button>
              <button
                type="button"
                onClick={() => markAll('absent')}
                className="text-[10px] font-bold text-rose-600 border border-rose-100 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors uppercase tracking-wider"
              >
                {t("attendance.markAllAbsent", "Mark All Absent")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Student Attendance Export Panel ── */}
      {!isVP && attendanceMode === 'student' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="studentExportStartDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("attendance.exportFrom", "Export From")}
            </label>
            <EthiopianDatePicker
              id="studentExportStartDate"
              value={studentExportStartDate}
              onChange={setStudentExportStartDate}
              placeholder="YYYY-MM-DD"
              title="Select start date for student export (Ethiopian calendar)"
            />
          </div>

          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="studentExportEndDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("attendance.exportTo", "Export To")}
            </label>
            <EthiopianDatePicker
              id="studentExportEndDate"
              value={studentExportEndDate}
              onChange={setStudentExportEndDate}
              placeholder="YYYY-MM-DD"
              title="Select end date for student export (Ethiopian calendar)"
            />
          </div>

          <div className="w-full sm:w-auto">
            <button
              id="exportStudentAttendanceBtn"
              onClick={handleExportStudentAttendance}
              disabled={isStudentExporting || !studentExportStartDate || !studentExportEndDate}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-white transition-colors
                ${isStudentExporting || !studentExportStartDate || !studentExportEndDate
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                }`}
            >
              {isStudentExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t("attendance.exportStudentCsv", "Export Student CSV")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!isVP && attendanceMode === 'student' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            {isAdmin ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("attendance.colGradeSection","Grade/Section")}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colEnrollment","Enrollment")}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colPresentToday","Present Today")}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t("attendance.colAttendanceRate","Attendance Rate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {gradeStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                            {stat.badgeNumber}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{stat.grade}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">{stat.enrollment} Students</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">{stat.present} Students</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stat.percentage}</span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, no-inline-styles */}
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.percentageNumeric}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("attendance.colStudentIdentity","Student Identity")}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colStatus", "Status")}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t("attendance.colLast30Days","Last 30 Days")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                            {student.name[0]}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(student.id, 'present')}
                            className={`p-2 rounded-lg border transition-all ${attendance[student.id] === 'present'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                              }`}
                            title="Present"
                            aria-label="Mark present"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(student.id, 'absent')}
                            className={`p-2 rounded-lg border transition-all ${attendance[student.id] === 'absent'
                              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-500'
                              }`}
                            title="Absent"
                            aria-label="Mark absent"
                          >
                            <XCircle size={20} />
                          </button>

                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {studentAttendanceHistory[student.id]?.attendance_percentage ?? '-'}%
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, no-inline-styles */}
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${studentAttendanceHistory[student.id]?.attendance_percentage ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!isVP && attendanceMode === 'staff' && (
        <div className="space-y-6">

          {/* Staff Attendance: Date Picker + Save Button */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label htmlFor="staffAttendanceDate" className="text-[10px] font-bold text-slate-500 uppercase">{t("attendance.viewDate","View Date (Ethiopian Calendar)")}</label>
                <div className="flex flex-col gap-1 w-52">
                  <EthiopianDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="YYYY-MM-DD"
                    title="Select staff attendance date (Ethiopian calendar)"
                  />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">{formatEthDateStr(selectedDate)}</span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t("attendance.totalStaff")}</label>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{staffAttendance.length} {t("attendance.members")}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t("attendance.presentStaff")}</label>
                <p className="text-sm font-bold text-emerald-600">{staffSummary.present} {t("attendance.staffLabel")}</p>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                id="saveStaffAttendanceBtn"
                onClick={handleSaveAllStaffAttendance}
                disabled={staffSaving || staffAttendance.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-100 dark:shadow-none transition-all"
              >
                {staffSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <><Check size={14} /> {t("attendance.saveAttendanceRecords")}</>
                )}
              </button>
            )}
          </div>
          {/* Export Report Container */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="exportStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t("attendance.startDate")}
              </label>
              <EthiopianDatePicker
                id="exportStartDate"
                value={exportStartDate}
                onChange={setExportStartDate}
                placeholder="YYYY-MM-DD"
                title="Select start date for export (Ethiopian calendar)"
              />
            </div>

            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="exportEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t("attendance.endDate")}
              </label>
              <EthiopianDatePicker
                id="exportEndDate"
                value={exportEndDate}
                onChange={setExportEndDate}
                placeholder="YYYY-MM-DD"
                title="Select end date for export (Ethiopian calendar)"
              />
            </div>

            <div className="w-full sm:w-auto">
              <button
                onClick={handleExportReport}
                disabled={isExporting || !exportStartDate || !exportEndDate}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-white transition-colors
        ${isExporting || !exportStartDate || !exportEndDate
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t("attendance.exportCsv")}
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t("attendance.teachersPresent")}</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{staffSummary.present}</p>
            </div>
            <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 dark:text-amber-400">{t("attendance.latePresent")}</p>
              <p className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">{staffSummary.late}</p>
              <p className="mt-1.5 text-[10px] font-bold text-amber-400 dark:text-amber-500/70 uppercase tracking-wider">{t("attendance.arrivedLateToday")}</p>
            </div>
            <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t("attendance.teachersAbsent")}</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{staffSummary.absent}</p>
            </div>
            <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t("attendance.pendingSignIn")}</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{staffSummary.pendingSignIn}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("attendance.staffBiometricTitle")}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {formatEthDateStr(selectedDate)} — {t("attendance.staffBiometricSubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: t("attendance.filterAll") },
                { value: 'present', label: t("attendance.filterPresent") },
                { value: 'absent', label: t("attendance.filterAbsent") },
                { value: 'pending', label: t("attendance.filterPending") },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStaffFilter(filter.value as 'all' | 'present' | 'absent' | 'pending')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${staffFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("attendance.colStaff","Staff Member")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">ZK ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colStatus", "Status")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colArrival", "Arrival")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colLunchOut","Lunch Out")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colLunchIn","Lunch In")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t("attendance.colDeparture", "Departure")}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t("attendance.colVerification", "Verification & Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading staff attendance...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                          {staffFilter === 'all'
                            ? 'No staff members found for this branch.'
                            : `No staff members with status "${staffFilter}" for this date.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                              {record.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{record.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {record.subjects && record.subjects.length > 0
                                  ? record.subjects.join(', ')
                                  : record.role ? record.role.replace('-', ' ').toUpperCase() : 'Staff'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                          {record.zkDeviceId ?? '--'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.2em]
                            ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                            ${record.status === 'Present (Late)' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : ''}
                            ${record.status === 'Half Day' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                            ${record.status === 'Late' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                            ${record.status === 'Absent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                            ${record.status === 'Pending' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : ''}
                            ${record.status === 'Weekend' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${record.status === 'Holiday' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : ''}
                          `}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{record.signInTime ?? '--:--'}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{record.lunchOutTime ?? '--:--'}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{record.lunchInTime ?? '--:--'}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{record.signOutTime ?? '--:--'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {record.isBiometric ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/20">
                                Biometric
                              </span>
                            ) : record.signInTime ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100 dark:border-amber-900/20">
                                Manual
                              </span>
                            ) : null}
                            {isAdmin && (
                              <button
                                onClick={() => setEditRecord(record)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors text-[10px] font-black uppercase tracking-wider"
                                title="Edit attendance manually"
                              >
                                <Pencil size={11} />
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Staff Substitution</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Rapid Proxy Teacher Assignment</p>
                </div>
              </div>
              <button type="button" aria-label="Close substitution modal" onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-700 dark:text-rose-400 font-black text-2xl shadow-inner">
                    {absentTeacher?.name[0]}
                  </div>
                  <div>
                    <p className="text-base font-black text-rose-900 dark:text-rose-100">{absentTeacher?.name}</p>
                    <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-widest mt-1">Reported Absent Today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Live Impact</p>
                  <p className="text-lg font-black text-rose-900 dark:text-rose-100">{absentTeacher?.classes} Classes</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Eligible Substitutes
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {staffAttendance.filter(t => t.status === 'Present' && t.role === 'teacher' && t.id !== absentTeacher?.id).map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                          {teacher.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{teacher.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{teacher.subjects.join(', ') || 'General'}</p>
                        </div>
                      </div>
                      <button type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all">
                        Assign Proxy
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Automated SMS & App notifications will be sent to parents and the assigned teacher.
              </p>
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <EditAttendanceModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSave={handleSaveManualAttendance}
          saving={editSaving}
        />
      )}
    </div>
  );
};

const EditAttendanceModal = ({
  record,
  onClose,
  onSave,
  saving
}: {
  record: StaffAttendanceRecord;
  onClose: () => void;
  onSave: (userId: string, date: string, formData: any) => Promise<void>;
  saving: boolean;
}) => {
  const to24h = (time12?: string): string => {
    if (!time12) return '';
    const parts = time12.split(' ');
    if (parts.length < 2) return '';
    const [timePart, meridiem] = parts;
    const [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${mStr}`;
  };

  const to12h = (time24: string): string => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const meridiem = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${meridiem}`;
  };

  const getCurrentTime24 = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const [signIn, setSignIn] = useState(to24h(record.signInTime) || getCurrentTime24());
  const [lunchOut, setLunchOut] = useState(to24h(record.lunchOutTime) || '');
  const [lunchIn, setLunchIn] = useState(to24h(record.lunchInTime) || '');
  const [signOut, setSignOut] = useState(to24h(record.signOutTime) || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, record.date || new Date().toISOString().split('T')[0], {
      sign_in_time: signIn ? to12h(signIn) : undefined,
      lunch_out_time: lunchOut ? to12h(lunchOut) : undefined,
      lunch_in_time: lunchIn ? to12h(lunchIn) : undefined,
      sign_out_time: signOut ? to12h(signOut) : undefined,
    });
  };

  const setFieldToNow = (field: string) => {
    const now24 = getCurrentTime24();
    if (field === 'signIn') setSignIn(now24);
    if (field === 'lunchOut') setLunchOut(now24);
    if (field === 'lunchIn') setLunchIn(now24);
    if (field === 'signOut') setSignOut(now24);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Manual Punch Entry</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight mt-0.5">{record.name} ({record.role?.replace('-', ' ').toUpperCase()})</p>
          </div>
          <button type="button" onClick={onClose} title="Close manual punch entry" aria-label="Close manual punch entry" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Arrival Time</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={signIn}
                  onChange={(e) => setSignIn(e.target.value)}
                  title="Arrival time"
                  aria-label="Arrival time"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFieldToNow('signIn')}
                  title="Set arrival time to now"
                  aria-label="Set arrival time to now"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors"
                >
                  Now
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lunch Out Time</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={lunchOut}
                  onChange={(e) => setLunchOut(e.target.value)}
                  title="Lunch out time"
                  aria-label="Lunch out time"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFieldToNow('lunchOut')}
                  title="Set lunch out time to now"
                  aria-label="Set lunch out time to now"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors"
                >
                  Now
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lunch In Time</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={lunchIn}
                  onChange={(e) => setLunchIn(e.target.value)}
                  title="Lunch in time"
                  aria-label="Lunch in time"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFieldToNow('lunchIn')}
                  title="Set lunch in time to now"
                  aria-label="Set lunch in time to now"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors"
                >
                  Now
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departure Time</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={signOut}
                  onChange={(e) => setSignOut(e.target.value)}
                  title="Departure time"
                  aria-label="Departure time"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFieldToNow('signOut')}
                  title="Set departure time to now"
                  aria-label="Set departure time to now"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors"
                >
                  Now
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Attendance'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
