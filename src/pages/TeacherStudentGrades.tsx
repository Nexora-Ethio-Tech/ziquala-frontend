import { uiError, uiText } from "../localization";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { ArrowLeft, Award, TrendingUp, BookOpen } from 'lucide-react';
import { getStudentAllGrades } from '../services/teacherService';

interface Course {
  courseId: string;
  courseName: string;
  courseCode: string;
  teacherId: string;
  teacherName: string;
  isMyCourse: boolean;
  grades: Array<{
    id: string;
    type: string;
    score: number;
    total: number;
    weight: string;
    percentage: number;
    createdAt: string;
  }>;
  totalScore: number;
  totalPossible: number;
  average: number;
  gradeCount: number;
}

interface StudentGradesData {
  student: {
    id: string;
    name: string;
    email: string;
    digitalId: string;
    grade: string;
    status: string;
  };
  myCourses: Course[];
  otherCourses: Course[];
  summary: {
    totalCourses: number;
    myCoursesCount: number;
    otherCoursesCount: number;
    totalGrades: number;
    overallAverage: number;
    myCoursesAverage: number;
    gradeStatus: string;
  };
}

export const TeacherStudentGrades = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentGrades();
    }
  }, [studentId]);

  const fetchStudentGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStudentAllGrades(studentId!);
      setData(response);
    } catch (err: any) {
      console.error('Failed to fetch student grades:', err);
      setError(uiError(err.response?.data?.error?.message || 'Failed to load student grades'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />{uiText("Back")}</button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {uiText(error || 'Student not found')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />{uiText("Back to Students")}</button>

      {/* Student Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.student.name}</h1>
            <p className="text-gray-600 mt-1">
              {uiText(data.student.digitalId)}{uiText(" • ")}{uiText(data.student.grade)}{uiText(" • ")}{uiText(data.student.status)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{data.student.email}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{uiText(data.summary.overallAverage.toFixed(1))}{uiText("%")}</div>
            <p className="text-sm text-gray-600">{uiText("Overall Average")}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              data.summary.gradeStatus === 'Passing' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {uiText(data.summary.gradeStatus)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalCourses}</p>
              <p className="text-sm text-gray-600">{uiText("Total Courses")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalGrades}</p>
              <p className="text-sm text-gray-600">{uiText("Total Grades")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{uiText(data.summary.myCoursesAverage.toFixed(1))}{uiText("%")}</p>
              <p className="text-sm text-gray-600">{uiText("My Courses Avg")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.summary.myCoursesCount}</p>
              <p className="text-sm text-gray-600">{uiText("My Courses")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Courses */}
      {data.myCourses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{uiText("My Courses")}</h2>
          <div className="space-y-4">
            {data.myCourses.map((course) => (
              <div key={course.courseId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{uiText(course.courseName)}</h3>
                      <p className="text-sm text-gray-600">{uiText(course.courseCode)}{uiText(" • ")}{uiText(course.teacherName)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{uiText(course.average.toFixed(1))}{uiText("%")}</div>
                      <p className="text-sm text-gray-600">{course.gradeCount}{uiText(" grades")}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Type")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Score")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Percentage")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Weight")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {course.grades.map((grade) => (
                        <tr key={grade.id}>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {uiText(grade.type)}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-900">{grade.score}{uiText("/")}{grade.total}</td>
                          <td className="py-3">
                            <span className={`font-bold ${
                              grade.percentage >= 80 ? 'text-green-600' :
                              grade.percentage >= 60 ? 'text-blue-600' :
                              grade.percentage >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {uiText(grade.percentage.toFixed(1))}{uiText("%")}</span>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{uiText(grade.weight)}{uiText("%")}</td>
                          <td className="py-3 text-sm text-gray-600">
                            {uiText(formatEthiopianLabel(grade.createdAt))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Courses */}
      {data.otherCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{uiText("Other Courses")}</h2>
          <div className="space-y-4">
            {data.otherCourses.map((course) => (
              <div key={course.courseId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{uiText(course.courseName)}</h3>
                      <p className="text-sm text-gray-600">{uiText(course.courseCode)}{uiText(" • ")}{uiText(course.teacherName)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-600">{uiText(course.average.toFixed(1))}{uiText("%")}</div>
                      <p className="text-sm text-gray-600">{course.gradeCount}{uiText(" grades")}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Type")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Score")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Percentage")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Weight")}</th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">{uiText("Date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {course.grades.map((grade) => (
                        <tr key={grade.id}>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                              {uiText(grade.type)}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-900">{grade.score}{uiText("/")}{grade.total}</td>
                          <td className="py-3">
                            <span className={`font-bold ${
                              grade.percentage >= 80 ? 'text-green-600' :
                              grade.percentage >= 60 ? 'text-blue-600' :
                              grade.percentage >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {uiText(grade.percentage.toFixed(1))}{uiText("%")}</span>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{uiText(grade.weight)}{uiText("%")}</td>
                          <td className="py-3 text-sm text-gray-600">
                            {uiText(formatEthiopianLabel(grade.createdAt))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.myCourses.length === 0 && data.otherCourses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{uiText("No grades found for this student.")}</p>
        </div>
      )}
    </div>
  );
};
