import { apiClient } from './apiClient';
import { mockExecutionLogs, mockErrorLogs } from './mockData';
import { PCloudShareExecution, ErrorLog } from '../types';

export const logsService = {
  async getExecutionLogs(): Promise<PCloudShareExecution[]> {
    try {
      const response = await apiClient.get('/v1/logs/executions');
      return response.data;
    } catch {
      return mockExecutionLogs;
    }
  },

  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      const response = await apiClient.get('/v1/logs/errors');
      return response.data;
    } catch {
      return mockErrorLogs;
    }
  },
};
