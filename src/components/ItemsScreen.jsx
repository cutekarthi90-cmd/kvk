import React, { useState, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, Check, X, Search, TrendingUp, AlertTriangle, Layers } from 'lucide-react';
import { formatCurrency } from '../services/pdfService';

export default function ItemsScreen({ items = [], sales = [], purchases = [], onSaveItems }) {
  const [editingItem, setEditingItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [unit, setUnit] = useState('Kg');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const commonUnits = ['Kg', 'Bag', 'Pkt', 'Btl', 'Box', 'Nos', 'Ltr', 'Gram', 'Tin', 'Bundle'];

  // Stock calculations per item
  const itemStockStats = useMemo(() => {
    const stats = {};
    items.forEach((item) => {
      const initial = Number(item.initialStock) || 0;
      let purchased = 0;
      purchases.forEach((p) => {
        (p.items || []).forEach((pi) => {
          if (pi.id === item.id) {
            purchased += Number(pi.qty) || 0;
          }
        });
      });

      let sold = 0;
      sales.forEach((s) => {
        (s.items || []).forEach((si) => {
          if (si.id === item.id) {
            sold += Number(si.qty) || 0;
          }
        });
      });

      const current = initial + purchased - sold;
      stats[item.id] = { initial, purchased, sold, current };
    });
    return stats;
  }, [items, sales, purchases]);

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
    setUnit('Kg');
    setError('');
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setIsAdding(false);
    setName(item.name);
    setPrice(String(item.price));
    setPurchasePrice(item.purchasePrice ? String(item.purchasePrice) : '');
    setInitialStock(item.initialStock !== undefined ? String(item.initialStock) : '0');
    setUnit(item.unit || 'Kg');
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
              unit: unit.trim(),
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
        unit: unit.trim(),
      };
      onSaveItems([...items, newItem]);
    }

    handleCancel();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const updated = items.filter((i) => i.id !== id);
      onSaveItems(updated);
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto p-3 space-y-3">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Stock & Price Master</h2>
            <p className="text-xs text-slate-500">
              {items.length} items • Live inventory tracking
            </p>
          </div>
        </div>

        {!isAdding && !editingItem && (
          <button
            onClick={handleStartAdd}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search items or grains..."
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
              placeholder="e.g. Ponni Boiled Rice 25kg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Unit (Measure)
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                {commonUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
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
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">Starting quantity</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Cost / Purchase (₹)
              </label>
              <input
                type="number"
                placeholder="Optional"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">Default purchase rate</span>
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
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        per {item.unit || 'Kg'}
                      </span>
                      {item.purchasePrice > 0 && (
                        <span className="text-[10px] text-slate-400">
                          (Cost: ₹{item.purchasePrice})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit Item & Stock"
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

              {/* Stock Status Bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Stock:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1 ${
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
                    {stats.current} {item.unit || 'Kg'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 font-medium">
                  In: {stats.initial + stats.purchased} | Out: {stats.sold}
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
    </div>
  );
}