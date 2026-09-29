import { AuditLog } from '../types';
import { apiRequest, getBackendStatus } from './api/apiClient';
import { mockBackendEngine } from './api/mockBackendEngine';

export const auditService = {
  async getLogs(entityType?: string, search?: string): Promise<AuditLog[]> {
    const status = getBackendStatus();
    if (status.connected) {
      try {
        const query = new URLSearchParams();
        if (entityType) query.append('entityType', entityType);
        if (search) query.append('search', search);
        const res = await apiRequest<AuditLog[]>(`/audit-logs?${query.toString()}`);
        return res.data;
      } catch (e) {
        console.warn('API error, falling back to mock engine for audit logs:', e);
      }
    }
    return mockBackendEngine.getAuditLogs(entityType, search);
  },
};
