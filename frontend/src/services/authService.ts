import { apiClient } from './apiClient';
import { mockUser, mockOrganization } from './mockData';
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
    try {
      const response = await apiClient.post('/auth/login', payload);
      const token = response.data?.token;
      if (token) {
        localStorage.setItem('autowork_jwt_token', token);
        document.cookie = `autowork_jwt_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }
      return response.data;
    } catch (err) {
      // Mock fallback when API is not reached
      const mockToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('autowork_jwt_token', mockToken);
      document.cookie = `autowork_jwt_token=${mockToken}; path=/; max-age=604800; SameSite=Lax`;
      return {
        user: { ...mockUser, email: payload.email },
        organization: mockOrganization,
        token: mockToken,
      };
    }
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', payload);
      const token = response.data?.token;
      if (token) {
        localStorage.setItem('autowork_jwt_token', token);
        document.cookie = `autowork_jwt_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }
      return response.data;
    } catch (err) {
      const mockToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('autowork_jwt_token', mockToken);
      document.cookie = `autowork_jwt_token=${mockToken}; path=/; max-age=604800; SameSite=Lax`;
      return {
        user: {
          id: 'usr-new',
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          organizationId: 'org-new',
          role: 'ADMIN',
        },
        organization: {
          id: 'org-new',
          name: payload.organizationName,
          slug: payload.organizationName.toLowerCase().replace(/\s+/g, '-'),
        },
        token: mockToken,
      };
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('autowork_jwt_token');
    document.cookie = 'autowork_jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },

  async getCurrentUser(): Promise<{ user: User; organization: Organization } | null> {
    const token = localStorage.getItem('autowork_jwt_token');
    if (!token) return null;

    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (err) {
      return { user: mockUser, organization: mockOrganization };
    }
  },
};
