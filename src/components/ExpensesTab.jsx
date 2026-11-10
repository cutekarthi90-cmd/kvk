import React, { useState, useMemo } from 'react';
import {
  Fuel,
  Truck,
  Building,
  Zap,
  Coffee,
  Wrench,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Share2,
  Search,
  CheckCircle,
  X
} from 'lucide-react';
import { Storage, getFinancialYear } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';
import { openDirectWhatsApp } from '../services/shareService';

const EXPENSE_CATEGORIES = [
  { id: 'diesel', label: 'டீசல் (Diesel)', icon: Fuel, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'kooli', label: 'கூலி / லாரி வாடகை (Kooli / Hamali)', icon: Truck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'rent', label: 'மண்டி வாடகை (Mandi Rent)', icon: Building, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'eb', label: 'மின்சாரம் / EB Bill', icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'tea', label: 'டீ & சில்லறை செலவு (Tea / Kharcha)', icon: Coffee, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'others', label: 'இதர செலவு (Maintenance / Other)', icon: Wrench, color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

export default function ExpensesTab({
  shop = {},
  expenses: externalExpenses,
  onSaveExpense,
  onDeleteExpense,
}) {
  const [internalExpenses, setInternalExpenses] = useState(() => Storage.getExpenses());
  const expenses = externalExpenses || internalExpenses;
  const [isAdding, setIsAdding] = useState(false);
  const [filterFY, setFilterFY] = useState(() => getFinancialYear());
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('diesel');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const currentFY = getFinancialYear();

  // All financial years present in expenses
  const availableFYs = useMemo(() => {
    const set = new Set([currentFY]);
    expenses.forEach((e) => {
      if (e.date) set.add(getFinancialYear(e.date));
    });
    return Array.from(set).sort().reverse();
  }, [expenses, currentFY]);

  // Filtered by FY and Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchFY = !filterFY || getFinancialYear(e.date) === filterFY;
      if (!matchFY) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
      );
    });
  }, [expenses, filterFY, search]);

  // Strictly DESCENDING order (newest first)
  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredExpenses]);

  // Analytics for the selected FY
  const yearlySummary = useMemo(() => {
    const fyList = expenses.filter((e) => getFinancialYear(e.date) === (filterFY || currentFY));
    const totalAmount = fyList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const categoryMap = {};
    EXPENSE_CATEGORIES.forEach((c) => {
      categoryMap[c.id] = 0;
    });

    fyList.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + (Number(e.amount) || 0);
    });

    // Current Month Total
    const thisMonthStr = new Date().toISOString().substring(0, 7);
    const thisMonthTotal = expenses
      .filter((e) => (e.date || '').startsWith(thisMonthStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      totalAmount,
      count: fyList.length,
      categoryMap,
      thisMonthTotal,
    };
  }, [expenses, filterFY, currentFY]);

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      showToast('Please enter a valid amount!');
      return;
    }

    const newExp = {
      id: `exp-${Date.now()}`,
      date,
      category,
      amount: numAmt,
      paidTo: paidTo.trim(),
      paymentMode,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (onSaveExpense) {
      onSaveExpense(newExp);
    } else {
      const updated = [newExp, ...expenses];
      setInternalExpenses(updated);
      Storage.saveExpenses(updated);
    }

    showToast('Expense recorded successfully!');
    setAmount('');
    setPaidTo('');
    setNotes('');
    setIsAdding(false);
  };

  const handleDeleteExpense = (id) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      if (onDeleteExpense) {
        onDeleteExpense(id);
      } else {
        const updated = expenses.filter((e) => e.id !== id);
        setInternalExpenses(updated);
        Storage.saveExpenses(updated);
        Storage.recordDeletedId(id);
      }
      showToast('Expense deleted');
    }
  };

  // Export Expenses to Excel CSV
  const handleExportExcel = () => {
    const rows = [
      [`"${shop.name || 'KVK THANIYA MANDI'} - EXPENSES REPORT (FY ${filterFY || currentFY})"`],
      [`"Generated on: ${new Date().toLocaleDateString('en-IN')}"`],
      [],
      ['"S.No"', '"Date"', '"Category"', '"Paid To / Vehicle"', '"Amount (Rs.)"', '"Payment Mode"', '"Notes"'],
    ];

    sortedExpenses.forEach((e, idx) => {
      const catObj = EXPENSE_CATEGORIES.find((c) => c.id === e.category);
      rows.push([
        idx + 1,
        `"${e.date}"`,
        `"${catObj ? catObj.label : e.category}"`,
        `"${(e.paidTo || '').replace(/"/g, '""')}"`,
        Number(e.amount).toFixed(2),
        `"${e.paymentMode}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ]);
    });

    rows.push([]);
    rows.push(['""', '""', '""', '"YEARLY TOTAL EXPENSE"', yearlySummary.totalAmount.toFixed(2), '""', '""']);

    const csvContent = rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KVK_Expenses_${filterFY || currentFY}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Expenses Excel CSV downloaded!');
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500">FY:</span>
          <select
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none"
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
          onClick={() => setIsAdding(!isAdding)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all ${
            isAdding
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
          }`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Close Form' : '+ Add Expense (செலவு)'}</span>
        </button>
      </div>

      {/* Yearly & Monthly Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Yearly Total Expense (வருடாந்திர மொத்த செலவு)
            </span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {formatCurrency(yearlySummary.totalAmount)}
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              FY {filterFY || currentFY} • {yearlySummary.count} Entries
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              This Month
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              {formatCurrency(yearlySummary.thisMonthTotal)}
            </div>
          </div>
        </div>

        {/* Category Breakdown (Diesel, Kooli, Rent...) */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <div className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1">
              <Fuel className="w-3.5 h-3.5" />
              டீசல்
            </div>
            <div className="font-black text-sm text-white mt-0.5">
              {formatCurrency(yearlySummary.categoryMap['diesel'] || 0)}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <div className="text-xs text-blue-300 font-bold flex items-center justify-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              கூலி
            </div>
            <div className="font-black text-sm text-white mt-0.5">
              {formatCurrency(yearlySummary.categoryMap['kooli'] || 0)}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <div className="text-xs text-emerald-300 font-bold flex items-center justify-center gap-1">
              <Building className="w-3.5 h-3.5" />
              வாடகை/இதர
            </div>
            <div className="font-black text-sm text-white mt-0.5">
              {formatCurrency(
                (yearlySummary.categoryMap['rent'] || 0) +
                (yearlySummary.categoryMap['eb'] || 0) +
                (yearlySummary.categoryMap['tea'] || 0) +
                (yearlySummary.categoryMap['others'] || 0)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADD EXPENSE FORM */}
      {isAdding && (
        <form
          onSubmit={handleSaveExpense}
          className="bg-white rounded-2xl p-4 border-2 border-emerald-400 shadow-md space-y-3 animate-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              Record New Mandi Expense
            </h4>
            <span className="text-[11px] text-slate-500 font-bold">FY {getFinancialYear(date)}</span>
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Expense Category (செலவு வகை) *
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isSel = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                      isSel
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Amount (தொகை ₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-base font-black text-slate-900 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Date (தேதி) *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Paid To / Vehicle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Paid To / Vehicle No (யாருக்கு / வண்டி எண்)
            </label>
            <input
              type="text"
              placeholder="எ.கா: லாரி TN 33 AB 1234, டிரைவர் குமார்"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Payment Mode & Notes */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="Cash">Cash (ரொக்கம்)</option>
                <option value="GPay / PhonePe">GPay / PhonePe (UPI)</option>
                <option value="Bank Transfer">Bank Transfer (வங்கி)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Notes (குறிப்பு)
              </label>
              <input
                type="text"
                placeholder="எ.கா: டீசல் 50 லிட்டர்"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>SAVE EXPENSE (செலவை சேமி)</span>
          </button>
        </form>
      )}

      {/* Past Expenses List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
            title="Download Excel CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>

        {sortedExpenses.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <Fuel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">
              {search ? 'Matching expenses illa.' : `FY ${filterFY} la expenses ethuvum illa.`}
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 text-xs text-emerald-600 font-bold underline"
            >
              + Click here to add your first expense
            </button>
          </div>
        ) : (
          sortedExpenses.map((exp) => {
            const catObj = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
            const Icon = catObj?.icon || Wrench;

            return (
              <div
                key={exp.id}
                className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catObj?.color || 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">
                      {catObj?.label.split(' ')[0] || exp.category}
                      {exp.paidTo && <span className="font-normal text-xs text-slate-500 ml-1.5">• {exp.paidTo}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                      <span>{formatDate(exp.date)}</span>
                      <span>•</span>
                      <span>{exp.paymentMode}</span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px] text-slate-600 font-semibold">{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="font-black text-slate-900 text-base">
                      {formatCurrency(exp.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {getFinancialYear(exp.date)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
