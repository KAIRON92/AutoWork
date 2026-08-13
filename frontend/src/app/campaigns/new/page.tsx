"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { accountsService } from '@/services/accountsService';
import { filesService } from '@/services/filesService';
import { contactsService } from '@/services/contactsService';
import { templatesService } from '@/services/templatesService';
import { campaignsService } from '@/services/campaignsService';
import { PCloudAccount, PCloudFile, ContactList, Template } from '@/types';
import {
  Share2,
  Cloud,
  FolderSync,
  Users,
  FileText,
  Settings2,
  CheckCircle2,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  // Loaded Data
  const [accounts, setAccounts] = useState<PCloudAccount[]>([]);
  const [files, setFiles] = useState<PCloudFile[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

  // Form State
  const [name, setName] = useState('Enterprise pCloud Distribution Q3');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [shareType, setShareType] = useState<'sharefolder' | 'uploadtransfer'>('sharefolder');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [accs, storedFiles, contactLists, tpls] = await Promise.all([
          accountsService.getAll(),
          filesService.getAll(),
          contactsService.getAllLists(),
          templatesService.getAll(),
        ]);
        setAccounts(accs);
        setFiles(storedFiles);
        setLists(contactLists);
        setTemplates(tpls);

        if (accs.length > 0) setSelectedAccountId(accs[0].id);
        if (storedFiles.length > 0) setSelectedFileId(storedFiles[0].id);
        if (contactLists.length > 0) setSelectedListId(contactLists[0].id);
        if (tpls.length > 0) setSelectedTemplateId(tpls[0].id);
      } catch (e) {
        console.error('Failed to init wizard:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedFile = files.find((f) => f.id === selectedFileId);
  const selectedList = lists.find((l) => l.id === selectedListId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Trigger preview when reaching Step 7
  useEffect(() => {
    if (step === 7 && selectedTemplate) {
      templatesService.preview(selectedTemplate.content).then(setPreviewData).catch(console.error);
    }
  }, [step, selectedTemplate]);

  const handleLaunch = async () => {
    if (!selectedAccountId || !selectedFileId || !selectedTemplateId) {
      alert('Please complete all required selections');
      return;
    }

    try {
      setIsLaunching(true);
      const newCamp = await campaignsService.create({
        name,
        pcloudAccountId: selectedAccountId,
        pcloudFileId: selectedFileId,
        templateId: selectedTemplateId,
        contactListId: selectedListId || undefined,
        config: {
          shareType,
          rateLimitPerMinute,
        },
      });

      await campaignsService.launch(newCamp.id);
      router.push('/campaigns');
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const stepsLabels = [
    '1. Details',
    '2. Account',
    '3. Document',
    '4. Audience',
    '5. Template',
    '6. Config',
    '7. Review',
    '8. Launch',
  ];

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">8-Step pCloud Campaign Wizard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
              Orchestrator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure multi-tenant document distributions, resolve personalized template tokens, and execute via pCloud.
          </p>

          {/* 8-Step Progress Indicator */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mt-6 pt-4 border-t border-slate-100 text-center text-[11px]">
            {stepsLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isPast = step > stepNum;
              return (
                <div
                  key={label}
                  onClick={() => setStep(stepNum as any)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-xs'
                      : isPast
                      ? 'bg-cyan-50 text-cyan-800 font-semibold'
                      : 'bg-slate-50 text-slate-400 font-medium'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Campaign Details */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 1 — Campaign Details</h2>
            <p className="text-xs text-slate-500">Provide an identifier for tracking this distribution in execution logs.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Campaign Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Select pCloud Account</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select pCloud Account */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 2 — Select pCloud Account</h2>
            <p className="text-xs text-slate-500">
              Explicitly choose which authorized pCloud account will execute this campaign's file shares/transfers.
            </p>

            <div className="space-y-3">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-cyan-500 bg-cyan-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className={`h-5 w-5 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{acc.name}</p>
                        <p className="text-xs font-mono text-slate-500">{acc.accountEmail} &bull; Engine: {acc.provider}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">Daily Cap: {acc.dailyLimit}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Select pCloud File</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select pCloud File */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 3 — Select pCloud File / Document</h2>
            <p className="text-xs text-slate-500">
              Select the registered pCloud document or folder to be shared with each recipient.
            </p>

            <div className="space-y-3">
              {files.map((file) => {
                const isSelected = selectedFileId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-cyan-500 bg-cyan-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FolderSync className={`h-5 w-5 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{file.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          Ref: {file.fileId} &bull; {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600">{file.mimeType}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Select Recipients</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Recipient List */}
        {step === 4 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 4 — Select Recipient List</h2>
            <p className="text-xs text-slate-500">
              Choose the target contact audience list extracted from your CSV / Excel imports.
            </p>

            <div className="space-y-3">
              {lists.map((lst) => {
                const isSelected = selectedListId === lst.id;
                return (
                  <div
                    key={lst.id}
                    onClick={() => setSelectedListId(lst.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-cyan-500 bg-cyan-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className={`h-5 w-5 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{lst.name}</p>
                        <p className="text-xs text-slate-500">{lst.description || 'Imported contact group'}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {lst.memberCount || 0} Contacts
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Select Template</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Select Description Template */}
        {step === 5 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 5 — Select Description Template</h2>
            <p className="text-xs text-slate-500">
              Choose the message template that will be resolved with personalized variables and #RANDOM# security codes.
            </p>

            <div className="space-y-3">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      isSelected ? 'border-cyan-500 bg-cyan-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-700 bg-cyan-100/50 px-2 py-0.5 rounded">
                        #RANDOM# Enabled
                      </span>
                    </div>
                    <pre className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap font-sans">
                      {tpl.content}
                    </pre>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(4)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Configuration</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Configuration */}
        {step === 6 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 6 — Execution Configuration</h2>
            <p className="text-xs text-slate-500">Tune operational mode and dispatch velocity.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  pCloud Operation Method
                </label>
                <select
                  value={shareType}
                  onChange={(e: any) => setShareType(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="sharefolder">Folder Sharing Endpoint (https://api.pcloud.com/sharefolder)</option>
                  <option value="uploadtransfer">Direct Upload Transfer Endpoint (https://api.pcloud.com/uploadtransfer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Rate Limit (Operations / Minute)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(5)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(7)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Review & Preview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Review & Preview */}
        {step === 7 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 7 — Pre-Flight Review & Live Resolution Preview</h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Campaign Name</span>
                <span className="font-bold text-slate-900 text-sm">{name}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">pCloud Account</span>
                <span className="font-bold text-slate-900">{selectedAccount?.name} ({selectedAccount?.accountEmail})</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">pCloud File</span>
                <span className="font-bold text-slate-900">{selectedFile?.name}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Audience Count</span>
                <span className="font-bold text-slate-900">{selectedList?.memberCount || 0} Target Recipients</span>
              </div>
            </div>

            {/* Resolved Sample Description */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Sample Resolved Description (Recipient: Alex Morgan)
                </span>
                {previewData && (
                  <span className="text-[10px] font-mono bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded text-cyan-300">
                    Generated #RANDOM#: {previewData.randomCodeGenerated}
                  </span>
                )}
              </div>
              <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-700">
                {previewData ? previewData.resolvedPreview : selectedTemplate?.content}
              </pre>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(6)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={() => setStep(8)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>Proceed to Start</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 8: Start / Launch */}
        {step === 8 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Rocket className="h-8 w-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Ready to Launch pCloud Campaign</h2>
              <p className="text-xs text-slate-500">
                Upon launch, jobs will be enqueued in Redis BullMQ. The worker will resolve template variables and execute file shares via the official pCloud adapter.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setStep(7)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                Back to Review
              </button>
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:opacity-95 flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Rocket className="h-4 w-4" />
                {isLaunching ? 'Enqueueing Jobs...' : 'Confirm & Launch Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
