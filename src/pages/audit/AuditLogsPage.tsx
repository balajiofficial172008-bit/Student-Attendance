import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Download, RefreshCw, UserCheck, Calendar } from 'lucide-react';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs(entityFilter || undefined, search || undefined);
      setLogs(data);
    } catch {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Action', 'Entity Type', 'User Name', 'Role', 'IP Address', 'Details'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.action,
      l.entityType,
      l.userName,
      l.userRole,
      l.ip || '127.0.0.1',
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Audit trail exported successfully!');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail & Security Logs</h1>
          <p className="page-subtitle">
            Tamper-evident system activity log tracking attendance markings, modifications, and administrative operations
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchLogs} title="Refresh logs">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={exportCSV} disabled={logs.length === 0}>
            <Download size={15} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: '', label: 'All Activities' },
              { id: 'attendance', label: 'Attendance Markings' },
              { id: 'student', label: 'Student Records' },
              { id: 'leave', label: 'Leave & OD' },
              { id: 'auth', label: 'Security & Auth' },
              { id: 'system', label: 'System Operations' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setEntityFilter(tab.id)}
                className={`btn btn-sm ${entityFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', minWidth: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search action or details..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 36, height: 38 }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Activity Timeline ({logs.length} events)</span>
          <span className="badge badge-success">🛡️ Read-Only Cryptographic Audit Log</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">No audit events found</div>
            <div className="empty-state-text">No recorded events match the selected criteria.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Event</th>
                  <th>Entity</th>
                  <th>Performed By</th>
                  <th>Details & Changes</th>
                  <th>Host / IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: log.action.includes('DELETED') || log.action.includes('FAILED')
                            ? 'rgba(239, 68, 68, 0.15)'
                            : log.action.includes('SAVED') || log.action.includes('APPROVED')
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(99, 102, 241, 0.15)',
                          color: log.action.includes('DELETED') || log.action.includes('FAILED')
                            ? '#ef4444'
                            : log.action.includes('SAVED') || log.action.includes('APPROVED')
                            ? '#10b981'
                            : '#6366f1',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                        {log.entityType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{log.userName}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {log.userRole}
                      </div>
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.4 }}>{log.details}</div>
                      {log.entityId && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          Ref ID: <code>{log.entityId}</code>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {log.ip || '127.0.0.1'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
