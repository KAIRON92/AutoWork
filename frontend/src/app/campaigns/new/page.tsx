"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockAccounts, mockTemplates, mockContactLists, mockContacts } from '@/services/mockData';
import { mockAttachments } from '@/services/storageService';
import { campaignsService } from '@/services/campaignsService';
import { Send, CheckCircle2, ArrowRight, ArrowLeft, Mail, Users, FileText, Paperclip, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Form State
  const [name, setName] = useState('New Outbound Campaign');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([mockAccounts[0].id]);
  const [selectedList, setSelectedList] = useState<string>(mockContactLists[0].id);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(mockTemplates[0].id);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(mockAttachments[0]?.id || null);
  const [isLaunching, setIsLaunching] = useState(false);

  const toggleAccount = (id: string) => {
    if (selectedAccounts.includes(id)) {
      if (selectedAccounts.length > 1) {
        setSelectedAccounts(selectedAccounts.filter((a) => a !== id));
      }
    } else {
      setSelectedAccounts([...selectedAccounts, id]);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    const newCamp = await campaignsService.createCampaign({
      name,
      templateId: selectedTemplate,
      accountIds: selectedAccounts,
      contactListIds: [selectedList],
      attachmentIds: selectedAttachment ? [selectedAttachment] : [],
    });
    await campaignsService.launchCampaign(newCamp.id);
    setIsLaunching(false);
    router.push('/campaigns');
  };

  const currentTpl = mockTemplates.find((t) => t.id === selectedTemplate) || mockTemplates[0];

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Creation Wizard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and validate multi-account automated outbound campaigns.
          </p>

          {/* Steps Indicator */}
          <div className="grid grid-cols-6 gap-2 mt-6 pt-4 border-t border-slate-100 text-center text-xs">
            {['1. Details', '2. Accounts', '3. Recipients', '4. Template', '5. Attachments', '6. Review'].map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isPast = step > stepNum;
              return (
                <div
                  key={label}
                  onClick={() => setStep(stepNum as any)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isPast
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'bg-slate-50 text-slate-400 font-medium'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 1: Campaign Details</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 font-medium"
              />
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Select Sending Accounts</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Sending Accounts */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 2: Select Sending Accounts (Rotation Mode)</h2>
            <p className="text-xs text-slate-500">
              Select one or more active accounts. Dispatches will rotate evenly across selected accounts.
            </p>

            <div className="space-y-3">
              {mockAccounts.map((acc) => {
                const isSelected = selectedAccounts.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    onClick={() => toggleAccount(acc.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{acc.name}</p>
                        <p className="text-xs font-mono text-slate-500">{acc.email}</p>
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
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Select Recipients</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Recipients */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 3: Select Audience List</h2>

            <div className="space-y-3">
              {mockContactLists.map((lst) => {
                const isSelected = selectedList === lst.id;
                return (
                  <div
                    key={lst.id}
                    onClick={() => setSelectedList(lst.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{lst.name}</p>
                        <p className="text-xs text-slate-500">{lst.description}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {lst.memberCount} Recipients
                    </span>
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
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Select Template</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Template */}
        {step === 4 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 4: Select Email Template</h2>

            <div className="space-y-3">
              {mockTemplates.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-1">{tpl.subject}</p>
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
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Select Attachments</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Attachments */}
        {step === 5 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Step 5: pCloud Storage File Attachment (Optional)</h2>

            <div className="space-y-3">
              <div
                onClick={() => setSelectedAttachment(null)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAttachment === null ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                }`}
              >
                <p className="font-bold text-slate-900 text-sm">No Attachment</p>
                <p className="text-xs text-slate-500">Send email without external file attachment.</p>
              </div>

              {mockAttachments.map((att) => {
                const isSelected = selectedAttachment === att.id;
                return (
                  <div
                    key={att.id}
                    onClick={() => setSelectedAttachment(att.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-sky-500" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{att.filename}</p>
                        <p className="text-xs text-slate-400">pCloud Storage ID: {att.pcloudFileId}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
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
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Review & Launch</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Launch */}
        {step === 6 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 6: Pre-Flight Review & Launch</h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Campaign Title</span>
                <span className="font-bold text-slate-900 text-sm">{name}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Accounts Rotation</span>
                <span className="font-bold text-slate-900">{selectedAccounts.length} Active Sending Accounts</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Template Subject</span>
                <span className="font-mono text-slate-900">{currentTpl.subject}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">Attachment</span>
                <span className="font-semibold text-slate-900">
                  {selectedAttachment ? 'pCloud Attachment Wired' : 'None'}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(5)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="px-6 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Rocket className="h-4 w-4" />
                {isLaunching ? 'Queueing Campaign Jobs...' : 'Confirm & Launch Queue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
