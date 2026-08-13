"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cloud,
  Users,
  FileSpreadsheet,
  FileText,
  FolderSync,
  Share2,
  Workflow,
  ScrollText,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'pCloud Accounts', href: '/accounts', icon: Cloud },
  { name: 'pCloud Files', href: '/files', icon: FolderSync },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Import Data', href: '/imports', icon: FileSpreadsheet },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Campaigns', href: '/campaigns', icon: Share2 },
  { name: 'Automations', href: '/automations', icon: Workflow },
  { name: 'Share Logs', href: '/logs', icon: ScrollText },
];

const adminNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin Console', href: '/admin', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/50">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">Autowork.com</h1>
            <p className="text-xs text-cyan-400 font-medium">pCloud Orchestrator v1.0</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="px-3 py-4 space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
            Platform Modules
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin & Footers */}
      <div className="p-3 border-t border-slate-800 space-y-1 bg-slate-950/30">
        <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
          Administration
        </p>
        {adminNavigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* pCloud Engine Badge */}
        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cloud className="h-3.5 w-3.5 text-cyan-400" />
            <span>pCloud Engine</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
