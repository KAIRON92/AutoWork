"use client";

import { useEffect, useState } from 'react';
import { Bell, Search, Building2, UserCircle, ChevronDown } from 'lucide-react';
import { authService } from '@/services/authService';
import { User, Organization } from '@/types';

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then((result) => {
      if (!active || !result) return;
      setUser(result.user);
      if (result.organization) setOrganization(result.organization);
    });
    return () => {
      active = false;
    };
  }, []);

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'AU';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
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

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>{organization?.name || 'Loading organization...'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>

        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {user ? `${user.firstName} ${user.lastName}` : 'Loading user...'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              {user?.role || 'USER'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
