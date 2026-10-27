-- ==========================================================
-- ADVANCED INTERNET PROGRAMMING (AIP) MINI-PROJECT
-- Institution: Chandigarh University (UIC)
-- Project: Student Result Management System
-- Roll Series: 26MCI10158
-- Database Schema (SQL-92 / SQLite / MySQL Compatible)
-- ==========================================================

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    roll_no VARCHAR(20) PRIMARY KEY, -- e.g. '26MCI10158'
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    branch VARCHAR(50) NOT NULL,
    semester INT NOT NULL,
    section VARCHAR(5) DEFAULT 'A',
    avatar_seed VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits INT NOT NULL DEFAULT 4,
    semester INT NOT NULL DEFAULT 6,
    max_internal INT DEFAULT 30,
    max_external INT DEFAULT 70
);

-- 3. Marks / Results Table
CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_no VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    internal_marks INT NOT NULL CHECK(internal_marks >= 0 AND internal_marks <= 30),
    external_marks INT NOT NULL CHECK(external_marks >= 0 AND external_marks <= 70),
    total_marks INT NOT NULL CHECK(total_marks >= 0 AND total_marks <= 100),
    grade VARCHAR(5) NOT NULL,
    grade_point INT NOT NULL CHECK(grade_point >= 0 AND grade_point <= 10),
    status VARCHAR(10) NOT NULL CHECK(status IN ('PASS', 'FAIL')),
    FOREIGN KEY(roll_no) REFERENCES students(roll_no) ON DELETE CASCADE,
    FOREIGN KEY(subject_code) REFERENCES subjects(code) ON DELETE CASCADE,
    UNIQUE(roll_no, subject_code, semester)
);

-- 4. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- Initial Reference Data for Subjects (AIP Curriculum)
-- ==========================================================
INSERT OR IGNORE INTO subjects (code, name, credits, semester, max_internal, max_external) VALUES
('CA601', 'Advanced Internet Programming', 4, 6, 30, 70),
('CA602', 'Cloud Computing & Microservices', 4, 6, 30, 70),
('CA603', 'Distributed Database Systems', 3, 6, 30, 70),
('CA604', 'Design & Analysis of Algorithms', 4, 6, 30, 70),
('CA605', 'Machine Learning & Analytics', 3, 6, 30, 70),
('CA606', 'Internet Programming Lab', 2, 6, 30, 70);
