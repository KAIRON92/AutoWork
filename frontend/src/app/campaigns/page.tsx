"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockCampaigns } from '@/services/mockData';
import { campaignsService } from '@/services/campaignsService';
import { Campaign } from '@/types';
import { Send, Plus, Play, Pause, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = campaigns.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const handleLaunch = async (id: string) => {
    const updated = await campaignsService.launchCampaign(id);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handlePause = async (id: string) => {
    const updated = await campaignsService.pauseCampaign(id);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Campaigns</h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, launch, pause, and track outbound automated email campaigns.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign Wizard
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'PROCESSING', 'QUEUED', 'DRAFT', 'COMPLETED', 'PAUSED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Campaign Cards List */}
        <div className="space-y-4">
          {filtered.map((cmp) => {
            const pct = Math.round((cmp.sentCount / (cmp.totalCount || 1)) * 100);
            return (
              <div
                key={cmp.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 text-lg">{cmp.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        cmp.status === 'PROCESSING'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : cmp.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : cmp.status === 'DRAFT'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {cmp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Template: <strong>{cmp.templateName || cmp.templateId}</strong> &bull; Accounts:{' '}
                    <strong>{cmp.accountIds.length} connected</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">Created: {new Date(cmp.createdAt).toLocaleString()}</p>
                </div>

                {/* Progress & Controls */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-full md:w-56 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{pct}% Sent</span>
                      <span>
                        {cmp.sentCount} / {cmp.totalCount}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cmp.status === 'PROCESSING' ? (
                      <button
                        onClick={() => handlePause(cmp.id)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pause Queue
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLaunch(cmp.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Launch Campaign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
