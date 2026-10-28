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
  Trash2
} from 'lucide-react';
import { generateLedgerStatementPDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp, formatWhatsAppPhone } from '../services/shareService';
import { Storage } from '../services/storage';

export default function LedgerScreen({
  customers,
  shop,
  sales,
  receipts,
  onOpenAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onQuickSale,
  onQuickReceipt,
}) {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Pre-calculate balances for each customer
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
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customerListWithBalances, search]);

  const totalOutstandingAll = useMemo(() => {
    return customerListWithBalances.reduce((sum, c) => sum + Math.max(0, c.balance.netDue), 0);
  }, [customerListWithBalances]);

  // Selected customer object synced with latest customer updates
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // When a customer is selected, fetch their detailed ledger
  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    return Storage.getCustomerLedger(selectedCustomer.id);
  }, [selectedCustomer, sales, receipts]);

  const currentCustomerBalance = useMemo(() => {
    if (!selectedCustomer) return { totalSales: 0, totalPaid: 0, netDue: 0 };
    return Storage.getCustomerBalance(selectedCustomer.id);
  }, [selectedCustomer, sales, receipts]);

  const handleShareStatementWhatsApp = async () => {
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
        `*${shop.name || 'KVK THANIYA MANDI'} - Statement of Account*\n` +
        `Customer: ${selectedCustomer.name}\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
        `Total Billed: Rs. ${Number(currentCustomerBalance.totalSales).toFixed(2)}\n` +
        `Total Received: Rs. ${Number(currentCustomerBalance.totalPaid).toFixed(2)}\n` +
        `*Closing Balance Due: Rs. ${Number(currentCustomerBalance.netDue).toFixed(2)}*\n\n` +
        `Please find your detailed account statement PDF attached. Thank you!`;

      await sharePdfToWhatsApp({
        doc,
        fileName,
        phone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        messageText: whatsappMsg,
      });

      showToast('Statement PDF shared to WhatsApp!');
    } catch (e) {
      console.error(e);
      showToast('Failed to generate Statement PDF');
    } finally {
      setSharing(false);
    }
  };

  const handlePreviewStatement = () => {
    if (!selectedCustomer) return;
    const doc = generateLedgerStatementPDF(
      selectedCustomer,
      customerLedger,
      shop,
      currentCustomerBalance
    );
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  };

  const handleDeleteCustomerClick = (e, customer) => {
    if (e) e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete customer "${customer.name}"?`
      )
    ) {
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

      {selectedCustomer ? (
        /* DETAIL VIEW: INDIVIDUAL CUSTOMER STATEMENT / LEDGER */
        <div className="p-3 space-y-3">
          {/* Back Button & Title */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase">
              Ledger Statement
            </span>
          </div>

          {/* Customer Profile Banner with Edit & Delete */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">
                  {selectedCustomer.name}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedCustomer.phone}
                </div>
                {selectedCustomer.address && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedCustomer.address}
                  </div>
                )}
              </div>

              {/* Action buttons: Edit, Delete, Call, WhatsApp */}
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={(e) => handleEditCustomerClick(e, selectedCustomer)}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteCustomerClick(e, selectedCustomer)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                  title="Delete Customer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${formatWhatsAppPhone(selectedCustomer.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg"
                  title="Open WhatsApp Chat"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Balance Overview Cards */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-blue-50/60 p-2 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">
                  Total Sales
                </span>
                <span className="text-xs font-bold text-blue-900">
                  {formatCurrency(currentCustomerBalance.totalSales)}
                </span>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Total Paid
                </span>
                <span className="text-xs font-bold text-emerald-900">
                  {formatCurrency(currentCustomerBalance.totalPaid)}
                </span>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  currentCustomerBalance.netDue > 0
                    ? 'bg-red-50 text-red-900'
                    : 'bg-emerald-50 text-emerald-900'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block opacity-75">
                  Balance Due
                </span>
                <span className="text-xs font-extrabold">
                  {formatCurrency(currentCustomerBalance.netDue)}
                </span>
              </div>
            </div>

            {/* Quick Actions: Add Bill / Add Receipt for this customer */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onQuickSale(selectedCustomer.id)}
                className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Sale
              </button>
              <button
                onClick={() => onQuickReceipt(selectedCustomer.id)}
                className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Receipt
              </button>
            </div>
          </div>

          {/* PRIMARY WHATSAPP STATEMENT ACTION */}
          <div className="space-y-2">
            <button
              disabled={sharing}
              onClick={handleShareStatementWhatsApp}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharing ? 'Generating Statement...' : 'Share Statement on WhatsApp (PDF)'}</span>
            </button>
            <button
              onClick={handlePreviewStatement}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Statement PDF
            </button>
          </div>

          {/* Chronological Ledger Transactions */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Transaction History ({customerLedger.length})
            </div>

            {customerLedger.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No transactions recorded yet for this customer.
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
      ) : (
        /* MASTER CUSTOMER DIRECTORY LIST */
        <div className="p-3 space-y-3">
          {/* Total Pending Balance Highlight Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-4 text-white shadow-md">
            <div className="text-xs text-blue-200 font-medium uppercase tracking-wider">
              Total Market Outstanding Due
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
                placeholder="Search by customer name or phone..."
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

          {/* Customer Cards List with Edit & Delete */}
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

                  {/* Customer Edit & Delete Quick Action Buttons */}
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
        </div>
      )}
    </div>
  );
}
