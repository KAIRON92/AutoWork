"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { filesService } from '@/services/filesService';
import { accountsService } from '@/services/accountsService';
import { PCloudFile, PCloudAccount } from '@/types';
import {
  FolderSync,
  Upload,
  Trash2,
  Folder,
  FileText,
  Search,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

export default function PCloudFilesPage() {
  const [files, setFiles] = useState<PCloudFile[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<PCloudAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [browsing, setBrowsing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeAccounts = accounts.filter((account) => account.provider === 'pcloud' && account.status === 'ACTIVE');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const [stored, accs] = await Promise.all([filesService.getAll(), accountsService.getAll()]);
      setFiles(stored);
      setAccounts(accs);
      const firstActive = accs.find((account) => account.provider === 'pcloud' && account.status === 'ACTIVE');
      if (firstActive && !selectedAccountId) setSelectedAccountId(firstActive.id);
      if (!firstActive) setSelectedAccountId('');
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || e.message || 'Failed to load pCloud data.');
    } finally {
      setLoading(false);
    }
  };

  const browseRemote = async () => {
    if (!selectedAccountId) {
      setRemoteFiles([]);
      return;
    }
    try {
      setBrowsing(true);
      setErrorMessage('');
      const items = await filesService.browsePCloud(selectedAccountId);
      setRemoteFiles(items);
    } catch (e: any) {
      setRemoteFiles([]);
      setErrorMessage(e.response?.data?.message || e.message || 'Unable to browse the selected pCloud account.');
    } finally {
      setBrowsing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedAccountId) browseRemote(); }, [selectedAccountId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fileInput = form.elements.namedItem('uploadFile') as HTMLInputElement | null;
    const selectedFile = fileInput?.files?.[0];
    if (!selectedFile || !selectedAccountId) {
      setErrorMessage('Select an active pCloud account and a file before uploading.');
      return;
    }

    try {
      setErrorMessage('');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', selectedAccountId);
      formData.append('folderId', '0');
      const uploaded = await filesService.upload(formData);
      setFiles((prev) => [uploaded, ...prev]);
      setIsUploadModalOpen(false);
      await browseRemote();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Upload failed.');
    }
  };

  const handleRegisterRemote = async (item: any) => {
    try {
      setErrorMessage('');
      const registered = await filesService.registerExisting({
        name: item.name,
        fileId: item.fileId || `file-${Date.now()}`,
        folderId: item.folderId || '0',
        fileSize: item.size || 1024,
        mimeType: item.mimeType || 'application/pdf',
        pcloudAccountId: selectedAccountId,
        pcloudPath: item.path || `/${item.name}`,
      });
      setFiles((prev) => [registered, ...prev]);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to register file.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this pCloud file reference?')) {
      await filesService.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">pCloud Files & Vault</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200"><FolderSync className="h-3 w-3" /> Storage Explorer</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Browse documents in connected pCloud accounts, upload campaign assets, and register sharing targets.</p>
          </div>
          <div className="flex items-center gap-3">
            <button disabled={!activeAccounts.length} onClick={() => { setErrorMessage(''); setIsUploadModalOpen(true); }} className="px-4 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"><Upload className="h-4 w-4" />Upload to pCloud</button>
          </div>
        </div>

        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage}</div>}

        {!loading && activeAccounts.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">No active production pCloud account is connected. Connect and successfully verify a real pCloud account on <strong>pCloud Accounts</strong> before browsing or uploading.</div>}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-cyan-600" /><div><h2 className="text-base font-bold text-slate-900">Live pCloud Directory Explorer</h2><p className="text-xs text-slate-500">Select an active account to view its remote folders and documents.</p></div></div>
            <div className="flex items-center gap-2">
              <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} disabled={!activeAccounts.length} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium disabled:opacity-50">
                <option value="">Select active account</option>
                {activeAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountEmail})</option>)}
              </select>
              <button onClick={browseRemote} disabled={browsing || !selectedAccountId} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50" title="Refresh Folder"><RefreshCw className={`h-4 w-4 ${browsing ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {remoteFiles.map((item, idx) => <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="p-2 rounded-lg bg-cyan-100/50 text-cyan-700 shrink-0">{item.isFolder ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div><div className="min-w-0"><p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p><p className="text-[11px] text-slate-400">{item.isFolder ? 'Folder' : `${(item.size / 1024).toFixed(1)} KB`}</p></div></div>{!item.isFolder && <button onClick={() => handleRegisterRemote(item)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold shrink-0">Select</button>}</div>)}
            {!browsing && selectedAccountId && remoteFiles.length === 0 && !errorMessage && <div className="col-span-full text-sm text-slate-500 py-8 text-center">The connected pCloud root contains no visible items.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900">Registered Campaign Documents</h2><p className="text-xs text-slate-500">Documents registered for outbound sharing and transfers.</p></div><div className="relative w-full sm:w-64"><Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" /><input type="text" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2" /></div></div>
          <div className="divide-y divide-slate-100">
            {filteredFiles.map((file) => <div key={file.id} className="py-3.5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></div><div><h3 className="text-sm font-semibold text-slate-900">{file.name}</h3><p className="text-xs text-slate-400 font-mono">pCloud Ref: {file.fileId} &bull; {(file.fileSize / 1024).toFixed(1)} KB &bull; {file.mimeType}</p></div></div><div className="flex items-center gap-2"><span className="text-xs text-slate-400 hidden sm:inline">{new Date(file.createdAt).toLocaleDateString()}</span><button onClick={() => handleDelete(file.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete File Reference"><Trash2 className="h-4 w-4" /></button></div></div>)}
            {!loading && filteredFiles.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No registered campaign documents.</div>}
          </div>
        </div>

        {isUploadModalOpen && <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3"><h3 className="text-lg font-bold text-slate-900">Upload Document to pCloud</h3><p className="text-xs text-slate-500">The file will be stored in the selected production pCloud account.</p></div>
          <form onSubmit={handleUpload} className="space-y-4">
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target pCloud Account</label><select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} required className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2">{activeAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountEmail})</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select File</label><input name="uploadFile" type="file" required className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" /></div>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100"><button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={!selectedAccountId} className="px-4 py-2 rounded-lg bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"><Upload className="h-4 w-4" />Upload & Register</button></div>
          </form>
        </div></div>}
      </div>
    </Shell>
  );
}
