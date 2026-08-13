"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { filesService } from '@/services/filesService';
import { accountsService } from '@/services/accountsService';
import { PCloudFile, PCloudAccount } from '@/types';
import {
  FolderSync,
  Upload,
  Plus,
  Trash2,
  Folder,
  FileText,
  Search,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  ExternalLink,
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

  // Upload Form
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stored, accs] = await Promise.all([
        filesService.getAll(),
        accountsService.getAll(),
      ]);
      setFiles(stored);
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setLoading(false);
    }
  };

  const browseRemote = async () => {
    try {
      setBrowsing(true);
      const items = await filesService.browsePCloud(selectedAccountId);
      setRemoteFiles(items);
    } catch (e) {
      console.error('Failed to browse pCloud:', e);
    } finally {
      setBrowsing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      browseRemote();
    }
  }, [selectedAccountId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', selectedAccountId);
      formData.append('folderId', '0');

      const uploaded = await filesService.upload(formData);
      setFiles([uploaded, ...files]);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setUploadName('');
      await browseRemote();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handleRegisterRemote = async (item: any) => {
    try {
      const registered = await filesService.registerExisting({
        name: item.name,
        fileId: item.fileId || `file-${Date.now()}`,
        folderId: item.folderId || '0',
        fileSize: item.size || 1024,
        mimeType: item.mimeType || 'application/pdf',
        pcloudAccountId: selectedAccountId,
        pcloudPath: item.path || `/${item.name}`,
      });

      setFiles([registered, ...files]);
      alert(`Registered "${item.name}" for campaign usage!`);
    } catch (err: any) {
      alert(`Failed to register file: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this pCloud file reference?')) {
      await filesService.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">pCloud Files & Vault</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                <FolderSync className="h-3 w-3" /> Storage Explorer
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Browse documents in connected pCloud accounts, upload campaign assets, and register sharing targets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:opacity-95 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload to pCloud
            </button>
          </div>
        </div>

        {/* pCloud Remote Browser Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-cyan-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Live pCloud Directory Explorer</h2>
                <p className="text-xs text-slate-500">Select an account to view its remote folders & documents</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountEmail})
                  </option>
                ))}
              </select>
              <button
                onClick={browseRemote}
                disabled={browsing}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Refresh Folder"
              >
                <RefreshCw className={`h-4 w-4 ${browsing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {remoteFiles.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-cyan-100/50 text-cyan-700 shrink-0">
                    {item.isFolder ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.isFolder ? 'Folder' : `${(item.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>

                {!item.isFolder && (
                  <button
                    onClick={() => handleRegisterRemote(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold shrink-0 transition-colors"
                  >
                    Select
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registered Campaign Files List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Campaign Documents</h2>
              <p className="text-xs text-slate-500">Documents registered for outbound sharing and transfers</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFiles.map((file) => (
              <div key={file.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{file.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      pCloud Ref: {file.fileId} &bull; {(file.fileSize / 1024).toFixed(1)} KB &bull; {file.mimeType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete File Reference"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Upload to pCloud */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Upload Document to pCloud</h3>
                <p className="text-xs text-slate-500">File will be stored directly into your pCloud storage vault.</p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Target pCloud Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountEmail})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Select File
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setUploadName(e.target.files[0].name);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold hover:opacity-95 shadow-sm flex items-center gap-1.5"
                  >
                    <Upload className="h-4 w-4" />
                    Upload & Register
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
