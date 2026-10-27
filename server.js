// ==========================================================
// AuraGrade - Next-Gen Student Result Management System
// High-Performance Native Node.js REST API & Real-time SSE Server
// Advanced Internet Programming (AIP) Mini-Project
// ==========================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SECRET_KEY = 'CHANDIGARH_UNIVERSITY_AIP_2026_KEY';

// Active Server-Sent Events (SSE) clients for real-time broadcasts
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    client.write(`event: ${eventType}\ndata: ${data}\n\n`);
  }
}

// Generate cryptographic verification signature for transcript authenticity
function generateVerificationToken(rollNo, sgpa, totalMarks) {
  const payload = `${rollNo.toUpperCase()}-${sgpa}-${totalMarks}-${SECRET_KEY}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();
}

// MIME types dictionary for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=UTF-8'
};

// Helper to parse JSON body asynchronously
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send standardized JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

// ----------------------------------------------------------
// Request Handler & Router
// ----------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // Global CORS preflight handler
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  try {
    // ------------------------------------------------------
    // Real-Time Server-Sent Events (SSE) Endpoint
    // ------------------------------------------------------
    if (pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': connected\n\n');
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // ------------------------------------------------------
    // REST API Routes
    // ------------------------------------------------------

    // GET /api/subjects
    if (pathname === '/api/subjects' && req.method === 'GET') {
      return sendJson(res, 200, { success: true, subjects: db.getSubjects() });
    }

    // GET /api/analytics
    if (pathname === '/api/analytics' && req.method === 'GET') {
      return sendJson(res, 200, { success: true, analytics: db.getClassAnalytics() });
    }

    // GET /api/audit-logs
    if (pathname === '/api/audit-logs' && req.method === 'GET') {
      const limit = Number(searchParams.get('limit')) || 15;
      return sendJson(res, 200, { success: true, logs: db.getAuditLogs(limit) });
    }

    // GET /api/students (with search, branch, standing filters)
    if (pathname === '/api/students' && req.method === 'GET') {
      let list = db.getAllStudentsSummary();
      const search = (searchParams.get('search') || '').toLowerCase().trim();
      const branch = searchParams.get('branch');
      const standing = searchParams.get('standing');

      if (search) {
        list = list.filter(s =>
          s.roll_no.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search)
        );
      }
      if (branch && branch !== 'ALL') {
        list = list.filter(s => s.branch === branch);
      }
      if (standing && standing !== 'ALL') {
        list = list.filter(s => s.standing === standing);
      }

      return sendJson(res, 200, { success: true, count: list.length, students: list });
    }

    // GET /api/students/:rollNo
    if (pathname.startsWith('/api/students/') && req.method === 'GET') {
      const rollNo = decodeURIComponent(pathname.replace('/api/students/', ''));
      const details = db.getStudentDetails(rollNo);
      if (!details) {
        return sendJson(res, 404, { success: false, error: `Student with Roll Number '${rollNo}' was not found.` });
      }

      // Add cryptographic verification token
      const verificationToken = generateVerificationToken(
        details.student.roll_no,
        details.student.sgpa,
        details.student.total_marks
      );
      details.student.verification_token = verificationToken;
      details.student.verification_url = `http://${req.headers.host || 'localhost:3000'}/verify.html?token=${verificationToken}&roll=${details.student.roll_no}`;

      return sendJson(res, 200, { success: true, ...details });
    }

    // POST /api/students (Add or update student)
    if (pathname === '/api/students' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = db.saveStudent(body);
      broadcastEvent('student_updated', { roll_no: result.roll_no, name: body.name });
      return sendJson(res, 200, { success: true, message: 'Student saved successfully.', roll_no: result.roll_no });
    }

    // DELETE /api/students/:rollNo
    if (pathname.startsWith('/api/students/') && req.method === 'DELETE') {
      const rollNo = decodeURIComponent(pathname.replace('/api/students/', ''));
      const result = db.deleteStudent(rollNo);
      broadcastEvent('student_deleted', { roll_no: rollNo });
      return sendJson(res, 200, { success: true, message: `Student '${rollNo}' deleted.` });
    }

    // POST /api/marks (Save subject marks)
    if (pathname === '/api/marks' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { roll_no, subject_code, internal_marks, external_marks, semester } = body;

      if (!roll_no || !subject_code || internal_marks === undefined || external_marks === undefined) {
        return sendJson(res, 400, { success: false, error: 'Missing roll_no, subject_code, internal_marks, or external_marks' });
      }

      const markResult = db.saveSubjectMark(roll_no, subject_code, internal_marks, external_marks, semester || 6);
      broadcastEvent('result_updated', { roll_no, subject_code, markResult });
      return sendJson(res, 200, { success: true, message: 'Marks saved successfully.', data: markResult });
    }

    // POST /api/batch-upload (CSV bulk upload)
    if (pathname === '/api/batch-upload' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.csvText) {
        return sendJson(res, 400, { success: false, error: 'csvText field is required' });
      }

      const lines = body.csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        return sendJson(res, 400, { success: false, error: 'CSV must contain a header line and at least one data row' });
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length === headers.length) {
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx];
          });
          rows.push(rowObj);
        }
      }

      const batchResult = db.batchImportMarks(rows);
      broadcastEvent('batch_updated', { imported: batchResult.imported });
      return sendJson(res, 200, { success: true, message: `Successfully imported ${batchResult.imported} records.` });
    }

    // GET /api/export-csv
    if (pathname === '/api/export-csv' && req.method === 'GET') {
      const students = db.getAllStudentsSummary();
      let csvContent = 'Rank,Roll No,Name,Email,Branch,Semester,Total Marks,Max Marks,Percentage,SGPA,Standing,Arrears\n';
      students.forEach(s => {
        csvContent += `"${s.rank}","${s.roll_no}","${s.name}","${s.email}","${s.branch}",${s.semester},${s.total_marks},${s.max_marks},${s.percentage}%,${s.sgpa},"${s.standing}",${s.arrears}\n`;
      });

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="Chandigarh_University_Student_Results.csv"',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(csvContent);
    }

    // GET /api/verify
    if (pathname === '/api/verify' && req.method === 'GET') {
      const token = searchParams.get('token');
      const rollNo = searchParams.get('roll');
      if (!token || !rollNo) {
        return sendJson(res, 400, { success: false, valid: false, error: 'token and roll query parameters required.' });
      }

      const details = db.getStudentDetails(rollNo);
      if (!details) {
        return sendJson(res, 404, { success: false, valid: false, error: 'Student record not found.' });
      }

      const expectedToken = generateVerificationToken(
        details.student.roll_no,
        details.student.sgpa,
        details.student.total_marks
      );

      const isValid = (token.toUpperCase() === expectedToken);
      return sendJson(res, 200, {
        success: true,
        valid: isValid,
        student: isValid ? {
          roll_no: details.student.roll_no,
          name: details.student.name,
          branch: details.student.branch,
          semester: details.student.semester,
          sgpa: details.student.sgpa,
          standing: details.student.standing,
          verified_at: new Date().toISOString()
        } : null
      });
    }

    // ------------------------------------------------------
    // Static Asset Serving
    // ------------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Check if filePath is inside PUBLIC_DIR (directory traversal protection)
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Fallback to index.html for SPA-style client routing
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '404 Not Found' }));

  } catch (err) {
    console.error('[Server Error]', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`
  ============================================================
  🎓 CHANDIGARH UNIVERSITY - STUDENT RESULT SYSTEM 🎓
  ============================================================
  [STATUS] Server running at: http://localhost:${PORT}
  [AIP]    Advanced Internet Programming Full-Stack Application
  [SSE]    Real-Time Server-Sent Events enabled at /api/events
  [DB]     SQLite Database Engine active (UID: 26MCI10158)
  ============================================================
  `);
});

module.exports = server;
