// ==========================================================
// Chandigarh University - Student Result Management System
// Database Access & Grading Business Logic
// Powered by Node.js built-in SQLite (DatabaseSync)
// With fallback to persistent JSON storage for universal compatibility
// ==========================================================

const path = require('node:path');
const fs = require('node:fs');

const DB_FILE = path.join(__dirname, 'results.db');
let dbInstance = null;
let useJsonFallback = false;
let memoryStore = {
  students: [],
  subjects: [],
  marks: [],
  audit_logs: []
};

// ----------------------------------------------------------
// 1. Grading Algorithm (Chandigarh University / UGC CBCS 10-Point Scale)
// ----------------------------------------------------------
function calculateGrade(internal, external) {
  const total = Number(internal) + Number(external);
  let grade = 'F';
  let gradePoint = 0;
  let status = 'FAIL';

  // Passing criteria: Minimum 40% aggregate and 35% in end-term external
  const passed = total >= 40 && external >= 25 && internal >= 10;

  if (passed) {
    status = 'PASS';
    if (total >= 90) {
      grade = 'O';
      gradePoint = 10;
    } else if (total >= 80) {
      grade = 'A+';
      gradePoint = 9;
    } else if (total >= 70) {
      grade = 'A';
      gradePoint = 8;
    } else if (total >= 60) {
      grade = 'B+';
      gradePoint = 7;
    } else if (total >= 50) {
      grade = 'B';
      gradePoint = 6;
    } else {
      grade = 'C';
      gradePoint = 5;
    }
  } else {
    grade = 'F';
    gradePoint = 0;
    status = 'FAIL';
  }

  return { total, grade, gradePoint, status };
}

// ----------------------------------------------------------
// 2. Initialize Database Connection
// ----------------------------------------------------------
function initDB() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(DB_FILE);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    createTables();
    seedInitialData();
    console.log('[DB] Connected successfully to Chandigarh University SQLite database via node:sqlite');
  } catch (err) {
    console.warn('[DB] Falling back to persistent JSON engine.');
    useJsonFallback = true;
    initJsonStore();
  }
}

