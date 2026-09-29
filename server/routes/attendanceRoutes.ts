import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { AttendanceSession, AttendanceRecord, AttendanceStatus, Notification } from '../../src/types';

const router = Router();

// GET /api/attendance/sessions
router.get('/sessions', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { departmentId, year, section, subjectId, date, startDate, endDate, period } = req.query;
  const database = db.get();
  let sessions = [...database.sessions];

  if (departmentId) sessions = sessions.filter(s => s.departmentId === departmentId);
  if (year) sessions = sessions.filter(s => s.year === Number(year));
  if (section) sessions = sessions.filter(s => s.section === section);
  if (subjectId) sessions = sessions.filter(s => s.subjectId === subjectId);
  if (date) sessions = sessions.filter(s => s.date === date);
  if (period !== undefined && period !== '') sessions = sessions.filter(s => s.period === Number(period));
  if (startDate) sessions = sessions.filter(s => s.date >= String(startDate));
  if (endDate) sessions = sessions.filter(s => s.date <= String(endDate));

  // Sort newest first
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    success: true,
    total: sessions.length,
    data: sessions,
  });
});

// GET /api/attendance/sessions/:id
router.get('/sessions/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const session = database.sessions.find(s => s.id === id);

  if (!session) {
    res.status(404).json({ success: false, message: 'Attendance session not found.' });
    return;
  }

  const records = database.records.filter(r => r.sessionId === id);
  const enrichedRecords = records.map(r => {
    const student = database.students.find(s => s.id === r.studentId);
    return { ...r, student };
  });

  const subject = database.subjects.find(s => s.id === session.subjectId);
  const department = database.departments.find(d => d.id === session.departmentId);
  const faculty = database.faculty.find(f => f.id === session.facultyId);

  res.json({
    success: true,
    data: {
      ...session,
      subject,
      department,
      faculty,
      records: enrichedRecords,
    },
  });
});

// POST /api/attendance/mark
// Core robust business logic for attendance submission
router.post('/mark', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const {
    departmentId,
    year,
    section,
    subjectId,
    date,
    period,
    periodLabel,
    records,
  } = req.body;

  if (!departmentId || !year || !section || !subjectId || !date) {
    res.status(400).json({
      success: false,
      message: 'Missing mandatory session criteria: departmentId, year, section, subjectId, and date are required.',
    });
    return;
  }

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({
      success: false,
      message: 'At least one student attendance record must be provided.',
    });
    return;
  }

  const database = db.get();
  const facultyId = req.user?.facultyId || req.body.facultyId || 'f1';

  // Check if session already exists for this exact class, date, and period slot
  let existingSession = database.sessions.find(s =>
    s.departmentId === departmentId &&
    s.year === Number(year) &&
    s.section === section &&
    s.subjectId === subjectId &&
    s.date === date &&
    (period !== undefined ? s.period === Number(period) : true)
  );

  let sessionId = existingSession?.id;
  const isUpdate = !!existingSession;

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  if (!existingSession) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    existingSession = {
      id: sessionId,
      departmentId,
      year: Number(year),
      section,
      subjectId,
      facultyId,
      date,
      period: period ? Number(period) : undefined,
      periodLabel: periodLabel || (period ? `Period ${period}` : 'Full Day'),
      startTime: req.body.startTime || '09:00 AM',
      endTime: req.body.endTime || '10:00 AM',
      totalStudents: records.length,
      presentCount,
      absentCount,
      createdAt: new Date().toISOString(),
    };
    database.sessions.push(existingSession);
  } else {
    existingSession.totalStudents = records.length;
    existingSession.presentCount = presentCount;
    existingSession.absentCount = absentCount;
    if (periodLabel) existingSession.periodLabel = periodLabel;
  }

  // Remove existing records for this session to guarantee idempotency and no duplicates
  database.records = database.records.filter(r => r.sessionId !== sessionId);

  // Insert new structured records
  const newRecords: AttendanceRecord[] = records.map((r: any) => ({
    id: `rec_${Date.now()}_${r.studentId}`,
    sessionId: sessionId!,
    studentId: r.studentId,
    status: (r.status as AttendanceStatus) || 'present',
    time: r.time || (r.status === 'present' ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined),
    remarks: r.remarks || undefined,
    createdAt: date,
  }));

  database.records.push(...newRecords);

  // Recalculate attendance percentages for affected students
  const threshold = database.settings.attendanceThreshold || 75;
  const newlyFlaggedDefaulters: string[] = [];

  records.forEach((r: any) => {
    const studentIdx = database.students.findIndex(s => s.id === r.studentId);
    if (studentIdx !== -1) {
      const studentRecs = database.records.filter(rec => rec.studentId === r.studentId);
      const total = studentRecs.length;
      const effectivePres = studentRecs.filter(rec =>
        rec.status === 'present' || rec.status === 'on_duty' || rec.status === 'medical_leave'
      ).length + (studentRecs.filter(rec => rec.status === 'late').length * 0.5);

      const newPerc = total > 0 ? Math.round((effectivePres / total) * 100) : 0;
      database.students[studentIdx].attendancePercentage = newPerc;

      if (newPerc < threshold && r.status === 'absent') {
        newlyFlaggedDefaulters.push(database.students[studentIdx].name);
      }
    }
  });

  // Automated notification dispatch if low attendance detected
  if (newlyFlaggedDefaulters.length > 0 && database.settings.lowAttendanceAlert) {
    const notif: Notification = {
      id: `notif_${Date.now()}`,
      userId: req.user?.id || 'u1',
      title: '⚠️ Low Attendance Trigger',
      message: `${newlyFlaggedDefaulters.slice(0, 3).join(', ')} attendance has dropped below ${threshold}%.`,
      type: 'alert',
      read: false,
      createdAt: new Date().toISOString(),
    };
    database.notifications.unshift(notif);
  }

  // Audit Logging
  const sub = database.subjects.find(s => s.id === subjectId);
  db.log(
    isUpdate ? 'ATTENDANCE_SESSION_UPDATED' : 'ATTENDANCE_SESSION_SAVED',
    'attendance',
    `${isUpdate ? 'Updated' : 'Recorded'} attendance for ${sub?.name || subjectId} (Year ${year} - ${section}) on ${date} (${presentCount} present, ${absentCount} absent).`,
    req.user,
    sessionId,
    req.ip
  );

  db.save(database);

  res.json({
    success: true,
    message: `Attendance ${isUpdate ? 'updated' : 'recorded'} successfully for ${records.length} students.`,
    data: {
      session: existingSession,
      recordsCount: newRecords.length,
      presentCount,
      absentCount,
      percentage: Math.round((presentCount / records.length) * 100),
    },
  });
});

