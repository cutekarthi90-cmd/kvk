import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Package,
  Clock,
  Search,
  UserPlus,
  Tag,
  ShieldCheck,
  Percent,
  Warehouse,
  Eye,
  Share2,
  X
} from 'lucide-react';
import { Storage } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';

export default function PurchaseScreen({
  items = [],
  purchases = [],
  suppliers: externalSuppliers = [],
  godowns: externalGodowns = [],
  onSavePurchase,
  onDeletePurchase,
  onSaveSuppliers,
  onSaveGodowns,
  onDeleteGodown,
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  
  // Q-Purchase Toggle (Regular GST vs Q Purchase)
  const [isQPurchase, setIsQPurchase] = useState(false);

  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierOpeningBalance, setSupplierOpeningBalance] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customBillNo, setCustomBillNo] = useState('');
  const [localGodowns, setLocalGodowns] = useState([]);
  const godownsList = useMemo(() => {
    const deleted = Storage.getDeletedGodowns();
    const fromProps = (Array.isArray(externalGodowns) ? externalGodowns : []).filter((g) => !deleted.includes((g || '').trim()));
    const saved = Storage.getGodowns().filter((g) => !deleted.includes((g || '').trim()));
    return Array.from(new Set([...fromProps, ...saved, ...localGodowns].filter(Boolean)));
  }, [externalGodowns, localGodowns]);

  const [selectedGodown, setSelectedGodown] = useState(() => {
    const deleted = Storage.getDeletedGodowns();
    const fromProps = Array.isArray(externalGodowns) ? externalGodowns : [];
    const saved = Storage.getGodowns();
    const fromPurchases = (purchases || []).map((p) => (p?.godown || '').trim()).filter(Boolean);
    const arr = Array.from(new Set([...fromProps, ...saved, ...fromPurchases].filter(Boolean)))
      .filter((g) => !deleted.includes((g || '').trim()));
    return arr.length > 0 ? arr[0] : '';
  });

  const activeGodown = selectedGodown || (godownsList.length > 0 ? godownsList[0] : '');
  const [newGodownInput, setNewGodownInput] = useState('');
  const [isAddingGodown, setIsAddingGodown] = useState(false);
  const [cart, setCart] = useState([]);
  const [freightCharges, setFreightCharges] = useState(''); // Freight / வண்டி வாடகை ₹
  const [discount, setDiscount] = useState(''); // Discount on Payment (தள்ளுபடி)
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedPurchaseBill, setSelectedPurchaseBill] = useState(null);
  const [toast, setToast] = useState('');

  // Suppliers master state
  const [internalSuppliers, setInternalSuppliers] = useState(() => Storage.getSuppliers());
  const savedSuppliers = externalSuppliers || internalSuppliers;
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);

  const autoBillNo = useMemo(() => {
    return String((purchases || []).length + 1);
  }, [purchases]);

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

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [cart]);

  const numDiscount = Number(discount) || 0;
  const numFreight = Number(freightCharges) || 0;

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal + numFreight - numDiscount);
  }, [subTotal, numFreight, numDiscount]);

  const resetForm = () => {
    setCart([]);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierGstin('');
    setSupplierOpeningBalance('');
    setCustomBillNo('');
    setFreightCharges('');
    setDiscount('');
    setNotes('');
    setIsQPurchase(false);
    setDate(new Date().toISOString().split('T')[0]);
    setIsAddingNewSupplier(false);
    setNewGodownInput('');
    setIsAddingGodown(false);
  };

  const handleAddGodown = (nameToAdd) => {
    const clean = (nameToAdd || newGodownInput).trim();
    if (!clean) {
      showToast('தயவுசெய்து குடோன் பெயரை உள்ளிடவும் (Enter Godown Name)');
      return;
    }
    const updated = Array.from(new Set([...godownsList, clean]));
    setLocalGodowns((prev) => Array.from(new Set([...prev, clean])));
    if (onSaveGodowns) {
      onSaveGodowns(updated);
    } else {
      Storage.saveGodowns(updated);
      SyncService.dispatch('SAVE_GODOWNS', updated);
    }
    setSelectedGodown(clean);
    setNewGodownInput('');
    setIsAddingGodown(false);
    showToast(`🏢 குடோன் "${clean}" வெற்றிகரமாக உருவாக்கப்பட்டது!`);
  };

  const handleDeleteGodown = (e, nameToDelete) => {
    e.stopPropagation();
    if (!window.confirm(`குடோன் "${nameToDelete}" பெயரை நிச்சயமாக நீக்க வேண்டுமா? (Delete godown '${nameToDelete}'?)`)) {
      return;
    }
    const clean = (nameToDelete || '').trim();
    Storage.recordDeletedGodown(clean);
    setLocalGodowns((prev) => prev.filter((g) => g !== clean));

    if (onDeleteGodown) {
      onDeleteGodown(clean);
    } else {
      const updated = godownsList.filter((g) => g !== clean);
      if (onSaveGodowns) {
        onSaveGodowns(updated);
      } else {
        Storage.saveGodowns(updated);
        SyncService.dispatch('SAVE_GODOWNS', updated);
      }
    }
    if (selectedGodown === clean) {
      const remaining = godownsList.filter((g) => g !== clean);
      setSelectedGodown(remaining.length > 0 ? remaining[0] : '');
    }
    showToast(`குடோன் "${clean}" நீக்கப்பட்டது.`);
  };

  const handleSelectSupplier = (s) => {
    if (!s) {
      setSupplierName('');
      setSupplierPhone('');
      setSupplierGstin('');
      setSupplierOpeningBalance('');
      return;
    }
    setSupplierName(s.name);
    setSupplierPhone(s.phone || '');
    setSupplierGstin(s.gstin || '');
    setSupplierOpeningBalance(s.openingBalance !== undefined ? String(s.openingBalance) : '');
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
    const cleanSupGstin = supplierGstin.trim().toUpperCase();
    const cleanSupOpeningBal = Number(supplierOpeningBalance) || 0;

    // Auto-save supplier to master if not existing
    const existing = savedSuppliers.find(
      (s) => s.name.toLowerCase() === cleanSupName.toLowerCase()
    );
    if (!existing) {
      const newSup = {
        id: `sup-${Date.now()}`,
        name: cleanSupName,
        phone: cleanSupPhone,
        gstin: cleanSupGstin,
        openingBalance: cleanSupOpeningBal,
      };
      const updatedSups = [newSup, ...savedSuppliers];
      if (onSaveSuppliers) {
        onSaveSuppliers(updatedSups);
      } else {
        setInternalSuppliers(updatedSups);
        Storage.saveSuppliers(updatedSups);
      }
    } else if (cleanSupGstin && !existing.gstin) {
      // update existing supplier gstin if provided
      const updatedSups = savedSuppliers.map((s) =>
        s.id === existing.id ? { ...s, gstin: cleanSupGstin, openingBalance: cleanSupOpeningBal || s.openingBalance || 0 } : s
      );
      if (onSaveSuppliers) {
        onSaveSuppliers(updatedSups);
      } else {
        setInternalSuppliers(updatedSups);
        Storage.saveSuppliers(updatedSups);
      }
    }

    const finalGodown = (activeGodown || newGodownInput || '').trim();
    if (finalGodown && !godownsList.includes(finalGodown)) {
      const updated = [...godownsList, finalGodown];
      setLocalGodowns((prev) => Array.from(new Set([...prev, finalGodown])));
      if (onSaveGodowns) {
        onSaveGodowns(updated);
      } else {
        Storage.saveGodowns(updated);
        SyncService.dispatch('SAVE_GODOWNS', updated);
      }
    }

    const newPurchase = {
      id: `pur-${Date.now()}`,
      billNo,
      date,
      supplierName: cleanSupName,
      supplierPhone: cleanSupPhone,
      supplierGstin: cleanSupGstin || existing?.gstin || '',
      isQPurchase,
      billType: isQPurchase ? 'Q_PURCHASE' : 'GST_BILL',
      godown: finalGodown,
      items: cart.map((i) => ({
        ...i,
        qty: Math.max(1, Number(i.qty) || 1),
        price: Math.max(0, Number(i.price) || 0),
        unit: 'Bag',
        godown: finalGodown,
      })),
      subTotal,
      freightCharges: numFreight,
      discount: numDiscount,
      grandTotal,
      paymentStatus,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePurchase(newPurchase);
    showToast(
      isQPurchase
        ? `Q Purchase Bill #${billNo} saved! Stock updated (Excluded from Auditor GST).`
        : `Regular Purchase Bill #${billNo} saved! Stock & GST updated.`
    );
    resetForm();
    setActiveTab('history');
  };

  // Past purchases sorted strictly DESCENDING (newest first)
  const sortedPurchases = useMemo(() => {
    const list = (purchases || []).filter((p) => {
      if (!p) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return (
        String(p.billNo || '').toLowerCase().includes(q) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.godown && p.godown.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const numA = parseInt(String(a?.billNo || '').replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b?.billNo || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b?.date || b?.createdAt || 0) - new Date(a?.date || a?.createdAt || 0);
    });
  }, [purchases, historySearch]);

  // Overall Purchase Summary metrics (including Discount on Payment column)
  const purchaseSummary = useMemo(() => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let netTotal = 0;
    let totalBags = 0;
    let qPurchaseTotal = 0;
    let qPurchaseCount = 0;

    (purchases || []).forEach((p) => {
      if (!p) return;
      const sub = Number(p.subTotal) || Number(p.grandTotal) || 0;
      const disc = Number(p.discount) || 0;
      const grand = Number(p.grandTotal) || (sub - disc);

      grossTotal += sub;
      totalDiscount += disc;
      netTotal += grand;

      (p.items || []).forEach((i) => {
        totalBags += Number(i?.qty) || 0;
      });

      if (p.isQPurchase || p.billType === 'Q_PURCHASE') {
        qPurchaseTotal += grand;
        qPurchaseCount += 1;
      }
    });

    return {
      grossTotal,
      totalDiscount,
      netTotal,
      totalBags,
      qPurchaseTotal,
      qPurchaseCount,
    };
  }, [purchases]);

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="p-3 bg-white border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Purchase Bill Entry</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Past Purchases ({purchases.length})</span>
        </button>
      </div>

      {/* VIEW: PURCHASE ENTRY FORM */}
      {activeTab === 'create' && (
        <form onSubmit={handleSavePurchaseBill} className="p-3 space-y-3">
          {/* Bill Type Toggle: Regular GST Purchase vs Q Purchase */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex gap-1">
            <button
              type="button"
              onClick={() => setIsQPurchase(false)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isQPurchase
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>🏢 Regular GST Bill</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQPurchase(true)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isQPurchase
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>📦 Q Purchase (Quotation)</span>
            </button>
          </div>

          {/* Q Purchase Notice */}
          {isQPurchase && (
            <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-start gap-2 text-xs text-purple-900">
              <span className="font-bold shrink-0">📦 Q Purchase Note:</span>
              <span>
                Grain stock-la bags add aagum, supplier ledger-lum varum. <strong>Auditor GST Report-la ithu pogathu (Excludes strictly).</strong>
              </span>
            </div>
          )}

          {/* Top Bar: Bill No & Date */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isQPurchase ? 'Q-Purchase Ref No.' : 'Purchase Bill No.'}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-slate-400">{isQPurchase ? 'Q-' : '#'}</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setCustomBillNo(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 font-black text-slate-800 text-sm focus:outline-none focus:bg-white"
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

          {/* Supplier Info Card */}
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
                  setSupplierGstin('');
                  setSupplierOpeningBalance('');
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
                      {s.name} {s.phone ? `(${s.phone})` : ''} {s.gstin ? `[GST: ${s.gstin}]` : ''}
                    </option>
                  ))}
                </select>

                {supplierName && (
                  <div className="p-2 bg-blue-50/60 rounded-lg flex items-center justify-between text-xs border border-blue-100">
                    <div>
                      <span className="font-bold text-blue-900">{supplierName}</span>
                      {supplierPhone && <span className="text-slate-500 ml-2">Ph: {supplierPhone}</span>}
                      {supplierGstin && (
                        <span className="text-indigo-600 ml-2 font-mono text-[11px] font-bold">
                          GST: {supplierGstin}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold">Selected</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Supplier Name *"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                  <input
                    type="tel"
                    placeholder="Phone (WhatsApp)"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="GSTIN (Optional)"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={15}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Opening Bal (பழைய பாக்கி ₹)"
                    value={supplierOpeningBalance}
                    onChange={(e) => setSupplierOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Godown Entry Card - User's Own Godowns */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black text-slate-800 uppercase">
                  சரக்கு இறக்கும் குடோன் (Stock In Godown)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingGodown(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ புதிய குடோன் சேர்க்க</span>
              </button>
            </div>

            {/* List of user's added godowns */}
            {godownsList.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>சரக்கு வைக்க வேண்டிய குடோனைத் தேர்ந்தெடுக்கவும்:</span>
                  {activeGodown && (
                    <span className="text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      தேர்ந்தெடுத்தது: {activeGodown}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {godownsList.map((g) => {
                    const isSelected = activeGodown === g;
                    return (
                      <div
                        key={g}
                        onClick={() => setSelectedGodown(g)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border select-none ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/50'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50/60 hover:border-amber-300'
                        }`}
                      >
                        <Warehouse className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-100' : 'text-amber-600'}`} />
                        <span>{g}</span>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white ml-0.5" />}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteGodown(e, g)}
                          className={`hover:text-red-500 rounded p-0.5 ml-1 ${
                            isSelected ? 'text-amber-200 hover:text-white' : 'text-slate-400'
                          }`}
                          title="Remove Godown"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-dashed border-amber-300 text-center space-y-2">
                <p className="text-xs text-amber-900 font-medium">
                  இன்னும் குடோன் சேர்க்கப்படவில்லை. உங்கள் குடோன் பெயரை உருவாக்க கீழே உள்ள <strong>"+ புதிய குடோன் சேர்க்க"</strong> பட்டனை அழுத்தவும்.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingGodown(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ முதல் குடோனை உருவாக்கவும் (+ Create Godown)</span>
                </button>
              </div>
            )}

            {/* Input to add / type godown modal / inline form */}
            {isAddingGodown && (
              <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-400 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                    புதிய குடோன் பெயர் சேர்க்கவும் (Enter Godown Name):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGodown(false);
                      setNewGodownInput('');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="e.g. குடோன் 1 / மெயின் குடோன் / Vip godown..."
                    value={newGodownInput}
                    onChange={(e) => setNewGodownInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGodown();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAddGodown()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>உருவாக்கு (Create)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TAP PAD TO ADD ITEMS */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Tap Item to Add to Purchase Bill
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                {items.length} items (50kg Bags)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((item) => {
                const inCart = cart.find((i) => i.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[75px] ${
                      inCart
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-snug">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                      <span className="text-xs font-black text-blue-600">
                        ₹{item.purchasePrice || Math.round(item.price * 0.85)}
                      </span>
                      {inCart && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                          {inCart.qty} Bag
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart Table with Editable Qty & Rate */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Items in Purchase Bill ({cart.length})
              </span>
              <span className="text-[11px] text-slate-400">Unit: 50kg Bag</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No items added yet. Tap items above to add.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-900 text-xs truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <span>₹</span>
                        <input
                          type="number"
                          value={item.price}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                          className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span>/ Bag</span>
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

          {/* Freight Charges, Discount on Payment & Grand Total Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            {/* Freight Charges Field (வண்டி வாடகை / லாரி வாடகை) */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-700" />
                  Freight Charges (வண்டி / லாரி வாடகை ₹):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={freightCharges}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFreightCharges(e.target.value)}
                    className="w-28 pl-6 pr-2 py-1 bg-white border-2 border-blue-300 focus:border-blue-600 rounded-lg text-sm font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
              <span className="text-[10px] text-blue-700 block">
                Transport / Lorry freight added to total payable bill amount
              </span>
            </div>

            {/* Discount on Payment Field */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-700" />
                  Discount on Payment (தள்ளுபடி ₹):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={discount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-28 pl-6 pr-2 py-1 bg-white border-2 border-amber-300 focus:border-amber-600 rounded-lg text-sm font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
              <span className="text-[10px] text-amber-800 block">
                Cash discount / Supplier concession on bill amount
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-2">
              <div className="flex items-center justify-between">
                <span>Subtotal (மண்டியில் இறக்கிய தானிய மதிப்பு):</span>
                <span className="font-bold text-slate-800">₹{subTotal.toFixed(2)}</span>
              </div>

              {numFreight > 0 && (
                <div className="flex items-center justify-between text-blue-700 font-bold">
                  <span>(+) Freight Charges (வண்டி வாடகை):</span>
                  <span>+₹{numFreight.toFixed(2)}</span>
                </div>
              )}

              {numDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span>(-) Discount on Payment (தள்ளுபடி):</span>
                  <span>-₹{numDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

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
                  PAID (ரொக்கம்)
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
              <span className="text-sm font-bold text-slate-800">Net Payable Total:</span>
              <span className="text-2xl font-black text-blue-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all text-white ${
                isQPurchase
                  ? 'bg-purple-700 hover:bg-purple-800'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {isQPurchase
                  ? 'SAVE Q-PURCHASE & UPDATE STOCK'
                  : 'SAVE PURCHASE & UPDATE STOCK'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW: PAST PURCHASES HISTORY & SUMMARY */}
      {activeTab === 'history' && (
        <div className="p-3 space-y-3">
          {/* PURCHASE SUMMARY CARD (Requested: Discount on payment column in summary!) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Purchase Summary (கொள்முதல் விவரம்)
                </span>
                <div className="text-2xl font-black text-blue-400 mt-0.5">
                  {formatCurrency(purchaseSummary.netTotal)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Bags
                </span>
                <span className="text-lg font-black text-white">
                  {purchaseSummary.totalBags} Bags
                </span>
              </div>
            </div>

            {/* Metrics Grid with Discount on Payment column */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">Gross Value</span>
                <span className="font-bold text-white text-xs">{formatCurrency(purchaseSummary.grossTotal)}</span>
              </div>

              <div className="bg-emerald-950/60 p-2 rounded-xl border border-emerald-700/60">
                <span className="text-[10px] text-emerald-400 block font-bold">Discount on Pay</span>
                <span className="font-black text-emerald-300 text-xs">
                  {formatCurrency(purchaseSummary.totalDiscount)}
                </span>
              </div>

              <div className="bg-purple-950/60 p-2 rounded-xl border border-purple-700/60">
                <span className="text-[10px] text-purple-300 block font-bold">Q Purchases</span>
                <span className="font-black text-purple-200 text-xs">
                  {formatCurrency(purchaseSummary.qPurchaseTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Search bar */}
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

          {/* Bills List */}
          <div className="space-y-2">
            {sortedPurchases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No purchases found.
              </div>
            ) : (
              sortedPurchases.map((p) => {
                const isQ = p.isQPurchase || p.billType === 'Q_PURCHASE';
                const disc = Number(p.discount) || 0;

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-base">
                            Bill #{p.billNo}
                          </span>

                          {/* Q-Purchase vs Regular Badge */}
                          {isQ ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              📦 Q Purchase
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-800">
                              GST Bill
                            </span>
                          )}

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              p.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.paymentStatus}
                          </span>

                          {/* Godown Badge */}
                          {p.godown ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Warehouse className="w-2.5 h-2.5 text-amber-600" />
                              {p.godown}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs font-bold text-slate-700 mt-1">
                          {p.supplierName} {p.supplierPhone ? `• ${p.supplierPhone}` : ''}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {(p.items || []).map((i) => `${i?.name || ''} (${i?.qty || 0} Bag)`).filter(Boolean).join(', ')}
                        </div>

                        {/* Freight and Discount Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {Number(p.freightCharges) > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>வாடகை: +₹{Number(p.freightCharges).toFixed(2)}</span>
                            </span>
                          )}

                          {disc > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Tag className="w-3 h-3 text-emerald-600" />
                              <span>தள்ளுபடி: -₹{disc.toFixed(2)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-blue-600 text-base">
                          {formatCurrency(p.grandTotal)}
                        </div>
                        {disc > 0 && (
                          <span className="text-[10px] text-slate-400 line-through block">
                            ₹{(Number(p.subTotal) || (Number(p.grandTotal) + disc)).toFixed(2)}
                          </span>
                        )}
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {p.date ? formatDate(p.date) : ''}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete Purchase Bill #${p.billNo}? Stock will be adjusted back.`)) {
                            if (typeof onDeletePurchase === 'function') {
                              onDeletePurchase(p.id);
                            }
                          }
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseBill(p)}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>View Bill</span>
                        </button>

                        {p.supplierPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = String(p.supplierPhone).replace(/[^0-9]/g, '');
                              const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
                              const itemsText = (p.items || []).map((i) => `• ${i.name}: ${i.qty} Bag @ Rs.${i.price}`).join('\n');
                              const msg =
                                `🌾 *KVK THANIYA MANDI* 🌾\n` +
                                `*Purchase Bill #${p.billNo}*\n` +
                                `Supplier: *${p.supplierName}*\n` +
                                `Date: ${formatDate(p.date)}\n` +
                                (p.godown ? `Godown: ${p.godown}\n` : '') +
                                `━━━━━━━━━━━━━━━━━━\n` +
                                `${itemsText}\n` +
                                `━━━━━━━━━━━━━━━━━━\n` +
                                `Total: *Rs. ${Number(p.grandTotal).toFixed(2)}*\n` +
                                `Status: *${p.paymentStatus}*\n` +
                                `Thank you!`;
                              window.location.href = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-2xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW PURCHASE BILL DETAILS MODAL */}
      {selectedPurchaseBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-3 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Purchase Bill #{selectedPurchaseBill.billNo}
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {formatDate(selectedPurchaseBill.date)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchaseBill(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier & Godown Info */}
            <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="font-extrabold text-slate-800">
                Supplier: {selectedPurchaseBill.supplierName}
              </div>
              {selectedPurchaseBill.supplierPhone && (
                <div className="text-slate-500 font-medium">
                  Phone: {selectedPurchaseBill.supplierPhone}
                </div>
              )}
              {selectedPurchaseBill.supplierGstin && (
                <div className="text-indigo-600 font-mono font-bold text-[11px]">
                  GST: {selectedPurchaseBill.supplierGstin}
                </div>
              )}
              {selectedPurchaseBill.godown && (
                <div className="text-amber-800 font-bold flex items-center gap-1 pt-0.5">
                  <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                  <span>Godown: {selectedPurchaseBill.godown}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Items Purchased ({(selectedPurchaseBill.items || []).length})
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(selectedPurchaseBill.items || []).map((item, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs bg-white">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {item.qty} Bag @ ₹{item.price}
                      </span>
                    </div>
                    <span className="font-black text-slate-900">
                      ₹{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold">₹{Number(selectedPurchaseBill.subTotal || selectedPurchaseBill.grandTotal).toFixed(2)}</span>
              </div>
              {Number(selectedPurchaseBill.freightCharges) > 0 && (
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>+ Freight (வாடகை):</span>
                  <span>₹{Number(selectedPurchaseBill.freightCharges).toFixed(2)}</span>
                </div>
              )}
              {Number(selectedPurchaseBill.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>- Discount (தள்ளுபடி):</span>
                  <span>₹{Number(selectedPurchaseBill.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-blue-900 pt-1 border-t border-blue-200">
                <span>Net Total:</span>
                <span>{formatCurrency(selectedPurchaseBill.grandTotal)}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPurchaseBill(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
