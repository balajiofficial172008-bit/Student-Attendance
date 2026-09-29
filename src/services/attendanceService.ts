import { AttendanceSession, AttendanceRecord, AttendanceFilter, AttendanceStatus, EligibilityPrediction } from '../types';
import { seedSessions, seedRecords } from '../data/seedData';
import { apiRequest, getBackendStatus } from './api/apiClient';
import { mockBackendEngine } from './api/mockBackendEngine';

const SESSIONS_KEY = 'sams_sessions';
const RECORDS_KEY = 'sams_records';

function initSessions(): void {
  if (!localStorage.getItem(SESSIONS_KEY)) localStorage.setItem(SESSIONS_KEY, JSON.stringify(seedSessions));
}
function initRecords(): void {
  if (!localStorage.getItem(RECORDS_KEY)) localStorage.setItem(RECORDS_KEY, JSON.stringify(seedRecords));
}

export const attendanceService = {
  getAllSessions(): AttendanceSession[] {
    initSessions();
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  },

  getAllRecords(): AttendanceRecord[] {
    initRecords();
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
  },

  getSessionById(id: string): AttendanceSession | undefined {
    return this.getAllSessions().find(s => s.id === id);
  },

  findSession(
    departmentId: string,
    year: number,
    section: string,
    subjectId: string,
    date: string,
    period?: number
  ): AttendanceSession | undefined {
    return this.getAllSessions().find(
      s => s.departmentId === departmentId &&
           s.year === Number(year) &&
           s.section === section &&
           s.subjectId === subjectId &&
           s.date === date &&
           (period !== undefined ? s.period === Number(period) : true)
    );
  },

  createSession(data: Omit<AttendanceSession, 'id' | 'createdAt'>): AttendanceSession {
    const sessions = this.getAllSessions();
    const existing = sessions.find(
      s => s.departmentId === data.departmentId &&
           s.year === Number(data.year) &&
           s.section === data.section &&
           s.subjectId === data.subjectId &&
           s.date === data.date &&
           (data.period !== undefined ? s.period === Number(data.period) : true)
    );
    if (existing) return existing;

    const session: AttendanceSession = {
      id: `sess_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };
    sessions.push(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return session;
  },

  async saveAttendance(
    session: Omit<AttendanceSession, 'id' | 'createdAt'>,
    records: { studentId: string; status: AttendanceStatus; time?: string; remarks?: string }[],
    user?: any
  ): Promise<any> {
    const backend = getBackendStatus();

    // If connected to live Express backend, execute server-side transactional mark
    if (backend.connected) {
      try {
        const res = await apiRequest('/attendance/mark', {
          method: 'POST',
          body: JSON.stringify({
            ...session,
            records,
          }),
        });

        // Also update local cache for instant UI rendering
        await mockBackendEngine.markAttendance({
          ...session,
          records,
        }, user);

        return res.data;
      } catch (err) {
        console.warn('Backend mark failed, executing resilient mock engine:', err);
      }
    }

    // Fallback or offline resilient execution
    return await mockBackendEngine.markAttendance({
      ...session,
      records,
    }, user);
  },

  getRecordsForSession(sessionId: string): AttendanceRecord[] {
    return this.getAllRecords().filter(r => r.sessionId === sessionId);
  },

  getRecordsForStudent(studentId: string, subjectId?: string): AttendanceRecord[] {
    const records = this.getAllRecords().filter(r => r.studentId === studentId);
    if (!subjectId) return records;
    const sessions = this.getAllSessions().filter(s => s.subjectId === subjectId);
    const sessionIds = new Set(sessions.map(s => s.id));
    return records.filter(r => sessionIds.has(r.sessionId));
  },

  getFilteredSessions(filter: AttendanceFilter): AttendanceSession[] {
    let sessions = this.getAllSessions();
    if (filter.departmentId) sessions = sessions.filter(s => s.departmentId === filter.departmentId);
    if (filter.year) sessions = sessions.filter(s => s.year === Number(filter.year));
    if (filter.section) sessions = sessions.filter(s => s.section === filter.section);
    if (filter.subjectId) sessions = sessions.filter(s => s.subjectId === filter.subjectId);
    if (filter.date) sessions = sessions.filter(s => s.date === filter.date);
    if (filter.startDate) sessions = sessions.filter(s => s.date >= filter.startDate!);
    if (filter.endDate) sessions = sessions.filter(s => s.date <= filter.endDate!);
    return sessions.sort((a, b) => b.date.localeCompare(a.date));
  },

  getTodayStats(): { present: number; absent: number; late: number; onDuty: number; total: number; percentage: number } {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = this.getAllSessions().filter(s => s.date === today);
    const sessionIds = new Set(todaySessions.map(s => s.id));
    const todayRecords = this.getAllRecords().filter(r => sessionIds.has(r.sessionId));

    const present = todayRecords.filter(r => r.status === 'present').length;
    const onDuty = todayRecords.filter(r => r.status === 'on_duty').length;
    const late = todayRecords.filter(r => r.status === 'late').length;
    const absent = todayRecords.filter(r => r.status === 'absent').length;
    const total = todayRecords.length;

    const effective = present + onDuty + (late * 0.5);
    const percentage = total > 0 ? Math.round((effective / total) * 100) : 0;

    return {
      present: present + onDuty,
      absent,
      late,
      onDuty,
      total,
      percentage,
    };
  },

  getOverallPercentage(): number {
    const records = this.getAllRecords();
    if (records.length === 0) return 0;
    const present = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
    return Math.round((present / records.length) * 100);
  },

  getMonthlyStats(year: number, month: number): { date: string; present: number; absent: number; percentage: number }[] {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const sessions = this.getAllSessions().filter(s => s.date.startsWith(monthStr));
    const grouped: Record<string, { present: number; absent: number; total: number }> = {};

    sessions.forEach(sess => {
      if (!grouped[sess.date]) grouped[sess.date] = { present: 0, absent: 0, total: 0 };
      const records = this.getRecordsForSession(sess.id);
      records.forEach(r => {
        grouped[sess.date].total++;
        if (r.status === 'present' || r.status === 'on_duty') grouped[sess.date].present++;
        else grouped[sess.date].absent++;
      });
    });

    return Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        present: stats.present,
        absent: stats.absent,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getStudentCalendar(studentId: string, subjectId?: string): Record<string, AttendanceStatus> {
    const records = this.getRecordsForStudent(studentId, subjectId);
    const sessions = this.getAllSessions();
    const result: Record<string, AttendanceStatus> = {};
    records.forEach(r => {
      const session = sessions.find(s => s.id === r.sessionId);
      if (session) result[session.date] = r.status;
    });
    return result;
  },

  getDepartmentStats(departmentId: string): { present: number; absent: number; percentage: number } {
    const sessions = this.getAllSessions().filter(s => s.departmentId === departmentId);
    const sessionIds = new Set(sessions.map(s => s.id));
    const records = this.getAllRecords().filter(r => sessionIds.has(r.sessionId));
    const present = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
    const total = records.length;
    return { present, absent: total - present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  },

  async predictEligibility(studentId: string, targetPerc = 75): Promise<EligibilityPrediction> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const res = await apiRequest<EligibilityPrediction>('/attendance/calculate-eligibility', {
          method: 'POST',
          body: JSON.stringify({ studentId, targetPercentage: targetPerc }),
        });
        return res.data;
      } catch (err) {
        console.warn('API error in predictEligibility, falling back to mock engine:', err);
      }
    }
    return mockBackendEngine.predictEligibility(studentId, targetPerc);
  },

  deleteSession(sessionId: string): void {
    const sessions = this.getAllSessions().filter(s => s.id !== sessionId);
    const records = this.getAllRecords().filter(r => r.sessionId !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));

    const backend = getBackendStatus();
    if (backend.connected) {
      apiRequest(`/attendance/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    }
  },
};
