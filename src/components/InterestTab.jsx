import React, { useState, useMemo } from 'react';
import {
  Coins,
  Percent,
  Calendar,
  User,
  Phone,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Share2,
  X,
  CreditCard
} from 'lucide-react';
import { Storage } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';
import { openDirectWhatsApp } from '../services/shareService';

export default function InterestTab({ shop = {} }) {
  const [loans, setLoans] = useState(() => Storage.getInterestLoans());
  const [payments, setPayments] = useState(() => Storage.getInterestPayments());

  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [toast, setToast] = useState('');

  // Loan Form States
  const [lenderName, setLenderName] = useState('');
  const [lenderPhone, setLenderPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('1.5'); // e.g. 1.5% per month (ரூ 1.50 வட்டி)
  const [loanStartDate, setLoanStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loanNotes, setLoanNotes] = useState('');

  // Payment Form States
  const [paymentLoanId, setPaymentLoanId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [interestPaidAmount, setInterestPaidAmount] = useState('');
  const [principalPaidAmount, setPrincipalPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    let totalPrincipalBorrowed = 0;
    let totalMonthlyInterest = 0;

    loans.forEach((l) => {
      const p = Number(l.principalAmount) || 0;
      const rate = Number(l.interestRate) || 0;
      totalPrincipalBorrowed += p;
      totalMonthlyInterest += (p * rate) / 100;
    });

    const totalInterestPaid = payments.reduce(
      (sum, p) => sum + (Number(p.interestAmount) || 0),
      0
    );
    const totalPrincipalRepaid = payments.reduce(
      (sum, p) => sum + (Number(p.principalRepaid) || 0),
      0
    );

    const remainingPrincipal = Math.max(0, totalPrincipalBorrowed - totalPrincipalRepaid);

    return {
      totalPrincipalBorrowed,
      totalMonthlyInterest,
      totalInterestPaid,
      totalPrincipalRepaid,
      remainingPrincipal,
      activeLoansCount: loans.length,
    };
  }, [loans, payments]);

  // Handle Save New Loan
  const handleSaveLoan = (e) => {
    e.preventDefault();
    const numP = Number(principalAmount);
    const numRate = Number(interestRate);

    if (!lenderName.trim()) {
      showToast('Please enter Lender / Financier name!');
      return;
    }
    if (!numP || numP <= 0) {
      showToast('Please enter a valid loan amount!');
      return;
    }

    const newLoan = {
      id: `loan-${Date.now()}`,
      lenderName: lenderName.trim(),
      lenderPhone: lenderPhone.trim(),
      principalAmount: numP,
      interestRate: numRate,
      monthlyInterest: (numP * numRate) / 100,
      startDate: loanStartDate,
      notes: loanNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newLoan, ...loans];
    setLoans(updated);
    Storage.saveInterestLoans(updated);

    showToast('New loan / interest entry saved!');
    setLenderName('');
    setLenderPhone('');
    setPrincipalAmount('');
    setLoanNotes('');
    setIsAddingLoan(false);
  };

  // Handle Save Monthly Interest Payment
  const handleSavePayment = (e) => {
    e.preventDefault();
    if (!paymentLoanId) {
      showToast('Please select a loan!');
      return;
    }

    const numInterest = Number(interestPaidAmount) || 0;
    const numPrincipal = Number(principalPaidAmount) || 0;

    if (numInterest <= 0 && numPrincipal <= 0) {
      showToast('Please enter interest amount or principal repaid!');
      return;
    }

    const loanObj = loans.find((l) => l.id === paymentLoanId);

    const newPayment = {
      id: `inpay-${Date.now()}`,
      loanId: paymentLoanId,
      lenderName: loanObj?.lenderName || 'Financier',
      lenderPhone: loanObj?.lenderPhone || '',
      date: paymentDate,
      interestAmount: numInterest,
      principalRepaid: numPrincipal,
      paymentMode,
      notes: paymentNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    Storage.saveInterestPayments(updated);

    showToast('Interest payment saved successfully!');
    setInterestPaidAmount('');
    setPrincipalPaidAmount('');
    setPaymentNotes('');
    setIsAddingPayment(false);

    // Prompt to send WhatsApp confirmation to Financier
    if (loanObj?.lenderPhone) {
      const msg =
        `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 *INTEREST PAYMENT CONFIRMATION (வட்டி ரசீது)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Paid To: *${loanObj.lenderName}*\n` +
        `Date: ${formatDate(paymentDate)}\n` +
        (numInterest > 0 ? `• Interest Paid (வட்டி): *Rs. ${numInterest.toFixed(2)}*\n` : '') +
        (numPrincipal > 0 ? `• Principal Repaid (அசல்): *Rs. ${numPrincipal.toFixed(2)}*\n` : '') +
        `• Payment Mode: *${paymentMode}*\n` +
        (paymentNotes ? `• Notes: ${paymentNotes}\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Thank you!`;
      openDirectWhatsApp(loanObj.lenderPhone, msg);
    }
  };

  const handleDeleteLoan = (loanId) => {
    if (confirm('Are you sure you want to delete this loan record?')) {
      const updated = loans.filter((l) => l.id !== loanId);
      setLoans(updated);
      Storage.saveInterestLoans(updated);
      Storage.recordDeletedId(loanId);
      showToast('Loan record deleted');
    }
  };

  const handleDeletePayment = (paymentId) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      const updated = payments.filter((p) => p.id !== paymentId);
      setPayments(updated);
      Storage.saveInterestPayments(updated);
      Storage.recordDeletedId(paymentId);
      showToast('Payment record deleted');
    }
  };

  // WhatsApp Statement for a specific loan
  const handleShareLoanStatement = (loan) => {
    const loanPayments = payments.filter((p) => p.loanId === loan.id);
    const totalInt = loanPayments.reduce((s, p) => s + (Number(p.interestAmount) || 0), 0);
    const totalPrinRepaid = loanPayments.reduce((s, p) => s + (Number(p.principalRepaid) || 0), 0);
    const balPrincipal = Math.max(0, loan.principalAmount - totalPrinRepaid);

    const historyText = loanPayments
      .slice(0, 5)
      .map((p) => `• ${formatDate(p.date)}: Rs.${p.interestAmount} (${p.paymentMode})`)
      .join('\n');

    const msg =
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📊 *LOAN & INTEREST STATEMENT (வட்டி கணக்கு)*\n` +
      `Lender: *${loan.lenderName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• Initial Principal: *Rs. ${Number(loan.principalAmount).toFixed(2)}*\n` +
      `• Rate of Interest: *${loan.interestRate}% / month*\n` +
      `• Monthly Interest: *Rs. ${Number(loan.monthlyInterest).toFixed(2)}*\n` +
      `• Start Date: ${formatDate(loan.startDate)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• Total Interest Paid: *Rs. ${totalInt.toFixed(2)}*\n` +
      `• Total Principal Repaid: *Rs. ${totalPrinRepaid.toFixed(2)}*\n` +
      `• *Remaining Principal Due: Rs. ${balPrincipal.toFixed(2)}*\n` +
      (historyText ? `\nRecent Payments:\n${historyText}\n` : '') +
      `━━━━━━━━━━━━━━━━━━\n` +
      `KVK Thaniya Mandi, Chennimalai.`;

    if (loan.lenderPhone) {
      openDirectWhatsApp(loan.lenderPhone, msg);
    } else {
      alert('Financier phone number not found!');
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setIsAddingLoan(!isAddingLoan);
            setIsAddingPayment(false);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all ${
            isAddingLoan
              ? 'bg-slate-200 text-slate-700'
              : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
          }`}
        >
          {isAddingLoan ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAddingLoan ? 'Close' : '+ Add Loan (கடன் அசல்)'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsAddingPayment(!isAddingPayment);
            setIsAddingLoan(false);
          }}
          disabled={loans.length === 0}
          className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all ${
            isAddingPayment
              ? 'bg-slate-200 text-slate-700'
              : loans.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
          }`}
        >
          {isAddingPayment ? <X className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
          <span>{isAddingPayment ? 'Close' : 'Pay Interest (வட்டி செலுத்து)'}</span>
        </button>
      </div>

      {/* High Impact Summary Card */}
      <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-2.5">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Remaining Principal Due (மீதமுள்ள அசல் கடன்)
            </span>
            <div className="text-2xl font-black text-amber-300 mt-0.5">
              {formatCurrency(summary.remainingPrincipal)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Borrowed: {formatCurrency(summary.totalPrincipalBorrowed)} • {summary.activeLoansCount} Loans
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Interest
            </span>
            <div className="text-lg font-black text-red-400 mt-0.5">
              {formatCurrency(summary.totalMonthlyInterest)} / mo
            </div>
          </div>
        </div>

        {/* Total Interest Paid metric */}
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 font-bold block">இதுவரை செலுத்திய மொத்த வட்டி</span>
            <span className="text-[10px] text-slate-500">Total Interest Paid Till Date</span>
          </div>
          <div className="font-black text-base text-emerald-400">
            {formatCurrency(summary.totalInterestPaid)}
          </div>
        </div>
      </div>

      {/* 1. ADD LOAN FORM */}
      {isAddingLoan && (
        <form
          onSubmit={handleSaveLoan}
          className="bg-white rounded-2xl p-4 border-2 border-amber-400 shadow-md space-y-3 animate-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              Add Borrowed Money on Interest (வட்டி கடன்)
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Lender / Financier Name *
              </label>
              <input
                type="text"
                placeholder="எ.கா: கந்தசாமி பைனான்ஸ்"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Phone (WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="10 digit number"
                value={lenderPhone}
                onChange={(e) => setLenderPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Principal Amount (அசல் ₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={principalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-amber-300 focus:border-amber-600 rounded-xl text-base font-black text-slate-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Rate of Interest (% / mo) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="1.5"
                  value={interestRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                ரூ {interestRate || 0} வட்டி (100க்கு)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Borrowed Date (தேதி) *
              </label>
              <input
                type="date"
                value={loanStartDate}
                onChange={(e) => setLoanStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Monthly Interest (கணக்கீடு)
              </label>
              <div className="px-3 py-2 bg-amber-50 rounded-xl text-sm font-black text-amber-900 border border-amber-200">
                {formatCurrency(((Number(principalAmount) || 0) * (Number(interestRate) || 0)) / 100)} / mo
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Notes / Terms
            </label>
            <input
              type="text"
              placeholder="எ.கா: செக் கொடுத்து வாங்கியது"
              value={loanNotes}
              onChange={(e) => setLoanNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>SAVE LOAN (கடனை சேமி)</span>
          </button>
        </form>
      )}

      {/* 2. RECORD MONTHLY INTEREST PAYMENT FORM */}
      {isAddingPayment && (
        <form
          onSubmit={handleSavePayment}
          className="bg-white rounded-2xl p-4 border-2 border-emerald-400 shadow-md space-y-3 animate-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              Pay Monthly Interest (மாதாந்திர வட்டி செலுத்துதல்)
            </h4>
          </div>

          {/* Select Loan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Select Financier / Loan *
            </label>
            <select
              value={paymentLoanId}
              onChange={(e) => {
                const id = e.target.value;
                setPaymentLoanId(id);
                const found = loans.find((l) => l.id === id);
                if (found) {
                  setInterestPaidAmount(String(found.monthlyInterest));
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">-- Choose Lender ({loans.length}) --</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lenderName} • Principal: ₹{l.principalAmount} (Monthly Int: ₹{l.monthlyInterest})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Interest Amount Paid (வட்டி ₹) *
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={interestPaidAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInterestPaidAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-base font-black text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Principal Repaid (அசல் திருப்பி ₹)
              </label>
              <input
                type="number"
                placeholder="Optional"
                value={principalPaidAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPrincipalPaidAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>

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
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Notes (எ.கா: அக்டோபர் மாத வட்டி)
            </label>
            <input
              type="text"
              placeholder="எ.கா: October month vatti paid"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>SAVE & SEND TO FINANCIER (வட்டி பதிவு செய்)</span>
          </button>
        </form>
      )}

      {/* LOANS LIST (LENDERS CARDS) */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-amber-600" />
          Active Loans & Financiers ({loans.length})
        </h4>

        {loans.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">No interest loans recorded yet.</p>
            <button
              onClick={() => setIsAddingLoan(true)}
              className="mt-2 text-xs text-amber-600 font-bold underline"
            >
              + Click here to add your first loan
            </button>
          </div>
        ) : (
          loans.map((loan) => {
            const loanPayments = payments.filter((p) => p.loanId === loan.id);
            const totalInt = loanPayments.reduce((s, p) => s + (Number(p.interestAmount) || 0), 0);
            const totalPrinRepaid = loanPayments.reduce((s, p) => s + (Number(p.principalRepaid) || 0), 0);
            const balPrincipal = Math.max(0, loan.principalAmount - totalPrinRepaid);

            return (
              <div
                key={loan.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{loan.lenderName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {loan.lenderPhone || 'No Phone'} • From {formatDate(loan.startDate)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Balance Principal
                    </span>
                    <span className="font-black text-base text-amber-900">
                      {formatCurrency(balPrincipal)}
                    </span>
                  </div>
                </div>

                {/* Sub metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center text-xs border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Rate</span>
                    <span className="font-black text-slate-800">{loan.interestRate}% / mo</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Monthly Int</span>
                    <span className="font-black text-red-600">{formatCurrency(loan.monthlyInterest)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Total Paid</span>
                    <span className="font-black text-emerald-600">{formatCurrency(totalInt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    title="Delete Loan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentLoanId(loan.id);
                        setInterestPaidAmount(String(loan.monthlyInterest));
                        setIsAddingPayment(true);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200"
                    >
                      + Pay Interest
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareLoanStatement(loan)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Statement</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAST INTEREST PAYMENTS HISTORY */}
      {payments.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" />
            Recent Interest Payments History ({payments.length})
          </h4>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {payments.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{p.lenderName}</div>
                  <div className="text-[11px] text-slate-400">
                    {formatDate(p.date)} • {p.paymentMode} {p.notes ? `(${p.notes})` : ''}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="font-black text-emerald-600">{formatCurrency(p.interestAmount)}</div>
                    {p.principalRepaid > 0 && (
                      <span className="text-[10px] text-amber-700 font-bold block">
                        + Prin: ₹{p.principalRepaid}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="p-1 text-slate-300 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