// DELETE /api/attendance/sessions/:id
router.delete('/sessions/:id', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const database = db.get();
  const session = database.sessions.find(s => s.id === id);

  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found.' });
    return;
  }

  database.sessions = database.sessions.filter(s => s.id !== id);
  database.records = database.records.filter(r => r.sessionId !== id);

  db.log('ATTENDANCE_SESSION_DELETED', 'attendance', `Deleted attendance session ${id} for date ${session.date}`, req.user, id, req.ip);
  db.save(database);

  res.json({ success: true, message: 'Attendance session deleted.' });
});

// GET /api/attendance/stats/today
router.get('/stats/today', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const today = new Date().toISOString().split('T')[0];
  const database = db.get();
  const todaySessions = database.sessions.filter(s => s.date === today);
  const sessionIds = new Set(todaySessions.map(s => s.id));
  const todayRecords = database.records.filter(r => sessionIds.has(r.sessionId));

  const present = todayRecords.filter(r => r.status === 'present' || r.status === 'on_duty').length;
  const absent = todayRecords.filter(r => r.status === 'absent').length;
  const late = todayRecords.filter(r => r.status === 'late').length;
  const onDuty = todayRecords.filter(r => r.status === 'on_duty').length;
  const total = todayRecords.length;

  res.json({
    success: true,
    data: {
      today,
      totalSessions: todaySessions.length,
      totalRecords: total,
      present,
      absent,
      late,
      onDuty,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    },
  });
});

// GET /api/attendance/stats/monthly
router.get('/stats/monthly', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const month = req.query.month ? Number(req.query.month) : (new Date().getMonth() + 1);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const database = db.get();
  const sessions = database.sessions.filter(s => s.date.startsWith(monthStr));
  const grouped: Record<string, { present: number; absent: number; total: number; sessionsCount: number }> = {};

  sessions.forEach(sess => {
    if (!grouped[sess.date]) {
      grouped[sess.date] = { present: 0, absent: 0, total: 0, sessionsCount: 0 };
    }
    grouped[sess.date].sessionsCount++;
    const recs = database.records.filter(r => r.sessionId === sess.id);
    recs.forEach(r => {
      grouped[sess.date].total++;
      if (r.status === 'present' || r.status === 'on_duty') grouped[sess.date].present++;
      else grouped[sess.date].absent++;
    });
  });

  const timeline = Object.entries(grouped)
    .map(([date, stats]) => ({
      date,
      ...stats,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ success: true, data: timeline });
});

// GET /api/attendance/stats/department/:deptId
router.get('/stats/department/:deptId', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { deptId } = req.params;
  const database = db.get();
  const sessions = database.sessions.filter(s => s.departmentId === deptId);
  const sessionIds = new Set(sessions.map(s => s.id));
  const records = database.records.filter(r => sessionIds.has(r.sessionId));

  const present = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
  const total = records.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  res.json({
    success: true,
    data: {
      departmentId: deptId,
      totalSessions: sessions.length,
      totalRecords: total,
      present,
      absent: total - present,
      percentage,
    },
  });
});

// GET /api/attendance/calendar/:studentId
router.get('/calendar/:studentId', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { studentId } = req.params;
  const { subjectId } = req.query;
  const database = db.get();

  let relevantSessions = database.sessions;
  if (subjectId) {
    relevantSessions = relevantSessions.filter(s => s.subjectId === subjectId);
  }
  const sessionMap = new Map(relevantSessions.map(s => [s.id, s]));

  const records = database.records.filter(r => r.studentId === studentId && sessionMap.has(r.sessionId));
  const calendar: Record<string, { status: AttendanceStatus; time?: string; subjectCode?: string }> = {};

  records.forEach(r => {
    const s = sessionMap.get(r.sessionId);
    if (s) {
      calendar[s.date] = {
        status: r.status,
        time: r.time,
        subjectCode: database.subjects.find(sub => sub.id === s.subjectId)?.code,
      };
    }
  });

  res.json({ success: true, data: calendar });
});

// POST /api/attendance/calculate-eligibility
// Algorithmic detention calculator endpoint
router.post('/calculate-eligibility', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { studentId, targetPercentage } = req.body;
  if (!studentId) {
    res.status(400).json({ success: false, message: 'studentId is required.' });
    return;
  }

  const prediction = db.predictEligibility(studentId, targetPercentage ? Number(targetPercentage) : 75);
  res.json({ success: true, data: prediction });
});

export default router;
