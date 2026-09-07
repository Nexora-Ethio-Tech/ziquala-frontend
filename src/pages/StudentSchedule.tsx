import { uiError, uiText } from "../localization";
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { getMySchedule, StudentSchedule } from '../services/studentPortalService';

const StudentSchedulePage: React.FC = () => {
  const [schedule, setSchedule] = useState<StudentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(uiText(""));
      const data = await getMySchedule();
      setSchedule(data);
    } catch (err: any) {
      setError(uiError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDay = (day: string) => {
    return schedule.filter(s => s.day === day).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{uiText("My Schedule")}</h1>
        <p className="text-gray-600 mt-1">{uiText("Your weekly class timetable")}</p>
      </div>

      {uiText(error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {uiError(error)}
        </div>
      ))}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{uiText("Time")}</th>
                  {days.map(day => (
                    <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {uiText(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from(new Set(schedule.map(s => s.timeSlot))).sort().map(timeSlot => (
                  <tr key={timeSlot}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {uiText(timeSlot)}
                      </div>
                    </td>
                    {days.map(day => {
                      const session = getScheduleForDay(day).find(s => s.timeSlot === timeSlot);
                      return (
                        <td key={day} className="px-6 py-4">
                          {session ? (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-gray-900">{uiText(session.subject)}</p>
                              <p className="text-xs text-gray-600 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {uiText(session.teacher)}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {uiText(session.room)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{uiText("-")}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSchedulePage;
