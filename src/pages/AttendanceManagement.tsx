import { uiError, uiText } from "../localization";
import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import * as attendanceService from '../services/attendanceService';
import classService from '../services/classService';
import studentService from '../services/studentService';
import { exportToCSV } from '../utils/exportUtils';
import { getTodayEthiopianDate, formatEthiopianLabel } from '../utils/ethiopianCalendar';

export const AttendanceManagement = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<attendanceService.AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayEthiopianDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      const data = Array.isArray(response) ? response : response.data || [];
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [studentsData, attendanceData] = await Promise.all([
        studentService.getStudentsByClass(selectedClass),
        attendanceService.default.getAttendanceByClass(selectedClass, selectedDate)
      ]);
      
      setStudents(studentsData);
      setAttendance(attendanceData);
      
      // Initialize local attendance state
      const localState: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
      attendanceData.forEach((record: attendanceService.AttendanceRecord) => {
        localState[record.studentId] = record.status;
      });
      setLocalAttendance(localState);
    } catch (err: any) {
      setError(uiError(err.response?.data?.message || 'Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const promises = students.map(student => {
        const status = localAttendance[student.id] || 'Absent';
        const existingRecord = attendance.find(a => a.studentId === student.id);
        
        if (existingRecord) {
          // Update existing record
          return attendanceService.default.updateAttendance(existingRecord.id, { status });
        } else {
          // Create new record
          const data: attendanceService.MarkAttendanceData = {
            studentId: student.id,
            classId: selectedClass,
            date: selectedDate,
            status
          };
          return attendanceService.default.markAttendance(data);
        }
      });
      
      await Promise.all(promises);
      await fetchStudentsAndAttendance();
      alert(uiText("Attendance saved successfully!"));
    } catch (err: any) {
      setError(uiError(err.response?.data?.message || 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAll = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const newState: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
    students.forEach(student => {
      newState[student.id] = status;
    });
    setLocalAttendance(newState);
  };

  const handleExport = () => {
    const dataToExport = students.map(student => ({
      StudentID: student.digitalId,
      Name: `${student.firstName} ${student.lastName}`,
      Date: selectedDate,
      Status: localAttendance[student.id] || 'Not Marked',
      Class: classes.find(c => c.id === selectedClass)?.name || ''
    }));
    exportToCSV(dataToExport, `Attendance_${selectedDate}`);
  };

  const stats = {
    total: students.length,
    present: Object.values(localAttendance).filter(s => s === 'Present').length,
    absent: Object.values(localAttendance).filter(s => s === 'Absent').length,
    late: Object.values(localAttendance).filter(s => s === 'Late').length,
    excused: Object.values(localAttendance).filter(s => s === 'Excused').length
  };

  if (loading && !students.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{uiText("Attendance Management")}</h1>
          <p className="text-gray-600">{uiText("Mark and track student attendance")}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-5 h-5" />{uiText("Export")}</button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uiText(saving ? 'Saving...' : 'Save Attendance')}
          </button>
        </div>
      </div>

      {uiText(error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {uiError(error)}
        </div>
      ))}

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{uiText("Select Class")}</label>
            <select
              title={uiText("Select class for attendance management")}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}{uiText(" - ")}{uiText(cls.section)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{uiText("Date")}</label>
            <input
              type="date"
              title={uiText("Select attendance date")}
              placeholder={uiText("Select date")}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMarkAll('Present')}
              className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
            >{uiText("All Present")}</button>
            <button
              onClick={() => handleMarkAll('Absent')}
              className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
            >{uiText("All Absent")}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{uiText("Total Students")}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{uiText("Present")}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{uiText("Absent")}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{uiText("Late")}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{uiText("Student")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{uiText("ID")}</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{uiText("Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                      {uiText(student.firstName[0])}{uiText(student.lastName[0])}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{uiText(student.firstName)} {uiText(student.lastName)}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{uiText(student.digitalId)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleStatusChange(student.id, 'Present')}
                      className={`p-2 rounded-lg border transition-all ${
                        localAttendance[student.id] === 'Present'
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500'
                      }`}
                      title={uiText("Present")}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'Absent')}
                      className={`p-2 rounded-lg border transition-all ${
                        localAttendance[student.id] === 'Absent'
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500'
                      }`}
                      title={uiText("Absent")}
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'Late')}
                      className={`p-2 rounded-lg border transition-all ${
                        localAttendance[student.id] === 'Late'
                          ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-500 hover:text-yellow-500'
                      }`}
                      title={uiText("Late")}
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'Excused')}
                      className={`p-2 rounded-lg border transition-all ${
                        localAttendance[student.id] === 'Excused'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500'
                      }`}
                      title={uiText("Excused")}
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{uiText("No students found in this class.")}</p>
        </div>
      )}
    </div>
  );
};
