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
  AlertTriangle
} from 'lucide-react';
import { Storage } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';

export default function PurchaseScreen({
  items,
  purchases,
  onSavePurchase,
  onDeletePurchase,
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'stock' | 'history'
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customBillNo, setCustomBillNo] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [searchStock, setSearchStock] = useState('');
  const [toast, setToast] = useState('');

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
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          qty: 1,
          price: item.purchasePrice || Math.round(item.price * 0.85),
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
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('Please enter Supplier Name!');
      return;
    }
    if (cart.length === 0) {
      showToast('Please add at least 1 item to purchase!');
      return;
    }

    const newPurchase = {
      id: `pur-${Date.now()}`,
      billNo,
      date,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim(),
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
    setActiveTab('stock');
  };

  // Live stock calculation for all items
  const itemsWithLiveStock = useMemo(() => {
    return items.map((item) => {
      const stock = Storage.getItemStock(item.id);
      return {
        ...item,
        currentStock: stock,
      };
    });
  }, [items, purchases]);

  const filteredStockItems = useMemo(() => {
    if (!searchStock.trim()) return itemsWithLiveStock;
    const q = searchStock.toLowerCase();
    return itemsWithLiveStock.filter((i) => i.name.toLowerCase().includes(q));
  }, [itemsWithLiveStock, searchStock]);

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs: New Purchase, Live Stock, Past Purchases */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-1.5">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          + Purchase Bill
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'stock'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Live Stock
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          History ({purchases.length})
        </button>
      </div>

      {/* VIEW 1: LIVE STOCK TABLE */}
      {activeTab === 'stock' && (
        <div className="p-3 space-y-3">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl p-4 text-white shadow-md">
            <div className="text-xs text-emerald-200 font-medium uppercase tracking-wider">
              Stock & Inventory Summary
            </div>
            <div className="text-2xl font-black mt-1">
              {items.length} Items Monitored
            </div>
            <div className="text-[11px] text-emerald-100/80 mt-1">
              Sales auto-deducts stock • Purchases auto-adds stock
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stock by item name..."
              value={searchStock}
              onChange={(e) => setSearchStock(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          <div className="space-y-2">
            {filteredStockItems.map((item, idx) => {
              const isLow = item.currentStock <= 10;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Selling Rate: <span className="font-semibold text-slate-800">₹{item.price}</span> / {item.unit}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      In Stock
                    </span>
                    <span
                      className={`text-base font-black px-2 py-0.5 rounded-lg inline-block ${
                        isLow
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {item.currentStock} {item.unit || 'Nos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: PAST PURCHASES HISTORY */}
      {activeTab === 'history' && (
        <div className="p-3 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Past Purchase Entries
          </div>
          {purchases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No purchase bills entered yet.
            </div>
          ) : (
            purchases.slice().reverse().map((pur) => (
              <div
                key={pur.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Bill No. {pur.billNo}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          pur.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {pur.paymentStatus}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 font-medium">
                      Supplier: {pur.supplierName} {pur.supplierPhone ? `(${pur.supplierPhone})` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-blue-600 text-base">
                      {formatCurrency(pur.grandTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400">{formatDate(pur.date)}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span>{pur.items.length} items purchased (Stock Added)</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete Purchase Bill No. ${pur.billNo}? This will revert the added stock.`)) {
                        onDeletePurchase(pur.id);
                        showToast(`Purchase Bill No. ${pur.billNo} deleted`);
                      }
                    }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: CREATE PURCHASE ENTRY */}
      {activeTab === 'create' && (
        <form onSubmit={handleSave} className="p-3 space-y-3">
          {/* Top Bar: Bill No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Purchase Bill No.
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">No.</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setCustomBillNo(e.target.value)}
                  className="w-16 bg-blue-50/60 border border-blue-200 rounded px-1.5 py-0.5 font-extrabold text-blue-600 text-sm focus:outline-none focus:bg-white"
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

          {/* Supplier Info Card */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Supplier Details (கொள்முதல் விவரம்) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  placeholder="Supplier Name / Company *"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* TAP PAD TO ADD ITEMS (BIG LETTERS FOR EASY TOUCH!) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Tap Item to Add to Purchase Bill
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                {items.length} items
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
                        {item.unit || 'Nos'}
                      </span>
                      {inCart && (
                        <span className="bg-white text-blue-700 px-2 py-0.5 rounded-full text-xs font-black">
                          {inCart.qty} added
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items In Purchase Bill */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Items Purchased ({cart.length})
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

          {/* Grand Total & Payment Mode */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex justify-between items-center text-base font-black text-blue-600 border-b border-slate-100 pb-2">
              <span>Total Purchase Cost:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Payment Status:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('CREDIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    paymentStatus === 'CREDIT'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Credit (Pending)
                </button>
              </div>
            </div>
          </div>

          {/* SINGLE BIG SAVE BUTTON */}
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>SAVE PURCHASE ENTRY (கொள்முதல் சேமி)</span>
          </button>
        </form>
      )}
    </div>
  );
}
