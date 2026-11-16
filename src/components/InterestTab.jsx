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
  CreditCard,
  RotateCcw,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { Storage } from '../services/storage';
import { formatCurrency, formatDate } from '../services/pdfService';
import { openDirectWhatsApp } from '../services/shareService';

/**
 * Calculates loan accrual, duration (days & months), total accumulated interest till date,
 * paid interest, pending interest, remaining principal, and settlement due.
 */
export const calculateLoanMetrics = (loan, loanPayments = []) => {
  const p = Number(loan.principalAmount) || 0;
  const rate = Number(loan.interestRate) || 0;
  const monthlyInt = Number(loan.monthlyInterest) || ((p * rate) / 100);

  const totalIntPaid = loanPayments.reduce(
    (sum, pmt) => sum + (Number(pmt.interestAmount) || 0),
    0
  );
  const totalPrinRepaid = loanPayments.reduce(
    (sum, pmt) => sum + (Number(pmt.principalRepaid) || 0),
    0
  );
  const balancePrincipal = Math.max(0, p - totalPrinRepaid);

  // Status check: either explicitly marked CLOSED or fully paid principal
  const isClosed = loan.status === 'CLOSED' || (balancePrincipal <= 0 && totalPrinRepaid > 0);

  // Time elapsed calculation
  const startDateStr = loan.startDate || (loan.createdAt ? loan.createdAt.split('T')[0] : '');
  let diffDays = 0;
  let elapsedMonths = '0.0';
  let totalAccruedInterest = 0;

  if (startDateStr) {
    const start = new Date(startDateStr);
    // If loan is closed and has closedAt date, calculate up to closedAt; otherwise up to today
    const endDate = isClosed && loan.closedAt ? new Date(loan.closedAt) : new Date();
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = Math.max(0, endMidnight.getTime() - startMidnight.getTime());
    diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Mandi standard convention: 30 days = 1 month
    elapsedMonths = (diffDays / 30).toFixed(1);
    totalAccruedInterest = Math.round((diffDays / 30) * monthlyInt);
  }

  const pendingInterest = Math.max(0, totalAccruedInterest - totalIntPaid);
  const totalSettlementDue = isClosed ? 0 : (balancePrincipal + pendingInterest);

  return {
    principalAmount: p,
    interestRate: rate,
    monthlyInterest: monthlyInt,
    diffDays,
    elapsedMonths,
    totalAccruedInterest,
    totalIntPaid,
    totalPrinRepaid,
    balancePrincipal: isClosed && balancePrincipal <= 0 ? 0 : balancePrincipal,
    pendingInterest,
    totalSettlementDue,
    isClosed,
  };
};

/**
 * Calculates due date details and triggers reminder 10 days before due date
 * ONLY when loan.remindMe is enabled (true).
 */
