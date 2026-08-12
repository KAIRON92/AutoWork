"use client";

import { useState } from 'react';
import { Shell } from '@/components/layout/shell';
import { mockContacts, mockContactLists } from '@/services/mockData';
import { contactsService } from '@/services/contactsService';
import { Contact, ContactList } from '@/types';
import { Users, Plus, Search, FileSpreadsheet, Mail, Phone, Building2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [lists, setLists] = useState<ContactList[]>(mockContactLists);
  const [search, setSearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  // New Contact state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  // New List state
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.firstName && c.firstName.toLowerCase().includes(q)) ||
      (c.lastName && c.lastName.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const newC = await contactsService.createContact({
      email,
      firstName,
      lastName,
      phone,
      company,
    });
    setContacts([newC, ...contacts]);
    setIsContactModalOpen(false);
    setEmail('');
    setFirstName('');
    setLastName('');
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName) return;
    const newList = await contactsService.createContactList(listName, listDesc);
    setLists([newList, ...lists]);
    setIsListModalOpen(false);
    setListName('');
    setListDesc('');
  };

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contacts & Audiences</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage individual recipients and audience list groupings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsListModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New List
            </button>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Contact
            </button>
            <Link
              href="/imports"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Wizard
            </Link>
          </div>
        </div>

        {/* Contact Lists Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map((lst) => (
            <div key={lst.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{lst.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{lst.description || 'No description'}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                {lst.memberCount} Members
              </span>
            </div>
          ))}
        </div>

        {/* Contacts Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="relative w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredContacts.length} of {contacts.length} Contacts
            </span>
          </div>

          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/60 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Recipient Name</th>
                <th className="py-3.5 px-6">Email Address</th>
                <th className="py-3.5 px-6">Company</th>
                <th className="py-3.5 px-6">Phone</th>
                <th className="py-3.5 px-6">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">
                    {c.firstName || c.lastName ? `${c.firstName || ''} ${c.lastName || ''}` : 'Unnamed Contact'}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-slate-600 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {c.email}
                  </td>
                  <td className="py-3.5 px-6 text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {c.company || '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {c.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Add Contact */}
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Add Individual Contact
              </h3>
              <form onSubmit={handleCreateContact} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      placeholder="Sarah"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Connor"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="Cyberdyne Systems"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
                    Save Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: New List */}
        {isListModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Create Contact List
              </h3>
              <form onSubmit={handleCreateList} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">List Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP Prospects"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    placeholder="Optional details..."
                    value={listDesc}
                    onChange={(e) => setListDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
                    Create List
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
