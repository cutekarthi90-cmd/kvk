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
  MessageSquare,
  Fuel,
  Coins,
  Building2,
  Wallet,
  UserPlus,
  X
} from 'lucide-react';
import { generateLedgerStatementPDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp, sendDirectSMS } from '../services/shareService';
import { Storage } from '../services/storage';
import ExpensesTab from './ExpensesTab';
import InterestTab from './InterestTab';

export default function LedgerScreen({
  customers = [],
  shop = {},
  sales = [],
  receipts = [],
  purchases = [],
  salesReturns = [],
  suppliers: externalSuppliers,
  supplierPayments = [],
  expenses = [],
  interestLoans = [],
  interestPayments = [],
  onOpenAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSaveSuppliers,
  onSaveExpense,
  onDeleteExpense,
  onSaveInterestLoan,
  onDeleteInterestLoan,
  onSaveInterestPayment,
  onDeleteInterestPayment,
  onQuickSale,
  onQuickReceipt,
}) {
  const [activeLedgerTab, setActiveLedgerTab] = useState('customers'); // 'customers' | 'suppliers' | 'expenses' | 'interest'
  const [customerSubTab, setCustomerSubTab] = useState('regular'); // 'regular' | 'qsale' | 'all'
  const [statementFilter, setStatementFilter] = useState('ALL'); // 'ALL' | 'REGULAR' | 'Q_SALE'
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');

  // Suppliers Master & Edit State
  const [internalSuppliers, setInternalSuppliers] = useState(() => Storage.getSuppliers());
  const savedSuppliers = externalSuppliers || internalSuppliers;
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierFormName, setSupplierFormName] = useState('');
  const [supplierFormPhone, setSupplierFormPhone] = useState('');
  const [supplierFormGstin, setSupplierFormGstin] = useState('');
  const [supplierFormOpBal, setSupplierFormOpBal] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ==================== 1. CUSTOMER LEDGER CALCULATIONS ====================
  const customerListWithBalances = useMemo(() => {
    return (customers || []).map((c) => {
      const regBal = Storage.getCustomerBalance(c.id, 'REGULAR', sales, receipts, salesReturns, c);
      const qBal = Storage.getCustomerBalance(c.id, 'Q_SALE', sales, receipts, salesReturns, c);
      const allBal = Storage.getCustomerBalance(c.id, 'ALL', sales, receipts, salesReturns, c);

      const custSales = (sales || []).filter((s) => s && s.customerId === c.id);
      const hasRegularSales = custSales.some((s) => !s.isQSale && s.billType !== 'Q_SALE') || (Number(c.openingBalance) > 0);
      const hasQSales = custSales.some((s) => s.isQSale || s.billType === 'Q_SALE');

      return {
        ...c,
        balance: allBal || { netDue: 0, totalSales: 0, totalPaid: 0 },
        regBalance: regBal || { netDue: 0, totalSales: 0, totalPaid: 0 },
        qBalance: qBal || { netDue: 0, totalSales: 0, totalPaid: 0 },
        hasRegularSales,
        hasQSales,
      };
    });
  }, [customers, sales, receipts, salesReturns]);

  const displayedCustomers = useMemo(() => {
    let list = customerListWithBalances || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      return list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
      );
    }

    if (customerSubTab === 'qsale') {
      // Sort customers with Q-Sales or Q-Due first, then all remaining customers
      return [...list].sort((a, b) => {
        const aHas = a.hasQSales || (a.qBalance?.netDue > 0) ? 1 : 0;
        const bHas = b.hasQSales || (b.qBalance?.netDue > 0) ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return (b.qBalance?.netDue || 0) - (a.qBalance?.netDue || 0);
      });
    }

    if (customerSubTab === 'regular') {
      // Sort customers with Regular sales or Regular due first, then all remaining customers
      return [...list].sort((a, b) => {
        const aHas = a.hasRegularSales || (a.regBalance?.netDue > 0) ? 1 : 0;
        const bHas = b.hasRegularSales || (b.regBalance?.netDue > 0) ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return (b.regBalance?.netDue || 0) - (a.regBalance?.netDue || 0);
      });
    }

    return [...list].sort((a, b) => (b.balance?.netDue || 0) - (a.balance?.netDue || 0));
  }, [customerListWithBalances, customerSubTab, search]);

  const currentTabOutstanding = useMemo(() => {
    if (customerSubTab === 'regular') {
      return customerListWithBalances.reduce((sum, c) => sum + Math.max(0, Number(c.regBalance?.netDue) || 0), 0);
    }
    if (customerSubTab === 'qsale') {
      return customerListWithBalances.reduce((sum, c) => sum + Math.max(0, Number(c.qBalance?.netDue) || 0), 0);
    }
    return customerListWithBalances.reduce((sum, c) => sum + Math.max(0, Number(c.balance?.netDue) || 0), 0);
  }, [customerListWithBalances, customerSubTab]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Customer Ledger transactions in DESCENDING order (newest first)
  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    const raw = Storage.getCustomerLedger(selectedCustomer.id, statementFilter, sales, receipts, salesReturns, selectedCustomer);
    return [...raw].reverse();
  }, [selectedCustomer, sales, receipts, salesReturns, statementFilter]);

  const currentCustomerBalance = useMemo(() => {
    if (!selectedCustomer) return { totalSales: 0, totalPaid: 0, netDue: 0, openingBalance: 0 };
    return Storage.getCustomerBalance(selectedCustomer.id, statementFilter, sales, receipts, salesReturns, selectedCustomer);
  }, [selectedCustomer, sales, receipts, salesReturns, statementFilter]);

  // ==================== 2. SUPPLIER LEDGER CALCULATIONS ====================
  const supplierList = useMemo(() => {
    const map = {};
    // 1. First add all savedSuppliers from master
    (savedSuppliers || []).forEach((s) => {
      const name = (s.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      map[key] = {
        id: s.id || `sup-${key}`,
        name,
        phone: s.phone || '',
        gstin: s.gstin || '',
        openingBalance: Number(s.openingBalance) || 0,
        totalPurchases: 0,
        totalPaid: 0,
        totalDiscount: 0,
        billsCount: 0,
        bills: [],
      };
    });

    // 2. Add / merge from purchases
    purchases.forEach((p) => {
      const name = (p.supplierName || 'Unknown Supplier').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map[key]) {
        map[key] = {
          id: `sup-${Date.now()}-${Math.random()}`,
          name,
          phone: p.supplierPhone || '',
          gstin: p.supplierGstin || '',
          openingBalance: 0,
          totalPurchases: 0,
          totalPaid: 0,
          totalDiscount: 0,
          billsCount: 0,
          bills: [],
        };
      }
      if (!map[key].phone && p.supplierPhone) map[key].phone = p.supplierPhone;
      if (!map[key].gstin && p.supplierGstin) map[key].gstin = p.supplierGstin;

      const sub = Number(p.subTotal) || Number(p.grandTotal) || 0;
      const disc = Number(p.discount) || 0;
      const grand = Number(p.grandTotal) || (sub - disc);

      map[key].totalPurchases += sub;
      map[key].totalDiscount += disc;

      if (p.paymentStatus === 'PAID') {
        map[key].totalPaid += grand;
      }
      map[key].billsCount += 1;
      map[key].bills.push(p);
    });

    return Object.values(map).map((s) => ({
      ...s,
      netDue: Math.max(0, s.openingBalance + s.totalPurchases - s.totalPaid - s.totalDiscount),
    }));
  }, [purchases, savedSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return supplierList;
    const q = search.toLowerCase();
    return supplierList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
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

  // ==================== SUPPLIER ADD / EDIT HANDLERS ====================
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormName('');
    setSupplierFormPhone('');
    setSupplierFormGstin('');
    setSupplierFormOpBal('');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (e, sup) => {
    if (e) e.stopPropagation();
    setEditingSupplier(sup);
    setSupplierFormName(sup.name || '');
    setSupplierFormPhone(sup.phone || '');
    setSupplierFormGstin(sup.gstin || '');
    setSupplierFormOpBal(sup.openingBalance !== undefined ? String(sup.openingBalance) : '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!supplierFormName.trim()) {
      showToast('Supplier Name is required!');
      return;
    }
    const cleanName = supplierFormName.trim();
    const cleanPhone = supplierFormPhone.trim();
    const cleanGstin = supplierFormGstin.trim().toUpperCase();
    const cleanOpBal = Number(supplierFormOpBal) || 0;

    let updated;
    if (editingSupplier) {
      let matched = false;
      updated = savedSuppliers.map((s) => {
        if (s.id === editingSupplier.id || s.name.toLowerCase() === editingSupplier.name.toLowerCase()) {
          matched = true;
          return {
            ...s,
            name: cleanName,
            phone: cleanPhone,
            gstin: cleanGstin,
            openingBalance: cleanOpBal,
          };
        }
        return s;
      });
      if (!matched) {
        updated.push({
          id: editingSupplier.id || `sup-${Date.now()}`,
          name: cleanName,
          phone: cleanPhone,
          gstin: cleanGstin,
          openingBalance: cleanOpBal,
        });
      }
      if (selectedSupplierName === editingSupplier.name) {
        setSelectedSupplierName(cleanName);
      }
    } else {
      const newSup = {
        id: `sup-${Date.now()}`,
        name: cleanName,
        phone: cleanPhone,
        gstin: cleanGstin,
        openingBalance: cleanOpBal,
      };
      updated = [newSup, ...savedSuppliers];
    }

    if (onSaveSuppliers) {
      onSaveSuppliers(updated);
    } else {
      setInternalSuppliers(updated);
      Storage.saveSuppliers(updated);
    }
    setIsSupplierModalOpen(false);
    showToast(editingSupplier ? 'Supplier updated successfully!' : 'Supplier added successfully!');
  };

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

      const filterLabel =
        statementFilter === 'Q_SALE'
          ? ' [Q-Sale / கொட்டேஷன்]'
          : statementFilter === 'REGULAR'
          ? ' [Regular Sale / விற்பனை]'
          : '';
      const gstinLine = selectedCustomer.gstin ? `GSTIN: ${selectedCustomer.gstin}\n` : '';

      const whatsappMsg =
        `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
        `*Customer Account Statement${filterLabel}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Customer: *${selectedCustomer.name}*\n` +
        gstinLine +
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

    const opBalLine =
      Number(selectedSupplier.openingBalance) > 0
        ? `Opening Balance: Rs. ${Number(selectedSupplier.openingBalance).toFixed(2)}\n`
        : '';
    const gstinLine = selectedSupplier.gstin ? `GSTIN: ${selectedSupplier.gstin}\n` : '';

    const whatsappMsg =
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `*Supplier Purchase Account Statement*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Supplier: *${selectedSupplier.name}*\n` +
      gstinLine +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      opBalLine +
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
    const msg = `${shop.name || 'KVK THANIYA MANDI'}: Dear ${selectedCustomer.name}, your current outstanding balance is Rs. ${Number(currentCustomerBalance.netDue).toFixed(2)}. Thank you!`;
    sendDirectSMS(selectedCustomer.phone, msg);
  };

  const handleShareSupplierSMS = () => {
    if (!selectedSupplier?.phone) {
      showToast('No supplier phone number!');
      return;
    }
    const msg = `${shop.name || 'KVK THANIYA MANDI'}: Dear ${selectedSupplier.name}, purchase account statement balance is Rs. ${Number(selectedSupplier.netDue).toFixed(2)}. Thank you!`;
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
                {selectedCustomer.gstin && (
                  <div className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 border border-indigo-100">
                    <Building2 className="w-3 h-3 text-indigo-500" />
                    <span>GST:</span> {selectedCustomer.gstin}
                  </div>
                )}
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

            {/* Filter Toggle: All vs Regular Sale vs Q-Sale */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatementFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  statementFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Bills
              </button>
              <button
                type="button"
                onClick={() => setStatementFilter('REGULAR')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  statementFilter === 'REGULAR'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 Regular
              </button>
              <button
                type="button"
                onClick={() => setStatementFilter('Q_SALE')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  statementFilter === 'Q_SALE'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📦 Q-Sale
              </button>
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
                No transactions recorded for this customer in this category yet.
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
                            t.type === 'Q_SALE'
                              ? 'bg-purple-100 text-purple-700'
                              : t.type === 'SALE'
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
                {selectedSupplier.gstin && (
                  <div className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 border border-indigo-100">
                    <Building2 className="w-3 h-3 text-indigo-500" />
                    <span>GST:</span> {selectedSupplier.gstin}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  {selectedSupplier.billsCount} Purchase Bills Recorded
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleOpenEditSupplier(e, selectedSupplier)}
                  className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Edit Supplier (GSTIN / Opening Balance)"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary Cards: 4 columns including Opening Balance */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[9px] text-slate-400 font-bold uppercase truncate">Opening Bal</div>
                <div className="font-extrabold text-slate-800 text-xs mt-0.5">
                  {formatCurrency(selectedSupplier.openingBalance || 0)}
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[9px] text-slate-400 font-bold uppercase truncate">Total Purchase</div>
                <div className="font-extrabold text-slate-800 text-xs mt-0.5">
                  {formatCurrency(selectedSupplier.totalPurchases)}
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[9px] text-slate-400 font-bold uppercase truncate">Total Paid</div>
                <div className="font-extrabold text-emerald-600 text-xs mt-0.5">
                  {formatCurrency(selectedSupplier.totalPaid)}
                </div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <div className="text-[9px] text-amber-700 font-bold uppercase truncate">To Pay</div>
                <div className="font-black text-amber-700 text-xs mt-0.5">
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
                No purchase bills found for this supplier yet.
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
                        {p.isQPurchase && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-700">
                            Q-Purchase
                          </span>
                        )}
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
          {/* Top Switcher: 4 Tabs - Customer, Supplier, Expenses, Interest */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs grid grid-cols-4 gap-1">
            <button
              onClick={() => {
                setActiveLedgerTab('customers');
                setSearch('');
              }}
              className={`py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                activeLedgerTab === 'customers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="truncate">Customers ({customers.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveLedgerTab('suppliers');
                setSearch('');
              }}
              className={`py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                activeLedgerTab === 'suppliers'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="truncate">Suppliers ({supplierList.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveLedgerTab('expenses');
                setSearch('');
              }}
              className={`py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                activeLedgerTab === 'expenses'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate">Expenses (செலவு)</span>
            </button>
            <button
              onClick={() => {
                setActiveLedgerTab('interest');
                setSearch('');
              }}
              className={`py-2 text-[10px] sm:text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                activeLedgerTab === 'interest'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-yellow-500" />
              <span className="truncate">Interest (வட்டி)</span>
            </button>
          </div>

          {/* TAB 3: EXPENSES (Diesel, Kooli, Mandi Expenses) */}
          {activeLedgerTab === 'expenses' && (
            <ExpensesTab
              shop={shop}
              expenses={expenses}
              onSaveExpense={onSaveExpense}
              onDeleteExpense={onDeleteExpense}
            />
          )}

          {/* TAB 4: INTEREST LOANS (வட்டி கணக்கு) */}
          {activeLedgerTab === 'interest' && (
            <InterestTab
              shop={shop}
              loans={interestLoans}
              payments={interestPayments}
              onSaveLoan={onSaveInterestLoan}
              onDeleteLoan={onDeleteInterestLoan}
              onSavePayment={onSaveInterestPayment}
              onDeletePayment={onDeleteInterestPayment}
            />
          )}

          {/* TAB 1: CUSTOMERS DIRECTORY */}
          {activeLedgerTab === 'customers' && (
            <>
              {/* Market Outstanding Due Banner */}
              <div
                className={`rounded-2xl p-4 text-white shadow-md transition-all ${
                  customerSubTab === 'qsale'
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-800'
                    : customerSubTab === 'regular'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-800'
                    : 'bg-gradient-to-r from-slate-800 to-slate-900'
                }`}
              >
                <div className="text-xs text-white/80 font-medium uppercase tracking-wider">
                  {customerSubTab === 'qsale'
                    ? 'Q-Sale Outstanding Due (கொட்டேஷன் வாடிக்கையாளர் பாக்கி)'
                    : customerSubTab === 'regular'
                    ? 'Regular Sale Outstanding Due (GST வாடிக்கையாளர் பாக்கி)'
                    : 'Total Market Outstanding Due (மொத்த வாடிக்கையாளர் பாக்கி)'}
                </div>
                <div className="text-2xl font-black mt-1">
                  {formatCurrency(currentTabOutstanding)}
                </div>
                <div className="text-[11px] text-white/70 mt-1">
                  Across {displayedCustomers.length} customers listed
                </div>
              </div>

              {/* Customer Sub-Tabs: Sale vs Q-Sale vs All */}
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerSubTab('regular')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    customerSubTab === 'regular'
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <span>🏢 Regular ({customerListWithBalances.filter((c) => c.hasRegularSales || (c.regBalance?.netDue > 0)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerSubTab('qsale')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    customerSubTab === 'qsale'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <span>📦 Q-Sale ({customerListWithBalances.filter((c) => c.hasQSales || (c.qBalance?.netDue > 0)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerSubTab('all')}
                  className={`px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    customerSubTab === 'all'
                      ? 'bg-slate-800 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <span>All ({customers.length})</span>
                </button>
              </div>

              {/* Search bar & Add Customer Button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer by name, phone or GSTIN..."
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
                {displayedCustomers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    {search ? `No customers found matching "${search}".` : 'No customers found in this category.'}
                  </div>
                ) : (
                  displayedCustomers.map((c) => {
                    const dueAmt = Number(
                      customerSubTab === 'qsale'
                        ? c.qBalance?.netDue
                        : customerSubTab === 'regular'
                        ? c.regBalance?.netDue
                        : c.balance?.netDue
                    ) || 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setStatementFilter(
                            customerSubTab === 'qsale'
                              ? 'Q_SALE'
                              : customerSubTab === 'regular'
                              ? 'REGULAR'
                              : 'ALL'
                          );
                        }}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-blue-400 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3 active:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.gstin && (
                              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                GST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {c.phone}
                          </div>
                          {c.gstin && (
                            <div className="text-[10px] font-mono text-indigo-600 font-semibold mt-0.5 truncate">
                              GST: {c.gstin}
                            </div>
                          )}
                          {c.address && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {c.address}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {customerSubTab === 'qsale'
                              ? 'Q-Sale Bal'
                              : customerSubTab === 'regular'
                              ? 'Regular Bal'
                              : 'Balance'}
                          </span>
                          <span
                            className={`text-sm font-extrabold ${
                              dueAmt > 0 ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatCurrency(dueAmt)}
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
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: SUPPLIERS DIRECTORY */}
          {activeLedgerTab === 'suppliers' && (
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
                  Across {supplierList.length} suppliers (including opening balance)
                </div>
              </div>

              {/* Search Suppliers & Add Supplier Button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search supplier by name, phone or GSTIN..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                </div>
                <button
                  onClick={handleOpenAddSupplier}
                  className="px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>

              {/* Suppliers List */}
              <div className="space-y-2">
                {filteredSuppliers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    {search ? `No suppliers found matching "${search}".` : 'No suppliers found. Click "+ Add" to create a new supplier.'}
                  </div>
                ) : (
                  filteredSuppliers.map((s) => (
                    <div
                      key={s.name}
                      onClick={() => setSelectedSupplierName(s.name)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-amber-400 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3 active:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {s.gstin && (
                            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              GST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-blue-600" />
                          {s.phone || 'No Phone'}
                        </div>
                        {s.gstin && (
                          <div className="text-[10px] font-mono text-indigo-600 font-semibold mt-0.5 truncate">
                            GST: {s.gstin}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{s.billsCount} Bills</span>
                          {s.openingBalance > 0 && (
                            <span className="text-amber-700 font-semibold">
                              Op. Bal: {formatCurrency(s.openingBalance)}
                            </span>
                          )}
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

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleOpenEditSupplier(e, s)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 ml-0.5" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUPPLIER ADD / EDIT MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-800 text-base">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Supplier Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Raju Agro Pollachi / Kavi"
                    value={supplierFormName}
                    onChange={(e) => setSupplierFormName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  WhatsApp Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                  <input
                    type="tel"
                    placeholder="10-digit number e.g. 9842112345"
                    value={supplierFormPhone}
                    onChange={(e) => setSupplierFormPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  GSTIN / GST Number (Optional)
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                  <input
                    type="text"
                    placeholder="e.g. 33ABCDE1234F1Z5"
                    value={supplierFormGstin}
                    onChange={(e) => setSupplierFormGstin(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm uppercase font-mono tracking-wider"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* OPENING BALANCE (ஆரம்ப இருப்பு / பழைய பாக்கி) */}
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 space-y-1.5">
                <label className="block text-xs font-bold text-amber-900 uppercase flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  Opening Balance / ஆரம்ப இருப்பு (பழைய பாக்கி ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={supplierFormOpBal}
                    onChange={(e) => setSupplierFormOpBal(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-amber-800">
                  சப்ளையருக்கு கொடுக்க வேண்டிய பழைய பாக்கி இருந்தால் இங்கே போடவும். Ledger-ல் பாக்கியாக சேரும்.
                </p>
              </div>

              <div className="pt-2 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 shadow-md flex items-center justify-center gap-1.5 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}