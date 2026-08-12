"use client";

import { Shell } from '@/components/layout/shell';
import { mockCampaigns, mockAccounts, mockContacts } from '@/services/mockData';
import { Send, Mail, Users, CheckCircle2, AlertCircle, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const activeCampaigns = mockCampaigns.filter((c) => c.status === 'PROCESSING');
  const activeAccounts = mockAccounts.filter((a) => a.status === 'ACTIVE');

  return (
    <Shell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Command Center</h1>
            <p className="text-sm text-slate-500 mt-1">
              Multi-tenant outbound email dispatch & background queue monitoring.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/imports"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Import Contacts
            </Link>
            <Link
              href="/campaigns/new"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Link>
          </div>
        </div>

        {/* Key Performance Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Campaigns
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Send className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-3">{activeCampaigns.length}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Queue workers active</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sending Accounts
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Mail className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-3">{activeAccounts.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Active test/fake provider active
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Contacts
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-3">{mockContacts.length}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Ready for variable resolution</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Dispatch Rate
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-3">98.5%</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Worker throughput high</p>
          </div>
        </div>

        {/* Live Active Campaigns Tracker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Campaign Queue</h2>
              <p className="text-xs text-slate-500">Realtime progress via BullMQ worker queue</p>
            </div>
            <Link href="/campaigns" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all campaigns &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {mockCampaigns.map((cmp) => {
              const progressPct = Math.round((cmp.sentCount / (cmp.totalCount || 1)) * 100);
              return (
                <div
                  key={cmp.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{cmp.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          cmp.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-700'
                            : cmp.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cmp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Template: {cmp.templateName} &bull; {cmp.totalCount} Recipients
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>{progressPct}% sent</span>
                      <span>
                        {cmp.sentCount} / {cmp.totalCount}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Sending Accounts Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Connected Accounts</h2>
              <p className="text-xs text-slate-500">
                Provider-agnostic accounts with automated load balancing & limits.
              </p>
            </div>
            <Link href="/accounts" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Manage accounts &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockAccounts.map((acc) => (
              <div key={acc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">{acc.name}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      acc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{acc.email}</p>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Provider: <strong className="uppercase text-slate-800">{acc.provider}</strong></span>
                  <span>Sent: <strong>{acc.sentToday}</strong> / {acc.dailyLimit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
