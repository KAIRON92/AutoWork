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
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/v1/auth/login', payload);
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/v1/auth/register', payload);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/v1/auth/logout');
    } finally {
      // JWT is stored server-side in an HttpOnly cookie; there is no token in localStorage.
    }
  },

  async getCurrentUser(): Promise<{ user: User; organization?: Organization } | null> {
    try {
      const response = await apiClient.get('/v1/auth/me');
      return response.data;
    } catch {
      return null;
    }
  },
};
