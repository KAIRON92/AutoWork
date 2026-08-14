"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { accountsService } from '@/services/accountsService';
import { PCloudAccount } from '@/types';
import { Cloud, Plus, CheckCircle2, PauseCircle, Trash2, ShieldCheck, Check, RefreshCw } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<PCloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [dailyLimit, setDailyLimit] = useState(500);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setAccounts(await accountsService.getAll());
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleToggle = async (id: string) => {
    try {
      const updated = await accountsService.toggleStatus(id);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) { console.error('Toggle status failed:', err); }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const res = await accountsService.testConnection(id);
      setTestResult({ id, success: res.connected, message: res.message });
      await fetchAccounts();
    } catch (err: any) {
      setTestResult({ id, success: false, message: err.response?.data?.message || err.message || 'Connection test failed' });
    } finally { setTestingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this pCloud account?')) {
      await accountsService.delete(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountEmail || !accessToken) return;
    try {
      const newAcc = await accountsService.create({ name, accountEmail, provider: 'pcloud', accessToken, dailyLimit: Number(dailyLimit) });
      setAccounts((prev) => [newAcc, ...prev]);
      setIsModalOpen(false);
      setName(''); setAccountEmail(''); setAccessToken('');
    } catch (err: any) {
      alert(`Error connecting pCloud account: ${err.response?.data?.message || err.message || 'Connection failed'}`);
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">pCloud Accounts</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Cloud className="h-3 w-3" /> Multi-Account Architecture</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Connect and manage authenticated production pCloud accounts for file transfers and sharing.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold shadow-md flex items-center gap-2"><Plus className="h-4 w-4" />Connect pCloud Account</button>
        </div>

        <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">Production pCloud connection</p>
            <p>Only the official pCloud REST API is enabled here. Passwords are used only for the login exchange; the resulting auth token is encrypted at rest and never returned to the browser.</p>
          </div>
        </div>

        {testResult && <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}><div className="flex items-center gap-2">{testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}<span>{testResult.message}</span></div><button onClick={() => setTestResult(null)} className="text-xs font-bold hover:underline">Dismiss</button></div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const isMock = acc.provider === 'mock_pcloud';
            return (
              <div key={acc.id} className={`bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between space-y-4 ${isMock ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Cloud className="h-5 w-5 text-cyan-600" /><span className="font-bold text-slate-900 text-base">{acc.name}</span></div><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${acc.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}><span className={`h-2 w-2 rounded-full ${acc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>{acc.status}</span></div>
                  <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 truncate">{acc.accountEmail}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block text-[10px] uppercase font-semibold">Engine</span><span className={`font-bold uppercase ${isMock ? 'text-amber-700' : 'text-slate-800'}`}>{isMock ? 'MOCK / DRY RUN' : 'PCLOUD PRODUCTION'}</span></div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="text-slate-400 block text-[10px] uppercase font-semibold">Daily Transfers</span><span className="font-bold text-slate-800">{acc.sentToday} / {acc.dailyLimit}</span></div>
                  </div>
                  {!isMock && acc.lastUsedAt && <div className="text-[11px] text-emerald-700 font-semibold">Verified against pCloud API on {new Date(acc.lastUsedAt).toLocaleString()}</div>}
                  {isMock && <div className="text-[11px] text-amber-700 font-semibold">Dry-run account. Disconnect it before client handover.</div>}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleTestConnection(acc.id)} disabled={testingId === acc.id || isMock} className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${testingId === acc.id ? 'animate-spin' : ''}`} />{testingId === acc.id ? 'Testing...' : 'Test Auth'}</button>
                  <button onClick={() => handleToggle(acc.id)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${acc.status === 'ACTIVE' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 text-white'}`}>{acc.status === 'ACTIVE' ? <><PauseCircle className="h-3.5 w-3.5" />Pause</> : <><CheckCircle2 className="h-3.5 w-3.5" />Activate</>}</button>
                  <button onClick={() => handleDelete(acc.id)} className="p-2 rounded-lg border border-slate-200 text-rose-600" title="Disconnect Account"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>

        {isModalOpen && <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4"><h3 className="text-lg font-bold text-slate-900">Connect Production pCloud Account</h3><p className="text-xs text-slate-500">Official pCloud REST API only. Credentials are verified before anything is stored.</p></div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Friendly Name</label><input type="text" required placeholder="e.g. Client Premium Account" value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">pCloud Registered Email</label><input type="email" required placeholder="pcloud-user@yourcompany.com" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Engine / Adapter Type</label><input readOnly value="Official pCloud REST API (Production)" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">pCloud Access Token or Account Password</label><input type="password" required placeholder="Paste access token or enter account password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono" /><p className="text-[11px] text-slate-500 mt-1">For a password, AutoWork exchanges it for a pCloud auth token and does not store the password.</p></div>
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Daily Share/Transfer Cap</label><input type="number" min="1" max="10000" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" /></div>
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold flex items-center gap-1.5"><Check className="h-4 w-4" />Verify & Save Production Account</button></div>
          </form>
        </div></div>}
      </div>
    </Shell>
  );
}
