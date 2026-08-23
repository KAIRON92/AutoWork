"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { accountsService } from '@/services/accountsService';
import { emailAccountsService, EmailAccount } from '@/services/emailAccountsService';
import { filesService } from '@/services/filesService';
import { contactsService } from '@/services/contactsService';
import { templatesService } from '@/services/templatesService';
import { campaignsService } from '@/services/campaignsService';
import { PCloudAccount, PCloudFile, ContactList, Template, Contact } from '@/types';
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
  CheckSquare,
  Square,
  Search,
  UserCheck,
  Plus,
  X,
  Check,
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
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
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
  const [audienceMode, setAudienceMode] = useState<'INDIVIDUAL' | 'LIST'>('INDIVIDUAL');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [recipientOverrides, setRecipientOverrides] = useState<Record<string, string>>({});
  const [expandedOverrideId, setExpandedOverrideId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [shareType, setShareType] = useState<'sharefolder' | 'uploadtransfer'>('sharefolder');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [previewData, setPreviewData] = useState<any>(null);

  // Custom Template Inline Creation State
  const [isCreatingCustomTemplate, setIsCreatingCustomTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [emailAccs, pcloudAccs, storedFiles, contactLists, contacts, tpls] = await Promise.all([
          emailAccountsService.getAll(),
          accountsService.getAll(),
          filesService.getAll(),
          contactsService.getAllLists(),
          contactsService.getAllContacts(),
          templatesService.getAll(),
        ]);
        const verifiedEmail = emailAccs.filter((a: EmailAccount) => a.status === 'VERIFIED');
        setEmailAccounts(verifiedEmail);
        setPCloudAccounts(pcloudAccs);
        setFiles(storedFiles);
        setLists(contactLists);
        setAllContacts(contacts);
        setSelectedContactIds(contacts.map((c: Contact) => c.id));
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

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContactIds(allContacts.map((c) => c.id));
  };

  const deselectAllContacts = () => {
    setSelectedContactIds([]);
  };

  const setContactOverrideMessage = (contactId: string, message: string) => {
    setRecipientOverrides((prev) => {
      if (!message.trim()) {
        const next = { ...prev };
        delete next[contactId];
        return next;
      }
      return { ...prev, [contactId]: message };
    });
  };

  const filteredContacts = allContacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.firstName && c.firstName.toLowerCase().includes(q)) ||
      (c.lastName && c.lastName.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const handleSaveCustomTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!newTemplateContent.trim()) {
      alert('Please enter template message content');
      return;
    }

    try {
      setIsSavingTemplate(true);
      const created = await templatesService.create({
        name: newTemplateName.trim(),
        description: 'Created during campaign setup',
        content: newTemplateContent.trim(),
      });
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplateId(created.id);
      setIsCreatingCustomTemplate(false);
      setNewTemplateName('');
      setNewTemplateContent('');
    } catch (e: any) {
      alert(`Failed to save template: ${e.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

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
    if (audienceMode === 'INDIVIDUAL' && selectedContactIds.length === 0) {
      alert('Please select at least one contact to receive the campaign');
      return;
    }
    if (audienceMode === 'LIST' && !selectedListId) {
      alert('Please select a contact list');
      return;
    }

    try {
      setIsLaunching(true);
      const isIndividual = audienceMode === 'INDIVIDUAL';
      const cleanOverrides: Record<string, string> = {};
      if (isIndividual) {
        for (const [id, msg] of Object.entries(recipientOverrides)) {
          if (selectedContactIds.includes(id) && msg.trim()) {
            cleanOverrides[id] = msg.trim();
          }
        }
      }

      const newCamp = await campaignsService.create({
        name,
        emailAccountId: deliveryMode === 'EMAIL' ? selectedEmailAccountId : undefined,
        pcloudAccountId: selectedPCloudAccountId,
        pcloudFileId: selectedFileId,
        templateId: selectedTemplateId,
        contactListId: !isIndividual ? (selectedListId || undefined) : undefined,
        recipientContactIds: isIndividual ? selectedContactIds : undefined,
        recipientOverrides: Object.keys(cleanOverrides).length > 0 ? cleanOverrides : undefined,
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
                      ? 'bg-linear-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-xs'
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 4 — Select Target Audience</h2>
                <p className="text-xs text-slate-500">Choose individual contacts or an entire contact list.</p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs self-start">
                <button
                  type="button"
                  onClick={() => setAudienceMode('INDIVIDUAL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    audienceMode === 'INDIVIDUAL'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Specific Contacts ({allContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceMode('LIST')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    audienceMode === 'LIST'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderSync className="h-3.5 w-3.5" />
                  Contact Lists ({lists.length})
                </button>
              </div>
            </div>

            {/* Mode 1: Individual Contacts Selection */}
            {audienceMode === 'INDIVIDUAL' && (
              <div className="space-y-4">
                {/* Search and Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search contacts by name, email, company..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                      Selected: {selectedContactIds.length} / {allContacts.length}
                    </span>
                    <button
                      type="button"
                      onClick={selectAllContacts}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllContacts}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Contacts List Grid */}
                <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 border border-slate-100 rounded-xl p-2">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No contacts found matching search.</div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      const hasCustomMsg = Boolean(recipientOverrides[contact.id]?.trim());
                      const isExpanded = expandedOverrideId === contact.id;

                      return (
                        <div
                          key={contact.id}
                          className={`rounded-xl border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/40 shadow-2xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            onClick={() => toggleContactSelection(contact.id)}
                            className="p-3 cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                  isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email}
                                  </span>
                                  {contact.company && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 shrink-0">
                                      {contact.company}
                                    </span>
                                  )}
                                  {hasCustomMsg && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                                      Custom Message Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate">{contact.email}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedOverrideId(isExpanded ? null : contact.id);
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                                    hasCustomMsg
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {hasCustomMsg ? '✏️ Edit Custom Message' : '+ Custom Message'}
                                </button>
                              )}
                              <div className="text-[11px] text-slate-400 hidden sm:block">
                                {contact.phone || ''}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Custom Message Box for this specific recipient */}
                          {isSelected && isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-blue-200/60 bg-blue-50/80 rounded-b-xl space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-blue-950">
                                  Personalized Message for {contact.firstName || contact.email}:
                                </span>
                                <span className="text-slate-400">Supports #NAME#, #COMPANY#, #RANDOM#</span>
                              </div>
                              <textarea
                                rows={2}
                                value={recipientOverrides[contact.id] || ''}
                                onChange={(e) => setContactOverrideMessage(contact.id, e.target.value)}
                                placeholder={`Type a custom message just for ${contact.firstName || contact.email} (leave empty to use default template)`}
                                className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
                              />
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 italic">
                                  {hasCustomMsg
                                    ? 'This contact will receive this custom message instead of the default template.'
                                    : 'Using default campaign template.'}
                                </span>
                                {hasCustomMsg && (
                                  <button
                                    type="button"
                                    onClick={() => setContactOverrideMessage(contact.id, '')}
                                    className="text-rose-600 hover:underline font-semibold text-[11px]"
                                  >
                                    Reset to Default Template
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Contact List Mode */}
            {audienceMode === 'LIST' && (
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">{list.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        List
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{list.description || 'Imported contacts segment'}</div>
                  </div>
                ))}
              </div>
            )}

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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 5 — Select or Create Message Template</h2>
                <p className="text-xs text-slate-500">
                  Select a pre-built template or create a custom message template on-the-fly.
                </p>
              </div>
              {!isCreatingCustomTemplate && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCustomTemplate(true)}
                  className="px-3.5 py-2 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-95 self-start"
                >
                  <Plus className="h-4 w-4" />
                  + Create Custom Template
                </button>
              )}
            </div>

            {/* Inline Custom Template Creator */}
            {isCreatingCustomTemplate && (
              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-blue-200 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Design Custom Template</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCustomTemplate(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Template Title / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Q3 Confidential Share Notice"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Variable Token Chips */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Click symbol to insert dynamic token:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { tag: '#NAME#', label: '👤 Name' },
                        { tag: '#COMPANY#', label: '🏢 Company' },
                        { tag: '#EMAIL#', label: '✉️ Email' },
                        { tag: '#RANDOM#', label: '🎲 Security Code' },
                        { tag: '#PHONE#', label: '📞 Phone' },
                        { tag: '#TARGET#', label: '🎯 Target' },
                      ].map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => setNewTemplateContent((prev) => `${prev} ${item.tag} `)}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-[11px] font-mono font-semibold text-blue-700 transition-colors shadow-2xs flex items-center gap-1"
                        >
                          {item.label}
                          <span className="text-[10px] text-slate-400 font-mono">({item.tag})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Message Content / Body
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Hi #NAME#,\n\nPlease find your secure document for #COMPANY# attached.\nYour security verification code is: #RANDOM#\n\nBest regards,\nExecutive Team"
                      value={newTemplateContent}
                      onChange={(e) => setNewTemplateContent(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-sans focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomTemplate(false)}
                      className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomTemplate}
                      disabled={isSavingTemplate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isSavingTemplate ? 'Saving...' : 'Save & Select Template'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Template Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* + Custom Template Box */}
              <div
                onClick={() => setIsCreatingCustomTemplate(true)}
                className="p-4 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition-all flex flex-col justify-center items-center text-center gap-2 group min-h-[100px]"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-700 block">+ Custom Template</span>
                  <span className="text-[11px] text-slate-400">Design your own message on-the-fly</span>
                </div>
              </div>

              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                    </div>
                    {selectedTemplateId === tpl.id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        Selected
                      </span>
                    )}
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
                <span className="text-slate-500">Target Audience:</span>
                <span className="font-semibold text-slate-900">
                  {audienceMode === 'INDIVIDUAL'
                    ? `Specific Contacts (${selectedContactIds.length} recipients selected)`
                    : selectedList?.name || 'Contact List'}
                </span>
              </div>
              {audienceMode === 'INDIVIDUAL' && Object.keys(recipientOverrides).length > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Custom Overrides:</span>
                  <span className="font-semibold">
                    {Object.keys(recipientOverrides).filter((id) => selectedContactIds.includes(id)).length} recipients with personalized message overrides
                  </span>
                </div>
              )}
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
                className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
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
