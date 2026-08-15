"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { apiClient } from '@/services/apiClient';
import { ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filename, setFilename] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState({ emailColumn: '', firstNameColumn: '', lastNameColumn: '', fullNameColumn: '', companyColumn: '', phoneColumn: '', targetColumn: '' });
  const [validation, setValidation] = useState<any>(null);
  const [listName, setListName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileContent(String(reader.result || ''));
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const parse = async () => {
    if (!filename || !fileContent.trim()) return alert('Upload a file or paste contact data first.');
    setBusy(true);
    try {
      const { data } = await apiClient.post('/v1/imports/parse', { filename, fileContent });
      setHeaders(data.headers || []); setRows(data.allRows || []);
      setMapping({
        emailColumn: data.detectedMapping?.email || '', firstNameColumn: data.detectedMapping?.firstName || '', lastNameColumn: data.detectedMapping?.lastName || '',
        fullNameColumn: data.detectedMapping?.fullName || '', companyColumn: data.detectedMapping?.company || '', phoneColumn: data.detectedMapping?.phone || '', targetColumn: data.detectedMapping?.target || '',
      });
      setStep(2);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Unable to parse contact file.');
    } finally { setBusy(false); }
  };

  const validate = async () => {
    if (!mapping.emailColumn) return alert('Select the email column.');
    setBusy(true);
    try {
      const { data } = await apiClient.post('/v1/imports/validate', { ...mapping, rows });
      setValidation(data); setStep(3);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Unable to validate contacts.');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.post('/v1/imports/confirm', { filename, rows, mapping, contactListName: listName || undefined });
      setResult(data); setStep(4);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Unable to persist imported contacts.');
    } finally { setBusy(false); }
  };

  const select = (key: keyof typeof mapping) => (
    <select value={mapping[key]} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
      <option value="">Ignore</option>
      {headers.map((header) => <option key={header} value={header}>{header}</option>)}
    </select>
  );

  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import Contacts</h1>
          <p className="mt-1 text-sm text-slate-500">Import real contact data, validate it, and persist only after review.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-slate-500">
            {['Upload', 'Map', 'Validate', 'Complete'].map((label, index) => <div key={label} className={step >= index + 1 ? 'text-slate-900' : ''}>{index + 1}. {label}</div>)}
          </div>
        </div>

        {step === 1 && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Upload className="mx-auto mb-3 h-9 w-9 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Upload CSV, XLS, XLSX or TXT</p>
            <p className="mt-1 text-xs text-slate-500">Spreadsheet files are parsed server-side; CSV/TXT may also be pasted directly.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              <FileSpreadsheet className="h-4 w-4" /> Browse file
              <input type="file" accept=".csv,.xls,.xlsx,.txt" className="hidden" onChange={onFile} />
            </label>
            {filename && <p className="mt-3 text-xs text-slate-600">Selected: {filename}</p>}
          </div>
          {!filename.toLowerCase().endsWith('.xls') && !filename.toLowerCase().endsWith('.xlsx') && <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)} placeholder="Paste CSV or tabular data here" rows={8} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" />}
          <div className="flex justify-end"><button onClick={() => void parse()} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Parsing...' : 'Continue'} <ArrowRight className="ml-1 inline h-4 w-4" /></button></div>
        </section>}

        {step === 2 && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Map contact fields</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {([['emailColumn','Email *'],['firstNameColumn','First name'],['lastNameColumn','Last name'],['fullNameColumn','Full name'],['companyColumn','Company'],['phoneColumn','Phone'],['targetColumn','Target']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<span className="mt-1 block">{select(key)}</span></label>)}
          </div>
          <div className="flex justify-between"><button onClick={() => setStep(1)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="mr-1 inline h-4 w-4" />Back</button><button onClick={() => void validate()} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Validating...' : 'Validate'} <ArrowRight className="ml-1 inline h-4 w-4" /></button></div>
        </section>}

        {step === 3 && validation && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Validation results</h2>
          <div className="grid grid-cols-3 gap-3 text-sm"><div className="rounded-lg bg-slate-50 p-4"><div className="text-slate-500">Rows</div><div className="mt-1 text-xl font-bold">{validation.totalRows}</div></div><div className="rounded-lg bg-emerald-50 p-4"><div className="text-emerald-700">Valid</div><div className="mt-1 text-xl font-bold text-emerald-700">{validation.validCount}</div></div><div className="rounded-lg bg-rose-50 p-4"><div className="text-rose-700">Invalid / duplicate</div><div className="mt-1 text-xl font-bold text-rose-700">{(validation.errorCount || 0) + (validation.duplicateCount || 0)}</div></div></div>
          <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Optional contact list name" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
          <div className="flex justify-between"><button onClick={() => setStep(2)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold">Back</button><button onClick={() => void confirm()} disabled={busy || !validation.validCount} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Importing...' : `Confirm ${validation.validCount} contacts`}</button></div>
        </section>}

        {step === 4 && result && <section className="rounded-xl border border-slate-200 bg-white p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h2 className="mt-4 text-xl font-bold text-slate-900">Import completed</h2><p className="mt-2 text-sm text-slate-500">{result.importedCount} new contacts imported; {result.duplicateCount} duplicates recognized.</p><button onClick={() => router.push('/contacts')} className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">View contacts</button></section>}
      </div>
    </Shell>
  );
}
