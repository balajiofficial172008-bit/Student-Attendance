import { Router, Response } from 'express';
import { db } from '../database';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/analytics
router.get('/analytics', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  const database = db.get();
  const threshold = database.settings.attendanceThreshold || 75;

  const totalStudents = database.students.length;
  const activeStudents = database.students.filter(s => s.enrollmentStatus === 'active').length;
  const totalDepartments = database.departments.length;
  const totalFaculty = database.faculty.length;
  const totalSubjects = database.subjects.length;
  const totalSessions = database.sessions.length;

  const lowAttendanceStudents = database.students.filter(
    s => s.enrollmentStatus === 'active' && (s.attendancePercentage || 0) < threshold
  );

  const criticalStudents = database.students.filter(
    s => s.enrollmentStatus === 'active' && (s.attendancePercentage || 0) < 60
  );

  // Department-wise breakdown
  const departmentBreakdown = database.departments.map(dept => {
    const deptStudents = database.students.filter(s => s.departmentId === dept.id);
    const deptSessions = database.sessions.filter(s => s.departmentId === dept.id);
    const sessionIds = new Set(deptSessions.map(s => s.id));
    const deptRecords = database.records.filter(r => sessionIds.has(r.sessionId));

    const present = deptRecords.filter(r => r.status === 'present' || r.status === 'on_duty').length;
    const total = deptRecords.length;
    const avgPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const lowCount = deptStudents.filter(s => (s.attendancePercentage || 0) < threshold).length;

    return {
      departmentId: dept.id,
      name: dept.name,
      code: dept.code,
      studentCount: deptStudents.length,
      averageAttendance: avgPercentage,
      lowAttendanceCount: lowCount,
    };
  });

  // Last 7 days attendance trends
  const trendDays: { date: string; present: number; absent: number; percentage: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    const sessions = database.sessions.filter(s => s.date === dateStr);
    const sessionIds = new Set(sessions.map(s => s.id));
    const records = database.records.filter(r => sessionIds.has(r.sessionId));

    const present = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
    const total = records.length;
    trendDays.push({
      date: dateStr,
      present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    });
  }

  res.json({
    success: true,
    data: {
      summary: {
        totalStudents,
        activeStudents,
        totalDepartments,
        totalFaculty,
        totalSubjects,
        totalSessions,
        lowAttendanceCount: lowAttendanceStudents.length,
        criticalAttendanceCount: criticalStudents.length,
        attendanceThreshold: threshold,
      },
      departments: departmentBreakdown,
      weeklyTrend: trendDays,
    },
  });
});

export default router;
