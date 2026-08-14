import { apiClient } from './apiClient';
import { DashboardMetrics } from '../types';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const res = await apiClient.get('/v1/dashboard/metrics');
    return res.data;
  },
};
