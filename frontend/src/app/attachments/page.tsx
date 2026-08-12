"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockAttachments, storageService } from '@/services/storageService';
import { Attachment } from '@/types';
import { Paperclip, Upload, CheckCircle2, Cloud, FileText, Trash2 } from 'lucide-react';

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>(mockAttachments);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const newAtt = await storageService.uploadAttachment(file);
      setAttachments([newAtt, ...attachments]);
      setIsUploading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">pCloud Attachments</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold flex items-center gap-1">
                <Cloud className="h-3 w-3 text-sky-500" />
                pCloud REST API Connected
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Upload campaign file attachments stored securely on pCloud API.
            </p>
          </div>
          <label className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading to pCloud...' : 'Upload Attachment'}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {/* Attachment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attachments.map((att) => (
            <div key={att.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{att.filename}</h3>
                    <p className="text-xs text-slate-400">
                      {(att.fileSize / 1024 / 1024).toFixed(2)} MB &bull; {att.mimeType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-[10px]">pCloud ID: {att.pcloudFileId}</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Synced
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
