"use client";

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { apiClient } from '@/services/apiClient';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw } from 'lucide-react';

interface EmailAccount {
  id: string;
  provider: string;
  accountEmail: string;
  displayName?: string | null;
  status: string;
}

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/v1/email/accounts');
      setAccounts(response.data);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Unable to load sender accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const connectGmail = async () => {
    setBusy('gmail');
    setMessage('');
    try {
      const response = await apiClient.get('/v1/email/accounts/gmail/oauth-url');
      window.location.href = response.data.url;
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Gmail OAuth is not configured');
      setBusy(null);
    }
  };

  const sendTest = async (account: EmailAccount) => {
    const to = window.prompt('Test recipient email address');
    if (!to) return;
    setBusy(account.id);
    setMessage('');
    try {
      const response = await apiClient.post(`/v1/email/accounts/${account.id}/test`, { to });
      setMessage(`Test message accepted by ${response.data.provider}. Provider message ID: ${response.data.messageId}`);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Controlled sender test failed');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (account: EmailAccount) => {
    if (!window.confirm(`Remove ${account.accountEmail} from AutoWork?`)) return;
    setBusy(account.id);
    try {
      await apiClient.delete(`/v1/email/accounts/${account.id}`);
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Unable to remove sender account');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Accounts</h1>
            <p className="text-sm text-slate-500 mt-1">Connect verified sender mailboxes. An address alone is never treated as an authenticated sender.</p>
          </div>
          <button onClick={connectGmail} disabled={busy === 'gmail'} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            <Mail className="h-4 w-4" />
            {busy === 'gmail' ? 'Preparing OAuth...' : 'Connect Gmail'}
          </button>
        </div>

        {message && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div>}

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />Verified Senders</div>
            <button onClick={() => void load()} className="text-slate-500 hover:text-slate-900" aria-label="Refresh sender accounts"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading sender accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No authenticated sender accounts are connected.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <div key={account.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{account.displayName || account.accountEmail}</p>
                    <p className="text-xs text-slate-500 truncate">{account.accountEmail} · {account.provider}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${account.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{account.status}</span>
                    {account.status === 'VERIFIED' && <button onClick={() => void sendTest(account)} disabled={busy === account.id} className="px-3 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Send className="h-3.5 w-3.5 inline mr-1.5" />Test</button>}
                    <button onClick={() => void remove(account)} disabled={busy === account.id} className="p-2 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label={`Remove ${account.accountEmail}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
