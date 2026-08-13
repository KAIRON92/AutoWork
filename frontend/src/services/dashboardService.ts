import axios from 'axios';
import { DashboardMetrics } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const res = await axios.get(`${API_BASE}/v1/dashboard/metrics`);
      return res.data;
    } catch {
      return {
        totalContacts: 542,
        connectedPCloudAccounts: 2,
        availableFiles: 6,
        activeCampaigns: 1,
        completedCampaigns: 4,
        totalShareTransferJobs: 1240,
        successfulJobs: 1226,
        failedJobs: 14,
        successRate: '98.9',
        recentCampaigns: [],
      };
    }
  },
};
