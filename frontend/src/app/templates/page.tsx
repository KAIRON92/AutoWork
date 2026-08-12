"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockTemplates, mockContacts } from '@/services/mockData';
import { templatesService } from '@/services/templatesService';
import { Template } from '@/types';
import { FileText, Plus, Code, Eye, Sparkles, Check, Trash2, Edit3 } from 'lucide-react';

const AVAILABLE_VARIABLES = [
  { tag: '#NAME#', label: 'Full Name', example: 'Sarah Connor' },
  { tag: '#FIRSTNAME#', label: 'First Name', example: 'Sarah' },
  { tag: '#LASTNAME#', label: 'Last Name', example: 'Connor' },
  { tag: '#EMAIL#', label: 'Email Address', example: 'sarah.c@cyberdyne.io' },
  { tag: '#PHONE#', label: 'Phone Number', example: '+1 555-0192' },
  { tag: '#COMPANY#', label: 'Company', example: 'Cyberdyne Systems' },
  { tag: '#RANDOM#', label: 'Random String', example: 'XK89B2 (Unique Per Send)' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [activeTemplate, setActiveTemplate] = useState<Template>(mockTemplates[0]);

  // Form State
  const [name, setName] = useState(activeTemplate.name);
  const [subject, setSubject] = useState(activeTemplate.subject);
  const [body, setBody] = useState(activeTemplate.body);

  const insertVariable = (tag: string) => {
    setBody((prev) => prev + ` ${tag}`);
  };

  const handleSave = async () => {
    const updated = await templatesService.updateTemplate(activeTemplate.id, {
      name,
      subject,
      body,
    });
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setActiveTemplate(updated);
    alert('Template saved successfully!');
  };

  const handleCreateNew = async () => {
    const newT = await templatesService.createTemplate({
      name: 'Untitled Template ' + (templates.length + 1),
      subject: 'Quick inquiry regarding #COMPANY# (#RANDOM#)',
      body: 'Hi #FIRSTNAME#,\n\nI hope you are having a great week at #COMPANY#.\n\nBest regards,\nAlex',
    });
    setTemplates([newT, ...templates]);
    setActiveTemplate(newT);
    setName(newT.name);
    setSubject(newT.subject);
    setBody(newT.body);
  };

  const sampleContact = mockContacts[0];
  const previewSubject = templatesService.resolvePreview(subject, {
    name: `${sampleContact.firstName} ${sampleContact.lastName}`,
    firstName: sampleContact.firstName || '',
    lastName: sampleContact.lastName || '',
    email: sampleContact.email,
    phone: sampleContact.phone || '',
    company: sampleContact.company || '',
  });

  const previewBody = templatesService.resolvePreview(body, {
    name: `${sampleContact.firstName} ${sampleContact.lastName}`,
    firstName: sampleContact.firstName || '',
    lastName: sampleContact.lastName || '',
    email: sampleContact.email,
    phone: sampleContact.phone || '',
    company: sampleContact.company || '',
  });

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Template Studio</h1>
            <p className="text-sm text-slate-500 mt-1">
              Build email templates with dynamic variable insertion and real-time preview.
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template List */}
          <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Organization Templates ({templates.length})
            </h2>

            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setActiveTemplate(tpl);
                    setName(tpl.name);
                    setSubject(tpl.subject);
                    setBody(tpl.body);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    activeTemplate.id === tpl.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                    <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs font-mono text-slate-500 truncate mt-1">{tpl.subject}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Editor & Live Preview Split */}
          <div className="lg:col-span-8 space-y-6">
            {/* Editor Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  Template Editor
                </h3>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Template
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Subject Line (Supports Variables)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Variable Pills */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Click to Insert Dynamic Variable:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-mono font-semibold transition-colors flex items-center gap-1"
                        title={`${v.label} (e.g. ${v.example})`}
                      >
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Body Content
                  </label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Panel */}
            <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Live Variable Preview</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Resolved against test contact: {sampleContact.email}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                  <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1">Resolved Subject:</span>
                  <span className="text-sky-300 font-semibold">{previewSubject}</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono whitespace-pre-wrap leading-relaxed text-slate-300">
                  <span className="text-slate-500 uppercase text-[10px] font-bold block mb-2">Resolved Body:</span>
                  {previewBody}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