function createTables() {
  if (useJsonFallback) return;

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS students (
      roll_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      branch TEXT NOT NULL,
      semester INTEGER NOT NULL,
      section TEXT DEFAULT 'A',
      avatar_seed TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 4,
      semester INTEGER NOT NULL DEFAULT 6,
      max_internal INTEGER DEFAULT 30,
      max_external INTEGER DEFAULT 70
    );

    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      semester INTEGER NOT NULL,
      internal_marks INTEGER NOT NULL,
      external_marks INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      grade TEXT NOT NULL,
      grade_point INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(roll_no) REFERENCES students(roll_no) ON DELETE CASCADE,
      FOREIGN KEY(subject_code) REFERENCES subjects(code) ON DELETE CASCADE,
      UNIQUE(roll_no, subject_code, semester)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ----------------------------------------------------------
// 3. Chandigarh University Reference Curriculum & Sample Dataset
// ----------------------------------------------------------
const SAMPLE_SUBJECTS = [
  { code: 'CA601', name: 'Advanced Internet Programming', credits: 4, semester: 6 },
  { code: 'CA602', name: 'Cloud Computing & Microservices', credits: 4, semester: 6 },
  { code: 'CA603', name: 'Distributed Database Systems', credits: 3, semester: 6 },
  { code: 'CA604', name: 'Design & Analysis of Algorithms', credits: 4, semester: 6 },
  { code: 'CA605', name: 'Machine Learning & Analytics', credits: 3, semester: 6 },
  { code: 'CA606', name: 'Internet Programming Lab', credits: 2, semester: 6 }
];

const SAMPLE_STUDENTS = [
  { roll_no: '26MCI10158', name: 'Ramana Sharma', email: '26mci10158@cuchd.in', branch: 'Computer Applications', semester: 6, section: 'A' },
  { roll_no: '26MCI10159', name: 'Amanpreet Singh', email: '26mci10159@cuchd.in', branch: 'Computer Applications', semester: 6, section: 'A' },
  { roll_no: '26MCI10160', name: 'Gurpreet Kaur', email: '26mci10160@cuchd.in', branch: 'Computer Applications', semester: 6, section: 'A' },
  { roll_no: '26MCI10161', name: 'Rohan Verma', email: '26mci10161@cuchd.in', branch: 'Computer Science', semester: 6, section: 'B' },
  { roll_no: '26MCI10162', name: 'Diya Patel', email: '26mci10162@cuchd.in', branch: 'Computer Science', semester: 6, section: 'B' },
  { roll_no: '26MCI10163', name: 'Kavya Nair', email: '26mci10163@cuchd.in', branch: 'Information Technology', semester: 6, section: 'A' },
  { roll_no: '26MCI10164', name: 'Siddharth Rao', email: '26mci10164@cuchd.in', branch: 'Information Technology', semester: 6, section: 'A' },
  { roll_no: '26MCI10165', name: 'Aditya Gupta', email: '26mci10165@cuchd.in', branch: 'Computer Applications', semester: 6, section: 'B' }
];

// Realistic marks matrix for Chandigarh University students
const SAMPLE_SCORES = {
  '26MCI10158': [ [29, 68], [30, 67], [29, 68], [30, 69], [29, 67], [30, 70] ], // 9.8+ Rank 1 (Outstanding Topper)
  '26MCI10159': [ [28, 64], [27, 63], [28, 64], [28, 66], [27, 62], [28, 68] ], // 9.2+ Rank 2
  '26MCI10160': [ [26, 60], [25, 59], [27, 61], [27, 63], [26, 58], [28, 65] ], // 8.7+ Rank 3
  '26MCI10161': [ [25, 56], [24, 52], [26, 58], [25, 54], [24, 53], [27, 62] ], // 8.0 First Class
  '26MCI10162': [ [23, 50], [22, 48], [24, 51], [23, 49], [22, 47], [25, 58] ], // 7.3 First Class
  '26MCI10163': [ [22, 45], [21, 44], [23, 46], [20, 42], [22, 43], [24, 54] ], // 6.6 Second Class
  '26MCI10164': [ [27, 62], [26, 61], [28, 63], [27, 60], [26, 59], [28, 66] ], // 8.8 Distinction
  '26MCI10165': [ [18, 32], [14, 20], [19, 34], [17, 30], [16, 28], [20, 45] ]  // CA602 Arrear/Fail demo
};

function seedInitialData() {
  if (useJsonFallback) return;

  const countRow = dbInstance.prepare("SELECT COUNT(*) as count FROM students WHERE roll_no LIKE '26MCI%'").get();
  if (countRow.count > 0) {
    return; // Already seeded with Chandigarh University dataset
  }

  console.log('[DB] Seeding Chandigarh University records with 26MCI10158...');
  dbInstance.exec('DELETE FROM marks; DELETE FROM students; DELETE FROM subjects;');

  const insertSubject = dbInstance.prepare(`
    INSERT OR IGNORE INTO subjects (code, name, credits, semester, max_internal, max_external)
    VALUES (?, ?, ?, ?, 30, 70)
  `);

  for (const s of SAMPLE_SUBJECTS) {
    insertSubject.run(s.code, s.name, s.credits, s.semester);
  }

  const insertStudent = dbInstance.prepare(`
    INSERT INTO students (roll_no, name, email, branch, semester, section, avatar_seed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMark = dbInstance.prepare(`
    INSERT INTO marks (roll_no, subject_code, semester, internal_marks, external_marks, total_marks, grade, grade_point, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const stu of SAMPLE_STUDENTS) {
    insertStudent.run(stu.roll_no, stu.name, stu.email, stu.branch, stu.semester, stu.section, stu.name.toLowerCase().replace(/\s+/g, '-'));

    const scores = SAMPLE_SCORES[stu.roll_no] || [ [20, 50], [20, 50], [20, 50], [20, 50], [20, 50], [20, 50] ];
    SAMPLE_SUBJECTS.forEach((sub, idx) => {
      const [intM, extM] = scores[idx];
      const res = calculateGrade(intM, extM);
      insertMark.run(stu.roll_no, sub.code, sub.semester, intM, extM, res.total, res.grade, res.gradePoint, res.status);
    });
  }

  const insertAudit = dbInstance.prepare(`
    INSERT INTO audit_logs (action, details) VALUES (?, ?)
  `);
  insertAudit.run('SYSTEM_INIT', 'Seeded Chandigarh University result ledger with roll series 26MCI10158.');
  console.log('[DB] Chandigarh University Seeding completed.');
}

// ----------------------------------------------------------
// 4. JSON Fallback Engine
// ----------------------------------------------------------
const JSON_FILE = path.join(__dirname, 'results_store.json');

function initJsonStore() {
  if (fs.existsSync(JSON_FILE)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      return;
    } catch (e) {}
  }

  memoryStore.subjects = [...SAMPLE_SUBJECTS];
  memoryStore.students = SAMPLE_STUDENTS.map(s => ({
    ...s,
    avatar_seed: s.name.toLowerCase().replace(/\s+/g, '-'),
    created_at: new Date().toISOString()
  }));

  memoryStore.marks = [];
  for (const stu of SAMPLE_STUDENTS) {
    const scores = SAMPLE_SCORES[stu.roll_no];
    SAMPLE_SUBJECTS.forEach((sub, idx) => {
      const [intM, extM] = scores[idx];
      const res = calculateGrade(intM, extM);
      memoryStore.marks.push({
        id: memoryStore.marks.length + 1,
        roll_no: stu.roll_no,
        subject_code: sub.code,
        semester: sub.semester,
        internal_marks: intM,
        external_marks: extM,
        total_marks: res.total,
        grade: res.grade,
        grade_point: res.gradePoint,
        status: res.status
      });
    });
  }
  memoryStore.audit_logs = [
    { id: 1, action: 'SYSTEM_INIT', details: 'Initialized Chandigarh University JSON ledger', timestamp: new Date().toISOString() }
  ];
  saveJsonStore();
}

function saveJsonStore() {
  if (!useJsonFallback) return;
  fs.writeFileSync(JSON_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
}

// ----------------------------------------------------------
// 5. Query & Operations API
// ----------------------------------------------------------
function getSubjects() {
  if (useJsonFallback) return memoryStore.subjects;
  return dbInstance.prepare('SELECT * FROM subjects ORDER BY code ASC').all();
}

function getAllStudentsSummary() {
  let students, marksList, subjects;
  if (useJsonFallback) {
    students = memoryStore.students;
    marksList = memoryStore.marks;
    subjects = memoryStore.subjects;
  } else {
    students = dbInstance.prepare('SELECT * FROM students ORDER BY roll_no ASC').all();
    marksList = dbInstance.prepare('SELECT * FROM marks').all();
    subjects = dbInstance.prepare('SELECT * FROM subjects').all();
  }

  const subjectMap = new Map();
  subjects.forEach(s => subjectMap.set(s.code, s));

  const studentSummaries = students.map(student => {
    const stMarks = marksList.filter(m => m.roll_no === student.roll_no);
    let totalCredits = 0;
    let earnedPoints = 0;
    let totalMarks = 0;
    let maxPossibleMarks = 0;
    let arrears = 0;

    stMarks.forEach(m => {
      const sub = subjectMap.get(m.subject_code);
      const credits = sub ? sub.credits : 4;
      totalCredits += credits;
      earnedPoints += (credits * m.grade_point);
      totalMarks += m.total_marks;
      maxPossibleMarks += 100;
      if (m.status === 'FAIL') arrears++;
    });

    const sgpa = totalCredits > 0 ? Number((earnedPoints / totalCredits).toFixed(2)) : 0;
    const percentage = maxPossibleMarks > 0 ? Number(((totalMarks / maxPossibleMarks) * 100).toFixed(1)) : 0;

    let standing = 'PASS';
    if (arrears > 0) {
      standing = 'REAPPEAR';
    } else if (sgpa >= 8.5) {
      standing = 'DISTINCTION';
    } else if (sgpa >= 7.0) {
      standing = 'FIRST CLASS';
    } else if (sgpa >= 5.5) {
      standing = 'SECOND CLASS';
    }

    return {
      ...student,
      total_subjects: stMarks.length,
      total_marks: totalMarks,
      max_marks: maxPossibleMarks,
      percentage: percentage,
      sgpa: sgpa,
      arrears: arrears,
      standing: standing
    };
  });

  studentSummaries.sort((a, b) => {
    if (b.sgpa !== a.sgpa) return b.sgpa - a.sgpa;
    return b.total_marks - a.total_marks;
  });

  studentSummaries.forEach((st, idx) => {
    st.rank = idx + 1;
  });

  return studentSummaries;
}

function getStudentDetails(rollNo) {
  let student, marksList, subjects;
  rollNo = rollNo.trim().toUpperCase();

  if (useJsonFallback) {
    student = memoryStore.students.find(s => s.roll_no.toUpperCase() === rollNo);
    if (!student) return null;
    marksList = memoryStore.marks.filter(m => m.roll_no.toUpperCase() === rollNo);
    subjects = memoryStore.subjects;
  } else {
    student = dbInstance.prepare('SELECT * FROM students WHERE UPPER(roll_no) = ?').get(rollNo);
    if (!student) return null;
    marksList = dbInstance.prepare('SELECT * FROM marks WHERE UPPER(roll_no) = ?').all(rollNo);
    subjects = dbInstance.prepare('SELECT * FROM subjects').all();
  }

  const subjectMap = new Map();
  subjects.forEach(s => subjectMap.set(s.code, s));

  let totalCredits = 0;
  let earnedPoints = 0;
  let totalMarks = 0;
  let maxPossibleMarks = 0;
  let arrears = 0;

  const subjectsWithMarks = marksList.map(m => {
    const sub = subjectMap.get(m.subject_code) || { name: 'Course', credits: 4 };
    totalCredits += sub.credits;
    earnedPoints += (sub.credits * m.grade_point);
    totalMarks += m.total_marks;
    maxPossibleMarks += 100;
    if (m.status === 'FAIL') arrears++;

    return {
      subject_code: m.subject_code,
      subject_name: sub.name,
      credits: sub.credits,
      semester: m.semester,
      internal_marks: m.internal_marks,
      external_marks: m.external_marks,
      total_marks: m.total_marks,
      grade: m.grade,
      grade_point: m.grade_point,
      status: m.status
    };
  });

  const sgpa = totalCredits > 0 ? Number((earnedPoints / totalCredits).toFixed(2)) : 0;
  const percentage = maxPossibleMarks > 0 ? Number(((totalMarks / maxPossibleMarks) * 100).toFixed(1)) : 0;

  let standing = 'PASS';
  if (arrears > 0) {
    standing = 'REAPPEAR';
  } else if (sgpa >= 8.5) {
    standing = 'DISTINCTION';
  } else if (sgpa >= 7.0) {
    standing = 'FIRST CLASS';
  } else if (sgpa >= 5.5) {
    standing = 'SECOND CLASS';
  }

  const allSummaries = getAllStudentsSummary();
  const foundSummary = allSummaries.find(s => s.roll_no.toUpperCase() === rollNo);
  const rank = foundSummary ? foundSummary.rank : '-';

  const classSubjectAverages = {};
  subjects.forEach(sub => {
    const allMarksForSub = (useJsonFallback ? memoryStore.marks : dbInstance.prepare('SELECT total_marks FROM marks WHERE subject_code = ?').all(sub.code))
      .map(row => row.total_marks);
    const avg = allMarksForSub.length > 0 
      ? Number((allMarksForSub.reduce((acc, v) => acc + v, 0) / allMarksForSub.length).toFixed(1))
      : 0;
    classSubjectAverages[sub.code] = avg;
  });

  return {
    student: {
      ...student,
      sgpa,
      percentage,
      total_marks: totalMarks,
      max_marks: maxPossibleMarks,
      standing,
      arrears,
      rank,
      total_class_size: allSummaries.length
    },
    marks: subjectsWithMarks,
    class_averages: classSubjectAverages
  };
}

function saveStudent(data) {
  const { roll_no, name, email, branch, semester = 6, section = 'A' } = data;
  if (!roll_no || !name || !email || !branch) {
    throw new Error('roll_no, name, email, and branch are mandatory.');
  }

  const cleanRoll = roll_no.trim().toUpperCase();
  const avatar_seed = name.toLowerCase().replace(/\s+/g, '-');

  if (useJsonFallback) {
    const existingIdx = memoryStore.students.findIndex(s => s.roll_no.toUpperCase() === cleanRoll);
    if (existingIdx >= 0) {
      memoryStore.students[existingIdx] = {
        ...memoryStore.students[existingIdx],
        name, email, branch, semester: Number(semester), section, avatar_seed
      };
    } else {
      memoryStore.students.push({
        roll_no: cleanRoll, name, email, branch, semester: Number(semester), section, avatar_seed,
        created_at: new Date().toISOString()
      });
    }
    saveJsonStore();
  } else {
    const upsert = dbInstance.prepare(`
      INSERT INTO students (roll_no, name, email, branch, semester, section, avatar_seed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(roll_no) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        branch = excluded.branch,
        semester = excluded.semester,
        section = excluded.section,
        avatar_seed = excluded.avatar_seed
    `);
    upsert.run(cleanRoll, name, email, branch, Number(semester), section, avatar_seed);
  }

  logAudit('SAVE_STUDENT', `Created/Updated student record for ${cleanRoll} (${name})`);
  return { success: true, roll_no: cleanRoll };
}

function deleteStudent(rollNo) {
  const cleanRoll = rollNo.trim().toUpperCase();
  if (useJsonFallback) {
    memoryStore.students = memoryStore.students.filter(s => s.roll_no.toUpperCase() !== cleanRoll);
    memoryStore.marks = memoryStore.marks.filter(m => m.roll_no.toUpperCase() !== cleanRoll);
    saveJsonStore();
  } else {
    dbInstance.prepare('DELETE FROM students WHERE UPPER(roll_no) = ?').run(cleanRoll);
  }
  logAudit('DELETE_STUDENT', `Deleted student record for ${cleanRoll}`);
  return { success: true };
}

function saveSubjectMark(rollNo, subjectCode, internalMarks, externalMarks, semester = 6) {
  const cleanRoll = rollNo.trim().toUpperCase();
  const cleanSub = subjectCode.trim().toUpperCase();
  const intM = Number(internalMarks);
  const extM = Number(externalMarks);

  if (intM < 0 || intM > 30) throw new Error('Internal marks must be between 0 and 30');
  if (extM < 0 || extM > 70) throw new Error('External marks must be between 0 and 70');

  const { total, grade, gradePoint, status } = calculateGrade(intM, extM);

  if (useJsonFallback) {
    const idx = memoryStore.marks.findIndex(m => m.roll_no.toUpperCase() === cleanRoll && m.subject_code.toUpperCase() === cleanSub && m.semester === Number(semester));
    if (idx >= 0) {
      memoryStore.marks[idx] = {
        ...memoryStore.marks[idx],
        internal_marks: intM, external_marks: extM, total_marks: total,
        grade, grade_point: gradePoint, status
      };
    } else {
      memoryStore.marks.push({
        id: memoryStore.marks.length + 1,
        roll_no: cleanRoll,
        subject_code: cleanSub,
        semester: Number(semester),
        internal_marks: intM,
        external_marks: extM,
        total_marks: total,
        grade,
        grade_point: gradePoint,
        status
      });
    }
    saveJsonStore();
  } else {
    const upsert = dbInstance.prepare(`
      INSERT INTO marks (roll_no, subject_code, semester, internal_marks, external_marks, total_marks, grade, grade_point, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(roll_no, subject_code, semester) DO UPDATE SET
        internal_marks = excluded.internal_marks,
        external_marks = excluded.external_marks,
        total_marks = excluded.total_marks,
        grade = excluded.grade,
        grade_point = excluded.grade_point,
        status = excluded.status
    `);
    upsert.run(cleanRoll, cleanSub, Number(semester), intM, extM, total, grade, gradePoint, status);
  }

  logAudit('UPDATE_MARK', `Updated mark for ${cleanRoll} in ${cleanSub}: ${total}/100 (${grade})`);
  return { success: true, total, grade, gradePoint, status };
}

function batchImportMarks(rows) {
  let importedCount = 0;
  for (const row of rows) {
    const { roll_no, name, email, branch, subject_code, internal_marks, external_marks, semester } = row;
    if (!roll_no || !subject_code) continue;

    if (name && email && branch) {
      saveStudent({ roll_no, name, email, branch, semester: semester || 6 });
    }

    if (internal_marks !== undefined && external_marks !== undefined) {
      saveSubjectMark(roll_no, subject_code, internal_marks, external_marks, semester || 6);
      importedCount++;
    }
  }

  logAudit('BATCH_IMPORT', `Batch processed ${importedCount} records.`);
  return { success: true, imported: importedCount };
}

function getClassAnalytics() {
  const summaries = getAllStudentsSummary();
  if (summaries.length === 0) {
    return {
      total_students: 0,
      pass_count: 0,
      fail_count: 0,
      pass_rate: 0,
      avg_sgpa: 0,
      distinction_count: 0,
      grade_distribution: {},
      top_performers: []
    };
  }

  let totalSgpa = 0;
  let passCount = 0;
  let distinctionCount = 0;
  const gradeDist = { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };

  const allMarks = useJsonFallback ? memoryStore.marks : dbInstance.prepare('SELECT grade FROM marks').all();
  allMarks.forEach(m => {
    if (gradeDist[m.grade] !== undefined) gradeDist[m.grade]++;
  });

  summaries.forEach(s => {
    totalSgpa += s.sgpa;
    if (s.standing !== 'REAPPEAR' && s.standing !== 'FAIL') {
      passCount++;
    }
    if (s.standing === 'DISTINCTION') {
      distinctionCount++;
    }
  });

  const avgSgpa = Number((totalSgpa / summaries.length).toFixed(2));
  const passRate = Number(((passCount / summaries.length) * 100).toFixed(1));

  return {
    total_students: summaries.length,
    pass_count: passCount,
    fail_count: summaries.length - passCount,
    pass_rate: passRate,
    avg_sgpa: avgSgpa,
    distinction_count: distinctionCount,
    grade_distribution: gradeDist,
    top_performers: summaries.slice(0, 3)
  };
}

function logAudit(action, details) {
  if (useJsonFallback) {
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      action, details, timestamp: new Date().toISOString()
    });
    if (memoryStore.audit_logs.length > 100) memoryStore.audit_logs.pop();
    saveJsonStore();
  } else {
    try {
      dbInstance.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(action, details);
    } catch (e) {}
  }
}

function getAuditLogs(limit = 15) {
  if (useJsonFallback) {
    return memoryStore.audit_logs.slice(0, limit);
  }
  return dbInstance.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
}

// Re-seed DB
initDB();

module.exports = {
  calculateGrade,
  getSubjects,
  getAllStudentsSummary,
  getStudentDetails,
  saveStudent,
  deleteStudent,
  saveSubjectMark,
  batchImportMarks,
  getClassAnalytics,
  getAuditLogs,
  logAudit
};
