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
  Package,
  RotateCcw,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { generateSaleInvoicePDF, formatCurrency, formatDate } from '../services/pdfService';
import { openDirectWhatsApp, sendDirectSMS, downloadPdfFile, formatWhatsAppPhone } from '../services/shareService';
import { Storage, getFinancialYear } from '../services/storage';

export default function SaleScreen({
  customers = [],
  items = [],
  shop = {},
  sales = [],
  salesReturns: externalSalesReturns,
  onSaveSale,
  onDeleteSale,
  onSaveSalesReturn,
  onDeleteSalesReturn,
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
  const [activeView, setActiveView] = useState('create'); // 'create' | 'history' | 'return'
  const [isQSale, setIsQSale] = useState(false); // Q-Sales Toggle (Regular GST vs Q Sale)
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

  // Financial Year Filter & Selection
  const [selectedFY, setSelectedFY] = useState('ALL');

  // Sales Return states
  const [internalSalesReturns, setInternalSalesReturns] = useState(() => Storage.getSalesReturns());
  const salesReturns = externalSalesReturns || internalSalesReturns;
  const [returnCustomerId, setReturnCustomerId] = useState('');
  const [returnCustomerSearch, setReturnCustomerSearch] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnCart, setReturnCart] = useState([]);
  const [returnReason, setReturnReason] = useState('Quality issue (தரம் சரியில்லை)');
  const [returnNotes, setReturnNotes] = useState('');

  // Bill number auto-incrementing PER FINANCIAL YEAR (restarts from 1 when FY changes!)
  // Separates regular GST bills and Q-Sales so sequences never collide
  const autoInvoiceNo = useMemo(() => {
    return String(Storage.getNextInvoiceNo(sales, date, isQSale));
  }, [sales, date, isQSale]);

  const nextInvoiceNo = autoInvoiceNo;

  const currentFY = getFinancialYear(date);

  const availableFYs = useMemo(() => {
    const set = new Set([getFinancialYear()]);
    sales.forEach((s) => {
      if (s.date) set.add(getFinancialYear(s.date));
    });
    return Array.from(set).sort().reverse();
  }, [sales]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const selectedReturnCustomer = useMemo(() => {
    return customers.find((c) => c.id === returnCustomerId) || null;
  }, [customers, returnCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerSearch]);

  const filteredReturnCustomers = useMemo(() => {
    if (!returnCustomerSearch.trim()) return customers;
    const q = returnCustomerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, returnCustomerSearch]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, itemSearch]);

  const filteredSalesHistory = useMemo(() => {
    return sales.filter((s) => {
      const matchFY = selectedFY === 'ALL' || getFinancialYear(s.date) === selectedFY;
      if (!matchFY) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return (
        String(s.invoiceNo).toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q))
      );
    });
  }, [sales, historySearch, selectedFY]);

  // STRICT DESCENDING ORDER FOR PAST BILLS (Newest Bill No. 5, 4, 3, 2, 1 at the top!)
  const sortedSalesHistory = useMemo(() => {
    return [...filteredSalesHistory].sort((a, b) => {
      const numA = parseInt(String(a.invoiceNo).replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b.invoiceNo).replace(/[^0-9]/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    });
  }, [filteredSalesHistory]);

  // SALES SUMMARY: Regular GST vs Q Sales breakdown
  const salesSummary = useMemo(() => {
    let grossTotal = 0;
    let regularTotal = 0;
    let qSalesTotal = 0;
    let totalBags = 0;
    let qSalesCount = 0;

    sortedSalesHistory.forEach((s) => {
      const grand = Number(s.grandTotal) || 0;
      grossTotal += grand;
      (s.items || []).forEach((i) => {
        totalBags += Number(i.qty) || 0;
      });

      if (s.isQSale || s.billType === 'Q_SALE') {
        qSalesTotal += grand;
        qSalesCount += 1;
      } else {
        regularTotal += grand;
      }
    });

    return {
      grossTotal,
      regularTotal,
      qSalesTotal,
      totalBags,
      qSalesCount,
      regularCount: sortedSalesHistory.length - qSalesCount,
    };
  }, [sortedSalesHistory]);

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
    const isQ = sale.isQSale || sale.billType === 'Q_SALE';
    const itemsList = (sale.items || [])
      .map((i, idx) => `${idx + 1}. *${i.name}*\n   ${i.qty} Bag x Rs.${Number(i.price).toFixed(2)} = *Rs. ${(Number(i.qty) * Number(i.price)).toFixed(2)}*`)
      .join('\n\n');

    const totalAmt = Number(sale.grandTotal).toFixed(2);
    const subTotalAmt = Number(sale.subTotal || sale.grandTotal).toFixed(2);
    const discAmt = Number(sale.discount || 0).toFixed(2);
    const paidAmt = Number(sale.paidAmount || 0).toFixed(2);
    const balDue = Math.max(0, Number(sale.grandTotal) - Number(sale.paidAmount || 0)).toFixed(2);
    const billTitle = isQ ? '*ESTIMATE / QUOTATION BILL*' : '*CASH / CREDIT BILL*';
    const billNoText = isQ
      ? `Q-Bill No: *${String(sale.invoiceNo).startsWith('Q-') ? sale.invoiceNo : `Q-${sale.invoiceNo}`}*`
      : `Bill No: *${String(sale.invoiceNo).startsWith('KVK') ? sale.invoiceNo : `KVK ${sale.invoiceNo}`}*`;

    return (
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI\n` +
      `Cell: 94866 - 68732 / 94439 - 95160\n\n` +
      `${billTitle}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${billNoText}\n` +
      `Date: ${formatDate(sale.date)}\n` +
      `Customer: *${customer?.name || sale.customerName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${itemsList}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      (Number(discAmt) > 0 ? `Subtotal: Rs. ${subTotalAmt}\n*Discount (தள்ளுபடி): -Rs. ${discAmt}*\n` : '') +
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
  const handleShareWhatsApp = (saleToShare) => {
    const customer = customers.find((c) => c.id === saleToShare.customerId) || {
      name: saleToShare.customerName,
      phone: saleToShare.customerPhone,
    };

    if (!customer.phone) {
      showToast('Customer does not have a phone number!');
      return;
    }

    try {
      const whatsappMsg = getBillMessageText(saleToShare, customer);
      openDirectWhatsApp(customer.phone, whatsappMsg);
      showToast('Opening WhatsApp directly to customer...');
    } catch (e) {
      console.error(e);
      showToast('Failed to open WhatsApp');
    }
  };

  const handleDownloadPdf = (saleToShare) => {
    const customer = customers.find((c) => c.id === saleToShare.customerId) || {
      name: saleToShare.customerName,
      phone: saleToShare.customerPhone,
    };
    try {
      const doc = generateSaleInvoicePDF(saleToShare, customer, shop);
      const isQ = saleToShare.isQSale || saleToShare.billType === 'Q_SALE';
      const cleanNo = String(saleToShare.invoiceNo).replace(/[^a-zA-Z0-9]/g, '_');
      const prefix = isQ ? 'Q_Bill' : 'Bill';
      const fileName = `${shop.name || 'KVK'}_${prefix}_${cleanNo}.pdf`.replace(/\s+/g, '_');
      downloadPdfFile(doc, fileName);
      showToast('PDF downloaded successfully!');
    } catch (err) {
      console.warn('Download error:', err);
      showToast('Failed to download PDF');
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

    const finalInvoiceNo = isQSale
      ? (customInvoiceNo ? (customInvoiceNo.startsWith('Q-') ? customInvoiceNo : `Q-${customInvoiceNo}`) : `Q-${autoInvoiceNo}`)
      : (customInvoiceNo
          ? (String(customInvoiceNo).trim().toUpperCase().startsWith('KVK')
              ? customInvoiceNo.trim()
              : `KVK ${customInvoiceNo.trim()}`)
          : `KVK ${autoInvoiceNo}`);

    const newSale = {
      id: `sale-${Date.now()}`,
      invoiceNo: finalInvoiceNo,
      isQSale,
      billType: isQSale ? 'Q_SALE' : 'REGULAR',
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
    showToast(`${isQSale ? 'Q-Sale' : 'Bill'} No. ${newSale.invoiceNo} Saved!`);

    // Automatically trigger WhatsApp share!
    await handleShareWhatsApp(newSale);
    resetForm();
  };

  const handlePreviewPdf = (saleToPreview) => {
    const sale = saleToPreview || {
      invoiceNo: isQSale ? `Q-${autoInvoiceNo}` : `KVK ${autoInvoiceNo}`,
      isQSale,
      billType: isQSale ? 'Q_SALE' : 'REGULAR',
      date,
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
        Storage.recordDeletedId(sale.id);
        showToast(`Bill No. ${sale.invoiceNo} deleted!`);
      }
    }
  };

  // ==================== SALES RETURN HANDLERS ====================
  const handleAddReturnItem = (item) => {
    setReturnCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: (Number(i.qty) || 1) + 1 } : i));
      }
      return [...prev, { ...item, qty: 1, price: item.price, unit: 'Bag' }];
    });
    showToast(`Added ${item.name} to return`);
  };

  const handleUpdateReturnQty = (itemId, newQty) => {
    setReturnCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, qty: newQty } : i))
    );
  };

  const handleUpdateReturnPrice = (itemId, newPrice) => {
    setReturnCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, price: newPrice } : i))
    );
  };

  const handleRemoveReturnItem = (itemId) => {
    setReturnCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const returnTotal = useMemo(() => {
    return returnCart.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [returnCart]);

  const handleSaveSalesReturn = (e) => {
    e.preventDefault();
    if (!returnCustomerId) {
      showToast('Please select a customer for Sales Return!');
      return;
    }
    if (returnCart.length === 0) {
      showToast('Please add at least 1 returned item!');
      return;
    }

    const returnNo = salesReturns.length + 1;
    const newReturn = {
      id: `ret-${Date.now()}`,
      returnNo,
      date: returnDate,
      customerId: returnCustomerId,
      customerName: selectedReturnCustomer?.name || 'Customer',
      customerPhone: selectedReturnCustomer?.phone || '',
      items: returnCart.map((i) => ({
        ...i,
        qty: Math.max(1, Number(i.qty) || 1),
        price: Math.max(0, Number(i.price) || 0),
        unit: 'Bag',
      })),
      totalAmount: returnTotal,
      reason: returnReason,
      notes: returnNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (onSaveSalesReturn) {
      onSaveSalesReturn(newReturn);
    } else {
      const updated = [newReturn, ...salesReturns];
      setInternalSalesReturns(updated);
      Storage.saveSalesReturns(updated);
    }

    showToast(`Sales Return #SR-${returnNo} Saved! Stock increased & customer credited.`);

    // 1-Tap WhatsApp to customer
    if (selectedReturnCustomer?.phone) {
      const itemsList = newReturn.items
        .map((i, idx) => `${idx + 1}. *${i.name}*\n   Returned: ${i.qty} Bag @ Rs.${i.price} = *Rs.${(i.qty * i.price).toFixed(2)}*`)
        .join('\n');

      const whatsappMsg =
        `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `↩️ *SALES RETURN VOUCHER (விற்பனை திருப்பம்)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Voucher: *#SR-${returnNo}*\n` +
        `Date: ${formatDate(returnDate)}\n` +
        `Customer: *${selectedReturnCustomer.name}*\n` +
        `Reason: *${returnReason}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${itemsList}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `*Total Credited to Account: Rs. ${returnTotal.toFixed(2)}*\n` +
        `*Current Balance Due: Rs. ${formatCurrency(Storage.getCustomerBalance(returnCustomerId).netDue)}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Returned bags received into stock. Thank you!`;

      openDirectWhatsApp(selectedReturnCustomer.phone, whatsappMsg);
    }

    setReturnCart([]);
    setReturnNotes('');
  };

  const handleDeleteSalesReturn = (retId) => {
    if (confirm('Delete this Sales Return? Stock and customer balance will be adjusted.')) {
      if (onDeleteSalesReturn) {
        onDeleteSalesReturn(retId);
      } else {
        const updated = salesReturns.filter((r) => r.id !== retId);
        setInternalSalesReturns(updated);
        Storage.saveSalesReturns(updated);
        Storage.recordDeletedId(retId);
      }
      showToast('Sales return deleted');
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Share2 className="w-4 h-4" />
                <span>1-Tap WhatsApp to Customer (Direct)</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareSMS(lastSavedBill)}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-blue-200"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Normal SMS Message</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf(lastSavedBill)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-300"
              >
                <FileText className="w-4 h-4 text-red-500" />
                <span>Download PDF Bill Copy</span>
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

      {/* View Switcher: New Bill vs Sales Return vs Past Invoices */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-1.5">
        <button
          onClick={() => setActiveView('create')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
            activeView === 'create'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          + Bill Entry
        </button>
        <button
          onClick={() => setActiveView('return')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeView === 'return'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Return ({salesReturns.length})</span>
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeView === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Past Bills ({sales.length})</span>
        </button>
      </div>

      {/* VIEW 1: PAST BILLS LIST WITH FY FILTER & 1-TAP RESEND */}
      {activeView === 'history' && (
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Past Bills ({sortedSalesHistory.length})
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">FY:</span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Financial Years</option>
                {availableFYs.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </div>
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

          {/* Sales Summary Card */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">
                Sales Summary ({selectedFY === 'ALL' ? 'All FY' : `FY ${selectedFY}`})
              </span>
              <span className="text-emerald-400 font-black text-sm">
                {salesSummary.totalBags} Bags (50kg)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-center">
              <div className="bg-slate-800/80 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block">Gross Sales</span>
                <span className="text-xs font-black text-white block mt-0.5">
                  {formatCurrency(salesSummary.grossTotal)}
                </span>
                <span className="text-[9px] text-slate-400">{sortedSalesHistory.length} Bills</span>
              </div>
              <div className="bg-blue-950/60 p-2 rounded-xl border border-blue-800/40">
                <span className="text-[10px] text-blue-300 font-bold block">Regular GST</span>
                <span className="text-xs font-black text-blue-300 block mt-0.5">
                  {formatCurrency(salesSummary.regularTotal)}
                </span>
                <span className="text-[9px] text-blue-400">{salesSummary.regularCount} Bills</span>
              </div>
              <div className="bg-purple-950/60 p-2 rounded-xl border border-purple-800/40">
                <span className="text-[10px] text-purple-300 font-bold block">Q Sales</span>
                <span className="text-xs font-black text-purple-300 block mt-0.5">
                  {formatCurrency(salesSummary.qSalesTotal)}
                </span>
                <span className="text-[9px] text-purple-400">{salesSummary.qSalesCount} Bills</span>
              </div>
            </div>
          </div>

          {sortedSalesHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No bills found.
            </div>
          ) : (
            sortedSalesHistory.map((sale) => {
              const isQ = sale.isQSale || sale.billType === 'Q_SALE';
              return (
              <div
                key={sale.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-base ${isQ ? 'text-purple-900' : 'text-slate-900'}`}>
                        {String(sale.invoiceNo).startsWith('Q-') ? sale.invoiceNo : (isQ ? `Q-${sale.invoiceNo}` : (String(sale.invoiceNo).startsWith('KVK') ? sale.invoiceNo : `KVK ${sale.invoiceNo}`))}
                      </span>
                      {isQ && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200">
                          📦 Q-Sale
                        </span>
                      )}
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
                    {Number(sale.discount) > 0 && (
                      <div className="text-[10px] text-amber-700 font-bold">
                        தள்ளுபடி: -{formatCurrency(Number(sale.discount))}
                      </div>
                    )}
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
            );
          })
        )}
      </div>
    )}

      {/* VIEW 2: CREATE BILL FORM */}
      {activeView === 'create' && (
        <div className="p-3 space-y-3">
          {/* Bill Type Toggle: Regular GST Bill vs Q Sales */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex gap-1">
            <button
              type="button"
              onClick={() => setIsQSale(false)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isQSale
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>🏢 Regular GST Bill</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQSale(true)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isQSale
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>📦 Q Sales (Quotation)</span>
            </button>
          </div>

          {/* Q Sales Notice */}
          {isQSale && (
            <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-start gap-2 text-xs text-purple-900 animate-in fade-in duration-150">
              <span className="font-bold shrink-0">📦 Q Sales Note:</span>
              <span>
                Grain stock-la bags கழிவு ஆகும் (-Stock), customer balance-lum பாக்கி ஏறும். <strong>Auditor GST Report-la ithu pogathu (Excludes strictly).</strong>
              </span>
            </div>
          )}

          {/* Top Bar: Bill No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isQSale ? 'Q-Sale Ref No. (தானாக ஏறும்)' : 'Bill Number (தானாக ஏறும்)'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-bold text-slate-400">No.</span>
                <span className={`font-black text-lg ${isQSale ? 'text-purple-700' : 'text-blue-600'}`}>
                  {isQSale ? `Q-${autoInvoiceNo}` : `KVK ${autoInvoiceNo}`}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                  FY {currentFY}
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
              <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Customer (வாடிக்கையாளர்) *
              </label>
              <button
                type="button"
                onClick={onOpenAddCustomer}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                + New Customer
              </button>
            </div>

            {/* If Customer is Selected: Show Name in Big Bold font with details and Change button */}
            {selectedCustomer ? (
              <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-400 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div>
                  <div className="text-[10px] uppercase font-black text-emerald-700 tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Selected Customer
                  </div>
                  <div className="font-black text-slate-900 text-base mt-0.5">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedCustomer.phone}
                    {selectedCustomer.address && (
                      <span className="text-slate-500 font-normal truncate max-w-[150px]">
                        • {selectedCustomer.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">
                    Past Due
                  </span>
                  <span className="font-black text-sm text-red-600 block">
                    {formatCurrency(Storage.getCustomerBalance(selectedCustomer.id).netDue)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setCustomerSearch('');
                    }}
                    className="mt-1 px-2.5 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Change
                  </button>
                </div>
              </div>
            ) : (
              /* When choosing a customer: Search bar + Direct Name List below */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Type name to search (எ.கா: Ram)..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-blue-200 focus:border-blue-600 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* DIRECT MATCHING CUSTOMER NAMES (Appears immediately below search!) */}
                {customerSearch.trim() ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto border border-blue-200 rounded-xl p-1 bg-blue-50/40">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-500 font-medium">
                          "{customerSearch}" matching customer illa.
                        </p>
                        <button
                          type="button"
                          onClick={onOpenAddCustomer}
                          className="mt-2 text-xs text-blue-600 font-bold underline"
                        >
                          + Click here to add "{customerSearch}" as New Customer
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const bal = Storage.getCustomerBalance(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearch('');
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 flex items-center justify-between shadow-2xs transition-all active:scale-98"
                          >
                            <div>
                              <div className="font-black text-slate-900 text-sm">
                                {c.name}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {c.phone} {c.address ? `• ${c.address}` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {bal.netDue > 0 ? (
                                <span className="text-[11px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full">
                                  Due: ₹{bal.netDue}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold">
                                  No Due
                                </span>
                              )}
                              <span className="block text-[10px] text-blue-600 font-black mt-0.5">
                                Tap to Select →
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* If search is blank: show direct selectable dropdown list */
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Or Pick Customer from List ({customers.length}) --</option>
                    {customers.map((c) => {
                      const bal = Storage.getCustomerBalance(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) {bal.netDue > 0 ? `[Due: ₹${bal.netDue}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
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
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            {/* Discount Column (தள்ளுபடி ₹) */}
            <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-300 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-700" />
                  <span>Discount (தள்ளுபடி ₹):</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-28 pl-6 pr-2 py-1 bg-white border-2 border-amber-400 focus:border-amber-600 rounded-lg text-sm font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
              <span className="text-[10px] text-amber-800 block">
                {isQSale ? 'Q-Sale quotation concession on bill amount' : 'Customer concession / Cash discount deducted from bill total'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-2">
              <div className="flex justify-between items-center">
                <span>Subtotal (பொருட்களின் மதிப்பு):</span>
                <span className="font-bold text-slate-800">{formatCurrency(subTotal)}</span>
              </div>
              {Number(discount) > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>(-) Discount (தள்ளுபடி):</span>
                  <span>- {formatCurrency(Number(discount))}</span>
                </div>
              )}
              <div className={`flex justify-between items-center text-base font-black pt-1 border-t border-slate-100 ${
                isQSale ? 'text-purple-800' : 'text-blue-600'
              }`}>
                <span>Grand Total (நிகர தொகை):</span>
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
              className={`w-full py-4 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all ${
                isQSale ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>{sharing ? 'Sending...' : `SAVE & SEND ${isQSale ? 'Q-SALE' : 'BILL'} (சேமித்து அனுப்புக)`}</span>
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

      {/* VIEW 3: SALES RETURN (விற்பனை திருப்பம்) */}
      {activeView === 'return' && (
        <div className="p-3 space-y-3 animate-in fade-in duration-200">
          <form onSubmit={handleSaveSalesReturn} className="space-y-3">
            {/* Top Bar: Return No & Date */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  Return Voucher No.
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-bold text-slate-400">#SR-</span>
                  <span className="font-black text-amber-800 text-lg">
                    {salesReturns.length + 1}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Return Date
                </span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Customer Selection Card for Return */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                Customer Returning Goods (வாடிக்கையாளர்) *
              </label>

              {selectedReturnCustomer ? (
                <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-400 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div>
                    <div className="text-[10px] uppercase font-black text-amber-800 tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                      Selected Customer
                    </div>
                    <div className="font-black text-slate-900 text-base mt-0.5">
                      {selectedReturnCustomer.name}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedReturnCustomer.phone}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">
                      Current Due
                    </span>
                    <span className="font-black text-sm text-red-600 block">
                      {formatCurrency(Storage.getCustomerBalance(selectedReturnCustomer.id).netDue)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnCustomerId('');
                        setReturnCustomerSearch('');
                      }}
                      className="mt-1 px-2.5 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Type name to search customer for return..."
                      value={returnCustomerSearch}
                      onChange={(e) => setReturnCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-amber-200 focus:border-amber-600 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    {returnCustomerSearch && (
                      <button
                        type="button"
                        onClick={() => setReturnCustomerSearch('')}
                        className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {returnCustomerSearch.trim() ? (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto border border-amber-200 rounded-xl p-1 bg-amber-50/40">
                      {filteredReturnCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Customer "{returnCustomerSearch}" not found.
                        </div>
                      ) : (
                        filteredReturnCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setReturnCustomerId(c.id);
                              setReturnCustomerSearch('');
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 flex items-center justify-between shadow-2xs transition-all active:scale-98"
                          >
                            <div>
                              <div className="font-black text-slate-900 text-sm">{c.name}</div>
                              <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {c.phone}
                              </div>
                            </div>
                            <span className="text-[10px] text-amber-700 font-bold">
                              Select Customer →
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <select
                      value={returnCustomerId}
                      onChange={(e) => setReturnCustomerId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Or Choose Customer from List ({customers.length}) --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Tap Item to Add Return */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Tap Item Returned by Customer
                </span>
                <span className="text-[11px] text-amber-600 font-semibold">
                  Unit: 50kg Bag
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((item) => {
                  const inCart = returnCart.find((i) => i.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAddReturnItem(item)}
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[75px] ${
                        inCart
                          ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-snug">
                        {item.name}
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                        <span className="text-xs font-black text-amber-700">₹{item.price}</span>
                        {inCart && (
                          <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[10px] font-black rounded-full">
                            {inCart.qty} Bag
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Returned Items Table */}
            {returnCart.length > 0 && (
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase block">
                  Items to Return ({returnCart.length})
                </span>

                <div className="space-y-2">
                  {returnCart.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{item.name}</div>
                        <div className="flex items-center gap-1 mt-1 text-slate-600">
                          <span>Return Rate ₹</span>
                          <input
                            type="number"
                            value={item.price}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleUpdateReturnPrice(item.id, e.target.value)}
                            className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold"
                          />
                          <span>/ Bag</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(item.qty) || 1;
                            if (cur > 1) handleUpdateReturnQty(item.id, cur - 1);
                            else handleRemoveReturnItem(item.id);
                          }}
                          className="w-7 h-7 bg-white rounded-lg border border-slate-300 flex items-center justify-center text-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateReturnQty(item.id, e.target.value)}
                          className="w-12 py-1 text-center font-black bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateReturnQty(item.id, (Number(item.qty) || 0) + 1)}
                          className="w-7 h-7 bg-white rounded-lg border border-slate-300 flex items-center justify-center text-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right shrink-0 min-w-[60px]">
                        <div className="font-black text-amber-900">
                          ₹{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReturnItem(item.id)}
                          className="text-[10px] text-red-500 hover:text-red-700 mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Return Reason & Notes */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Return Reason (காரணம்)
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="Quality issue (தரம் சரியில்லை)">Quality issue (தரம் சரியில்லை)</option>
                  <option value="Damaged bags (சேதமடைந்த பைகள்)">Damaged bags (சேதமடைந்த பைகள்)</option>
                  <option value="Excess bags returned (கூடுதல் தானியம்)">Excess bags returned (கூடுதல் தானியம்)</option>
                  <option value="Wrong item supplied (தவறான பொருள்)">Wrong item supplied (தவறான பொருள்)</option>
                  <option value="Other / இதர காரணம்">Other / இதர காரணம்</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">Total Credit Amount:</span>
                <span className="text-2xl font-black text-amber-600">
                  {formatCurrency(returnTotal)}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                <span>SAVE SALES RETURN & CREDIT CUSTOMER</span>
              </button>
            </div>
          </form>

          {/* Past Sales Returns List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Past Sales Returns ({salesReturns.length})
            </h4>

            {salesReturns.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
                No sales returns recorded yet.
              </div>
            ) : (
              salesReturns.map((ret) => (
                <div
                  key={ret.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          Voucher #SR-{ret.returnNo}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                          {ret.reason?.split(' ')[0] || 'Return'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {ret.customerName} {ret.customerPhone ? `• ${ret.customerPhone}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {(ret.items || []).map((i) => `${i.name} (${i.qty} Bag)`).join(', ')}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-amber-700 text-base">
                        {formatCurrency(ret.totalAmount)}
                      </div>
                      <div className="text-[11px] text-slate-400">{formatDate(ret.date)}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleDeleteSalesReturn(ret.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const itemsList = (ret.items || [])
                          .map((i, idx) => `${idx + 1}. *${i.name}*\n   Returned: ${i.qty} Bag @ Rs.${i.price} = *Rs.${(i.qty * i.price).toFixed(2)}*`)
                          .join('\n');
                        const msg =
                          `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
                          `━━━━━━━━━━━━━━━━━━\n` +
                          `↩️ *SALES RETURN VOUCHER (விற்பனை திருப்பம்)*\n` +
                          `━━━━━━━━━━━━━━━━━━\n` +
                          `Voucher: *#SR-${ret.returnNo}*\n` +
                          `Date: ${formatDate(ret.date)}\n` +
                          `Customer: *${ret.customerName}*\n` +
                          `━━━━━━━━━━━━━━━━━━\n` +
                          `${itemsList}\n` +
                          `━━━━━━━━━━━━━━━━━━\n` +
                          `*Total Credited: Rs. ${Number(ret.totalAmount).toFixed(2)}*\n` +
                          `Thank you!`;
                        openDirectWhatsApp(ret.customerPhone, msg);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Voucher</span>
                    </button>
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
