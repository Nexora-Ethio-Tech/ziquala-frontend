import React from 'react';

export interface StudentProfileInfo {
  fullName?: string;
  name?: string;
  sex?: string;
  age?: string | number;
  birthDate?: string;
  birthPlace?: string;
  region?: string;
  town?: string;
  houseNo?: string;
  telNo?: string;
  phoneNo?: string;
  poBox?: string;
}

export interface TranscriptSubjectRow {
  name: string;
  mark?: string | number;
  grade?: string;
  // Year 1 columns
  year1Sem1?: string | number;
  year1Sem2?: string | number;
  year1Average?: string | number;
  // Year 2 columns
  year2Sem1?: string | number;
  year2Sem2?: string | number;
  year2Average?: string | number;
}

export interface TranscriptTemplateData {
  student?: StudentProfileInfo;
  name?: string;
  id?: string;
  academicYear?: string;
  semester?: string;
  year1Label?: string;
  year1Class?: string;
  year2Label?: string;
  year2Class?: string;
  subjects: TranscriptSubjectRow[];
  average?: string | number;
  rank?: string | number;
  year1OverallAverage?: string | number;
  year2OverallAverage?: string | number;
}

interface TranscriptTemplateProps {
  studentData: TranscriptTemplateData;
}

export const TranscriptTemplate = ({ studentData }: TranscriptTemplateProps) => {
  const student = studentData.student || {};
  const fullName = student.fullName || student.name || studentData.name || '';
  const sex = student.sex || '';
  const age = student.age || '';
  const birthDate = student.birthDate || '';
  const birthPlace = student.birthPlace || '';
  const region = student.region || '';
  const town = student.town || '';
  const houseNo = student.houseNo || '';
  const telNo = student.telNo || student.phoneNo || '';
  const poBox = student.poBox || '';

  const year1Label = studentData.year1Label || studentData.academicYear || '_______';
  const year1Class = studentData.year1Class || 'Grade 7';
  const year2Label = studentData.year2Label || '_______';
  const year2Class = studentData.year2Class || 'Grade 8';

  // Ensure subjects are sorted ALPHABETICALLY
  const sortedSubjects = [...(studentData.subjects || [])].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );

  const displaySubjects = sortedSubjects.length > 0 ? sortedSubjects : [
    { name: 'Amharic', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'Biology', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'Chemistry', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'English', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'Mathematics', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'Physics', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
    { name: 'Social Studies', year1Sem1: '', year1Sem2: '', year1Average: '', year2Sem1: '', year2Sem2: '', year2Average: '' },
  ];

  return (
    <div className="transcript-page w-full max-w-[210mm] mx-auto p-6 bg-white text-black font-serif shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full">
      
      {/* Title Header Banner */}
      <div className="text-center mb-6">
        <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase text-black font-serif border-b-2 border-black inline-block pb-1">
          ZIQUALA ABO MONASTERY PRIMARY SCHOOL STUDENT TRANSCRIPT SHEET
        </h1>
      </div>

      {/* Student Registration Demographic Info Box */}
      <div className="border border-black bg-gray-200 p-4 text-xs font-serif font-bold text-black space-y-3 mb-6">
        {/* Row 1: Full Name, Sex, Age */}
        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-6 flex items-baseline">
            <span className="whitespace-nowrap">Full Name:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-2 font-mono font-normal min-h-[18px]">
              {fullName || '__________________________'}
            </span>
          </div>
          <div className="col-span-3 flex items-baseline">
            <span className="whitespace-nowrap">Sex:-</span>
            <span className="flex-1 border-b border-black ml-1.5 text-center font-mono font-normal min-h-[18px]">
              {sex || '_____'}
            </span>
          </div>
          <div className="col-span-3 flex items-baseline">
            <span className="whitespace-nowrap">Age:-</span>
            <span className="flex-1 border-b border-black ml-1.5 text-center font-mono font-normal min-h-[18px]">
              {age || '_____'}
            </span>
          </div>
        </div>

        {/* Row 2: Birth date, Birth place, Region, Town */}
        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-4 flex items-baseline">
            <span className="whitespace-nowrap">Birth date:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {birthDate || '___________'}
            </span>
          </div>
          <div className="col-span-3 flex items-baseline">
            <span className="whitespace-nowrap">Birth place:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {birthPlace || '_______'}
            </span>
          </div>
          <div className="col-span-3 flex items-baseline">
            <span className="whitespace-nowrap">Region:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {region || '_______'}
            </span>
          </div>
          <div className="col-span-2 flex items-baseline">
            <span className="whitespace-nowrap">Town:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {town || '_______'}
            </span>
          </div>
        </div>

        {/* Row 3: House No., Tel.No., Po.Box */}
        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-4 flex items-baseline">
            <span className="whitespace-nowrap">House No.:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {houseNo || '___________'}
            </span>
          </div>
          <div className="col-span-5 flex items-baseline">
            <span className="whitespace-nowrap">Tel.No.:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {telNo || '___________________'}
            </span>
          </div>
          <div className="col-span-3 flex items-baseline">
            <span className="whitespace-nowrap">Po.Box:-</span>
            <span className="flex-1 border-b border-black ml-1.5 px-1 font-mono font-normal min-h-[18px]">
              {poBox || '_____________'}
            </span>
          </div>
        </div>
      </div>

      {/* Academic Table Matrix */}
      <div className="border border-black overflow-hidden mb-6">
        <table className="w-full text-left border-collapse font-serif text-xs">
          <thead>
            {/* Header Row 1: Subject | Year ____ Class ____ | Year ____ Class ____ */}
            <tr className="bg-gray-200 border-b border-black font-bold text-center">
              <th rowSpan={3} className="p-2 border-r border-black w-44 text-left font-black align-middle">
                Subject
              </th>
              <th colSpan={3} className="p-2 border-r border-black font-black">
                Year <span className="underline px-2">{year1Label}</span> Class <span className="underline px-2">{year1Class}</span>
              </th>
              <th colSpan={3} className="p-2 font-black">
                Year <span className="underline px-2">{year2Label}</span> Class <span className="underline px-2">{year2Class}</span>
              </th>
            </tr>
            {/* Header Row 2: Semister | Semister */}
            <tr className="bg-gray-200 border-b border-black font-bold text-center">
              <th colSpan={3} className="p-1 border-r border-black font-black">
                Semister
              </th>
              <th colSpan={3} className="p-1 font-black">
                Semister
              </th>
            </tr>
            {/* Header Row 3: I | II | Averege | I | II | Averege */}
            <tr className="bg-gray-200 border-b border-black font-bold text-center text-[11px]">
              <th className="p-1 border-r border-black w-16">I</th>
              <th className="p-1 border-r border-black w-16">II</th>
              <th className="p-1 border-r border-black w-20">Averege</th>
              <th className="p-1 border-r border-black w-16">I</th>
              <th className="p-1 border-r border-black w-16">II</th>
              <th className="p-1 w-20">Averege</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black text-center font-mono">
            {displaySubjects.map((sub: any, idx: number) => {
              const sem1_y1 = sub.year1Sem1 ?? (sub.mark !== undefined ? sub.mark : '');
              const sem2_y1 = sub.year1Sem2 ?? (sub.mark !== undefined ? sub.mark : '');
              const avg_y1 = sub.year1Average ?? (sub.mark !== undefined ? sub.mark : '');

              const sem1_y2 = sub.year2Sem1 ?? '';
              const sem2_y2 = sub.year2Sem2 ?? '';
              const avg_y2 = sub.year2Average ?? '';

              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 border-r border-black text-left font-serif font-bold text-gray-900">
                    {sub.name}
                  </td>
                  <td className="p-2 border-r border-black">{sem1_y1 || ''}</td>
                  <td className="p-2 border-r border-black">{sem2_y1 || ''}</td>
                  <td className="p-2 border-r border-black font-bold">{avg_y1 || ''}</td>
                  <td className="p-2 border-r border-black">{sem1_y2 || ''}</td>
                  <td className="p-2 border-r border-black">{sem2_y2 || ''}</td>
                  <td className="p-2 font-bold">{avg_y2 || ''}</td>
                </tr>
              );
            })}

            {/* Overall Average Summary Row */}
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td className="p-2 border-r border-black text-left font-serif">
                OVERALL AVERAGE
              </td>
              <td colSpan={2} className="p-2 border-r border-black text-right text-[10px] font-serif uppercase">Average:</td>
              <td className="p-2 border-r border-black font-extrabold text-blue-900">
                {studentData.year1OverallAverage ?? studentData.average ?? ''}
              </td>
              <td colSpan={2} className="p-2 border-r border-black text-right text-[10px] font-serif uppercase">Average:</td>
              <td className="p-2 font-extrabold text-blue-900">
                {studentData.year2OverallAverage ?? ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Signatures Footer */}
      <div className="grid grid-cols-2 gap-8 mt-10 pt-4 text-xs font-serif font-bold text-black">
        <div className="text-center space-y-6">
          <p className="uppercase">Record Officer / Registrar Signature</p>
          <div className="border-b border-black w-4/5 mx-auto"></div>
          <p className="text-[10px] font-normal italic">Date: ________________________</p>
        </div>
        <div className="text-center space-y-6">
          <p className="uppercase">Director / Vice Principal Signature & Stamp</p>
          <div className="border-b border-black w-4/5 mx-auto"></div>
          <p className="text-[10px] font-normal italic">Date: ________________________</p>
        </div>
      </div>

    </div>
  );
};

export default TranscriptTemplate;
