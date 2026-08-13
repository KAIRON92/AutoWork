"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import axios from 'axios';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Database,
  AlertCircle,
  AlertTriangle,
  Users,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ImportsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filename, setFilename] = useState('contacts_leads.csv');
  const [rawText, setRawText] = useState(
    "Email,First Name,Last Name,Company,Phone,Target\n" +
    "sarah.connor@cyberdyne.io,Sarah,Connor,Cyberdyne Systems,+1 555-0192,Enterprise IT\n" +
    "bruce.wayne@wayneenterprises.com,Bruce,Wayne,Wayne Enterprises,+1 555-0144,Strategic Tech\n" +
    "clark.kent@dailyplanet.com,Clark,Kent,Daily Planet,+1 555-0177,Media Operations\n" +
    "diana.prince@themyscira.org,Diana,Prince,Themyscira Global,+1 555-0188,Cloud Defense"
  );

  // Parsed metadata
  const [headers, setHeaders] = useState<string[]>(['Email', 'First Name', 'Last Name', 'Company', 'Phone', 'Target']);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState<number>(4);

  // Column Mapping
  const [mapping, setMapping] = useState<{
    emailColumn: string;
    firstNameColumn: string;
    lastNameColumn: string;
    fullNameColumn: string;
    companyColumn: string;
    phoneColumn: string;
    targetColumn: string;
  }>({
    emailColumn: 'Email',
    firstNameColumn: 'First Name',
    lastNameColumn: 'Last Name',
    fullNameColumn: '',
    companyColumn: 'Company',
    phoneColumn: 'Phone',
    targetColumn: 'Target',
  });

  // Validation
  const [validationReport, setValidationReport] = useState<any>(null);
  const [contactListName, setContactListName] = useState('Imported Leads List');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const content = evt.target.result.toString();
          setRawText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleParseAndContinue = async () => {
    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE}/v1/imports/parse`, {
        filename,
        fileContent: rawText,
      });

      const data = res.data;
      setHeaders(data.headers);
      setAllRows(data.allRows);
      setPreviewRows(data.previewRows);
      setTotalRows(data.totalRows);

      if (data.detectedMapping) {
        setMapping({
          emailColumn: data.detectedMapping.email || data.headers[0] || '',
          firstNameColumn: data.detectedMapping.firstName || '',
          lastNameColumn: data.detectedMapping.lastName || '',
          fullNameColumn: data.detectedMapping.fullName || '',
          companyColumn: data.detectedMapping.company || '',
          phoneColumn: data.detectedMapping.phone || '',
          targetColumn: data.detectedMapping.target || '',
        });
      }

      setStep(2);
    } catch (err: any) {
      alert(`Parse error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateAndContinue = async () => {
    if (!mapping.emailColumn) {
      alert('You must select an Email Address column.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE}/v1/imports/validate`, {
        ...mapping,
        rows: allRows.length > 0 ? allRows : previewRows,
      });

      setValidationReport(res.data);
      setStep(3);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteImport = async () => {
    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE}/v1/imports/confirm`, {
        filename,
        rows: allRows.length > 0 ? allRows : previewRows,
        mapping,
        contactListName: contactListName || undefined,
      });

      setImportResult(res.data);
      setStep(4);
    } catch (err: any) {
      alert(`Import execution error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Wizard Progress Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Import Wizard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
              CSV & Excel Parser
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Server-driven batch contact extraction with auto-column detection, duplicate prevention, and contact list grouping.
          </p>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-cyan-700' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</span>
              <span>Upload / Paste</span>
            </div>
            <div className="h-0.5 w-10 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-cyan-700' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
              <span>Column Mapping</span>
            </div>
            <div className="h-0.5 w-10 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-cyan-700' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
              <span>Validation</span>
            </div>
            <div className="h-0.5 w-10 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>4</span>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Upload or Paste */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 1 — Upload or Paste Contact File</h2>

            <div className="border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
              <Upload className="h-10 w-10 text-cyan-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Upload CSV, XLSX or TXT file</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Supports comma, semicolon, tab, and pipe delimited rows</p>
              <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-95 shadow-sm">
                Browse File
                <input type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
              {filename && <p className="text-xs font-mono text-cyan-700 mt-3">Selected file: {filename}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Or Paste Structured CSV / Tabular Text</label>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleParseAndContinue}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Parsing file...' : 'Continue to Column Mapping'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 2 — Map File Columns</h2>
              <p className="text-xs text-slate-500">Auto-detected columns have been pre-matched. Adjust if necessary.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Recipient Email Column *
                </label>
                <select
                  value={mapping.emailColumn}
                  onChange={(e) => setMapping({ ...mapping, emailColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  First Name Column
                </label>
                <select
                  value={mapping.firstNameColumn}
                  onChange={(e) => setMapping({ ...mapping, firstNameColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- None / Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Last Name Column
                </label>
                <select
                  value={mapping.lastNameColumn}
                  onChange={(e) => setMapping({ ...mapping, lastNameColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- None / Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Company / Organization Column
                </label>
                <select
                  value={mapping.companyColumn}
                  onChange={(e) => setMapping({ ...mapping, companyColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- None / Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Phone Number Column
                </label>
                <select
                  value={mapping.phoneColumn}
                  onChange={(e) => setMapping({ ...mapping, phoneColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- None / Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Target / Division Column
                </label>
                <select
                  value={mapping.targetColumn}
                  onChange={(e) => setMapping({ ...mapping, targetColumn: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
                >
                  <option value="">-- None / Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleValidateAndContinue}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Validating...' : 'Validate & Preview'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Validation & List Creation */}
        {step === 3 && validationReport && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Step 3 — Validation & Preview</h2>
                <p className="text-xs text-slate-500">Review extraction statistics and optionally create a contact list.</p>
              </div>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rows</span>
                <span className="text-lg font-bold text-slate-900">{validationReport.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Valid Emails</span>
                <span className="text-lg font-bold text-emerald-700">{validationReport.validCount}</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-600 uppercase font-semibold block">Duplicates</span>
                <span className="text-lg font-bold text-amber-700">{validationReport.duplicateCount}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] text-rose-600 uppercase font-semibold block">Invalid Rows</span>
                <span className="text-lg font-bold text-rose-700">{validationReport.errorCount}</span>
              </div>
            </div>

            {/* Contact List Creation Input */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Create Contact List (Optional)
              </label>
              <input
                type="text"
                value={contactListName}
                onChange={(e) => setContactListName(e.target.value)}
                placeholder="Enter contact list name to group these recipients"
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              />
              <p className="text-[11px] text-slate-400">
                If provided, imported contacts will be automatically added to this list for campaign selection.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Database className="h-4 w-4" />
                {isSubmitting ? 'Importing Contacts...' : `Confirm & Import (${validationReport.validCount} Contacts)`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completion */}
        {step === 4 && importResult && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Import Completed Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Successfully imported {importResult.importedCount} new contacts ({importResult.duplicateCount} duplicates recognized).
            </p>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => router.push('/contacts')}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
              >
                View Contacts & Lists
              </button>
              <button
                onClick={() => router.push('/campaigns/new')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 shadow-sm"
              >
                Create pCloud Campaign with this List
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
