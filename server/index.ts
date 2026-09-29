import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db } from './database';
import authRoutes from './routes/authRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import studentRoutes from './routes/studentRoutes';
import departmentRoutes from './routes/departmentRoutes';
import facultyRoutes from './routes/facultyRoutes';
import subjectRoutes from './routes/subjectRoutes';
import leaveRoutes from './routes/leaveRoutes';
import reportsRoutes from './routes/reportsRoutes';
import auditRoutes from './routes/auditRoutes';
import settingsRoutes from './routes/settingsRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();
const PORT = process.env.PORT || 5000;
const startTime = Date.now();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request performance & audit logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqStart = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - reqStart;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const database = db.get();
  res.json({
    status: 'healthy',
    mode: 'live_api',
    service: 'AttendPro Enterprise Academic Server',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    serverTime: new Date().toISOString(),
    metrics: {
      studentsCount: database.students.length,
      sessionsCount: database.sessions.length,
      recordsCount: database.records.length,
      departmentsCount: database.departments.length,
      auditLogsCount: database.auditLogs.length,
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Route Handler
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
  });
});

// Global Centralized Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error encountered.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AttendPro Enterprise Backend Engine is LIVE on port ${PORT}`);
  console.log(`📡 REST API Base: http://localhost:${PORT}/api`);
  console.log(`🩺 Health Check:   http://localhost:${PORT}/api/health`);
  console.log(`💾 JSON Database:  server/data/db.json`);
  console.log(`======================================================\n`);
});

export default app;
