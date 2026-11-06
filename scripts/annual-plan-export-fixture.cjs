module.exports = {
  id: '00000000-0000-4000-8000-000000000201', teacher_id: '00000000-0000-4000-8000-000000000012',
  teacher_name: 'ALAN', subject: 'Science', grade: 'Grade 7', academic_year: '2018 E.C.', status: 'Approved',
  periods_week: 4, working_days_year: 180, periods_year: 160, duration_period: '45 minutes',
  items: [
    { semester: '1st Semester', month: 'September', week: 1, date: '2018-01-05', pageRef: '1–4', unit: 'Unit 1',
      topicContent: 'የተፈጥሮ ሳይንስ ትምህርት', subContent: 'ሕይወት ያላቸው ነገሮች', noOfSessions: 4,
      learningOutcome: 'ተማሪዎች ይለያሉ', significanceSubject: 'የትምህርቱ ጠቀሜታ', priorCompetency: 'ቀደም ያለ እውቀት',
      instructionalMaterials: 'ሥዕሎች እና መጻሕፍት', teachingMethodology: 'ውይይት እና ማብራሪያ', classroomManagement: 'የቡድን ሥራ',
      evaluation: 'የቃል ጥያቄዎች', remark: 'የመጀመሪያ ሳምንት' },
    { month: 'September', week: 2, chapter_unit: 'Unit 2', main_content: 'Main legacy content', sub_content: 'Sub legacy content',
      no_of_sessions: 0, learning_outcome: 'Competence legacy', teaching_methodology: 'Method legacy',
      instructional_materials: 'Aid legacy', classroom_management: 'Management legacy', evaluation: 'Evaluation legacy', remarks: 'Remark legacy' },
    { semester: '2nd Semester', month: 'February', week: 1, unit: 'Unit 3', mainContent: 'Main & <content>', subContent: 'Sub content',
      noOfPeriods: 3, competence: 'Competence', method: 'Demonstration', aids: 'ማስተማሪያ መሣሪያዎች '.repeat(20),
      assessment: ['Written test', 'Observation'], remark: '=A1+1' },
    { semester: '2nd Semester', month: 'February', week: 2, topicContent: '', noOfSessions: '', evaluation: '' },
  ],
};
