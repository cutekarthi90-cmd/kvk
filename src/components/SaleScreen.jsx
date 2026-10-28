import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Share2,
  CheckCircle,
  FileText,
  Search,
  User,
  Phone,
  Clock,
  ArrowRight,
  Eye,
  AlertCircle,
  MessageSquare,
  Send,
  X,
  Package
} from 'lucide-react';
import { generateSaleInvoicePDF, formatCurrency, formatDate } from '../services/pdfService';
import { sharePdfToWhatsApp, formatWhatsAppPhone } from '../services/shareService';
import { Storage } from '../services/storage';

export default function SaleScreen({
  customers,
  items,
  shop,
  sales,
  onSaveSale,
  onDeleteSale,
  onOpenAddCustomer,
  preselectedCustomerId = '',
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('CREDIT'); // 'CREDIT' | 'PAID' | 'PARTIAL'
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [activeView, setActiveView] = useState('create'); // 'create' | 'history'
  const [historySearch, setHistorySearch] = useState('');
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState('');
  const [customInvoiceNo, setCustomInvoiceNo] = useState('');
  const [lastSavedBill, setLastSavedBill] = useState(null); // for post-save popup

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
      setActiveView('create');
    }
  }, [preselectedCustomerId]);

  // Bill number starting from 1 (1, 2, 3...) - STRICTLY AUTO-INCREMENTING
  const autoInvoiceNo = useMemo(() => {
    return String(sales.length + 1);
  }, [sales.length]);

  const nextInvoiceNo = autoInvoiceNo;

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerSearch]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const filteredSalesHistory = useMemo(() => {
    if (!historySearch.trim()) return sales;
    const q = historySearch.toLowerCase();
    return sales.filter(
      (s) =>
        String(s.invoiceNo).toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q))
    );
  }, [sales, historySearch]);

  // Cart operations
  const handleAddItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    showToast(`Added ${item.name}`);
  };

  const handleUpdateQty = (itemId, newQty) => {
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, qty: newQty } : i))
    );
  };

  const handleUpdatePrice = (itemId, newPrice) => {
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, price: newPrice } : i))
    );
  };

  const handleRemoveItem = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal - (Number(discount) || 0));
  }, [subTotal, discount]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const resetForm = () => {
    setCart([]);
    setSelectedCustomerId('');
    setCustomInvoiceNo('');
    setDiscount(0);
    setPaymentStatus('CREDIT');
    setPaidAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
  };

  // Helper to construct WhatsApp / SMS text
  const getBillMessageText = (sale, customer) => {
    const itemsList = (sale.items || [])
      .map((i, idx) => `${idx + 1}. *${i.name}*\n   ${i.qty} Bag x Rs.${Number(i.price).toFixed(2)} = *Rs. ${(Number(i.qty) * Number(i.price)).toFixed(2)}*`)
      .join('\n\n');

    const totalAmt = Number(sale.grandTotal).toFixed(2);
    const paidAmt = Number(sale.paidAmount || 0).toFixed(2);
    const balDue = Math.max(0, Number(sale.grandTotal) - Number(sale.paidAmount || 0)).toFixed(2);

    return (
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI\n` +
      `Cell: 94866 - 68732 / 94439 - 95160\n\n` +
      `*CASH / CREDIT BILL*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Bill No: *No. ${sale.invoiceNo}*\n` +
      `Date: ${formatDate(sale.date)}\n` +
      `Customer: *${customer?.name || sale.customerName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${itemsList}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Grand Total: Rs. ${totalAmt}*\n` +
      (Number(paidAmt) > 0 ? `Paid: Rs. ${paidAmt}\n` : '') +
      (Number(balDue) > 0 ? `*Balance Due: Rs. ${balDue}*\n` : '') +
      `Status: *${sale.paymentStatus}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for your business!`
    );
  };

  // Normal SMS Share via phone native messaging
  const handleShareSMS = (sale) => {
    const customer = customers.find((c) => c.id === sale.customerId) || {
      name: sale.customerName,
      phone: sale.customerPhone,
    };
    if (!customer?.phone) {
      showToast('No phone number for customer!');
      return;
    }
    const msg = getBillMessageText(sale, customer);
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  };

  // Share to WhatsApp (PDF + Text)
  const handleShareWhatsApp = async (saleToShare) => {
    const customer = customers.find((c) => c.id === saleToShare.customerId) || {
      name: saleToShare.customerName,
      phone: saleToShare.customerPhone,
    };

    if (!customer.phone) {
      showToast('Customer does not have a phone number!');
      return;
    }

    setSharing(true);
    try {
      const doc = generateSaleInvoicePDF(saleToShare, customer, shop);
      const fileName = `${shop.name || 'Bill'}_No_${saleToShare.invoiceNo}.pdf`.replace(/\s+/g, '_');
      const whatsappMsg = getBillMessageText(saleToShare, customer);

      await sharePdfToWhatsApp({
        doc,
        fileName,
        phone: customer.phone,
        customerName: customer.name,
        messageText: whatsappMsg,
      });

      showToast('Invoice sent to WhatsApp!');
    } catch (e) {
      console.error(e);
      showToast('Failed to generate PDF');
    } finally {
      setSharing(false);
    }
  };

  // SINGLE SAVE BUTTON HANDLER: Saves, opens WhatsApp, and shows SMS button!
  const handleSingleSaveAndSend = async () => {
    if (!selectedCustomerId) {
      showToast('Please select a Customer!');
      return;
    }
    if (cart.length === 0) {
      showToast('Please add at least 1 item!');
      return;
    }

    const effectivePaid =
      paymentStatus === 'PAID'
        ? grandTotal
        : paymentStatus === 'PARTIAL'
        ? Math.min(grandTotal, Number(paidAmount) || 0)
        : 0;

    const newSale = {
      id: `sale-${Date.now()}`,
      invoiceNo: nextInvoiceNo,
      date,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      items: cart.map((i) => ({
        ...i,
        qty: Math.max(1, Number(i.qty) || 1),
        price: Math.max(0, Number(i.price) || 0),
        unit: 'Bag',
      })),
      subTotal,
      discount: Number(discount) || 0,
      grandTotal,
      paymentStatus,
      paidAmount: effectivePaid,
      paymentMode: effectivePaid > 0 ? paymentMode : '',
    };

    onSaveSale(newSale);
    setLastSavedBill(newSale);
    showToast(`Bill No. ${newSale.invoiceNo} Saved!`);

    // Automatically trigger WhatsApp share!
    await handleShareWhatsApp(newSale);
    resetForm();
  };

  const handlePreviewPdf = (saleToPreview) => {
    const sale = saleToPreview || {
      invoiceNo: nextInvoiceNo,
      date,
      customerId: selectedCustomerId,
      items: cart.map((i) => ({
        ...i,
        qty: Math.max(1, Number(i.qty) || 1),
        price: Math.max(0, Number(i.price) || 0),
        unit: 'Bag',
      })),
      subTotal,
      discount: Number(discount) || 0,
      grandTotal,
      paymentStatus,
      paidAmount: paymentStatus === 'PAID' ? grandTotal : paidAmount,
    };

    if (sale.items.length === 0) {
      showToast('Add items to preview bill');
      return;
    }

    const customer = customers.find((c) => c.id === sale.customerId) || {
      name: 'Preview Customer',
      phone: '9840123456',
    };

    const doc = generateSaleInvoicePDF(sale, customer, shop);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  };

  const handleDeleteSaleItem = (sale) => {
    if (
      confirm(
        `Are you sure you want to delete Bill No. ${sale.invoiceNo} of ${formatCurrency(
          sale.grandTotal
        )}?`
      )
    ) {
      if (onDeleteSale) {
        onDeleteSale(sale.id);
        showToast(`Bill No. ${sale.invoiceNo} deleted!`);
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

      {/* POST-SAVE SUCCESS MODAL (WhatsApp & Normal SMS Options) */}
      {lastSavedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-lg">
                Bill No. {lastSavedBill.invoiceNo} Saved!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lastSavedBill.customerName} • {formatCurrency(lastSavedBill.grandTotal)}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(lastSavedBill)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Send on WhatsApp (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareSMS(lastSavedBill)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send via Normal SMS Message</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLastSavedBill(null)}
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs pt-1"
            >
              Done / Create Next Bill
            </button>
          </div>
        </div>
      )}

      {/* View Switcher: New Bill vs Past Invoices */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveView('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeView === 'create'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          + Create New Bill
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeView === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Past Bills ({sales.length})
        </button>
      </div>

      {activeView === 'history' ? (
        /* PAST BILLS LIST WITH SEARCH & 1-TAP RESEND */
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Past Bills ({sales.length}) - Tap to Resend
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search past bills by No. or Customer..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {filteredSalesHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No bills found.
            </div>
          ) : (
            filteredSalesHistory.slice().reverse().map((sale) => (
              <div
                key={sale.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">
                        No. {sale.invoiceNo}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          sale.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {sale.customerName} • {sale.customerPhone}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {sale.items.length} items ({sale.items.map((i) => i.name).slice(0, 2).join(', ')}...)
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-blue-600 text-base">
                      {formatCurrency(sale.grandTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">{formatDate(sale.date)}</div>
                  </div>
                </div>

                {/* 1-TAP RESEND BUTTONS FOR ANY PAST BILL */}
                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleDeleteSaleItem(sale)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Delete Bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handlePreviewPdf(sale)}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleShareSMS(sale)}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
                      title="Send regular SMS"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      SMS
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(sale)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                      title="Send to WhatsApp"
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
        /* CREATE BILL FORM */
        <div className="p-3 space-y-3">
          {/* Top Bar: Bill No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Bill Number (தானாக ஏறும்)
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-400">No.</span>
                <span className="font-black text-blue-600 text-lg">
                  {autoInvoiceNo}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Bill Date
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
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
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
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="p-2.5 bg-blue-50/70 rounded-xl flex items-center justify-between text-xs text-blue-950 border border-blue-100">
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {selectedCustomer.phone}
                  </div>
                  {selectedCustomer.address && (
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                      {selectedCustomer.address}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    Past Due
                  </span>
                  <span className="font-extrabold text-red-600">
                    {formatCurrency(Storage.getCustomerBalance(selectedCustomer.id).netDue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* TAP PAD ITEM - BIG BOLD LETTERS & CLEAR TOUCH CARDS */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-800 uppercase block">
                  Tap Item to Add Bill
                </span>
                <span className="text-[11px] text-slate-400">
                  Letters perusa aakiyirukku ({items.length} items)
                </span>
              </div>
              <div className="relative w-32">
                <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* BIG TOUCH PAD GRID (2 Columns on Mobile with Large Bold Text!) */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                const liveStock = Storage.getItemStock(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5 shadow-xs active:scale-95 ${
                      inCart
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    {/* Item Name in BIG BOLD FONT */}
                    <div className="font-black text-sm sm:text-base leading-tight">
                      {item.name}
                    </div>

                    <div className="flex items-end justify-between w-full mt-1">
                      <div>
                        <div
                          className={`font-black text-sm ${
                            inCart ? 'text-white' : 'text-emerald-700'
                          }`}
                        >
                          ₹{item.price}
                        </div>
                        <div
                          className={`text-[10px] ${
                            inCart ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          / {item.unit || 'Nos'}
                        </div>
                      </div>

                      <div className="text-right">
                        {inCart ? (
                          <span className="bg-white text-blue-700 px-2 py-0.5 rounded-full text-xs font-black shadow-xs">
                            {inCart.qty} added
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            Stk: {liveStock}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart Table / Items Added to Bill */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Items in Bill ({cart.length})
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No items added. Tap any item above to add to this bill.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <span>Rate: ₹</span>
                        <input
                          type="number"
                          value={item.price}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                          onBlur={() => {
                            handleUpdatePrice(item.id, Math.max(0, Number(item.price) || 0));
                          }}
                          className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span>/ {item.unit || 'Bag'}</span>
                      </div>
                    </div>

                    {/* Qty Stepper with Select-All on Focus */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(item.qty) || 1;
                          if (current > 1) handleUpdateQty(item.id, current - 1);
                          else handleRemoveItem(item.id);
                        }}
                        className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 active:bg-slate-100 shadow-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleUpdateQty(item.id, e.target.value)}
                        onBlur={() => {
                          if (!item.qty || Number(item.qty) <= 0) {
                            handleUpdateQty(item.id, 1);
                          } else {
                            handleUpdateQty(item.id, parseInt(item.qty, 10));
                          }
                        }}
                        className="w-14 py-1 text-center font-black text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(item.qty) || 0;
                          handleUpdateQty(item.id, current + 1);
                        }}
                        className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 active:bg-slate-100 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <div className="text-xs font-black text-slate-900">
                        ₹{(item.qty * item.price).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-600 p-0.5 mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Calculation & Payment Status */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-20 text-right p-1 bg-slate-50 border border-slate-200 rounded font-bold text-xs"
                />
              </div>
              <div className="flex justify-between items-center text-base font-black text-blue-600 pt-1 border-t border-slate-100">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Type Selection */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                Payment Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('CREDIT')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatus === 'CREDIT'
                      ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Credit (Pending)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PARTIAL')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatus === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Partial Paid
                </button>
              </div>

              {paymentStatus !== 'CREDIT' && (
                <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  {paymentStatus === 'PARTIAL' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Amount Paid Now (₹):</span>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={paidAmount || ''}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="w-28 p-1.5 bg-white border border-slate-200 rounded font-bold text-right text-xs"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Payment Mode:</span>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="p-1 bg-white border border-slate-200 rounded text-xs font-medium"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GPay / PhonePe">GPay / UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SINGLE PRIMARY SAVE BUTTON: "SAVE BILL (சேமித்து அனுப்புக)" */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={sharing}
              onClick={handleSingleSaveAndSend}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{sharing ? 'Sending...' : 'SAVE & SEND BILL (சேமித்து அனுப்புக)'}</span>
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
