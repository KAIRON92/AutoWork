import { apiClient } from './apiClient';
import { mockExecutionLogs, mockErrorLogs } from './mockData';
import { ExecutionLog, ErrorLog } from '../types';

export const logsService = {
  async getExecutionLogs(): Promise<ExecutionLog[]> {
    try {
      const response = await apiClient.get('/logs/executions');
      return response.data;
    } catch (err) {
      return mockExecutionLogs;
    }
  },

  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      const response = await apiClient.get('/logs/errors');
      return response.data;
    } catch (err) {
      return mockErrorLogs;
    }
  },
};
