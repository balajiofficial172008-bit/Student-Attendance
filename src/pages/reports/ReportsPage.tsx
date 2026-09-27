import React, { useState } from 'react';
import { FileBarChart2, Download, Printer, FileText, Users, BookOpen, Building2, AlertTriangle, Calendar } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { departmentService } from '../../services/departmentService';
import { subjectService } from '../../services/subjectService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'student' | 'subject' | 'department' | 'low-attendance';

const reportTypes = [
  { id: 'daily' as ReportType, label: 'Daily Attendance', icon: Calendar, color: '#4f46e5', desc: 'Attendance summary for today' },
  { id: 'weekly' as ReportType, label: 'Weekly Report', icon: FileBarChart2, color: '#10b981', desc: 'Last 7 days attendance summary' },
  { id: 'monthly' as ReportType, label: 'Monthly Report', icon: FileText, color: '#f59e0b', desc: 'Full month attendance breakdown' },
  { id: 'student' as ReportType, label: 'Student Report', icon: Users, color: '#06b6d4', desc: 'Per-student attendance details' },
  { id: 'subject' as ReportType, label: 'Subject Report', icon: BookOpen, color: '#8b5cf6', desc: 'Subject-wise attendance analysis' },
  { id: 'department' as ReportType, label: 'Department Report', icon: Building2, color: '#ec4899', desc: 'Department-wise statistics' },
  { id: 'low-attendance' as ReportType, label: 'Low Attendance', icon: AlertTriangle, color: '#ef4444', desc: 'Students below threshold' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState('');

  const generateReport = (type: ReportType) => {
    setActiveReport(type);
    const departments = departmentService.getAll();
    const subjects = subjectService.getAll();
    const students = studentService.getAll();
    const today = new Date().toISOString().split('T')[0];

    if (type === 'daily') {
      setReportTitle('Daily Attendance Report – ' + today);
      const sessions = attendanceService.getAllSessions().filter(s => s.date === today);
      const data = sessions.map(sess => {
        const subject = subjects.find(s => s.id === sess.subjectId);
        const dept = departments.find(d => d.id === sess.departmentId);
        const records = attendanceService.getRecordsForSession(sess.id);
        const present = records.filter(r => r.status === 'present').length;
        return { subject: subject?.code || '—', dept: dept?.code || '—', year: sess.year, section: sess.section, present, absent: records.length - present, total: records.length, percentage: records.length > 0 ? Math.round((present / records.length) * 100) : 0 };
      });
      setReportData(data);
    } else if (type === 'student') {
      setReportTitle('Student Attendance Report');
      const data = students.slice(0, 30).map(s => {
        const summary = studentService.getAttendanceSummary(s.id);
        const dept = departments.find(d => d.id === s.departmentId);
        return { name: s.name, regNo: s.registerNumber, dept: dept?.code || '—', year: s.year, section: s.section, present: summary.presentDays, absent: summary.absentDays, total: summary.totalDays, percentage: summary.percentage };
      });
      setReportData(data);
    } else if (type === 'subject') {
      setReportTitle('Subject-wise Attendance Report');
      const data = subjects.map(sub => {
        const sessions = attendanceService.getAllSessions().filter(s => s.subjectId === sub.id);
        const sessionIds = new Set(sessions.map(s => s.id));
        const records = attendanceService.getAllRecords().filter(r => sessionIds.has(r.sessionId));
        const present = records.filter(r => r.status === 'present').length;
        const dept = departments.find(d => d.id === sub.departmentId);
        return { name: sub.name, code: sub.code, dept: dept?.code || '—', sessions: sessions.length, present, absent: records.length - present, total: records.length, percentage: records.length > 0 ? Math.round((present / records.length) * 100) : 0 };
      }).filter(s => s.total > 0);
      setReportData(data);
    } else if (type === 'department') {
      setReportTitle('Department-wise Attendance Report');
      const data = departments.map(dept => {
        const stats = attendanceService.getDepartmentStats(dept.id);
        const studentCount = students.filter(s => s.departmentId === dept.id).length;
        return { name: dept.name, code: dept.code, students: studentCount, present: stats.present, absent: stats.absent, total: stats.present + stats.absent, percentage: stats.percentage };
      });
      setReportData(data);
    } else if (type === 'low-attendance') {
      setReportTitle('Low Attendance Students Report');
      const lowStudents = studentService.getLowAttendanceStudents(75);
      const data = lowStudents.map(s => {
        const dept = departments.find(d => d.id === s.departmentId);
        return { name: s.name, regNo: s.registerNumber, dept: dept?.code || '—', year: s.year, section: s.section, percentage: s.attendancePerc, status: s.attendancePerc < 60 ? '⛔ Critical' : '⚠️ Warning' };
      });
      setReportData(data);
    } else if (type === 'weekly' || type === 'monthly') {
      const days = type === 'weekly' ? 7 : 30;
      const label = type === 'weekly' ? 'Weekly' : 'Monthly';
      setReportTitle(`${label} Attendance Report`);
      const data: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateStr = d.toISOString().split('T')[0];
        const sessions = attendanceService.getAllSessions().filter(s => s.date === dateStr);
        const sessionIds = new Set(sessions.map(s => s.id));
        const records = attendanceService.getAllRecords().filter(r => sessionIds.has(r.sessionId));
        const present = records.filter(r => r.status === 'present').length;
        data.push({ date: dateStr, present, absent: records.length - present, total: records.length, percentage: records.length > 0 ? Math.round((present / records.length) * 100) : 0 });
      }
      setReportData(data);
    }

    toast.success(`${reportTypes.find(r => r.id === type)?.label} generated!`);
  };

  const exportCSV = () => {
    if (!reportData.length) return;
    const headerLines = [
      'Mahendra Engineering College (Autonomous) - Main Campus',
      reportTitle,
      `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
      '',
    ];
    const keys = Object.keys(reportData[0]);
    const rows = [keys.map(k => k.replace(/([A-Z])/g, ' $1').trim()), ...reportData.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`))];
    const csv = headerLines.join('\n') + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `MEC_${activeReport}_report.csv`; a.click();
    toast.success('CSV exported!');
  };

  const handlePrint = () => { window.print(); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Reports</h1><p className="page-subtitle">Generate and export attendance reports</p></div>
        {activeReport && (
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={exportCSV}><Download size={16} />Export CSV</button>
            <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16} />Print</button>
          </div>
        )}
      </div>

      {/* Report Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        {reportTypes.map(rt => (
          <div key={rt.id} className="report-card" onClick={() => generateReport(rt.id)} style={{ borderColor: activeReport === rt.id ? rt.color : undefined, boxShadow: activeReport === rt.id ? `0 0 0 2px ${rt.color}30` : undefined }}>
            <div className="report-card-icon" style={{ background: `${rt.color}15`, color: rt.color }}>
              <rt.icon size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{rt.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{rt.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Output */}
      {activeReport && reportData.length > 0 && (
        <div className="card">
          <div className="report-inst-banner">
            <div className="report-inst-logo">🎓</div>
            <div className="report-inst-details">
              <h2 className="report-inst-name">MAHENDRA ENGINEERING COLLEGE (AUTONOMOUS)</h2>
              <p className="report-inst-campus">Main Campus • Approved by AICTE, Affiliated to Anna University</p>
              <p className="report-inst-title">OFFICE OF ACADEMIC AFFAIRS — {reportTitle.toUpperCase()}</p>
            </div>
          </div>
          <div className="card-header">
            <span className="card-title">{reportTitle}</span>
            <span className="badge badge-success">{reportData.length} records</span>
          </div>
          {(activeReport === 'weekly' || activeReport === 'monthly') && (
            <div style={{ padding: 24 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reportData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                  <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4,4,0,0]} />
                  <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>{Object.keys(reportData[0]).map(k => <th key={k}>{k.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j}>
                        {typeof val === 'number' && String(Object.keys(row)[j]).toLowerCase().includes('percent') ? (
                          <span style={{ fontWeight: 700, color: val >= 75 ? '#10b981' : '#ef4444' }}>{val}%</span>
                        ) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport && reportData.length === 0 && (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">No Data Available</div><div className="empty-state-text">No records found for this report type.</div></div></div>
      )}

      {!activeReport && (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">Select a Report Type</div><div className="empty-state-text">Click any report card above to generate the report</div></div></div>
      )}
    </div>
  );
}
