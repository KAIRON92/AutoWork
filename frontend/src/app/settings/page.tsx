"use client";

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { authService } from '@/services/authService';
import { Settings, Shield, Building2, User, KeyRound } from 'lucide-react';
import { Organization, User as AppUser } from '@/types';

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then((result) => {
      if (!active) return;
      if (!result) {
        setError('Unable to load your account settings.');
        setLoading(false);
        return;
      }
      setUser(result.user);
      setOrganization(result.organization || null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & User Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your profile, organization parameters, and multi-tenant security policies.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Organization Multi-Tenancy Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Organization Name</label>
              <input type="text" readOnly value={loading ? 'Loading...' : organization?.name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Organization Slug (Tenant ID)</label>
              <input type="text" readOnly value={loading ? 'Loading...' : organization?.slug || ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">User Credentials & Role</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
              <input type="text" readOnly value={loading ? 'Loading...' : user ? `${user.firstName} ${user.lastName}` : ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
              <input type="text" readOnly value={loading ? 'Loading...' : user?.email || ''} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800" />
            </div>
          </div>
          <div className="text-xs text-slate-500">Role: <span className="font-semibold text-slate-800">{loading ? 'Loading...' : user?.role || '—'}</span></div>
        </div>
      </div>
    </Shell>
  );
}
