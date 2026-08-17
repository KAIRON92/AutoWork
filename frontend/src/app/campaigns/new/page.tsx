"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { accountsService } from '@/services/accountsService';
import { emailAccountsService, EmailAccount } from '@/services/emailAccountsService';
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
  Mail,
  Paperclip,
  Link2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  // Loaded Data
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [pcloudAccounts, setPCloudAccounts] = useState<PCloudAccount[]>([]);
  const [files, setFiles] = useState<PCloudFile[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

  // Form State
  const [name, setName] = useState('Enterprise Document Distribution Q3');
  const [deliveryMode, setDeliveryMode] = useState<'EMAIL' | 'PCLOUD_NATIVE'>('EMAIL');
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState<string>('');
  const [selectedPCloudAccountId, setSelectedPCloudAccountId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [attachmentMode, setAttachmentMode] = useState<'ATTACHMENT' | 'DIRECT_LINK' | 'BOTH'>('ATTACHMENT');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [shareType, setShareType] = useState<'sharefolder' | 'uploadtransfer'>('uploadtransfer');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [emailAccs, pcloudAccs, storedFiles, contactLists, tpls] = await Promise.all([
          emailAccountsService.getAll(),
          accountsService.getAll(),
          filesService.getAll(),
          contactsService.getAllLists(),
          templatesService.getAll(),
        ]);
        const verifiedEmail = emailAccs.filter((a) => a.status === 'VERIFIED');
        setEmailAccounts(verifiedEmail);
        setPCloudAccounts(pcloudAccs);
        setFiles(storedFiles);
        setLists(contactLists);
        setTemplates(tpls);

        if (verifiedEmail.length > 0) setSelectedEmailAccountId(verifiedEmail[0].id);
        if (pcloudAccs.length > 0) setSelectedPCloudAccountId(pcloudAccs[0].id);
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

  const selectedEmailAccount = emailAccounts.find((a) => a.id === selectedEmailAccountId);
  const selectedPCloudAccount = pcloudAccounts.find((a) => a.id === selectedPCloudAccountId);
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
    if (deliveryMode === 'EMAIL' && !selectedEmailAccountId) {
      alert('Please select an authenticated sender email account');
      return;
    }
    if (!selectedPCloudAccountId || !selectedFileId || !selectedTemplateId) {
      alert('Please complete all required selections');
      return;
    }

    try {
      setIsLaunching(true);
      const newCamp = await campaignsService.create({
        name,
        emailAccountId: deliveryMode === 'EMAIL' ? selectedEmailAccountId : undefined,
        pcloudAccountId: selectedPCloudAccountId,
        pcloudFileId: selectedFileId,
        templateId: selectedTemplateId,
        contactListId: selectedListId || undefined,
        config: {
          deliveryMode,
          attachmentMode,
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
    '2. Sender',
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Creation Wizard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
              Orchestrator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure multi-tenant document distributions, resolve dynamic template variables, and execute via verified Email or pCloud.
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

        {/* Step 1: Details & Delivery Mode */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900">Step 1 — Details & Delivery Channel</h2>
            <p className="text-xs text-slate-500">Provide an identifier and choose the primary distribution channel.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Campaign Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Delivery Mode *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDeliveryMode('EMAIL')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    deliveryMode === 'EMAIL'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className={`h-5 w-5 ${deliveryMode === 'EMAIL' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-bold text-slate-900">Verified Email Distribution (Default)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sends branded, personalized emails directly from your verified Gmail, Microsoft, or Custom SMTP sender account with the pCloud document attached or linked.
                  </p>
                </div>

                <div
                  onClick={() => setDeliveryMode('PCLOUD_NATIVE')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    deliveryMode === 'PCLOUD_NATIVE'
                      ? 'border-cyan-600 bg-cyan-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className={`h-5 w-5 ${deliveryMode === 'PCLOUD_NATIVE' ? 'text-cyan-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-bold text-slate-900">pCloud Native Transfer / Share</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Executes direct pCloud file transfers (/uploadtransfer) or folder collaborations (/sharefolder) sent via pCloud notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Select Sender <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Sender Selection */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {deliveryMode === 'EMAIL' ? 'Step 2 — Select Authenticated Email Sender' : 'Step 2 — Select pCloud Account'}
            </h2>
            <p className="text-xs text-slate-500">
              {deliveryMode === 'EMAIL'
                ? 'Select a verified mailbox (Gmail OAuth / Microsoft / Custom SMTP). Unauthenticated email addresses are rejected.'
                : 'Select the authenticated pCloud account that holds your assets.'}
            </p>

            {deliveryMode === 'EMAIL' ? (
              emailAccounts.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600 space-y-2">
                  <p>No verified email sender accounts found for this organization.</p>
                  <a href="/email-accounts" className="text-blue-600 font-bold hover:underline inline-block">
                    + Connect Gmail OAuth or Custom SMTP Sender
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {emailAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedEmailAccountId(acc.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedEmailAccountId === acc.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{acc.displayName || acc.accountEmail}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 uppercase">
                          {acc.provider}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{acc.accountEmail}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pcloudAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedPCloudAccountId(acc.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPCloudAccountId === acc.id
                        ? 'border-cyan-600 bg-cyan-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{acc.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 uppercase">
                        {acc.provider}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{acc.accountEmail}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Select Document <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Document Selection & Attachment Mode */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900">Step 3 — Select Document & Attachment Mode</h2>
            <p className="text-xs text-slate-500">Choose the document to distribute from your registered pCloud repository.</p>

            {/* If Email Mode, show Attachment Mode selector */}
            {deliveryMode === 'EMAIL' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Attachment Delivery Method *</label>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div
                    onClick={() => setAttachmentMode('ATTACHMENT')}
                    className={`p-3 rounded-xl border-2 cursor-pointer text-center ${
                      attachmentMode === 'ATTACHMENT' ? 'border-blue-600 bg-blue-50 font-bold text-blue-900' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <Paperclip className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    MIME Attachment
                  </div>
                  <div
                    onClick={() => setAttachmentMode('DIRECT_LINK')}
                    className={`p-3 rounded-xl border-2 cursor-pointer text-center ${
                      attachmentMode === 'DIRECT_LINK' ? 'border-blue-600 bg-blue-50 font-bold text-blue-900' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <Link2 className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    Direct Link Only
                  </div>
                  <div
                    onClick={() => setAttachmentMode('BOTH')}
                    className={`p-3 rounded-xl border-2 cursor-pointer text-center ${
                      attachmentMode === 'BOTH' ? 'border-blue-600 bg-blue-50 font-bold text-blue-900' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <FolderSync className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    Both (Attach + Link)
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Select pCloud Document *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedFileId === file.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">{file.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{file.pcloudPath || `/file/${file.fileId}`}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Select Audience <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Audience Selection */}
        {step === 4 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 4 — Select Audience</h2>
            <p className="text-xs text-slate-500">Select the target contact list or segment.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedListId === list.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">{list.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{list.description || 'Imported contacts segment'}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Select Template <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Template & Variables */}
        {step === 5 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 5 — Select Message Template</h2>
            <p className="text-xs text-slate-500">Select template with variables (#NAME#, #COMPANY#, #RANDOM#).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 line-clamp-2">{tpl.content}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Configuration <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Configuration */}
        {step === 6 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 6 — Throttling & Queue Config</h2>
            <p className="text-xs text-slate-500">Configure queue rate limits and delivery settings.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Rate Limit (Recipients / Minute)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              {deliveryMode === 'PCLOUD_NATIVE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">pCloud Operation Type</label>
                  <select
                    value={shareType}
                    onChange={(e) => setShareType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="uploadtransfer">Direct File Transfer (/uploadtransfer)</option>
                    <option value="sharefolder">Folder Share Collaboration (/sharefolder)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(5)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(7)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Review Campaign <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 7 — Review Campaign Details</h2>
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign:</span>
                <span className="font-semibold text-slate-900">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Mode:</span>
                <span className="font-semibold text-blue-600">{deliveryMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sender:</span>
                <span className="font-semibold text-slate-900">
                  {deliveryMode === 'EMAIL'
                    ? selectedEmailAccount?.accountEmail || 'None'
                    : selectedPCloudAccount?.accountEmail || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document:</span>
                <span className="font-semibold text-slate-900">{selectedFile?.name || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audience List:</span>
                <span className="font-semibold text-slate-900">{selectedList?.name || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Template:</span>
                <span className="font-semibold text-slate-900">{selectedTemplate?.name || 'None'}</span>
              </div>
            </div>

            {previewData && (
              <div className="p-4 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700">Message Preview:</span>
                <p className="text-slate-600 whitespace-pre-wrap">{previewData.resolvedText}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(6)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(8)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
              >
                Next: Launch <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 8: Launch */}
        {step === 8 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
            <Rocket className="h-12 w-12 text-blue-600 mx-auto animate-bounce" />
            <h2 className="text-lg font-bold text-slate-900">Ready to Launch Campaign</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your campaign is configured. Launching will immediately queue recipients for automated processing through Redis/BullMQ.
            </p>

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => setStep(7)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Review Again
              </button>
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {isLaunching ? 'Dispatching to Queue...' : '🚀 Launch Campaign Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
