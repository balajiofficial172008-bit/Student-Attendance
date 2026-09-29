import { LeaveRequest } from '../types';
import { apiRequest, getBackendStatus } from './api/apiClient';
import { mockBackendEngine } from './api/mockBackendEngine';

export const leaveService = {
  async getAll(studentId?: string, status?: string): Promise<LeaveRequest[]> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const query = new URLSearchParams();
        if (studentId) query.append('studentId', studentId);
        if (status) query.append('status', status);
        const res = await apiRequest<LeaveRequest[]>(`/leaves?${query.toString()}`);
        return res.data;
      } catch (err) {
        console.warn('API error, falling back to mock engine for leaves:', err);
      }
    }
    return mockBackendEngine.getLeaveRequests(studentId, status);
  },

  async apply(data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>, user?: any): Promise<LeaveRequest> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const res = await apiRequest<LeaveRequest>('/leaves', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (err) {
        console.warn('API error, falling back to mock engine for leave apply:', err);
      }
    }
    return mockBackendEngine.applyLeave(data, user);
  },

  async updateStatus(id: string, status: 'approved' | 'rejected', user?: any, remarks?: string): Promise<LeaveRequest> {
    const backend = getBackendStatus();
    if (backend.connected) {
      try {
        const res = await apiRequest<LeaveRequest>(`/leaves/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, remarks }),
        });
        return res.data;
      } catch (err) {
        console.warn('API error, falling back to mock engine for leave status update:', err);
      }
    }
    return mockBackendEngine.updateLeaveStatus(id, status, user, remarks);
  },
};
