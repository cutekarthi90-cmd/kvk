import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Package,
  Calendar,
  AlertCircle,
  Clock,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { Storage } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';

export default function PurchaseScreen({
  items,
  purchases,
  onSavePurchase,
  onDeletePurchase,
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customBillNo, setCustomBillNo] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [toast, setToast] = useState('');

  // Suppliers master state
  const [savedSuppliers, setSavedSuppliers] = useState(() => Storage.getSuppliers());
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);

  const autoBillNo = useMemo(() => {
    return String(purchases.length + 1);
  }, [purchases.length]);

  const billNo = customBillNo || autoBillNo;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: (Number(i.qty) || 1) + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          qty: 1,
          price: item.purchasePrice || Math.round(item.price * 0.85),
          unit: 'Bag',
        },
      ];
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

  const grandTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [cart]);

  const resetForm = () => {
    setCart([]);
    setSupplierName('');
    setSupplierPhone('');
    setCustomBillNo('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsAddingNewSupplier(false);
  };

  const handleSelectSupplier = (s) => {
    if (!s) {
      setSupplierName('');
      setSupplierPhone('');
      return;
    }
    setSupplierName(s.name);
    setSupplierPhone(s.phone || '');
  };

  const handleSavePurchaseBill = (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('Please enter supplier name!');
      return;
    }
    if (cart.length === 0) {
      showToast('Please add at least 1 item to purchase bill!');
      return;
    }

    const cleanSupName = supplierName.trim();
    const cleanSupPhone = supplierPhone.trim();

    // Auto-save supplier to master if not existing
    const existing = savedSuppliers.find(
      (s) => s.name.toLowerCase() === cleanSupName.toLowerCase()
    );
    if (!existing) {
      const newSup = {
        id: `sup-${Date.now()}`,
        name: cleanSupName,
        phone: cleanSupPhone,
      };
      const updatedSups = [newSup, ...savedSuppliers];
      setSavedSuppliers(updatedSups);
      Storage.saveSuppliers(updatedSups);
    }

    const newPurchase = {
      id: `pur-${Date.now()}`,
      billNo,
      date,
      supplierName: cleanSupName,
      supplierPhone: cleanSupPhone,
      items: cart.map((i) => ({
        ...i,
        qty: Math.max(1, Number(i.qty) || 1),
        price: Math.max(0, Number(i.price) || 0),
        unit: 'Bag',
      })),
      grandTotal,
      paymentStatus,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePurchase(newPurchase);
    showToast(`Purchase Bill No. ${billNo} saved! Stock updated.`);
    resetForm();
    setActiveTab('history');
  };

  // Past purchases sorted strictly DESCENDING (newest first)
  const sortedPurchases = useMemo(() => {
    const list = purchases.filter((p) => {
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return (
        String(p.billNo).toLowerCase().includes(q) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const numA = parseInt(String(a.billNo).replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b.billNo).replace(/[^0-9]/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    });
  }, [purchases, historySearch]);

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs: New Purchase vs Past Purchases (Live stock moved to Stock tab!) */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          + Purchase Bill Entry
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Past Purchases ({purchases.length})
        </button>
      </div>

      {/* VIEW: PURCHASE ENTRY FORM */}
      {activeTab === 'create' && (
        <form onSubmit={handleSavePurchaseBill} className="p-3 space-y-3">
          {/* Top Bar: Bill No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Purchase Bill No.
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-400">#</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setCustomBillNo(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-black text-slate-800 text-sm focus:outline-none focus:bg-white"
                  title="Supplier Invoice / Bill No"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Purchase Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Supplier Info Card with Selection / Add New Option */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                Supplier (கொள்முதல் சப்ளையர்) *
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewSupplier(!isAddingNewSupplier);
                  setSupplierName('');
                  setSupplierPhone('');
                }}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                {isAddingNewSupplier ? 'Choose Existing' : '+ New Supplier'}
              </button>
            </div>

            {!isAddingNewSupplier && savedSuppliers.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={supplierName}
                  onChange={(e) => {
                    const found = savedSuppliers.find((s) => s.name === e.target.value);
                    handleSelectSupplier(found);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Existing Supplier ({savedSuppliers.length}) --</option>
                  {savedSuppliers.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>

                {supplierName && (
                  <div className="p-2 bg-blue-50/60 rounded-lg flex items-center justify-between text-xs border border-blue-100">
                    <div>
                      <span className="font-bold text-blue-900">{supplierName}</span>
                      {supplierPhone && <span className="text-slate-500 ml-2">Ph: {supplierPhone}</span>}
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold">Selected</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                <div>
                  <input
                    type="text"
                    placeholder="Supplier Name *"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone (WhatsApp)"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TAP PAD TO ADD ITEMS (BIG LETTERS FOR EASY TOUCH!) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Tap Item to Add to Purchase Bill
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                {items.length} items (50kg Bags)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              {items.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 shadow-xs active:scale-95 ${
                      inCart
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="font-bold text-sm leading-tight truncate w-full">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between mt-1 w-full text-xs">
                      <span className={inCart ? 'text-blue-100 font-medium' : 'text-slate-500'}>
                        {item.unit || 'Bag'}
                      </span>
                      {inCart ? (
                        <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-black">
                          {inCart.qty} Bag
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-extrabold text-xs">
                          + Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart Table (Items Added) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Items in Purchase Bill ({cart.length})
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No items added. Tap any item above to add to this purchase bill.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <span>Cost: ₹</span>
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
                        ₹{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment & Grand Total Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Payment Status:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  PAID
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('UNPAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    paymentStatus === 'UNPAID'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  CREDIT (பாக்கி)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800">Grand Total:</span>
              <span className="text-2xl font-black text-blue-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              <span>SAVE PURCHASE & UPDATE STOCK</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW: PAST PURCHASES HISTORY */}
      {activeTab === 'history' && (
        <div className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases by Bill No. or Supplier..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <div className="space-y-2">
            {sortedPurchases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No purchases found.
              </div>
            ) : (
              sortedPurchases.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">
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
                      <div className="text-xs font-bold text-slate-700 mt-0.5">
                        {p.supplierName} {p.supplierPhone ? `• ${p.supplierPhone}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {(p.items || []).map((i) => `${i.name} (${i.qty} Bag)`).join(', ')}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-blue-600 text-base">
                        {formatCurrency(p.grandTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{formatDate(p.date)}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete Purchase Bill #${p.billNo}? Stock will be adjusted back.`)) {
                          onDeletePurchase(p.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
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
