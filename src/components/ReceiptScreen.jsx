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
  Search,
  Truck,
  FileText
} from 'lucide-react';
import { generateReceiptPDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp, sharePdfAsFile, sendDirectSMS } from '../services/shareService';
import { Storage } from '../services/storage';

export default function ReceiptScreen({
  customers = [],
  receipts = [],
  shop = {},
  onSaveReceipt,
  onDeleteReceipt,
  onOpenAddCustomer,
  preselectedCustomerId = '',
}) {
  // Voucher Entry Type: 'customer' (வரவு) | 'supplier' (பற்று / கொள்முதல் பட்டுவாடா)
  const [entryType, setEntryType] = useState('customer');

  // Customer Receipt states
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');

  // Supplier Payment states
  const [savedSuppliers, setSavedSuppliers] = useState(() => Storage.getSuppliers());
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierPayments, setSupplierPayments] = useState(() => Storage.getSupplierPayments());

  // Shared Form states
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [activeView, setActiveView] = useState('create'); // 'create' | 'history'
  const [historySearch, setHistorySearch] = useState('');
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');
  const [lastSavedVoucher, setLastSavedVoucher] = useState(null);

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
      setEntryType('customer');
      setActiveView('create');
    }
  }, [preselectedCustomerId]);

  const autoReceiptNo = useMemo(() => {
    return String(receipts.length + 1);
  }, [receipts.length]);

  const autoSupplierVoucherNo = useMemo(() => {
    return String(supplierPayments.length + 1);
  }, [supplierPayments.length]);

  const voucherNo = entryType === 'customer' ? autoReceiptNo : autoSupplierVoucherNo;

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerBalance = useMemo(() => {
    if (!selectedCustomerId) return { netDue: 0, totalSales: 0, totalPaid: 0 };
    return Storage.getCustomerBalance(selectedCustomerId);
  }, [selectedCustomerId, receipts]);

  const supplierBalance = useMemo(() => {
    if (!selectedSupplierName) return { totalPurchases: 0, totalPaid: 0, netDue: 0 };
    return Storage.getSupplierBalance(selectedSupplierName);
  }, [selectedSupplierName, supplierPayments]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedSupplierName('');
    setSupplierPhone('');
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  // Text generator for Customer Receipt
  const getCustomerReceiptText = (receipt, customer) => {
    const bal = Storage.getCustomerBalance(customer?.id || receipt.customerId);
    return (
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI\n` +
      `Cell: 94866 - 68732 / 94439 - 95160\n\n` +
      `*PAYMENT RECEIPT VOUCHER (வரவு)*\n` +
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

  // Text generator for Supplier Payment
  const getSupplierPaymentText = (payment, remainingDue) => {
    return (
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI\n` +
      `Cell: 94866 - 68732 / 94439 - 95160\n\n` +
      `*SUPPLIER PAYMENT VOUCHER (பட்டுவாடா)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Voucher No: *#${payment.voucherNo}*\n` +
      `Date: ${formatDate(payment.date)}\n` +
      `Paid To Supplier: *${payment.supplierName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Amount Paid: Rs. ${Number(payment.amount).toFixed(2)}*\n` +
      `Payment Mode: *${payment.paymentMode || 'Cash'}* ${payment.notes ? `(${payment.notes})` : ''}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Remaining Balance to Pay: Rs. ${Number(remainingDue).toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Thank you!`
    );
  };

  // SHARE TO WHATSAPP (Direct 1-Tap)
  const handleShareWhatsApp = async (voucher) => {
    const isCust = voucher.type !== 'supplier';
    const phone = isCust ? voucher.customerPhone : voucher.supplierPhone;
    if (!phone) {
      showToast('Phone number is missing!');
      return;
    }

    setSharing(true);
    try {
      if (isCust) {
        const customer = customers.find((c) => c.id === voucher.customerId) || {
          name: voucher.customerName,
          phone: voucher.customerPhone,
        };
        const prevBal = customerBalance.netDue;
        const doc = generateReceiptPDF(voucher, customer, shop, prevBal);
        const fileName = `${shop.name || 'Receipt'}_No_${voucher.receiptNo}.pdf`.replace(/\s+/g, '_');
        const whatsappMsg = getCustomerReceiptText(voucher, customer);

        await sharePdfToWhatsApp({
          doc,
          fileName,
          phone: customer.phone,
          customerName: customer.name,
          messageText: whatsappMsg,
        });
      } else {
        const remainingDue = Math.max(0, supplierBalance.netDue - Number(voucher.amount));
        const whatsappMsg = getSupplierPaymentText(voucher, remainingDue);
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const targetPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMsg)}`;
      }
      showToast('Opening WhatsApp...');
    } catch (e) {
      console.error(e);
      showToast('Failed to open WhatsApp');
    } finally {
      setSharing(false);
    }
  };

  // SHARE PDF AS FILE ATTACHMENT
  const handleSharePdfAttachment = async (voucher) => {
    if (voucher.type === 'supplier') {
      handleShareWhatsApp(voucher);
      return;
    }
    const customer = customers.find((c) => c.id === voucher.customerId) || {
      name: voucher.customerName,
      phone: voucher.customerPhone,
    };
    const prevBal = customerBalance.netDue;
    const doc = generateReceiptPDF(voucher, customer, shop, prevBal);
    const fileName = `${shop.name || 'Receipt'}_No_${voucher.receiptNo}.pdf`.replace(/\s+/g, '_');
    const whatsappMsg = getCustomerReceiptText(voucher, customer);
    await sharePdfAsFile({ doc, fileName, messageText: whatsappMsg });
  };

  // SHARE SMS
  const handleShareSMS = (voucher) => {
    const isCust = voucher.type !== 'supplier';
    const phone = isCust ? voucher.customerPhone : voucher.supplierPhone;
    if (!phone) {
      showToast('No phone number!');
      return;
    }

    if (isCust) {
      const customer = customers.find((c) => c.id === voucher.customerId) || {
        name: voucher.customerName,
        phone: voucher.customerPhone,
      };
      const msg = getCustomerReceiptText(voucher, customer);
      sendDirectSMS(phone, msg);
    } else {
      const remainingDue = Math.max(0, supplierBalance.netDue - Number(voucher.amount));
      const msg = getSupplierPaymentText(voucher, remainingDue);
      sendDirectSMS(phone, msg);
    }
  };

  // SINGLE SAVE BUTTON HANDLER
  const handleSingleSaveAndSend = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid amount!');
      return;
    }

    if (entryType === 'customer') {
      if (!selectedCustomerId) {
        showToast('Please select a Customer!');
        return;
      }
      const newReceipt = {
        id: `rec-${Date.now()}`,
        type: 'customer',
        receiptNo: autoReceiptNo,
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
      setLastSavedVoucher(newReceipt);
      showToast(`Receipt No. ${newReceipt.receiptNo} saved!`);
      await handleShareWhatsApp(newReceipt);
      resetForm();
    } else {
      // Supplier Payment
      if (!selectedSupplierName.trim()) {
        showToast('Please select or enter Supplier Name!');
        return;
      }
      const newPayment = {
        id: `suppay-${Date.now()}`,
        type: 'supplier',
        voucherNo: autoSupplierVoucherNo,
        date,
        createdAt: new Date().toISOString(),
        supplierName: selectedSupplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        amount: numAmount,
        paymentMode,
        notes: notes.trim(),
      };

      const updatedPayments = [newPayment, ...supplierPayments];
      setSupplierPayments(updatedPayments);
      Storage.saveSupplierPayments(updatedPayments);

      // Auto-save supplier to master if not existing
      const existing = savedSuppliers.find(
        (s) => s.name.toLowerCase() === selectedSupplierName.trim().toLowerCase()
      );
      if (!existing) {
        const newSup = {
          id: `sup-${Date.now()}`,
          name: selectedSupplierName.trim(),
          phone: supplierPhone.trim(),
        };
        const updatedSups = [newSup, ...savedSuppliers];
        setSavedSuppliers(updatedSups);
        Storage.saveSuppliers(updatedSups);
      }

      setLastSavedVoucher(newPayment);
      showToast(`Supplier Payment #${newPayment.voucherNo} saved!`);
      await handleShareWhatsApp(newPayment);
      resetForm();
    }
  };

  // Combined Vouchers History in STRICT DESCENDING ORDER
  const sortedVouchersHistory = useMemo(() => {
    const list = [
      ...receipts.map((r) => ({ ...r, type: 'customer' })),
      ...supplierPayments.map((p) => ({ ...p, type: 'supplier' })),
    ];

    const filtered = list.filter((v) => {
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      const name = v.customerName || v.supplierName || '';
      const phone = v.customerPhone || v.supplierPhone || '';
      const no = v.receiptNo || v.voucherNo || '';
      return (
        name.toLowerCase().includes(q) ||
        phone.includes(q) ||
        String(no).toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    });
  }, [receipts, supplierPayments, historySearch]);

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* POST-SAVE DIALOG */}
      {lastSavedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-lg">
                {lastSavedVoucher.type === 'supplier'
                  ? `Payment #${lastSavedVoucher.voucherNo} Saved!`
                  : `Receipt No. ${lastSavedVoucher.receiptNo} Saved!`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lastSavedVoucher.customerName || lastSavedVoucher.supplierName} •{' '}
                {formatCurrency(lastSavedVoucher.amount)}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(lastSavedVoucher)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Share2 className="w-4 h-4" />
                <span>1-Tap WhatsApp Chat (Direct)</span>
              </button>

              {lastSavedVoucher.type !== 'supplier' && (
                <button
                  type="button"
                  onClick={() => handleSharePdfAttachment(lastSavedVoucher)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-300"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>Share PDF File as Attachment</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleShareSMS(lastSavedVoucher)}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Normal SMS Message</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLastSavedVoucher(null)}
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs pt-1"
            >
              Done / Create Next Voucher
            </button>
          </div>
        </div>
      )}

      {/* Main Switcher: Create Voucher vs History */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveView('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeView === 'create'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          + New Voucher (ரசீது / பற்று)
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
          Past Vouchers ({receipts.length + supplierPayments.length})
        </button>
      </div>

      {activeView === 'history' ? (
        /* PAST VOUCHERS LIST (DESCENDING ORDER) */
        <div className="p-3.5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Past Receipts & Payments - Tap to Resend
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, supplier, or No..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {sortedVouchersHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No payment receipts recorded yet.
            </div>
          ) : (
            sortedVouchersHistory.map((rec) => {
              const isCust = rec.type !== 'supplier';
              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">
                          {isCust ? `No. ${rec.receiptNo}` : `#${rec.voucherNo}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isCust
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCust ? 'Customer வரவு' : 'Supplier பற்று'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-0.5">
                        {rec.customerName || rec.supplierName} • {rec.customerPhone || rec.supplierPhone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-black text-base ${
                          isCust ? 'text-emerald-600' : 'text-amber-700'
                        }`}
                      >
                        {formatCurrency(rec.amount)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{formatDate(rec.date)}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => {
                        if (isCust) {
                          onDeleteReceipt(rec.id);
                        } else {
                          const updated = supplierPayments.filter((p) => p.id !== rec.id);
                          setSupplierPayments(updated);
                          Storage.saveSupplierPayments(updated);
                        }
                        showToast('Deleted voucher');
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleShareSMS(rec)}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        SMS
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(rec)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* CREATE VOUCHER FORM */
        <div className="p-3 space-y-3">
          {/* Sub-Toggle: Customer Receipt (வரவு) vs Supplier Payment (பட்டுவாடா) */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex gap-1">
            <button
              type="button"
              onClick={() => {
                setEntryType('customer');
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                entryType === 'customer'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Receipt (வரவு)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType('supplier');
                resetForm();
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                entryType === 'supplier'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Supplier Payment (பட்டுவாடா)</span>
            </button>
          </div>

          {/* Top Bar: Number & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {entryType === 'customer' ? 'Receipt No. (தானாக ஏறும்)' : 'Voucher No. (தானாக ஏறும்)'}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-400">#</span>
                <span
                  className={`font-black text-lg ${
                    entryType === 'customer' ? 'text-emerald-600' : 'text-amber-700'
                  }`}
                >
                  {voucherNo}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Party Card: Customer or Supplier */}
          {entryType === 'customer' ? (
            /* CUSTOMER SELECTOR */
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Customer (வாடிக்கையாளர்) *
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Customer ({filteredCustomers.length}) --</option>
                {filteredCustomers.map((c) => {
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
                    <div className="text-xs font-bold text-slate-800">{selectedCustomer.name}</div>
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
          ) : (
            /* SUPPLIER SELECTOR */
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                Supplier (கொள்முதல் சப்ளையர்) *
              </label>

              <select
                value={selectedSupplierName}
                onChange={(e) => {
                  const name = e.target.value;
                  setSelectedSupplierName(name);
                  const found = savedSuppliers.find((s) => s.name === name);
                  setSupplierPhone(found?.phone || '');
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Choose Supplier ({savedSuppliers.length}) --</option>
                {savedSuppliers.map((s) => {
                  const bal = Storage.getSupplierBalance(s.name);
                  return (
                    <option key={s.name} value={s.name}>
                      {s.name} {s.phone ? `(${s.phone})` : ''} {bal.netDue > 0 ? `[To Pay: ₹${bal.netDue}]` : ''}
                    </option>
                  );
                })}
              </select>

              {/* Or type supplier directly */}
              {!selectedSupplierName && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Or type Supplier Name"
                    value={selectedSupplierName}
                    onChange={(e) => setSelectedSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (WhatsApp)"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {selectedSupplierName && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-amber-950">{selectedSupplierName}</div>
                    <div className="text-[11px] text-slate-500">{supplierPhone || 'No phone'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-amber-700 block font-bold">
                      To Pay Supplier
                    </span>
                    <span className="font-black text-amber-800 text-sm">
                      {formatCurrency(supplierBalance.netDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {entryType === 'customer'
                  ? 'Amount Received (ரசீது வரவு ₹) *'
                  : 'Amount Paid to Supplier (பட்டுவாடா தொகை ₹) *'}
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
                  className={`w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-slate-900 focus:outline-none focus:bg-white ${
                    entryType === 'customer'
                      ? 'focus:ring-2 focus:ring-emerald-500'
                      : 'focus:ring-2 focus:ring-amber-500'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Fill Full Due */}
            {entryType === 'customer' && customerBalance.netDue > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(customerBalance.netDue))}
                className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold"
              >
                Full Due (₹{customerBalance.netDue})
              </button>
            )}

            {entryType === 'supplier' && supplierBalance.netDue > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(supplierBalance.netDue))}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold"
              >
                Full Supplier Due (₹{supplierBalance.netDue})
              </button>
            )}

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {['Cash', 'GPay/UPI', 'Bank', 'Cheque'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      paymentMode === mode
                        ? entryType === 'customer'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <input
                type="text"
                placeholder="Notes / Cheque No / Remarks (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Single Save & Send Button */}
            <button
              type="button"
              onClick={handleSingleSaveAndSend}
              className={`w-full py-3.5 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all ${
                entryType === 'customer'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {entryType === 'customer'
                  ? 'SAVE & SEND RECEIPT'
                  : 'SAVE & SEND TO SUPPLIER'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
