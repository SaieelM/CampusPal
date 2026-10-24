// Sample class pre-filled from the GBS "MCA Timetable Odd Semester AY 2026-27
// (version 2, effective 10 Aug 2026)" – Semester III. Times were read from a
// photo of the sheet, so the class creator should double-check them.
// Days: 1 = Monday … 6 = Saturday.

const S = (id, name, code, professor, type, elective, group) => ({
  id,
  name,
  code,
  professor,
  type,
  elective,
  group: elective ? group : '',
});

export const MCA_SEM3_SAMPLE = {
  name: 'MCA Sem III – AY 2026-27',
  course: 'MCA',
  semester: 3,
  academicYear: '2026-27',
  startDate: '2026-08-10',
  endDate: '',
  batches: ['Batch 1', 'Batch 2'],
  subjects: [
    S('tdd', 'TDD and Design Patterns', 'CSA-6000', 'Ramrao Wagh', 'theory', true, 'TDD and Design Patterns'),
    S('dataeng', 'Data Engineering', 'CSA-6004', 'Shounak Deshpande', 'theory', true, 'RSE3 – Data Engineering'),
    S('crypto', 'Cryptography and Network Security', 'CSA-6002', 'Gaurpriya Chodanker', 'theory', false),
    S('uiux', 'Design Thinking for UI/UX', 'CSA-6003', 'Ramrao Wagh', 'theory', false),
    S('devops', 'Modern Development Practices & DevOps', 'CSA-6006', 'Sanket Mhamal', 'theory', false),
    S('iot', 'Internet of Things', 'CSA-6401', 'Sarvesh Vellp', 'theory', true, 'DSVE1 – Internet of Things'),
    S('iotlab', 'Internet of Things', 'CSA-6401', 'Sarvesh Vellp', 'lab', true, 'DSVE1 – Internet of Things'),
    S('cloud', 'Cloud Computing', 'CSA-6402', 'Sanket Mhamal', 'theory', true, 'DSVE2 – Cloud Computing'),
    S('cloudlab', 'Cloud Computing', 'CSA-6402', 'Sanket Mhamal', 'lab', true, 'DSVE2 – Cloud Computing'),
    S('mad', 'Mobile Application Development', 'CSA-6403', 'Shounak Deshpande', 'theory', true, 'DSVE3 – Mobile Application Development'),
    S('madlab', 'Mobile Application Development', 'CSA-6403', 'Shounak Deshpande', 'lab', true, 'DSVE3 – Mobile Application Development'),
    S('eh', 'Ethical Hacking', 'CSA-6404', 'Ramdas Karmali', 'theory', true, 'DSVE4 – Ethical Hacking'),
    S('ehlab', 'Ethical Hacking', 'CSA-6404', 'Ramdas Karmali', 'lab', true, 'DSVE4 – Ethical Hacking'),
  ],
  versions: [
    {
      effectiveFrom: '2026-08-10',
      slots: [
        // Monday
        { id: 'm1', day: 1, start: '09:30', end: '11:30', subjectId: 'cloud', count: 1, batch: null, room: 'FF8' },
        { id: 'm2', day: 1, start: '11:30', end: '12:30', subjectId: 'uiux', count: 1, batch: null, room: 'FF8' },
        { id: 'm3', day: 1, start: '13:30', end: '17:00', subjectId: 'cloudlab', count: 1, batch: 'Batch 1', room: 'CG10' },
        { id: 'm4', day: 1, start: '13:30', end: '17:00', subjectId: 'iotlab', count: 1, batch: 'Batch 2', room: 'CS9' },
        // Tuesday
        { id: 't1', day: 2, start: '09:30', end: '11:30', subjectId: 'devops', count: 1, batch: null, room: 'FF8' },
        { id: 't2', day: 2, start: '11:30', end: '12:30', subjectId: null, label: 'Mentoring', count: 1, batch: null, room: '' },
        { id: 't3', day: 2, start: '13:30', end: '17:00', subjectId: 'cloudlab', count: 1, batch: 'Batch 2', room: 'CG10' },
        { id: 't4', day: 2, start: '13:30', end: '17:00', subjectId: 'iotlab', count: 1, batch: 'Batch 1', room: 'CS9' },
        // Wednesday
        { id: 'w1', day: 3, start: '10:00', end: '12:00', subjectId: 'tdd', count: 1, batch: null, room: 'GF5' },
        { id: 'w2', day: 3, start: '10:00', end: '12:00', subjectId: 'dataeng', count: 1, batch: null, room: 'CS9' },
        { id: 'w3', day: 3, start: '13:00', end: '14:30', subjectId: 'iot', count: 1, batch: null, room: 'GF5' },
        { id: 'w4', day: 3, start: '15:00', end: '16:30', subjectId: 'crypto', count: 1, batch: null, room: 'GF5' },
        // Thursday
        { id: 'h1', day: 4, start: '09:30', end: '11:30', subjectId: 'mad', count: 1, batch: null, room: 'GF5' },
        { id: 'h2', day: 4, start: '11:30', end: '12:30', subjectId: 'uiux', count: 1, batch: null, room: 'FF8' },
        { id: 'h3', day: 4, start: '13:30', end: '17:00', subjectId: 'madlab', count: 1, batch: null, room: 'CS9' },
        { id: 'h4', day: 4, start: '13:30', end: '17:00', subjectId: 'ehlab', count: 1, batch: null, room: 'CS1' },
        // Friday
        { id: 'f1', day: 5, start: '09:30', end: '11:30', subjectId: 'crypto', count: 1, batch: null, room: 'GF3' },
        { id: 'f2', day: 5, start: '11:30', end: '13:30', subjectId: 'eh', count: 1, batch: null, room: 'GF5' },
        { id: 'f3', day: 5, start: '14:30', end: '16:30', subjectId: 'uiux', count: 1, batch: null, room: 'GF5' },
      ],
    },
  ],
};
