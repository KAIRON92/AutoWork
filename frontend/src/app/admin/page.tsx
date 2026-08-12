"use client";

import { Shell } from '@/components/layout/shell';
import { ShieldCheck, Activity, Server, Cpu, Database, Cloud, Zap, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin System Console</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                System Healthy
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Global infrastructure metrics, worker queue status, and provider adapter configurations.
            </p>
          </div>
        </div>

        {/* System Health Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">BullMQ Workers</span>
              <Server className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">3 Workers</p>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Email, Import & Campaign queues
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Redis Connection</span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">Connected</p>
            <p className="text-xs text-slate-500 font-mono">localhost:6379</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">pCloud Storage</span>
              <Cloud className="h-4 w-4 text-sky-500" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">Adapter Active</p>
            <p className="text-xs text-sky-600 font-semibold">Env Token Configured</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Email Provider</span>
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">Fake Provider</p>
            <p className="text-xs text-slate-500 font-medium">Awaiting Gmail/MS365 sign-off</p>
          </div>
        </div>

        {/* Integration Status Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Integration & Adapter Status Matrix
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">FakeEmailAdapter (Active Test Provider)</p>
                <p className="text-slate-500">Simulates 150ms delay with 98% mock delivery success rate.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">READY / ACTIVE</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">PCloudStorageAdapter (Confirmed Attachment Storage)</p>
                <p className="text-slate-500">Communicates directly with https://api.pcloud.com via environment keys.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">READY / ACTIVE</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">Gmail / Microsoft 365 / SMTP Adapters</p>
                <p className="text-slate-500">Placeholders wired behind Provider-Agnostic IEmailAdapter interface.</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold">PENDING CONFIRMATION</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
