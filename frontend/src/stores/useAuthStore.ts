import { create } from 'zustand';
import { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  setAuth: (user: User, organization: Organization, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  token: null,
  setAuth: (user, organization, token) => set({ user, organization, token }),
  clearAuth: () => set({ user: null, organization: null, token: null }),
}));
