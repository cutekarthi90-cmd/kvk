import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Share2,
  CheckCircle,
  Eye,
  Clock,
  User,
  Phone,
  AlertCircle,
  CreditCard,
  Banknote,
  Trash2,
  MessageSquare,
  Search
} from 'lucide-react';
import { generateReceiptPDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp } from '../services/shareService';
import { Storage } from '../services/storage';

export default function ReceiptScreen({
  customers,
  receipts,
  shop,
  onSaveReceipt,
  onDeleteReceipt,
  onOpenAddCustomer,
  preselectedCustomerId = '',
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [activeView, setActiveView] = useState('create');
  const [historySearch, setHistorySearch] = useState('');
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');
  const [customReceiptNo, setCustomReceiptNo] = useState('');
  const [lastSavedReceipt, setLastSavedReceipt] = useState(null);

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
      setActiveView('create');
    }
  }, [preselectedCustomerId]);

  const autoReceiptNo = useMemo(() => {
    return String(receipts.length + 1);
  }, [receipts.length]);

  const nextReceiptNo = autoReceiptNo;

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerBalance = useMemo(() => {
    if (!selectedCustomerId) return { netDue: 0, totalSales: 0, totalPaid: 0 };
    return Storage.getCustomerBalance(selectedCustomerId);
  }, [selectedCustomerId, receipts]);

  const filteredReceipts = useMemo(() => {
    if (!historySearch.trim()) return receipts;
    const q = historySearch.toLowerCase();
    return receipts.filter(
      (r) =>
        String(r.receiptNo).toLowerCase().includes(q) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.customerPhone && r.customerPhone.includes(q))
    );
  }, [receipts, historySearch]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setCustomReceiptNo('');
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const getReceiptMessageText = (receipt, customer) => {
    const bal = Storage.getCustomerBalance(customer?.id || receipt.customerId);
    return (
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI\n` +
      `Cell: 94866 - 68732 / 94439 - 95160\n\n` +
      `*PAYMENT RECEIPT VOUCHER*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Receipt No: *No. ${receipt.receiptNo}*\n` +
      `Date: ${formatDate(receipt.date)}\n` +
      `Customer: *${customer?.name || receipt.customerName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Amount Received: Rs. ${Number(receipt.amount).toFixed(2)}*\n` +
      `Payment Mode: *${receipt.paymentMode || 'Cash'}* ${receipt.notes ? `(${receipt.notes})` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Current Balance Due: Rs. ${Number(bal.netDue).toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for your payment!`
    );
  };

  const handleShareSMS = (rec) => {
    const customer = customers.find((c) => c.id === rec.customerId) || {
      name: rec.customerName,
      phone: rec.customerPhone,
    };
    if (!customer?.phone) {
      showToast('No customer phone number!');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const msg = getReceiptMessageText(rec, customer);
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
  };

  const handleShareWhatsApp = async (recToShare) => {
    const customer = customers.find((c) => c.id === recToShare.customerId) || {
      name: recToShare.customerName,
      phone: recToShare.customerPhone,
    };

    if (!customer.phone) {
      showToast('Customer does not have a phone number!');
      return;
    }

    setSharing(true);
    try {
      const prevBal = customerBalance.netDue;
      const doc = generateReceiptPDF(recToShare, customer, shop, prevBal);
      const fileName = `${shop.name || 'Receipt'}_No_${recToShare.receiptNo}.pdf`.replace(/\s+/g, '_');
      const whatsappMsg = getReceiptMessageText(recToShare, customer);

      await sharePdfToWhatsApp({
        doc,
        fileName,
        phone: customer.phone,
        customerName: customer.name,
        messageText: whatsappMsg,
      });

      showToast('Receipt PDF shared to WhatsApp!');
    } catch (e) {
      console.error(e);
      showToast('Failed to generate PDF');
    } finally {
      setSharing(false);
    }
  };

  // Single Save Button Handler: Saves and auto-triggers WhatsApp
  const handleSingleSaveAndSend = async () => {
    if (!selectedCustomerId) {
      showToast('Please select a Customer!');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid amount!');
      return;
    }

    const newReceipt = {
      id: `rec-${Date.now()}`,
      receiptNo: nextReceiptNo,
      date,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      amount: numAmount,
      paymentMode,
      notes: notes.trim(),
    };

    onSaveReceipt(newReceipt);
    setLastSavedReceipt(newReceipt);
    showToast(`Receipt No. ${newReceipt.receiptNo} saved!`);

    await handleShareWhatsApp(newReceipt);
    resetForm();
  };

  const handlePreviewPdf = (recToPreview) => {
    const receipt = recToPreview || {
      receiptNo: nextReceiptNo,
      date,
      customerId: selectedCustomerId,
      amount: Number(amount) || 0,
      paymentMode,
      notes,
    };

    if (!receipt.amount) {
      showToast('Enter amount to preview receipt');
      return;
    }

    const customer = customers.find((c) => c.id === receipt.customerId) || {
      name: 'Preview Customer',
      phone: '9840123456',
    };

    const doc = generateReceiptPDF(receipt, customer, shop, customerBalance.netDue);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  };

  const handleDeleteReceiptItem = (rec) => {
    if (
      confirm(
        `Are you sure you want to delete Receipt No. ${rec.receiptNo} of ${formatCurrency(
          rec.amount
        )}? This will restore the customer balance.`
      )
    ) {
      if (onDeleteReceipt) {
        onDeleteReceipt(rec.id);
        showToast(`Receipt No. ${rec.receiptNo} deleted!`);
      }
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* POST-SAVE MODAL */}
      {lastSavedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-lg">
                Receipt No. {lastSavedReceipt.receiptNo} Saved!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lastSavedReceipt.customerName} • {formatCurrency(lastSavedReceipt.amount)}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(lastSavedReceipt)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Send on WhatsApp (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareSMS(lastSavedReceipt)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send via Normal SMS Message</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLastSavedReceipt(null)}
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs pt-1"
            >
              Done / Next Receipt
            </button>
          </div>
        </div>
      )}

      {/* Switcher: New Receipt vs History */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveView('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeView === 'create'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          + New Payment Receipt
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeView === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Past Receipts ({receipts.length})
        </button>
      </div>

      {activeView === 'history' ? (
        /* PAST RECEIPTS LIST WITH 1-TAP RESEND */
        <div className="p-3.5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Past Receipts ({receipts.length}) - Tap to Resend
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipts by No. or Customer..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No payment receipts recorded yet.
            </div>
          ) : (
            filteredReceipts.slice().reverse().map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">
                        No. {rec.receiptNo}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                        {rec.paymentMode}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {rec.customerName} • {rec.customerPhone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-600 text-base">
                      {formatCurrency(rec.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">{formatDate(rec.date)}</div>
                  </div>
                </div>

                {rec.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                    Note: {rec.notes}
                  </div>
                )}

                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleDeleteReceiptItem(rec)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Delete Receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePreviewPdf(rec)}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleShareSMS(rec)}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      SMS
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(rec)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      WhatsApp PDF
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* CREATE RECEIPT FORM */
        <div className="p-3 space-y-3">
          {/* Top Bar: Receipt No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Receipt Number (தானாக ஏறும்)
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-400">No.</span>
                <span className="font-black text-emerald-600 text-lg">
                  {autoReceiptNo}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Receipt Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Selection Card */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Customer (வாடிக்கையாளர்) *
              </label>
              <button
                type="button"
                onClick={onOpenAddCustomer}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                + New Customer
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => {
                const bal = Storage.getCustomerBalance(c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {bal.netDue > 0 ? `[Due: ₹${bal.netDue}]` : ''}
                  </option>
                );
              })}
            </select>

            {selectedCustomer && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {selectedCustomer.phone}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">
                    Balance Due
                  </span>
                  <span
                    className={`font-black text-sm ${
                      customerBalance.netDue > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(customerBalance.netDue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Amount Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount Received (ரசீது தொகை ₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customerBalance.netDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(customerBalance.netDue))}
                  className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold"
                >
                  Full Due (₹{customerBalance.netDue})
                </button>
              )}
              {[500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium"
                >
                  +₹{val}
                </button>
              ))}
            </div>

            {/* Payment Mode Selection */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {['Cash', 'GPay/UPI', 'Bank', 'Cheque'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                      paymentMode === mode
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Ref */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Note / Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UTR #, Cheque #, or GPay message"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* SINGLE PRIMARY SAVE BUTTON: "SAVE & SEND RECEIPT" */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={sharing}
              onClick={handleSingleSaveAndSend}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{sharing ? 'Sending...' : 'SAVE & SEND RECEIPT (ரசீது சேமித்து அனுப்புக)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePreviewPdf(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs flex items-center justify-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
