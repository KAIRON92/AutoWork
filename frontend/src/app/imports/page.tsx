"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import axios from 'axios';
import { FileSpreadsheet, Upload, CheckCircle2, ArrowRight, ArrowLeft, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ImportsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filename, setFilename] = useState('');
  const [rawText, setRawText] = useState('');

  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);

  const [mapping, setMapping] = useState({
    emailColumn: '',
    firstNameColumn: '',
    lastNameColumn: '',
    fullNameColumn: '',
    companyColumn: '',
    phoneColumn: '',
    targetColumn: '',
  });

  const [validationReport, setValidationReport] = useState<any>(null);
  const [contactListName, setContactListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) setRawText(evt.target.result.toString());
    };
    reader.readAsText(file);
  };

  const handleParseAndContinue = async () => {
    if (!filename || !rawText.trim()) {
      alert('Upload a supported contact file or paste structured contact data before continuing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_BASE}/v1/imports/parse`, { filename, fileContent: rawText }, { withCredentials: true });
      const data = res.data;
      setHeaders(data.headers || []);
      setAllRows(data.allRows || []);
      setPreviewRows(data.previewRows || []);
      setTotalRows(data.totalRows || 0);

      if (data.detectedMapping) {
        setMapping({
          emailColumn: data.detectedMapping.email || '',
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
      alert(`Parse error: ${err.response?.data?.message || err.message || 'Unable to parse the file'}`);
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
      const res = await axios.post(
        `${API_BASE}/v1/imports/validate`,
        { ...mapping, rows: allRows },
        { withCredentials: true },
      );
      setValidationReport(res.data);
      setStep(3);
    } catch (err: any) {
      alert(`Validation error: ${err.response?.data?.message || err.message || 'Unable to validate the import'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationReport || validationReport.validCount <= 0) {
      alert('There are no validated recipient records to import.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(
        `${API_BASE}/v1/imports/confirm`,
        { filename, rows: allRows, mapping, contactListName: contactListName.trim() || undefined },
        { withCredentials: true },
      );
      setImportResult(res.data);
      setStep(4);
    } catch (err: any) {
      alert(`Import execution error: ${err.response?.data?.message || err.message || 'Import failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Import Wizard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">CSV & Excel Parser</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Import real recipient data and convert it into validated contacts for campaigns.</p>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            {['Upload / Paste', 'Column Mapping', 'Validation', 'Complete'].map((label, index) => {
              const current = index + 1;
              return (
                <div key={label} className={`flex items-center gap-2 text-xs font-semibold ${step >= current ? 'text-cyan-700' : 'text-slate-400'}`}>
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= current ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{current}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 1 — Upload or Paste Contact File</h2>
            <div className="border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
              <Upload className="h-10 w-10 text-cyan-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Upload CSV, XLSX or TXT file</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Supports the formats configured by the backend parser.</p>
              <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-95 shadow-sm">
                Browse File
                <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
              {filename && <p className="text-xs font-mono text-cyan-700 mt-3">Selected file: {filename}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Or Paste Structured CSV / Tabular Text</label>
              <textarea rows={6} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste your real contact data here" className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleParseAndContinue} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2">
                <span>{isSubmitting ? 'Parsing file...' : 'Continue to Column Mapping'}</span><ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div><h2 className="text-base font-bold text-slate-900">Step 2 — Map File Columns</h2><p className="text-xs text-slate-500">Auto-detected columns are pre-matched when available.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['emailColumn', 'Recipient Email Column *'], ['firstNameColumn', 'First Name Column'], ['lastNameColumn', 'Last Name Column'], ['companyColumn', 'Company / Organization Column'], ['phoneColumn', 'Phone Number Column'], ['targetColumn', 'Target / Division Column'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">{label}</label>
                  <select value={(mapping as any)[key]} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium">
                    <option value="">-- Select Column --</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" />Back</button>
              <button onClick={handleValidateAndContinue} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2"><span>{isSubmitting ? 'Validating...' : 'Validate & Preview'}</span><ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {step === 3 && validationReport && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div><h2 className="text-base font-bold text-slate-900">Step 3 — Validation & Preview</h2><p className="text-xs text-slate-500">Review extraction statistics before persisting real contacts.</p></div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl"><span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rows</span><span className="text-lg font-bold text-slate-900">{validationReport.totalRows}</span></div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl"><span className="text-[10px] text-emerald-600 uppercase font-semibold block">Valid Emails</span><span className="text-lg font-bold text-emerald-700">{validationReport.validCount}</span></div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl"><span className="text-[10px] text-amber-600 uppercase font-semibold block">Duplicates</span><span className="text-lg font-bold text-amber-700">{validationReport.duplicateCount}</span></div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl"><span className="text-[10px] text-rose-600 uppercase font-semibold block">Invalid Rows</span><span className="text-lg font-bold text-rose-700">{validationReport.errorCount}</span></div>
            </div>
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">Create Contact List (Optional)</label>
              <input type="text" value={contactListName} onChange={(e) => setContactListName(e.target.value)} placeholder="Enter contact list name" className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white" />
              <p className="text-[11px] text-slate-400">Imported contacts will be grouped into this reusable list when a name is provided.</p>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" />Back</button>
              <button onClick={handleExecuteImport} disabled={isSubmitting || validationReport.validCount <= 0} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 flex items-center gap-2 shadow-md shadow-emerald-600/20"><Database className="h-4 w-4" />{isSubmitting ? 'Importing Contacts...' : `Confirm & Import (${validationReport.validCount} Contacts)`}</button>
            </div>
          </div>
        )}

        {step === 4 && importResult && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="h-10 w-10" /></div>
            <h2 className="text-xl font-bold text-slate-900">Import Completed Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Successfully imported {importResult.importedCount} new contacts ({importResult.duplicateCount} duplicates recognized).</p>
            <div className="pt-4 flex justify-center gap-4">
              <button onClick={() => router.push('/contacts')} className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800">View Contacts & Lists</button>
              <button onClick={() => router.push('/campaigns/new')} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold rounded-xl hover:opacity-95 shadow-sm">Create Campaign with this List</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
