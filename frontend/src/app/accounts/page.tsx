"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockAccounts } from '@/services/mockData';
import { accountsService } from '@/services/accountsService';
import { EmailAccount } from '@/types';
import { Mail, Plus, CheckCircle2, PauseCircle, Trash2, ShieldAlert, Check } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>(mockAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState<'fake' | 'gmail' | 'microsoft' | 'smtp'>('fake');
  const [dailyLimit, setDailyLimit] = useState(500);

  const handleToggle = async (id: string) => {
    const updated = await accountsService.toggleStatus(id);
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this sending account?')) {
      await accountsService.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newAcc = await accountsService.createAccount({
      name,
      email,
      provider,
      dailyLimit: Number(dailyLimit),
    });

    setAccounts([newAcc, ...accounts]);
    setIsModalOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Accounts</h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect authorized sending accounts. Active provider: <strong>Fake Email Provider</strong>.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Connect Account
          </button>
        </div>

        {/* Notice Banner regarding Provider Adapter */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">Provider Adapter Notice (Blueprint Section 11)</p>
            <p>
              The platform is operating with the provider-agnostic <code>FakeEmailAdapter</code>. Gmail, Microsoft 365, and SMTP options remain available in the interface as placeholders until your organization sign-off confirms the real provider credentials.
            </p>
          </div>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-base">{acc.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      acc.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        acc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    {acc.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{acc.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Provider</span>
                    <span className="font-bold text-slate-800 uppercase">{acc.provider}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Daily Cap</span>
                    <span className="font-bold text-slate-800">{acc.sentToday} / {acc.dailyLimit}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleToggle(acc.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    acc.status === 'ACTIVE'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {acc.status === 'ACTIVE' ? (
                    <>
                      <PauseCircle className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activate
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(acc.id)}
                  className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                  title="Disconnect Account"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Connect Account */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Connect Email Sending Account</h3>
                <p className="text-xs text-slate-500">Configure provider parameters and daily limit.</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Account Friendly Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Outbound 01"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Sender Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="outbound@yourcompany.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email Provider Adapter
                  </label>
                  <select
                    value={provider}
                    onChange={(e: any) => setProvider(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="fake">Fake Email Provider (Active Test Adapter)</option>
                    <option value="gmail">Google Workspace / Gmail (Awaiting Confirmation)</option>
                    <option value="microsoft">Microsoft 365 / Outlook (Awaiting Confirmation)</option>
                    <option value="smtp">Custom SMTP Server (Awaiting Confirmation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Daily Sending Cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    Validate & Save Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
