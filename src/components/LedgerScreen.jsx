import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  Phone,
  Share2,
  Eye,
  ArrowLeft,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  Truck,
  MessageSquare
} from 'lucide-react';
import { generateLedgerStatementPDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp, sendDirectSMS } from '../services/shareService';
import { Storage } from '../services/storage';

export default function LedgerScreen({
  customers = [],
  shop = {},
  sales = [],
  receipts = [],
  purchases = [],
  onOpenAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onQuickSale,
  onQuickReceipt,
}) {
  const [activeLedgerTab, setActiveLedgerTab] = useState('customers'); // 'customers' | 'suppliers'
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ==================== 1. CUSTOMER LEDGER CALCULATIONS ====================
  const customerListWithBalances = useMemo(() => {
    return customers.map((c) => {
      const balance = Storage.getCustomerBalance(c.id);
      return {
        ...c,
        balance,
      };
    });
  }, [customers, sales, receipts]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customerListWithBalances;
    const q = search.toLowerCase();
    return customerListWithBalances.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customerListWithBalances, search]);

  const totalOutstandingAll = useMemo(() => {
    return customerListWithBalances.reduce((sum, c) => sum + Math.max(0, c.balance.netDue), 0);
  }, [customerListWithBalances]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Customer Ledger transactions in DESCENDING order (newest first)
  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    const raw = Storage.getCustomerLedger(selectedCustomer.id);
    return [...raw].reverse();
  }, [selectedCustomer, sales, receipts]);

  const currentCustomerBalance = useMemo(() => {
    if (!selectedCustomer) return { totalSales: 0, totalPaid: 0, netDue: 0 };
    return Storage.getCustomerBalance(selectedCustomer.id);
  }, [selectedCustomer, sales, receipts]);

  // ==================== 2. SUPPLIER LEDGER CALCULATIONS ====================
  const supplierList = useMemo(() => {
    const map = {};
    purchases.forEach((p) => {
      const name = (p.supplierName || 'Unknown Supplier').trim();
      if (!map[name]) {
        map[name] = {
          name,
          phone: p.supplierPhone || '',
          totalPurchases: 0,
          totalPaid: 0,
          billsCount: 0,
          bills: [],
        };
      }
      const amt = Number(p.grandTotal) || 0;
      map[name].totalPurchases += amt;
      if (p.paymentStatus === 'PAID') {
        map[name].totalPaid += amt;
      }
      map[name].billsCount += 1;
      map[name].bills.push(p);
    });

    return Object.values(map).map((s) => ({
      ...s,
      netDue: s.totalPurchases - s.totalPaid,
    }));
  }, [purchases]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return supplierList;
    const q = search.toLowerCase();
    return supplierList.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q))
    );
  }, [supplierList, search]);

  const totalSupplierPayable = useMemo(() => {
    return supplierList.reduce((sum, s) => sum + Math.max(0, s.netDue), 0);
  }, [supplierList]);

  const selectedSupplier = useMemo(() => {
    if (!selectedSupplierName) return null;
    return supplierList.find((s) => s.name === selectedSupplierName) || null;
  }, [supplierList, selectedSupplierName]);

  // Supplier bills in DESCENDING order (newest first)
  const selectedSupplierBills = useMemo(() => {
    if (!selectedSupplier) return [];
    return [...(selectedSupplier.bills || [])].sort((a, b) => {
      const numA = parseInt(String(a.billNo).replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b.billNo).replace(/[^0-9]/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    });
  }, [selectedSupplier]);

  // ==================== SHARE HANDLERS ====================
  const handleShareCustomerWhatsApp = async () => {
    if (!selectedCustomer) return;
    if (!selectedCustomer.phone) {
      showToast('Customer phone number is missing!');
      return;
    }

    setSharing(true);
    try {
      const doc = generateLedgerStatementPDF(
        selectedCustomer,
        customerLedger,
        shop,
        currentCustomerBalance
      );
      const fileName = `${shop.name || 'Statement'}_${selectedCustomer.name}_Statement.pdf`.replace(
        /\s+/g,
        '_'
      );

      const whatsappMsg =
        `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
        `*Customer Account Statement*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Customer: *${selectedCustomer.name}*\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Total Billed: Rs. ${Number(currentCustomerBalance.totalSales).toFixed(2)}\n` +
        `Total Paid: Rs. ${Number(currentCustomerBalance.totalPaid).toFixed(2)}\n` +
        `*Net Balance Due: Rs. ${Number(currentCustomerBalance.netDue).toFixed(2)}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Thank you for your business!`;

      await sharePdfToWhatsApp({
        doc,
        fileName,
        phone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        messageText: whatsappMsg,
      });

      showToast('Opening WhatsApp to customer...');
    } catch (e) {
      console.error(e);
      showToast('Failed to generate Statement');
    } finally {
      setSharing(false);
    }
  };

  const handleShareSupplierWhatsApp = () => {
    if (!selectedSupplier) return;
    if (!selectedSupplier.phone) {
      showToast('Supplier phone number is missing!');
      return;
    }

    const whatsappMsg =
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `*Supplier Purchase Account Statement*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Supplier: *${selectedSupplier.name}*\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Total Purchases: Rs. ${Number(selectedSupplier.totalPurchases).toFixed(2)}\n` +
      `Total Paid: Rs. ${Number(selectedSupplier.totalPaid).toFixed(2)}\n` +
      `*Balance Payable: Rs. ${Number(selectedSupplier.netDue).toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Purchase Bills: ${selectedSupplier.billsCount} Bills recorded\n` +
      `Thank you!`;

    const cleanPhone = selectedSupplier.phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMsg)}`;
  };

  const handleShareCustomerSMS = () => {
    if (!selectedCustomer?.phone) {
      showToast('No customer phone number!');
      return;
    }
    const msg =
      `${shop.name || 'KVK THANIYA MANDI'}: Dear ${selectedCustomer.name}, your current outstanding balance is Rs. ${Number(currentCustomerBalance.netDue).toFixed(2)}. Thank you!`;
    sendDirectSMS(selectedCustomer.phone, msg);
  };

  const handleShareSupplierSMS = () => {
    if (!selectedSupplier?.phone) {
      showToast('No supplier phone number!');
      return;
    }
    const msg =
      `${shop.name || 'KVK THANIYA MANDI'}: Dear ${selectedSupplier.name}, purchase account statement balance is Rs. ${Number(selectedSupplier.netDue).toFixed(2)}. Thank you!`;
    sendDirectSMS(selectedSupplier.phone, msg);
  };

  const handleDeleteCustomerClick = (e, customer) => {
    if (e) e.stopPropagation();
    if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      if (onDeleteCustomer) {
        onDeleteCustomer(customer.id);
        if (selectedCustomerId === customer.id) {
          setSelectedCustomerId(null);
        }
        showToast(`Customer "${customer.name}" deleted!`);
      }
    }
  };

  const handleEditCustomerClick = (e, customer) => {
    if (e) e.stopPropagation();
    if (onEditCustomer) {
      onEditCustomer(customer);
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

      {/* VIEW A: DETAIL CUSTOMER STATEMENT */}
      {selectedCustomer ? (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase">
              Customer Statement
            </span>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">
                  {selectedCustomer.name}
                </h2>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedCustomer.phone}
                </div>
                {selectedCustomer.address && (
                  <div className="text-xs text-slate-400 mt-1">
                    {selectedCustomer.address}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleEditCustomerClick(e, selectedCustomer)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteCustomerClick(e, selectedCustomer)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Billed</div>
                <div className="font-extrabold text-slate-800 text-xs mt-0.5">
                  {formatCurrency(currentCustomerBalance.totalSales)}
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Paid</div>
                <div className="font-extrabold text-emerald-600 text-xs mt-0.5">
                  {formatCurrency(currentCustomerBalance.totalPaid)}
                </div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <div className="text-[10px] text-red-600 font-bold uppercase">Balance Due</div>
                <div className="font-black text-red-600 text-sm mt-0.5">
                  {formatCurrency(currentCustomerBalance.netDue)}
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp & SMS */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleShareCustomerWhatsApp}
                disabled={sharing}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </button>
              <button
                onClick={handleShareCustomerSMS}
                className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
            </div>
          </div>

          {/* Transactions List (Descending Order) */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase block pb-1 border-b border-slate-100">
              Transactions ({customerLedger.length}) - Newest First
            </span>

            {customerLedger.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No transactions recorded for this customer yet.
              </div>
            ) : (
              <div className="space-y-2">
                {customerLedger.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                            t.type === 'SALE'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {t.refNo}
                        </span>
                        <span className="text-slate-400 text-[11px]">{formatDate(t.date)}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] truncate mt-1">
                        {t.description}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {t.debit > 0 && (
                        <div className="font-bold text-red-600">
                          + {formatCurrency(t.debit)}
                        </div>
                      )}
                      {t.credit > 0 && (
                        <div className="font-bold text-emerald-600">
                          - {formatCurrency(t.credit)}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-medium">
                        Bal: {formatCurrency(t.balance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : selectedSupplier ? (
        /* VIEW B: DETAIL SUPPLIER STATEMENT */
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSupplierName(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Suppliers
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase">
              Supplier Statement (கொள்முதல்)
            </span>
          </div>

          {/* Supplier Profile Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">
                  {selectedSupplier.name}
                </h2>
                {selectedSupplier.phone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    {selectedSupplier.phone}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  {selectedSupplier.billsCount} Purchase Bills Recorded
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Purchase</div>
                <div className="font-extrabold text-slate-800 text-xs mt-0.5">
                  {formatCurrency(selectedSupplier.totalPurchases)}
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Paid</div>
                <div className="font-extrabold text-emerald-600 text-xs mt-0.5">
                  {formatCurrency(selectedSupplier.totalPaid)}
                </div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <div className="text-[10px] text-amber-700 font-bold uppercase">To Pay Supplier</div>
                <div className="font-black text-amber-700 text-sm mt-0.5">
                  {formatCurrency(selectedSupplier.netDue)}
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp & SMS */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleShareSupplierWhatsApp}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </button>
              <button
                onClick={handleShareSupplierSMS}
                className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
            </div>
          </div>

          {/* Supplier Bills List (Descending Order) */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase block pb-1 border-b border-slate-100">
              Purchase History ({selectedSupplierBills.length}) - Newest First
            </span>

            {selectedSupplierBills.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No purchase bills found for this supplier.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSupplierBills.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          Bill #{p.billNo}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            p.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{formatDate(p.date)}</span>
                    </div>

                    <div className="text-slate-600 text-[11px]">
                      {(p.items || []).map((i) => `${i.name} (${i.qty} Bag)`).join(', ')}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-500">Bill Amount:</span>
                      <span className="text-blue-600 font-black text-sm">
                        {formatCurrency(p.grandTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MASTER DIRECTORY: CUSTOMERS VS SUPPLIERS TAB */
        <div className="p-3 space-y-3">
          {/* Top Switcher: Customer Ledger vs Supplier Ledger */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex gap-1">
            <button
              onClick={() => {
                setActiveLedgerTab('customers');
                setSearch('');
              }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeLedgerTab === 'customers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Ledger ({customers.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveLedgerTab('suppliers');
                setSearch('');
              }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeLedgerTab === 'suppliers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Supplier Ledger ({supplierList.length})</span>
            </button>
          </div>

          {activeLedgerTab === 'customers' ? (
            /* TAB 1: CUSTOMERS DIRECTORY */
            <>
              {/* Market Outstanding Due Banner */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-4 text-white shadow-md">
                <div className="text-xs text-blue-200 font-medium uppercase tracking-wider">
                  Total Market Outstanding Due (வாடிக்கையாளர் பாக்கி)
                </div>
                <div className="text-2xl font-black mt-1">
                  {formatCurrency(totalOutstandingAll)}
                </div>
                <div className="text-[11px] text-blue-200/80 mt-1">
                  Across {customers.length} registered customers
                </div>
              </div>

              {/* Search bar & Add Customer Button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer by name or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
                <button
                  onClick={onOpenAddCustomer}
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>

              {/* Customer Cards List */}
              <div className="space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No customers found matching "{search}".
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-blue-400 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3 active:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {c.phone}
                        </div>
                        {c.address && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {c.address}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Balance
                        </span>
                        <span
                          className={`text-sm font-extrabold ${
                            c.balance.netDue > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(c.balance.netDue)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleEditCustomerClick(e, c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCustomerClick(e, c)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 ml-0.5" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* TAB 2: SUPPLIERS DIRECTORY */
            <>
              {/* Supplier Total Payable Banner */}
              <div className="bg-gradient-to-r from-amber-700 to-orange-800 rounded-2xl p-4 text-white shadow-md">
                <div className="text-xs text-amber-200 font-medium uppercase tracking-wider">
                  Total Supplier Payable (கொள்முதல் கொடுக்க வேண்டிய பாக்கி)
                </div>
                <div className="text-2xl font-black mt-1">
                  {formatCurrency(totalSupplierPayable)}
                </div>
                <div className="text-[11px] text-amber-200/80 mt-1">
                  Across {supplierList.length} suppliers from purchases
                </div>
              </div>

              {/* Search Suppliers */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search supplier by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
              </div>

              {/* Suppliers List */}
              <div className="space-y-2">
                {filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No suppliers found. Purchase entries will automatically add suppliers here.
                  </div>
                ) : (
                  filteredSuppliers.map((s) => (
                    <div
                      key={s.name}
                      onClick={() => setSelectedSupplierName(s.name)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-amber-400 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3 active:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-blue-600" />
                          {s.phone || 'No Phone'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {s.billsCount} Purchase Bills
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          To Pay
                        </span>
                        <span
                          className={`text-sm font-extrabold ${
                            s.netDue > 0 ? 'text-amber-700' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(s.netDue)}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 ml-0.5" />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
