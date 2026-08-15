import { apiClient } from './apiClient';
import { PCloudShareExecution, ErrorLog } from '../types';

export const logsService = {
  async getExecutionLogs(): Promise<PCloudShareExecution[]> {
    const response = await apiClient.get('/v1/logs/executions');
    return response.data;
  },

  async getErrorLogs(): Promise<ErrorLog[]> {
    const response = await apiClient.get('/v1/logs/errors');
    return response.data;
  },
};
