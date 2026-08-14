import { apiClient } from './apiClient';
import { User, Organization } from '../types';

export interface LoginPayload {
  email: string;
  passwordHash: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/v1/auth/login', payload);
    const token = response.data?.token;
    if (!token) throw new Error('Authentication succeeded without a token');
    localStorage.setItem('autowork_jwt_token', token);
    document.cookie = `autowork_jwt_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/v1/auth/register', payload);
    const token = response.data?.token;
    if (!token) throw new Error('Registration succeeded without a token');
    localStorage.setItem('autowork_jwt_token', token);
    document.cookie = `autowork_jwt_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    return response.data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('autowork_jwt_token');
    document.cookie = 'autowork_jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },

  async getCurrentUser(): Promise<{ user: User; organization: Organization } | null> {
    const token = localStorage.getItem('autowork_jwt_token');
    if (!token) return null;
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },
};
