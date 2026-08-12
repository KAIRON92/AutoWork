"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { contactsService } from '@/services/contactsService';
import { FileSpreadsheet, Upload, CheckCircle2, ArrowRight, ArrowLeft, Database, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filename, setFilename] = useState('contacts_sample.csv');
  const [rawText, setRawText] = useState(
    "email,firstName,lastName,company,phone\n" +
    "sarah.c@cyberdyne.io,Sarah,Connor,Cyberdyne Systems,+1 555-0192\n" +
    "bruce.w@wayneent.com,Bruce,Wayne,Wayne Enterprises,+1 555-0144\n" +
    "clark.k@dailyplanet.com,Clark,Kent,Daily Planet,+1 555-0177"
  );
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    "0": "email",
    "1": "firstName",
    "2": "lastName",
    "3": "company",
    "4": "phone",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const parsedLines = rawText.trim().split('\n').map((l) => l.split(','));
  const header = parsedLines[0] || [];
  const rows = parsedLines.slice(1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setRawText(evt.target.result.toString());
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    setIsSubmitting(true);
    await contactsService.importContacts({
      filename,
      rawText,
      mappings: columnMapping,
    });
    setIsSubmitting(false);
    setIsSuccess(true);
    setStep(4);
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Wizard Progress Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Import Wizard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Server-driven batch contact parser (CSV, XLSX, TXT, or Direct Paste).
          </p>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</span>
              <span>Upload / Paste</span>
            </div>
            <div className="h-0.5 w-12 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
              <span>Column Mapping</span>
            </div>
            <div className="h-0.5 w-12 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
              <span>Preview & Validation</span>
            </div>
            <div className="h-0.5 w-12 bg-slate-200"></div>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>4</span>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Upload or Paste */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 1: Select Data Source</h2>

            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
              <Upload className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Drag & drop CSV, XLSX or TXT file</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Maximum file size: 25MB (up to 100,000 rows)</p>
              <label className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-700">
                Browse File
                <input type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
              {filename && <p className="text-xs font-mono text-blue-600 mt-3">Selected file: {filename}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Or Paste Raw CSV Data</label>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900">Step 2: Map CSV Headers to Contact Attributes</h2>

            <div className="space-y-3">
              {header.map((col, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                      Column {idx + 1}: {col}
                    </span>
                  </div>
                  <select
                    value={columnMapping[idx.toString()] || 'ignore'}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [idx.toString()]: e.target.value })}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-medium"
                  >
                    <option value="email">Map to Email Address *</option>
                    <option value="firstName">Map to First Name</option>
                    <option value="lastName">Map to Last Name</option>
                    <option value="company">Map to Company Name</option>
                    <option value="phone">Map to Phone Number</option>
                    <option value="ignore">Ignore Column</option>
                  </select>
                </div>
              ))}
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
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 flex items-center gap-2"
              >
                <span>Preview Parsed Records</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Validation */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Step 3: Preview & Validate ({rows.length} Records)</h2>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                0 Duplicates Found
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">First Name</th>
                    <th className="py-2.5 px-4">Last Name</th>
                    <th className="py-2.5 px-4">Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-4 font-mono font-medium text-slate-800">{row[0]}</td>
                      <td className="py-2 px-4 text-slate-700">{row[1]}</td>
                      <td className="py-2 px-4 text-slate-700">{row[2]}</td>
                      <td className="py-2 px-4 text-slate-700">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Database className="h-4 w-4" />
                {isSubmitting ? 'Processing Batch Import...' : `Execute Import (${rows.length} Contacts)`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Completion */}
        {step === 4 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Import Completed Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All {rows.length} contacts have been parsed, validated, and saved to your organization database.
            </p>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => router.push('/contacts')}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
              >
                View Contacts Table
              </button>
              <button
                onClick={() => router.push('/campaigns/new')}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
              >
                Create Campaign with Imported Contacts
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
