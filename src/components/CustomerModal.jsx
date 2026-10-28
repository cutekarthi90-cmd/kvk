import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Check, Wallet } from 'lucide-react';

export default function CustomerModal({ isOpen, onClose, onSave, existingCustomer = null }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceType, setOpeningBalanceType] = useState('DEBIT');
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingCustomer) {
      setName(existingCustomer.name || '');
      setPhone(existingCustomer.phone || '');
      setAddress(existingCustomer.address || '');
      setNotes(existingCustomer.notes || '');
      setOpeningBalance(existingCustomer.openingBalance !== undefined ? String(existingCustomer.openingBalance) : '');
      setOpeningBalanceType(existingCustomer.openingBalanceType || 'DEBIT');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setOpeningBalance('');
      setOpeningBalanceType('DEBIT');
    }
    setError('');
  }, [existingCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer Name is required');
      return;
    }
    if (!phone.trim()) {
      setError('WhatsApp Phone Number is required');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    const customerData = {
      id: existingCustomer?.id || `cust-${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      address: address.trim(),
      notes: notes.trim(),
      openingBalance: Number(openingBalance) || 0,
      openingBalanceType,
      createdAt: existingCustomer?.createdAt || new Date().toISOString(),
    };

    onSave(customerData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base sm:text-lg">
              {existingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Customer Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Veehech Coco Substrates / Murugan"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              WhatsApp Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
              <input
                type="tel"
                placeholder="10-digit number e.g. 9840123456"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm"
                maxLength={10}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              PDF bills and receipts will be sent to this WhatsApp number.
            </p>
          </div>

          {/* OPENING BALANCE (ஆரம்ப இருப்பு / பழைய பாக்கி) */}
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              Opening Balance / ஆரம்ப இருப்பு (பழைய பாக்கி ₹)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex rounded-xl border border-slate-200 p-0.5 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setOpeningBalanceType('DEBIT')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    openingBalanceType === 'DEBIT'
                      ? 'bg-red-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Customer owes money (வர வேண்டியது)"
                >
                  Debit (Due)
                </button>
                <button
                  type="button"
                  onClick={() => setOpeningBalanceType('CREDIT')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    openingBalanceType === 'CREDIT'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Advance payment (கொடுத்தது)"
                >
                  Credit (Advance)
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Pazhaya balance edhachum irundha inge podalam. Ledger-la idhu add aagi balance kaatum.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Address / Area (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Chennimalai Road, Erode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md flex items-center justify-center gap-1.5 text-sm"
            >
              <Check className="w-4 h-4" />
              {existingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
