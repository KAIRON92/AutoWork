"use client";

import { Shell } from '@/components/layout/shell';
import { mockUser, mockOrganization } from '@/services/mockData';
import { Settings, Shield, Building2, User, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & User Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your profile, organization parameters, and multi-tenant security policies.
          </p>
        </div>

        {/* Organization Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Organization Multi-Tenancy Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Organization Name</label>
              <input
                type="text"
                readOnly
                value={mockOrganization.name}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Organization Slug (Tenant ID)</label>
              <input
                type="text"
                readOnly
                value={mockOrganization.slug}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">User Credentials & Role</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                readOnly
                value={`${mockUser.firstName} ${mockUser.lastName}`}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="text"
                readOnly
                value={mockUser.email}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
