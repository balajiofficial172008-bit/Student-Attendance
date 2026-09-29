import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { Student, StudentFormData } from '../../src/types';

const router = Router();

// GET /api/students
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { departmentId, year, section, search, status, lowAttendance } = req.query;
  const database = db.get();
  let students = [...database.students];

  if (departmentId) students = students.filter(s => s.departmentId === departmentId);
  if (year) students = students.filter(s => s.year === Number(year));
  if (section) students = students.filter(s => s.section === section);
  if (status) students = students.filter(s => s.enrollmentStatus === status);

  if (search) {
    const q = String(search).toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }

  if (lowAttendance === 'true') {
    const threshold = database.settings.attendanceThreshold || 75;
    students = students.filter(s => (s.attendancePercentage || 0) < threshold);
  }

  // Populate department object
  const populated = students.map(s => {
    const dept = database.departments.find(d => d.id === s.departmentId);
    return { ...s, department: dept };
  });

  res.json({
    success: true,
    total: populated.length,
    data: populated,
  });
});

// GET /api/students/defaulters
router.get('/defaulters', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  const threshold = database.settings.attendanceThreshold || 75;

  const defaulters = database.students
    .filter(s => s.enrollmentStatus === 'active')
    .map(s => {
      const metrics = db.calculateStudentMetrics(s.id);
      const prediction = db.predictEligibility(s.id, threshold);
      const dept = database.departments.find(d => d.id === s.departmentId);
      return {
        ...s,
        department: dept,
        metrics,
        prediction,
        riskLevel: (s.attendancePercentage || 0) < 60 ? 'critical' : 'warning',
      };
    })
    .filter(s => (s.attendancePercentage || 0) < threshold)
    .sort((a, b) => (a.attendancePercentage || 0) - (b.attendancePercentage || 0));

  res.json({
    success: true,
    threshold,
    count: defaulters.length,
    data: defaulters,
  });
});

// GET /api/students/:id
router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const student = database.students.find(s => s.id === id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const dept = database.departments.find(d => d.id === student.departmentId);
  const metrics = db.calculateStudentMetrics(id);
  const prediction = db.predictEligibility(id, database.settings.attendanceThreshold || 75);

  res.json({
    success: true,
    data: {
      ...student,
      department: dept,
      metrics,
      prediction,
    },
  });
});

// GET /api/students/:id/summary
router.get('/:id/summary', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { subjectId } = req.query;
  const metrics = db.calculateStudentMetrics(id, subjectId ? String(subjectId) : undefined);

  if (!metrics) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  res.json({ success: true, data: metrics });
});

// POST /api/students
router.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const data: StudentFormData = req.body;
  const database = db.get();

  if (!data.name || !data.registerNumber || !data.departmentId) {
    res.status(400).json({ success: false, message: 'Name, register number, and department are required.' });
    return;
  }

  if (database.students.some(s => s.registerNumber.toLowerCase() === data.registerNumber.toLowerCase())) {
    res.status(400).json({ success: false, message: `Register number ${data.registerNumber} already exists in database.` });
    return;
  }

  if (data.email && database.students.some(s => s.email.toLowerCase() === data.email.toLowerCase())) {
    res.status(400).json({ success: false, message: `Student email ${data.email} is already registered.` });
    return;
  }

  const newStudent: Student = {
    id: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    attendancePercentage: 100,
    ...data,
    createdAt: new Date().toISOString().split('T')[0],
  };

  database.students.push(newStudent);
  db.log('STUDENT_ENROLLED', 'student', `Enrolled new student: ${newStudent.name} (${newStudent.registerNumber})`, req.user, newStudent.id, req.ip);
  db.save(database);

  res.status(201).json({
    success: true,
    message: 'Student enrolled successfully.',
    data: newStudent,
  });
});

// PUT /api/students/:id
router.put('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const updates: Partial<StudentFormData> = req.body;
  const database = db.get();
  const idx = database.students.findIndex(s => s.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  if (updates.registerNumber && database.students.some(s => s.id !== id && s.registerNumber === updates.registerNumber)) {
    res.status(400).json({ success: false, message: 'Another student already uses this register number.' });
    return;
  }

  database.students[idx] = { ...database.students[idx], ...updates };
  db.log('STUDENT_UPDATED', 'student', `Updated details for student ${database.students[idx].name}`, req.user, id, req.ip);
  db.save(database);

  res.json({
    success: true,
    message: 'Student profile updated.',
    data: database.students[idx],
  });
});

// DELETE /api/students/:id
router.delete('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const student = database.students.find(s => s.id === id);

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  database.students = database.students.filter(s => s.id !== id);
  database.records = database.records.filter(r => r.studentId !== id);

  db.log('STUDENT_REMOVED', 'student', `Removed student ${student.name} (${student.registerNumber}) and associated records`, req.user, id, req.ip);
  db.save(database);

  res.json({ success: true, message: 'Student and related attendance records removed.' });
});

// POST /api/students/bulk-import
router.post('/bulk-import', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ success: false, message: 'An array of students is required for bulk import.' });
    return;
  }

  const database = db.get();
  const existingRegNos = new Set(database.students.map(s => s.registerNumber.toLowerCase()));
  const imported: Student[] = [];
  const skipped: string[] = [];

  students.forEach((item: any, idx: number) => {
    if (!item.name || !item.registerNumber || !item.departmentId) {
      skipped.push(`Row ${idx + 1}: Missing required fields`);
      return;
    }
    if (existingRegNos.has(item.registerNumber.toLowerCase())) {
      skipped.push(`Row ${idx + 1}: Register Number ${item.registerNumber} already exists`);
      return;
    }

    const newStudent: Student = {
      id: `stu_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      name: item.name,
      registerNumber: item.registerNumber,
      email: item.email || `${item.registerNumber.toLowerCase()}@student.college.edu`,
      phone: item.phone || '9876543210',
      gender: item.gender || 'male',
      dateOfBirth: item.dateOfBirth || '2004-01-01',
      address: item.address || 'Chennai, Tamil Nadu',
      departmentId: item.departmentId,
      year: Number(item.year) || 1,
      semester: Number(item.semester) || 1,
      section: item.section || 'A',
      batch: item.batch || '2024-2028',
      admissionYear: Number(item.admissionYear) || 2024,
      bloodGroup: item.bloodGroup || 'O+',
      guardianName: item.guardianName || 'Parent',
      guardianPhone: item.guardianPhone || '9876543210',
      emergencyContact: item.emergencyContact || '9876543210',
      enrollmentStatus: 'active',
      attendancePercentage: 100,
      createdAt: new Date().toISOString().split('T')[0],
    };

    database.students.push(newStudent);
    existingRegNos.add(newStudent.registerNumber.toLowerCase());
    imported.push(newStudent);
  });

  db.log('STUDENT_BULK_IMPORTED', 'student', `Bulk imported ${imported.length} students (${skipped.length} skipped).`, req.user, undefined, req.ip);
  db.save(database);

  res.json({
    success: true,
    message: `Successfully imported ${imported.length} students.`,
    importedCount: imported.length,
    skippedCount: skipped.length,
    skippedDetails: skipped,
  });
});

export default router;
