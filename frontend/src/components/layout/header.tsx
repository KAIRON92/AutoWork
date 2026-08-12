"use client";

import { Bell, Search, Building2, UserCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { mockUser, mockOrganization } from '@/services/mockData';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns, contacts, templates..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls & Organization Switcher */}
      <div className="flex items-center gap-6">
        {/* Realtime Socket Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Realtime Connected</span>
        </div>

        {/* Organization Switcher */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors text-xs font-medium text-slate-700">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>{mockOrganization.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {mockUser.firstName[0]}
            {mockUser.lastName[0]}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {mockUser.firstName} {mockUser.lastName}
            </p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              {mockUser.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
