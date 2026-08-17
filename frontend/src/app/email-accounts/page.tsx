"use client";

import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { emailAccountsService, EmailAccount, CreateCustomSmtpPayload } from '@/services/emailAccountsService';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw, Server, Plus, X, AlertCircle } from 'lucide-react';

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showSmtpModal, setShowSmtpModal] = useState(false);

  // SMTP Form State
  const [smtpForm, setSmtpForm] = useState<CreateCustomSmtpPayload>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    accountEmail: '',
    fromName: '',
  });
  const [smtpError, setSmtpError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await emailAccountsService.getAll();
      setAccounts(data);
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
      const { url } = await emailAccountsService.getGmailOAuthUrl();
      window.location.href = url;
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Gmail OAuth is not configured');
      setBusy(null);
    }
  };

  const handleCreateSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpError('');
    setBusy('smtp_create');
    try {
      await emailAccountsService.createCustomSmtp({
        ...smtpForm,
        port: Number(smtpForm.port) || 587,
      });
      setShowSmtpModal(false);
      setSmtpForm({ host: '', port: 587, secure: false, user: '', pass: '', accountEmail: '', fromName: '' });
      setMessage('Custom SMTP sender verified and added successfully.');
      await load();
    } catch (err: any) {
      setSmtpError(err?.response?.data?.message || 'Failed to verify and save SMTP connection.');
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async (account: EmailAccount) => {
    const to = window.prompt('Test recipient email address');
    if (!to) return;
    setBusy(account.id);
    setMessage('');
    try {
      const response = await emailAccountsService.sendTestEmail(account.id, to);
      setMessage(`Test message accepted by ${response.provider}. Provider message ID: ${response.messageId}`);
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
      await emailAccountsService.remove(account.id);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Senders & Providers</h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect verified sender mailboxes (OAuth / Custom SMTP). A typed address alone is never treated as an authenticated sender.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSmtpModal(true)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold flex items-center gap-2 shadow-xs"
            >
              <Server className="h-4 w-4 text-slate-600" />
              Connect Custom SMTP
            </button>
            <button
              onClick={connectGmail}
              disabled={busy === 'gmail'}
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              <Mail className="h-4 w-4 text-emerald-400" />
              {busy === 'gmail' ? 'Preparing OAuth...' : 'Connect Gmail OAuth'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xs">
            {message}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Sending Accounts
            </div>
            <button
              onClick={() => void load()}
              className="text-slate-500 hover:text-slate-900 transition-colors p-1"
              aria-label="Refresh sender accounts"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading sender accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No authenticated sender accounts found. Connect Gmail OAuth or add a verified Custom SMTP relay above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <div key={account.id} className="p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{account.displayName || account.accountEmail}</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 uppercase">
                        {account.provider}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {account.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{account.accountEmail}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void sendTest(account)}
                      disabled={busy === account.id}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Test Send
                    </button>
                    <button
                      onClick={() => void remove(account)}
                      disabled={busy === account.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Delete sender account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom SMTP Modal */}
        {showSmtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Connect Custom SMTP Sender</h3>
                </div>
                <button onClick={() => setShowSmtpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {smtpError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{smtpError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSmtp} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">From Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="outreach@company.com"
                      value={smtpForm.accountEmail}
                      onChange={(e) => setSmtpForm({ ...smtpForm, accountEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Display Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Alex Morgan"
                      value={smtpForm.fromName || ''}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">SMTP Server Host *</label>
                    <input
                      type="text"
                      required
                      placeholder="smtp.sendgrid.net / smtp.mailgun.org"
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Port *</label>
                    <input
                      type="number"
                      required
                      placeholder="587"
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SMTP Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="apikey / user@company.com"
                      value={smtpForm.user}
                      onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SMTP Password / API Key *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={smtpForm.pass}
                      onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowSmtpModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy === 'smtp_create'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy === 'smtp_create' ? 'Verifying Handshake...' : 'Verify & Connect Sender'}
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
