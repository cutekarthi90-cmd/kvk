import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { formatCurrency, formatDate } from '../services/pdfService';
import { Storage, getFinancialYear } from '../services/storage';

export default function StockReportScreen({ items = [], sales = [], purchases = [] }) {
  const [selectedFY, setSelectedFY] = useState(() => getFinancialYear());
  const [openingValues, setOpeningValues] = useState(() => {
    try {
      const saved = localStorage.getItem('quickbill_gst_opening_stock_values');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingOpening, setEditingOpening] = useState(false);
  const [tempOpening, setTempOpening] = useState({});
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const availableFYs = useMemo(() => {
    const set = new Set([getFinancialYear()]);
    sales.forEach((s) => {
      if (s.date) set.add(getFinancialYear(s.date));
    });
    purchases.forEach((p) => {
      if (p.date) set.add(getFinancialYear(p.date));
    });
    return Array.from(set).sort().reverse();
  }, [sales, purchases]);

  // Filter ONLY Original GST Bills (excluding Q-Sales & Q-Purchases)
  const gstSales = useMemo(() => {
    return sales.filter((s) => {
      const matchFY = selectedFY === 'ALL' || getFinancialYear(s.date) === selectedFY;
      const isQ = s.isQSale || s.billType === 'Q_SALE';
      return matchFY && !isQ;
    });
  }, [sales, selectedFY]);

  const gstPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchFY = selectedFY === 'ALL' || getFinancialYear(p.date) === selectedFY;
      const isQ = p.isQPurchase || p.billType === 'Q_PURCHASE';
      return matchFY && !isQ;
    });
  }, [purchases, selectedFY]);

  // Calculate detailed stock metrics for every item
  const reportRows = useMemo(() => {
    return items.map((item) => {
      // 1. Opening Stock Value & Bags
      // User can customize opening stock value ₹ and bags per item or defaults to initialStock * purchasePrice
      const customOpening = openingValues[item.id] || {};
      const openingBags = customOpening.bags !== undefined ? Number(customOpening.bags) : (Number(item.initialStock) || 0);
      const openingRate = Number(item.purchasePrice) || Math.round(Number(item.price) * 0.85);
      const openingValue = customOpening.value !== undefined ? Number(customOpening.value) : (openingBags * openingRate);

      // 2. Original Purchases for selected FY
      let purchasedBags = 0;
      let purchasedValue = 0;
      gstPurchases.forEach((p) => {
        (p.items || []).forEach((pi) => {
          if (pi.id === item.id) {
            const q = Number(pi.qty) || 0;
            const r = Number(pi.price) || 0;
            purchasedBags += q;
            purchasedValue += (q * r);
          }
        });
      });

      // 3. Original Sales for selected FY
      let soldBags = 0;
      let soldValue = 0;
      gstSales.forEach((s) => {
        (s.items || []).forEach((si) => {
          if (si.id === item.id) {
            const q = Number(si.qty) || 0;
            const r = Number(si.price) || 0;
            soldBags += q;
            soldValue += (q * r);
          }
        });
      });

      // 4. Remaining Stock Bags & Value
      // Remaining bags = Opening + Purchases - Sales
      const remainingBags = Math.max(0, openingBags + purchasedBags - soldBags);
      // Valuation at purchase price / cost
      const remainingValue = remainingBags * openingRate;

      return {
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        purchasePrice: openingRate,
        openingBags,
        openingValue,
        purchasedBags,
        purchasedValue,
        soldBags,
        soldValue,
        remainingBags,
        remainingValue,
      };
    });
  }, [items, gstSales, gstPurchases, openingValues]);

  // Overall Totals
  const totals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => ({
        openingValue: acc.openingValue + row.openingValue,
        openingBags: acc.openingBags + row.openingBags,
        purchasedValue: acc.purchasedValue + row.purchasedValue,
        purchasedBags: acc.purchasedBags + row.purchasedBags,
        soldValue: acc.soldValue + row.soldValue,
        soldBags: acc.soldBags + row.soldBags,
        remainingValue: acc.remainingValue + row.remainingValue,
        remainingBags: acc.remainingBags + row.remainingBags,
      }),
      {
        openingValue: 0,
        openingBags: 0,
        purchasedValue: 0,
        purchasedBags: 0,
        soldValue: 0,
        soldBags: 0,
        remainingValue: 0,
        remainingBags: 0,
      }
    );
  }, [reportRows]);

  const handleStartEditOpening = () => {
    const temp = {};
    items.forEach((item) => {
      const cur = openingValues[item.id] || {};
      const defBags = cur.bags !== undefined ? cur.bags : (item.initialStock || 0);
      const defRate = Number(item.purchasePrice) || Math.round(Number(item.price) * 0.85);
      const defVal = cur.value !== undefined ? cur.value : (defBags * defRate);
      temp[item.id] = { bags: defBags, value: defVal };
    });
    setTempOpening(temp);
    setEditingOpening(true);
  };

  const handleSaveOpeningValues = () => {
    setOpeningValues(tempOpening);
    localStorage.setItem('quickbill_gst_opening_stock_values', JSON.stringify(tempOpening));
    setEditingOpening(false);
    showToast('Original Bill Opening Stock values saved!');
  };

  const exportExcelCSV = () => {
    const shop = Storage.getShopSettings();
    const rows = [];
    rows.push([`"${shop.name || 'KVK THANIYA MANDI'}"`]);
    rows.push([`"ORIGINAL GST BILL - STOCK VALUE & AUDIT REPORT"`]);
    rows.push([`"Financial Year: ${selectedFY}"`]);
    rows.push([`"Generated on: ${new Date().toLocaleDateString('en-IN')}"`]);
    rows.push([]);
    rows.push([
      '"S.No"',
      '"Item Name (Grain)"',
      '"Unit"',
      '"Opening Stock Bags"',
      '"Opening Stock Value (Rs.)"',
      '"Original Purchases Bags"',
      '"Original Purchases Value (Rs.)"',
      '"Original Sales Bags"',
      '"Original Sales Value (Rs.)"',
      '"Remaining Stock Bags"',
      '"Remaining Stock Value (Rs.)"',
    ]);

    reportRows.forEach((r, idx) => {
      rows.push([
        idx + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        '"Bag (50kg)"',
        r.openingBags,
        r.openingValue.toFixed(2),
        r.purchasedBags,
        r.purchasedValue.toFixed(2),
        r.soldBags,
        r.soldValue.toFixed(2),
        r.remainingBags,
        r.remainingValue.toFixed(2),
      ]);
    });

    rows.push([]);
    rows.push([
      '""',
      '"TOTAL VALUE"',
      '""',
      totals.openingBags,
      totals.openingValue.toFixed(2),
      totals.purchasedBags,
      totals.purchasedValue.toFixed(2),
      totals.soldBags,
      totals.soldValue.toFixed(2),
      totals.remainingBags,
      totals.remainingValue.toFixed(2),
    ]);

    const csvContent = rows.map((e) => e.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Original_Bill_Stock_Report_FY_${selectedFY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Stock Report CSV downloaded successfully!');
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg font-bold">
          {toast}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-black text-sm">Original Bill Stock Report</h3>
              <p className="text-[11px] text-blue-200">
                Opening Value • Purchase • Sales • Remaining Stock
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={exportExcelCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel CSV</span>
          </button>
        </div>

        {/* FY Selector & Edit Opening Values Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-800/60">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-blue-300">Financial Year:</span>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="bg-slate-800 border border-blue-400/40 rounded-lg px-2 py-1 text-xs font-black text-white focus:outline-none"
            >
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleStartEditOpening}
            className="px-2.5 py-1 bg-blue-700/60 hover:bg-blue-600 text-blue-100 rounded-lg text-[11px] font-bold border border-blue-400/40"
          >
            ✏️ Set Opening Value
          </button>
        </div>
      </div>

      {/* High-Level Financial Stock Dashboard */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* 1. Opening Stock Value */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            1. Opening Stock Value
          </span>
          <div className="font-black text-base text-slate-900 mt-0.5">
            {formatCurrency(totals.openingValue)}
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {totals.openingBags} Bags (50kg)
          </span>
        </div>

        {/* 2. Original Purchases */}
        <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-blue-600 block">
            2. Original Purchases
          </span>
          <div className="font-black text-base text-blue-700 mt-0.5">
            {formatCurrency(totals.purchasedValue)}
          </div>
          <span className="text-[10px] font-bold text-blue-600">
            +{totals.purchasedBags} Bags • {gstPurchases.length} Bills
          </span>
        </div>

        {/* 3. Original Sales */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">
            3. Original Sales
          </span>
          <div className="font-black text-base text-emerald-700 mt-0.5">
            {formatCurrency(totals.soldValue)}
          </div>
          <span className="text-[10px] font-bold text-emerald-600">
            -{totals.soldBags} Bags • {gstSales.length} Bills
          </span>
        </div>

        {/* 4. Remaining Stock Value */}
        <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">
            4. Remaining Stock Value
          </span>
          <div className="font-black text-base text-amber-800 mt-0.5">
            {formatCurrency(totals.remainingValue)}
          </div>
          <span className="text-[10px] font-black text-amber-700">
            = {totals.remainingBags} Bags Balance
          </span>
        </div>
      </div>

      {/* Info Notice on Q-Sales / Physical Stock Difference */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>அறிக்கை வழிகாட்டுதல் (Report Rules):</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          • இந்த அறிக்கை உங்கள் <strong>அதிகாரப்பூர்வ Original GST Bills</strong>-க்கு மட்டுமேயானது (Q-Sales மற்றும் Q-Purchases இதில் வராது).
          <br />
          • கடையில் உள்ள நேரடி மூட்டை இருப்பு <strong>Stock Tab</strong>-ல் எப்போதும் தெளிவாகக் காட்டும்.
        </p>
      </div>

      {/* Item-wise Stock Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">
            Item-wise Stock Valuation ({reportRows.length} தானியங்கள்)
          </h4>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {reportRows.map((r) => (
            <div key={r.id} className="p-3 space-y-2 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-black text-slate-900 text-xs">{r.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Rate: ₹{r.purchasePrice} / Bag
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-black text-amber-800 text-xs block">
                    Rem: {formatCurrency(r.remainingValue)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">
                    {r.remainingBags} Bags (50kg)
                  </span>
                </div>
              </div>

              {/* 3 Step Breakdown: Op + In - Out */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg text-center">
                <div>
                  <span className="text-slate-400 font-bold block">Opening</span>
                  <span className="font-extrabold text-slate-800">{r.openingBags} Bag</span>
                  <span className="text-slate-500 block">₹{Math.round(r.openingValue)}</span>
                </div>
                <div>
                  <span className="text-blue-500 font-bold block">+ Purchase</span>
                  <span className="font-extrabold text-blue-700">+{r.purchasedBags} Bag</span>
                  <span className="text-blue-600 block">₹{Math.round(r.purchasedValue)}</span>
                </div>
                <div>
                  <span className="text-emerald-500 font-bold block">- Sales</span>
                  <span className="font-extrabold text-emerald-700">-{r.soldBags} Bag</span>
                  <span className="text-emerald-600 block">₹{Math.round(r.soldValue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Edit Opening Stock Values */}
      {editingOpening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-900 text-sm">
                Original Bill Opening Stock Value (தொடக்க மதிப்பு)
              </h3>
              <button
                type="button"
                onClick={() => setEditingOpening(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              ஒவ்வொரு தானியத்திற்கும் Original Bill-க்கு எவ்வளவு தொடக்க மூட்டைகள் (Opening Bags) மற்றும் மொத்த மதிப்பு (₹) என்பதை இங்கு குறித்து வைக்கலாம்.
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => {
                const cur = tempOpening[item.id] || { bags: 0, value: 0 };
                return (
                  <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block font-semibold">Opening Bags:</label>
                        <input
                          type="number"
                          value={cur.bags}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const rate = Number(item.purchasePrice) || Math.round(Number(item.price) * 0.85);
                            setTempOpening((prev) => ({
                              ...prev,
                              [item.id]: {
                                bags: val,
                                value: val * rate,
                              },
                            }));
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block font-semibold">Total Value ₹:</label>
                        <input
                          type="number"
                          value={cur.value}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setTempOpening((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                value: val,
                              },
                            }));
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingOpening(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOpeningValues}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-blue-700"
              >
                Save Opening Values
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
