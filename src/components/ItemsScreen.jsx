import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  AlertTriangle,
  Layers,
  Sliders,
  ArrowRight,
  TrendingUp,
  Warehouse
} from 'lucide-react';
import { formatCurrency } from '../services/pdfService';
import { Storage } from '../services/storage';
import StockReportScreen from './StockReportScreen';

export default function ItemsScreen({
  items = [],
  sales = [],
  purchases = [],
  godowns = [],
  onSaveItems,
  onDeleteItem
}) {
  const [activeSubTab, setActiveSubTab] = useState('stock'); // 'stock' | 'report'
  const [selectedStockGodown, setSelectedStockGodown] = useState('ALL');
  const [editingItem, setEditingItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Manual Stock Adjustment Modal state
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustMode, setAdjustMode] = useState('set'); // 'set' | 'add' | 'sub'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Physical Stock Count');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const availableGodowns = useMemo(() => {
    const list = [{ id: 'ALL', label: 'அனைத்து குடோன்கள் (All Godowns)', short: '🌐 All Godowns' }];
    const seen = new Set(['ALL']);
    const pool = [
      ...(Array.isArray(godowns) ? godowns : []),
      ...Storage.getGodowns(),
      ...(purchases || []).map((p) => p.godown),
    ];
    pool.forEach((g) => {
      const clean = (g || '').trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push({ id: clean, label: clean, short: `🏢 ${clean}` });
      }
    });
    return list;
  }, [godowns, purchases]);

  // Stock calculations per item
  const itemStockStats = useMemo(() => {
    const stats = {};
    items.forEach((item) => {
      const initial = Number(item.initialStock) || 0;
      let purchased = 0;
      let godownPurchased = 0;
      purchases.forEach((p) => {
        const pGodown = (p.godown || '').trim();
        (p.items || []).forEach((pi) => {
          if (pi.id === item.id) {
            const qty = Number(pi.qty) || 0;
            purchased += qty;
            if (selectedStockGodown === 'ALL' || pGodown === selectedStockGodown) {
              godownPurchased += qty;
            }
          }
        });
      });

      let sold = 0;
      sales.forEach((s) => {
        // ONLY Q-Sales reduce physical stock! Original GST Sales do not reduce physical stock
        const isQ = s.isQSale || s.billType === 'Q_SALE';
        if (isQ) {
          (s.items || []).forEach((si) => {
            if (si.id === item.id) {
              sold += Number(si.qty) || 0;
            }
          });
        }
      });

      const current = initial + purchased - sold;
      stats[item.id] = { initial, purchased, godownPurchased, sold, current };
    });
    return stats;
  }, [items, sales, purchases, selectedStockGodown]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingItem(null);
    setName('');
    setPrice('');
    setPurchasePrice('');
    setInitialStock('0');
    setError('');
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setIsAdding(false);
    setName(item.name);
    setPrice(String(item.price));
    setPurchasePrice(item.purchasePrice ? String(item.purchasePrice) : '');
    setInitialStock(item.initialStock !== undefined ? String(item.initialStock) : '0');
    setError('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingItem(null);
    setError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Enter a valid selling price');
      return;
    }

    const numPurchase = purchasePrice ? Number(purchasePrice) : Math.round(numPrice * 0.85);
    const numInitialStock = Number(initialStock) || 0;

    if (editingItem) {
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: name.trim(),
              price: numPrice,
              purchasePrice: numPurchase,
              initialStock: numInitialStock,
              unit: 'Bag',
            }
          : i
      );
      onSaveItems(updated);
    } else {
      const newItem = {
        id: `item-${Date.now()}`,
        name: name.trim(),
        price: numPrice,
        purchasePrice: numPurchase,
        initialStock: numInitialStock,
        unit: 'Bag',
      };
      onSaveItems([...items, newItem]);
    }

    handleCancel();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      if (onDeleteItem) {
        onDeleteItem(id);
      } else {
        Storage.recordDeletedId(id);
        const updated = items.filter((i) => i.id !== id);
        onSaveItems(updated);
      }
    }
  };

  // MANUAL STOCK ADJUSTMENT HANDLER
  const handleOpenAdjust = (item) => {
    setAdjustingItem(item);
    const stats = itemStockStats[item.id] || { current: 0 };
    setAdjustQty(String(stats.current));
    setAdjustMode('set');
    setAdjustReason('Physical Stock Count');
  };

  const handleSaveStockAdjust = (e) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const stats = itemStockStats[adjustingItem.id] || { initial: 0, purchased: 0, sold: 0, current: 0 };
    const numQty = parseInt(adjustQty, 10);
    if (isNaN(numQty)) {
      alert('Please enter a valid quantity');
      return;
    }

    let targetCurrentStock = stats.current;
    if (adjustMode === 'set') {
      targetCurrentStock = Math.max(0, numQty);
    } else if (adjustMode === 'add') {
      targetCurrentStock = stats.current + Math.max(0, numQty);
    } else if (adjustMode === 'sub') {
      targetCurrentStock = Math.max(0, stats.current - Math.max(0, numQty));
    }

    // Calculate required initialStock so that initial + purchased - sold = targetCurrentStock
    // initialStock = targetCurrentStock - purchased + sold
    const newInitialStock = targetCurrentStock - stats.purchased + stats.sold;

    const updated = items.map((i) =>
      i.id === adjustingItem.id
        ? {
            ...i,
            initialStock: newInitialStock,
            lastStockAdjustment: {
              date: new Date().toISOString(),
              reason: adjustReason,
              oldStock: stats.current,
              newStock: targetCurrentStock,
            },
          }
        : i
    );

    onSaveItems(updated);
    showToast(`Stock updated: ${adjustingItem.name} -> ${targetCurrentStock} Bag`);
    setAdjustingItem(null);
  };

  return (
    <div className="pb-24 max-w-md mx-auto p-3 space-y-3">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg font-bold">
          {toast}
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Stock & Items Master</h2>
            <p className="text-xs text-slate-500">
              {items.length} items • Standard 50kg Bags
            </p>
          </div>
        </div>

        {!isAdding && !editingItem && activeSubTab === 'stock' && (
          <button
            onClick={handleStartAdd}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Sub Tabs: Live Physical Stock vs Original Bill Stock Report */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('stock')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'stock'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📦 Live Stock (இருப்பு)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('report')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'report'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>📊 Stock Report (Original Bill)</span>
        </button>
      </div>

      {/* TAB 2: ORIGINAL BILL STOCK REPORT */}
      {activeSubTab === 'report' && (
        <StockReportScreen
          items={items}
          sales={sales}
          purchases={purchases}
          godowns={godowns}
        />
      )}

      {/* TAB 1: LIVE PHYSICAL STOCK */}
      {activeSubTab === 'stock' && (
        <>
          {/* Stock Guidance Notice */}
          <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-bold">🌾 Stock Rule:</span>
            <span className="text-[11px] text-blue-800">
              Purchases (+Stock) • Q-Sales (-Stock) • Original Bills do NOT reduce
            </span>
          </div>

          {/* Godown Wise Filter Bar for Physical Stock */}
          {availableGodowns.length > 1 && (
            <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                  குடோன் வாரியான இருப்பு (Godown Filter):
                </span>
                {selectedStockGodown !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedStockGodown('ALL')}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    அனைத்தும் (Show All)
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {availableGodowns.map((g) => {
                  const isActive = selectedStockGodown === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedStockGodown(g.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {g.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Add / Edit Form Card */}
      {(isAdding || editingItem) && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl p-4 border-2 border-blue-500 shadow-md space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase text-blue-600">
              {editingItem ? `Edit: ${editingItem.name}` : 'Add New Item / Grain'}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ponni Boiled Rice (50kg)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Selling Price (₹ per Bag) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Unit (அளவீடு)
              </label>
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black text-blue-700 flex items-center justify-between">
                <span>Bag</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">50kg</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Initial Stock (In Shop)
              </label>
              <input
                type="number"
                placeholder="0"
                value={initialStock}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">Total Bags</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Cost / Purchase (₹)
              </label>
              <input
                type="number"
                placeholder="Optional"
                value={purchasePrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">Per Bag rate</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 shadow-xs"
            >
              <Check className="w-4 h-4" />
              {editingItem ? 'Update Item & Stock' : 'Save Item'}
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {filteredItems.map((item, idx) => {
          const stats = itemStockStats[item.id] || { initial: 0, purchased: 0, sold: 0, current: 0 };
          const isLow = stats.current <= 5 && stats.current > 0;
          const isOut = stats.current <= 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm leading-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-extrabold text-blue-600">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                        per Bag (50kg)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit Item Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stock Status Bar + Manual Adjustment Button */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-medium">Stock:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-extrabold text-xs flex items-center gap-1 ${
                      isOut
                        ? 'bg-red-100 text-red-700'
                        : isLow
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOut ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Layers className="w-3 h-3" />
                    )}
                    {stats.current} Bag
                  </span>

                  {selectedStockGodown !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Warehouse className="w-3 h-3 text-blue-500" />
                      <span>{selectedStockGodown}: {stats.godownPurchased} Bags</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    In: {stats.initial + stats.purchased} | Out: {stats.sold}
                  </span>

                  {/* Manual Stock Adjustment Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenAdjust(item)}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-blue-200 transition-colors active:scale-95"
                    title="Manual Stock Adjustment"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300 p-4">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No items match your search.</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* MANUAL STOCK ADJUSTMENT MODAL */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStockAdjust}
            className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Manual Stock Adjustment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-xs text-slate-500">Item:</div>
              <div className="font-black text-slate-900 text-sm mt-0.5">
                {adjustingItem.name}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">Current Stock:</span>
                <span className="font-black text-blue-600">
                  {itemStockStats[adjustingItem.id]?.current || 0} Bag (50kg)
                </span>
              </div>
            </div>

            {/* Adjustment Mode Selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdjustMode('set')}
                className={`py-1.5 rounded-lg transition-all ${
                  adjustMode === 'set'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Set Exact Total
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('add')}
                className={`py-1.5 rounded-lg transition-all ${
                  adjustMode === 'add'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Add Bags
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('sub')}
                className={`py-1.5 rounded-lg transition-all ${
                  adjustMode === 'sub'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                - Reduce Bags
              </button>
            </div>

            {/* Qty Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {adjustMode === 'set'
                  ? 'New Exact Stock in Mandi (Bags)'
                  : adjustMode === 'add'
                  ? 'Quantity to Add (Bags)'
                  : 'Quantity to Deduct / Damage (Bags)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  autoFocus
                  required
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                  Bags
                </span>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Reason (காரணம்)
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Physical count / Damaged bags"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Stock</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
