🎓 AuraGrade: Student Result Management System

## ⚡ Quick Start (Windows)

### Option 1: Full-Stack Mode (Node.js REST API + SQLite + Real-time SSE)
Simply double click:
👉 **`Launch Student Result System.bat`** (on your Desktop) or **`start.bat`** (inside this folder).

Your browser will automatically open:
```
http://localhost:3000
```

### Option 2: Standalone Offline Mode (Zero Server Required)
Double click:
👉 **`Launch Standalone Demo.bat`** or double click `public\standalone.html`.

---

## 🏛️ Design & Features

1. **White Glassmorphism**:
   - Clean, light frosted glass panels (`background: rgba(255, 255, 255, 0.75)`, `backdrop-filter: blur(16px)`).
   - High-contrast, easy-to-read typography (`#0f172a`, `#334155`).
   - Simple, academic, and professional aesthetic without flashy gaming or neon elements.

2. **Full RESTful Architecture**:
   - `GET /api/students`, `GET /api/students/:rollNo`, `POST /api/students`, `DELETE /api/students/:rollNo`, `POST /api/marks`.
   - Real-time Server-Sent Events (SSE) synchronization on `GET /api/events`.

3. **Official UGC 10-Point CBCS Grading**:
   - SGPA computation using standard credits and grade points.
   - Categorization: Distinction ($\ge 8.5$), First Class ($\ge 7.0$), Second Class ($\ge 5.5$), Reappear (Fail).

4. **Official Marksheet Generation**:
   - Print-ready transcript with SHA-256 cryptographic verification token and scannable SVG QR Code.
   - Clean `@media print` layout for PDF export.

5. **Faculty / Admin Portal**:
   - Overview metrics: Total evaluated, pass rate, average SGPA, distinction count.
   - Roster table with live filters by branch and standing.
   - Add/edit marks and CSV batch upload/export.
