import React from 'react';
import logo from '../assets/logo.jpg';

export interface TranscriptSubjectRow {
  name: string;
  mark: string | number;
  grade: string;
}

export interface TranscriptTemplateData {
  name: string;
  id: string;
  academicYear: string;
  semester: string;
  subjects: TranscriptSubjectRow[];
  average: string | number;
  rank: string | number;
}

interface TranscriptTemplateProps {
  studentData: TranscriptTemplateData;
}

export const TranscriptTemplate = ({ studentData }: TranscriptTemplateProps) => {
  const subjects = studentData.subjects.length > 0
    ? studentData.subjects
    : [{ name: 'No grades found', mark: 0, grade: '0' }];

  const rank = studentData.rank ?? 0;

  // Calculate total sum from all subjects
  const totalSum = subjects.length > 0 && subjects[0].name !== 'No grades found'
    ? subjects.reduce((sum, s) => sum + Number(s.mark || 0), 0)
    : 0;

  // Calculate class average from all subjects
  const classAverage = subjects.length > 0 && subjects[0].name !== 'No grades found'
    ? Math.round(
      subjects.reduce((sum, s) => sum + Number(s.mark || 0), 0) / subjects.length
    )
    : 0;

  return (
    <div className="transcript-page w-full max-w-[95vw] sm:max-w-[148mm] mx-auto p-6 bg-white text-gray-900 border-2 border-double border-gray-300 shadow-2xl print:shadow-none print:border-0 print:p-4 print:w-[210mm] print:h-[297mm] print:m-0 print:overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col items-center mb-8 border-b-4 border-blue-900 pb-6">
        <img src={logo} alt="Ziquala Abo School logo" className="w-32 h-32 mb-4 object-contain" />
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-wider text-center">MANA BARNOOTA ZUQAALAA AABBOO</h1>
        <h2 className="text-xl font-semibold text-gray-700 text-center">ZIQUALA ABO SCHOOL</h2>
        <p className="mt-2 text-sm italic font-medium text-center">"Excellence in Education & Integrity"</p>
      </div>

      {/* Student Information Section */}
      <div className="grid grid-cols-2 gap-4 mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Student Name</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{studentData.name || 'N/A'}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Academic Year</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{studentData.academicYear || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Semester</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{studentData.semester || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Academic Subjects Table */}
      <div className="mb-8">
        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-3 border-b-2 border-blue-900 pb-2">Academic Performance</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-blue-900 text-white uppercase text-xs">
              <th className="p-3 border border-blue-800 font-bold">Subject</th>
              <th className="p-3 border border-blue-800 font-bold text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, index) => (
              <tr
                key={`${subject.name}-${index}`}
                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
              >
                <td className="p-3 border border-gray-300 font-semibold text-gray-800">{subject.name}</td>
                <td className="p-3 border border-gray-300 text-center font-bold text-gray-900">{subject.mark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">Average</p>
          <p className="text-3xl font-extrabold text-blue-900">{classAverage}%</p>
        </div>
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2">Total Score</p>
          <p className="text-3xl font-extrabold text-indigo-900">{totalSum}</p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <p className="text-xs font-black text-purple-700 uppercase tracking-widest mb-2">Class Rank</p>
          <p className="text-3xl font-extrabold text-purple-900">{rank}</p>
        </div>
      </div>

      {/* Principal Signature Section */}
      <div className="border-t-4 border-blue-900 pt-6">
        <div className="text-center w-48 ml-auto">
          <div className="h-16 border-b-2 border-gray-400 mb-3"></div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Principal Signature</p>
          <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
        <p>This is an official school transcript. For inquiries, contact the Academic Office.</p>
      </div>
    </div>
  );
};

export default TranscriptTemplate;
