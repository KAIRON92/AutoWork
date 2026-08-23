"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { campaignsService } from '@/services/campaignsService';
import { Campaign } from '@/types';
import {
  Share2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud,
  FolderSync,
  Trash2,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await campaignsService.getAll();
      setCampaigns(data);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = campaigns.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const handleLaunch = async (id: string) => {
    try {
      await campaignsService.launch(id);
      await fetchCampaigns();
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await campaignsService.pause(id);
      await fetchCampaigns();
    } catch (err: any) {
      alert(`Pause error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await campaignsService.delete(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">pCloud Share Campaigns</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Share2 className="h-3 w-3" /> Distribution Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Automate multi-recipient document sharing and folder transfers with personalized variable resolution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCampaigns}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh Campaigns"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/campaigns/new"
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:opacity-95 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New 8-Step Campaign
            </Link>
          </div>
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
            const total = cmp.totalCount || 1;
            const shared = cmp.sharedCount || 0;
            const failed = cmp.failedCount || 0;
            const pct = Math.round((shared / total) * 100);

            const isAllFailed = cmp.status === 'COMPLETED' && shared === 0 && failed > 0;
            const isPartial = cmp.status === 'COMPLETED' && shared > 0 && failed > 0;

            let deliveryMode = 'PCLOUD_NATIVE';
            try {
              const cfg = JSON.parse(cmp.config || '{}');
              if (cfg.deliveryMode) deliveryMode = cfg.deliveryMode;
              else if (cmp.emailAccountId) deliveryMode = 'EMAIL';
            } catch {
              if (cmp.emailAccountId) deliveryMode = 'EMAIL';
            }
            const isEmail = deliveryMode === 'EMAIL';

            return (
              <div
                key={cmp.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-lg">{cmp.name}</h3>

                    {/* Delivery Channel Badge */}
                    {isEmail ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Mail className="h-3.5 w-3.5 text-indigo-600" />
                        Email SMTP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <Cloud className="h-3.5 w-3.5 text-cyan-600" />
                        pCloud Native
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        cmp.status === 'PROCESSING'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse'
                          : isAllFailed
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isPartial
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : cmp.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : cmp.status === 'DRAFT'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isAllFailed ? 'FAILED (0 DELIVERED)' : isPartial ? 'PARTIAL DELIVERY' : cmp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      {isEmail ? (
                        <>
                          <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                            <Mail className="h-3 w-3" />
                          </span>
                          Sender: <strong className="text-slate-800">{cmp.emailAccount?.accountEmail || 'SMTP Account'}</strong>
                        </>
                      ) : (
                        <>
                          <span className="p-1 rounded-md bg-cyan-100 text-cyan-700">
                            <Cloud className="h-3 w-3" />
                          </span>
                          pCloud: <strong className="text-slate-800">{cmp.pcloudAccount?.accountEmail || cmp.pcloudAccount?.name || 'pCloud'}</strong>
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderSync className="h-3.5 w-3.5 text-blue-600" />
                      Document: <strong className="text-slate-800">{cmp.pcloudFile?.name || 'Document'}</strong>
                    </span>
                    <span>Template: <strong className="text-slate-800">{cmp.template?.name || 'Executive Share'}</strong></span>
                  </p>
                  <p className="text-[11px] text-slate-400">Created: {new Date(cmp.createdAt).toLocaleString()}</p>
                </div>

                {/* Progress & Controls */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-full md:w-56 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{pct}% Shared</span>
                      <span>
                        <strong className="text-emerald-600">{shared}</strong> shared / {total}
                        {failed > 0 && <span className="text-rose-600 ml-1">({failed} failed)</span>}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isAllFailed ? 'bg-rose-500' : 'bg-linear-to-r from-blue-600 to-cyan-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cmp.status === 'PROCESSING' || cmp.status === 'QUEUED' ? (
                      <button
                        onClick={() => handlePause(cmp.id)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        {cmp.status === 'QUEUED' ? 'Queued (Pause)' : 'Pause'}
                      </button>
                    ) : cmp.status === 'COMPLETED' ? (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLaunch(cmp.id)}
                        className="px-3.5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:opacity-95 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Launch
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(cmp.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