export const getLoanDueDetails = (loan, loanPayments = []) => {
  const p = Number(loan.principalAmount) || 0;
  const totalPrinRepaid = loanPayments.reduce(
    (sum, pmt) => sum + (Number(pmt.principalRepaid) || 0),
    0
  );
  const balancePrincipal = Math.max(0, p - totalPrinRepaid);
  const isClosed = loan.status === 'CLOSED' || (balancePrincipal <= 0 && totalPrinRepaid > 0);

  const remindMe = Boolean(loan.remindMe);

  if (isClosed) {
    return {
      remindMe,
      isClosed: true,
      isDueSoon: false,
      isOverdue: false,
      isDueToday: false,
      daysRemaining: 999,
      dueDay: loan.dueDay || 1,
      nextDueDate: '',
      nextDueDateFormatted: '',
      statusText: 'கடன் முடிந்தது (Closed)',
      monthlyInterest: 0,
      lenderName: loan.lenderName,
      lenderPhone: loan.lenderPhone,
      loanId: loan.id,
    };
  }

  // Monthly due day (defaults to the day in startDate or createdAt, or 1)
  let dueDay = Number(loan.dueDay);
  if (!dueDay || dueDay < 1 || dueDay > 31) {
    const sDate = loan.startDate || loan.createdAt;
    dueDay = sDate ? new Date(sDate).getDate() : 1;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayMidnight = new Date(currentYear, currentMonth, now.getDate());

  // Check if any payment was made in the current calendar month
  const thisMonthStart = new Date(currentYear, currentMonth, 1);
  const hasPaidThisMonth = loanPayments.some((pmt) => {
    if (!pmt.date) return false;
    const pDate = new Date(pmt.date);
    return (
      pDate >= thisMonthStart &&
      (Number(pmt.interestAmount) > 0 || Number(pmt.principalRepaid) > 0)
    );
  });

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (hasPaidThisMonth) {
    // Already paid for this month, next due date falls in next month
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const maxDay = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(dueDay, maxDay);
  const nextDueDateObj = new Date(targetYear, targetMonth, targetDay);

  const diffMs = nextDueDateObj.getTime() - todayMidnight.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = !hasPaidThisMonth && diffDays < 0;
  const isDueToday = !hasPaidThisMonth && diffDays === 0;

  // Crucial requirement: Remind 10 days before ONLY when Remind Me is given!
  const isDueSoon = remindMe && !isClosed && diffDays <= 10;

  const yyyy = targetYear;
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  const nextDueDateStr = `${yyyy}-${mm}-${dd}`;

  let statusText = '';
  if (isOverdue) {
    statusText = `${Math.abs(diffDays)} நாட்கள் தாமதம் (Overdue)`;
  } else if (isDueToday) {
    statusText = 'இன்று செலுத்த வேண்டும் (Due Today!)';
  } else if (diffDays <= 10) {
    statusText = `இன்னும் ${diffDays} நாட்களில் தவணை (Due in ${diffDays} days)`;
  } else {
    statusText = `அடுத்த தவணை: ${dd}/${mm}/${yyyy}`;
  }

  const monthlyInterest =
    Number(loan.monthlyInterest) ||
    ((p * (Number(loan.interestRate) || 0)) / 100);

  return {
    remindMe,
    isClosed: false,
    dueDay,
    nextDueDate: nextDueDateStr,
    nextDueDateFormatted: formatDate(nextDueDateStr),
    daysRemaining: diffDays,
    isDueSoon,
    isOverdue,
    isDueToday,
    hasPaidThisMonth,
    statusText,
    monthlyInterest,
    lenderName: loan.lenderName,
    lenderPhone: loan.lenderPhone,
    loanId: loan.id,
  };
};

export default function InterestTab({
  shop = {},
  loans: externalLoans,
  payments: externalPayments,
  onSaveLoan,
  onDeleteLoan,
  onSavePayment,
  onDeletePayment,
}) {
  const [internalLoans, setInternalLoans] = useState(() => Storage.getInterestLoans());
  const [internalPayments, setInternalPayments] = useState(() => Storage.getInterestPayments());
  const loans = externalLoans || internalLoans;
  const payments = externalPayments || internalPayments;

  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [toast, setToast] = useState('');
  const [loanFilter, setLoanFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'CLOSED'

  // Loan Form States
  const [lenderName, setLenderName] = useState('');
  const [lenderPhone, setLenderPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('1.5'); // e.g. 1.5% per month (ரூ 1.50 வட்டி)
  const [loanStartDate, setLoanStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loanDueDay, setLoanDueDay] = useState(() => new Date().getDate());
  const [loanRemindMe, setLoanRemindMe] = useState(true); // Remind option toggle (10 days before)
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

  // Summary Metrics across all loans
  const summary = useMemo(() => {
    let totalPrincipalBorrowed = 0;
    let totalMonthlyInterest = 0;
    let totalAccruedInterestAll = 0;
    let totalPendingInterestAll = 0;
    let activeLoansCount = 0;
    let closedLoansCount = 0;

    loans.forEach((l) => {
      const loanPmts = payments.filter((p) => p.loanId === l.id);
      const metrics = calculateLoanMetrics(l, loanPmts);

      totalPrincipalBorrowed += metrics.principalAmount;
      if (!metrics.isClosed) {
        totalMonthlyInterest += metrics.monthlyInterest;
        activeLoansCount++;
      } else {
        closedLoansCount++;
      }
      totalAccruedInterestAll += metrics.totalAccruedInterest;
      totalPendingInterestAll += metrics.pendingInterest;
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
      totalAccruedInterestAll,
      totalPendingInterestAll,
      activeLoansCount,
      closedLoansCount,
      totalLoansCount: loans.length,
    };
  }, [loans, payments]);

  // Upcoming due loans within 10 days (ONLY if remindMe option is enabled)
  const dueSoonLoans = useMemo(() => {
    return loans
      .map((l) => {
        const loanPmts = payments.filter((p) => p.loanId === l.id);
        const dueInfo = getLoanDueDetails(l, loanPmts);
        return { loan: l, ...dueInfo };
      })
      .filter((item) => item.isDueSoon)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
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

    const defaultDay = loanStartDate ? new Date(loanStartDate).getDate() : 1;
    const finalDueDay = Number(loanDueDay) >= 1 && Number(loanDueDay) <= 31 ? Number(loanDueDay) : defaultDay;

    const newLoan = {
      id: `loan-${Date.now()}`,
      lenderName: lenderName.trim(),
      lenderPhone: lenderPhone.trim(),
      principalAmount: numP,
      interestRate: numRate,
      monthlyInterest: (numP * numRate) / 100,
      startDate: loanStartDate,
      dueDay: finalDueDay,
      remindMe: Boolean(loanRemindMe), // 10 days before reminder enabled/disabled
      status: 'ACTIVE',
      notes: loanNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (onSaveLoan) {
      onSaveLoan(newLoan);
    } else {
      const updated = [newLoan, ...loans];
      setInternalLoans(updated);
      Storage.saveInterestLoans(updated);
    }

    showToast(
      loanRemindMe
        ? 'New loan saved with 10-day reminder enabled!'
        : 'New loan saved successfully!'
    );
    setLenderName('');
    setLenderPhone('');
    setPrincipalAmount('');
    setLoanNotes('');
    setIsAddingLoan(false);
  };

  // Toggle Remind Me Option directly on a loan card
  const handleToggleRemindMe = (loan) => {
    const nextRemind = !loan.remindMe;
    const updatedLoan = {
      ...loan,
      remindMe: nextRemind,
    };

    if (onSaveLoan) {
      onSaveLoan(updatedLoan);
    } else {
      const updated = loans.map((l) => (l.id === loan.id ? updatedLoan : l));
      setInternalLoans(updated);
      Storage.saveInterestLoans(updated);
    }

    showToast(
      nextRemind
        ? '🔔 10 நாட்களுக்கு முன் நினைவூட்டல் இயக்கப்பட்டது (Reminder ON)'
        : '🔕 நினைவூட்டல் நிறுத்தப்பட்டது (Reminder OFF)'
    );
  };

  // Toggle Loan Status: ACTIVE <-> CLOSED
  const handleToggleLoanStatus = (loan) => {
    const loanPmts = payments.filter((p) => p.loanId === loan.id);
    const metrics = calculateLoanMetrics(loan, loanPmts);
    const willClose = !metrics.isClosed;

    const updatedLoan = {
      ...loan,
      status: willClose ? 'CLOSED' : 'ACTIVE',
      closedAt: willClose ? new Date().toISOString() : null,
    };

    if (onSaveLoan) {
      onSaveLoan(updatedLoan);
    } else {
      const updated = loans.map((l) => (l.id === loan.id ? updatedLoan : l));
      setInternalLoans(updated);
      Storage.saveInterestLoans(updated);
    }

    showToast(
      willClose
        ? '✓ கடன் முடிந்தது என குறிக்கப்பட்டது (Loan Marked CLOSED)'
        : '↺ கடன் மீண்டும் நடைமுறைக்கு மாற்றப்பட்டது (Loan Reopened)'
    );
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

    if (onSavePayment) {
      onSavePayment(newPayment);
    } else {
      const updated = [newPayment, ...payments];
      setInternalPayments(updated);
      Storage.saveInterestPayments(updated);
    }

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
      if (onDeleteLoan) {
        onDeleteLoan(loanId);
      } else {
        const updated = loans.filter((l) => l.id !== loanId);
        setInternalLoans(updated);
        Storage.saveInterestLoans(updated);
        Storage.recordDeletedId(loanId);
      }
      showToast('Loan record deleted');
    }
  };

  const handleDeletePayment = (paymentId) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      if (onDeletePayment) {
        onDeletePayment(paymentId);
      } else {
        const updated = payments.filter((p) => p.id !== paymentId);
        setInternalPayments(updated);
        Storage.saveInterestPayments(updated);
        Storage.recordDeletedId(paymentId);
      }
      showToast('Payment record deleted');
    }
  };

  // WhatsApp Statement for a specific loan
  const handleShareLoanStatement = (loan) => {
    const loanPayments = payments.filter((p) => p.loanId === loan.id);
    const metrics = calculateLoanMetrics(loan, loanPayments);
    const dueInfo = getLoanDueDetails(loan, loanPayments);

    const historyText = loanPayments
      .slice(0, 5)
      .map((p) => `• ${formatDate(p.date)}: Rs.${p.interestAmount} (${p.paymentMode})`)
      .join('\n');

    const msg =
      `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📊 *LOAN & INTEREST STATEMENT (வட்டி கணக்கு)*\n` +
      `Lender: *${loan.lenderName}*\n` +
      `Status: *${metrics.isClosed ? '✓ CLOSED / கடன் முடிந்தது' : 'ACTIVE / நடைமுறையில்'}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• Borrowed Date (தொடக்க தேதி): *${formatDate(loan.startDate)}*\n` +
      `• Loan Duration (காலம்): *${metrics.diffDays} நாட்கள் (${metrics.elapsedMonths} மாதங்கள்)*\n` +
      `• Monthly Due Day (தவணை தேதி): *ஒவ்வொரு மாதமும் ${dueInfo.dueDay}ம் தேதி*\n` +
      `• Initial Principal (அசல்): *Rs. ${metrics.principalAmount.toFixed(2)}*\n` +
      `• Rate of Interest: *${loan.interestRate}% / month*\n` +
      `• Monthly Interest: *Rs. ${metrics.monthlyInterest.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• Total Accrued Interest Till Date (இதுவரை மொத்த வட்டி): *Rs. ${metrics.totalAccruedInterest.toFixed(2)}*\n` +
      `• Total Interest Paid (செலுத்திய வட்டி): *Rs. ${metrics.totalIntPaid.toFixed(2)}*\n` +
      `• Pending Interest (பாக்கி வட்டி): *Rs. ${metrics.pendingInterest.toFixed(2)}*\n` +
      `• Balance Principal (மீதமுள்ள அசல்): *Rs. ${metrics.balancePrincipal.toFixed(2)}*\n` +
      (!metrics.isClosed
        ? `━━━━━━━━━━━━━━━━━━\n` +
          `👉 *TOTAL SETTLEMENT DUE (கடன் தீர்வு தொகை): Rs. ${metrics.totalSettlementDue.toFixed(2)}*\n`
        : `━━━━━━━━━━━━━━━━━━\n` +
          `✓ *கடன் முழுவதும் தீர்க்கப்பட்டு முடிந்தது.*\n`) +
      (historyText ? `\nRecent Payments:\n${historyText}\n` : '') +
      `━━━━━━━━━━━━━━━━━━\n` +
      `KVK Thaniya Mandi, Chennimalai.`;

    if (loan.lenderPhone) {
      openDirectWhatsApp(loan.lenderPhone, msg);
    } else {
      alert('Financier phone number not found!');
    }
  };

  // Filtered loans based on tab
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const loanPmts = payments.filter((p) => p.loanId === loan.id);
      const metrics = calculateLoanMetrics(loan, loanPmts);
      if (loanFilter === 'ACTIVE') return !metrics.isClosed;
      if (loanFilter === 'CLOSED') return metrics.isClosed;
      return true;
    });
  }, [loans, payments, loanFilter]);

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 🔔 10-DAY BEFORE DUE DATE REMINDERS BANNER (Front of Interest Tab) */}
      {dueSoonLoans.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/20 to-amber-500/15 border-2 border-rose-400 rounded-2xl p-3.5 shadow-xs space-y-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-rose-950 text-xs">
              <span className="p-1 bg-rose-600 text-white rounded-lg text-xs animate-bounce shadow-2xs">
                🔔
              </span>
              <div>
                <span className="block font-black text-rose-950">
                  வரவிருக்கும் வட்டி தவணைகள் (அடுத்த 10 நாட்களுக்குள்)
                </span>
                <span className="text-[10px] text-rose-700 font-medium">
                  10-Day Due Reminder (Remind Me Active)
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs">
              {dueSoonLoans.length} Loans Due
            </span>
          </div>

          <div className="space-y-1.5">
            {dueSoonLoans.map((item) => (
              <div
                key={item.loanId}
                className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between text-xs shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-black text-slate-900 truncate">{item.lenderName}</div>
                  <div className="text-[11px] font-black text-rose-700 flex items-center gap-1 mt-0.5 flex-wrap">
                    <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>{item.statusText}</span>
                    <span className="text-slate-400 font-normal">({item.nextDueDateFormatted})</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">வட்டி</span>
                    <span className="font-black text-rose-700 text-xs sm:text-sm">
                      {formatCurrency(item.monthlyInterest)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentLoanId(item.loanId);
                      setInterestPaidAmount(String(item.monthlyInterest));
                      setIsAddingPayment(true);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-2xs active:scale-95 transition-all"
                  >
                    + Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              Borrowed: {formatCurrency(summary.totalPrincipalBorrowed)} • {summary.activeLoansCount} Active ({summary.closedLoansCount} Closed)
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Active Interest
            </span>
            <div className="text-lg font-black text-red-400 mt-0.5">
              {formatCurrency(summary.totalMonthlyInterest)} / mo
            </div>
          </div>
        </div>

        {/* Accrued Interest Till Date & Total Paid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold block">இதுவரை ஆகியுள்ள மொத்த வட்டி</span>
            <div className="font-black text-sm text-amber-300 mt-0.5">
              {formatCurrency(summary.totalAccruedInterestAll)}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold block">இதுவரை செலுத்திய வட்டி</span>
            <div className="font-black text-sm text-emerald-400 mt-0.5">
              {formatCurrency(summary.totalInterestPaid)}
            </div>
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
                onChange={(e) => {
                  const val = e.target.value;
                  setLoanStartDate(val);
                  if (val) {
                    setLoanDueDay(new Date(val).getDate());
                  }
                }}
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

          {/* 🔔 10-DAY REMINDER OPTION (Requested by User) */}
          <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loanRemindMe}
                  onChange={(e) => setLoanRemindMe(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span>🔔 10 நாட்களுக்கு முன் நினைவூட்டு (Remind Me 10 Days Before)</span>
              </label>
            </div>

            {loanRemindMe && (
              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60 text-xs">
                <span className="text-[11px] font-bold text-amber-900">
                  மாத தவணை தேதி (Monthly Due Day):
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={loanDueDay}
                    onChange={(e) => setLoanDueDay(e.target.value)}
                    className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-center font-black text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[11px] font-bold text-slate-500">ம் தேதி</span>
                </div>
              </div>
            )}
            <p className="text-[10px] text-amber-800/80 leading-tight">
              {loanRemindMe
                ? `ஒவ்வொரு மாதமும் ${loanDueDay}ம் தேதிக்கு 10 நாட்களுக்கு முன் தானாக நினைவூட்டும்.`
                : 'நினைவூட்டல் ஆஃப் செய்யப்பட்டுள்ளது. (Remind Me off)'}
            </p>
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
              {loans.map((l) => {
                const loanPmts = payments.filter((p) => p.loanId === l.id);
                const m = calculateLoanMetrics(l, loanPmts);
                return (
                  <option key={l.id} value={l.id}>
                    {m.isClosed ? '✓ [முடிந்தது] ' : ''}{l.lenderName} • Principal: ₹{l.principalAmount} (Monthly: ₹{l.monthlyInterest})
                  </option>
                );
              })}
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
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-600" />
            Financiers & Loans ({loans.length})
          </h4>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setLoanFilter('ALL')}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              loanFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            அனைத்தும் ({loans.length})
          </button>
          <button
            type="button"
            onClick={() => setLoanFilter('ACTIVE')}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              loanFilter === 'ACTIVE'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            நடைமுறையில் ({summary.activeLoansCount})
          </button>
          <button
            type="button"
            onClick={() => setLoanFilter('CLOSED')}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              loanFilter === 'CLOSED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            முடிந்தது ({summary.closedLoansCount})
          </button>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">
              {loanFilter === 'CLOSED'
                ? 'முடிந்த கடன்கள் எதுவும் இல்லை (No closed loans).'
                : loanFilter === 'ACTIVE'
                ? 'நடைமுறையில் கடன்கள் இல்லை (No active loans).'
                : 'No interest loans recorded yet.'}
            </p>
            {loans.length === 0 && (
              <button
                onClick={() => setIsAddingLoan(true)}
                className="mt-2 text-xs text-amber-600 font-bold underline"
              >
                + Click here to add your first loan
              </button>
            )}
          </div>
        ) : (
          filteredLoans.map((loan) => {
            const loanPayments = payments.filter((p) => p.loanId === loan.id);
            const metrics = calculateLoanMetrics(loan, loanPayments);
            const dueInfo = getLoanDueDetails(loan, loanPayments);

            return (
              <div
                key={loan.id}
                className={`rounded-2xl p-3.5 border shadow-2xs space-y-3 transition-all ${
                  metrics.isClosed
                    ? 'bg-slate-50 border-emerald-300 opacity-95'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-base">{loan.lenderName}</span>
                      {metrics.isClosed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                          <CheckCircle className="w-3 h-3" />
                          CLOSED / கடன் முடிந்தது
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ACTIVE / நடைமுறையில்
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {loan.lenderPhone || 'No Phone'} • From {formatDate(loan.startDate)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {metrics.isClosed ? 'Status' : 'Balance Principal'}
                    </span>
                    <span
                      className={`font-black text-base ${
                        metrics.isClosed ? 'text-emerald-700' : 'text-amber-900'
                      }`}
                    >
                      {metrics.isClosed ? 'முடிந்தது' : formatCurrency(metrics.balancePrincipal)}
                    </span>
                  </div>
                </div>

                {/* 🔔 DUE DATE & 10-DAY REMINDER ROW */}
                {!metrics.isClosed && (
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-bold">மாத தவணை:</span>
                      <span className="font-black text-slate-800">{dueInfo.dueDay}ம் தேதி</span>

                      {loan.remindMe ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            dueInfo.isDueSoon
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          <Bell className="w-3 h-3 shrink-0" />
                          <span>{dueInfo.statusText}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          (நினைவூட்டல் ஆஃப்)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRemindMe(loan)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 ${
                        loan.remindMe
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                      }`}
                      title="10 நாட்களுக்கு முன் நினைவூட்டு"
                    >
                      <Bell className="w-3 h-3" />
                      <span>{loan.remindMe ? '🔔 Remind Me: ON' : '🔕 Remind Me: OFF'}</span>
                    </button>
                  </div>
                )}

                {/* ACCUMULATED INTEREST & DURATION SUMMARY BOX */}
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    metrics.isClosed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                    <div className="flex items-center gap-1 font-black text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>காலம் (Duration):</span>
                      <span className="text-amber-900 ml-1 font-black">
                        {metrics.diffDays} நாட்கள் ({metrics.elapsedMonths} மாதங்கள்)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold">வட்டி: </span>
                      <span className="font-bold text-slate-700">ரூ {loan.interestRate} (100க்கு)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/90 p-2 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-slate-500 font-bold block">
                        மாத வட்டி (Monthly EMI)
                      </span>
                      <span className="font-black text-sm text-red-600">
                        {formatCurrency(metrics.monthlyInterest)}
                      </span>
                    </div>

                    <div className="bg-white/90 p-2 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-800 font-bold block">
                        இப்போது வரை ஆகியுள்ள வட்டி
                      </span>
                      <span className="font-black text-sm text-amber-900">
                        {formatCurrency(metrics.totalAccruedInterest)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/50 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-semibold">செலுத்திய வட்டி: </span>
                      <span className="font-black text-emerald-700">
                        {formatCurrency(metrics.totalIntPaid)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-semibold">பாக்கி வட்டி: </span>
                      <span className="font-black text-red-600">
                        {formatCurrency(metrics.pendingInterest)}
                      </span>
                    </div>
                  </div>

                  {!metrics.isClosed && (
                    <div className="bg-amber-900 text-amber-100 p-2 rounded-lg flex items-center justify-between font-black text-xs">
                      <span>கடன் முடிக்க மொத்த தீர்வு தொகை (Total Due):</span>
                      <span className="text-sm text-amber-300">
                        {formatCurrency(metrics.totalSettlementDue)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    title="Delete Loan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Toggle Closed / Reopen Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleLoanStatus(loan)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                        metrics.isClosed
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {metrics.isClosed ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Loan</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>கடன் முடிந்தது (Close)</span>
                        </>
                      )}
                    </button>

                    {!metrics.isClosed && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentLoanId(loan.id);
                          setInterestPaidAmount(String(loan.monthlyInterest));
                          setIsAddingPayment(true);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-2xs"
                      >
                        + Pay Interest
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleShareLoanStatement(loan)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
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
