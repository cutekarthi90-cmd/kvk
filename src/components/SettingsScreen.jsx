import React, { useState } from 'react';
import {
  Store,
  Save,
  Download,
  Upload,
  RotateCcw,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Radio,
  RefreshCw,
  Cloud,
  Check,
  FileSpreadsheet,
  Share2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { Storage, getFinancialYear } from '../services/storage';
import { getServerUrl, setServerUrl, SyncService } from '../services/syncService';
import { getSavedFirebaseConfig, saveFirebaseConfig, initFirebase } from '../services/firebaseService';
import {
  getAvailableMonths,
  getMonthlyGSTData,
  exportMonthlyGSTExcel,
  getAuditorWhatsAppText
} from '../services/gstReportService';
import { openDirectWhatsApp } from '../services/shareService';
import { formatCurrency } from '../services/pdfService';

export default function SettingsScreen({ shop, onSaveShop, onReloadAll, syncStatus }) {
  const [form, setForm] = useState({ ...shop });
  const [serverUrlInput, setServerUrlInput] = useState(() => getServerUrl());
  const [fbConfigInput, setFbConfigInput] = useState(() => {
    const saved = getSavedFirebaseConfig();
    return saved ? JSON.stringify(saved, null, 2) : '';
  });
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const sales = Storage.getSales();
  const purchases = Storage.getPurchases();
  const availableMonths = getAvailableMonths(sales, purchases);
  const [selectedMonth, setSelectedMonth] = useState(() => availableMonths[0] || '2026-10');
  const [auditorPhone, setAuditorPhone] = useState('9443995160');

  const gstData = getMonthlyGSTData(selectedMonth, sales, purchases);

  const handleDownloadGSTExcel = () => {
    exportMonthlyGSTExcel(gstData, shop);
    showToast(`Monthly GST Excel for ${gstData.monthLabel} downloaded!`);
  };

  const handleShareAuditorWhatsApp = () => {
    const text = getAuditorWhatsAppText(gstData, shop);
    exportMonthlyGSTExcel(gstData, shop);
    openDirectWhatsApp(auditorPhone, text);
    showToast('Opening WhatsApp to send GST Report to Auditor...');
  };

  const currentFY = getFinancialYear();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveShop(form);
    showToast('Shop details updated successfully!');
  };

  const handleSaveServerUrl = () => {
    setServerUrl(serverUrlInput.trim());
    SyncService.connect();
    showToast('Sync Server URL updated & reconnecting...');
  };

  const handleSaveFirebase = () => {
    try {
      if (!fbConfigInput.trim()) {
        saveFirebaseConfig(null);
        showToast('Firebase Cloud Sync disabled');
        return;
      }
      const parsed = JSON.parse(fbConfigInput);
      saveFirebaseConfig(parsed);
      initFirebase(parsed);
      showToast('Firebase Cloud Sync configured successfully!');
      onReloadAll();
    } catch {
      alert('Invalid JSON! Please paste valid Firebase config object.');
    }
  };

  const handleExportBackup = () => {
    const jsonStr = Storage.exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KVK_ThaniyaMandi_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup downloaded successfully!');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      const success = Storage.restoreBackupData(content);
      if (success) {
        showToast('Backup restored successfully!');
        onReloadAll();
      } else {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data to default? This will clear all bills and receipts.')) {
      Storage.resetToDefault();
      onReloadAll();
      showToast('Data reset to defaults.');
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto p-3 space-y-4">
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* AUDITOR OFFICE GST MONTHLY REPORT GENERATOR (Requested by user) */}
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3.5 border border-emerald-700/50">
        <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-black text-sm">Auditor Office GST Report</h3>
              <p className="text-[11px] text-emerald-200">
                Monthly Excel (.csv) format for Auditor GSTR filing
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
            EXCEL / GST
          </span>
        </div>

        {/* Month Picker */}
        <div className="flex items-center justify-between gap-2 bg-white/10 p-2.5 rounded-xl">
          <label className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Select Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-emerald-400/50 rounded-lg px-2.5 py-1 text-xs font-black text-white focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Monthly Summary Figures */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-blue-300 font-bold uppercase block">
              1. Sales (Outward)
            </span>
            <div className="font-black text-sm text-white mt-0.5">
              {formatCurrency(gstData.totalSalesAmount)}
            </div>
            <span className="text-[10px] text-slate-400">
              {gstData.sales.length} Bills • {gstData.totalSalesBags} Bags
            </span>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
            <span className="text-[10px] text-emerald-300 font-bold uppercase block">
              2. GST Purchases
            </span>
            <div className="font-black text-sm text-white mt-0.5">
              {formatCurrency(gstData.totalGstPurchaseAmount)}
            </div>
            <span className="text-[10px] text-slate-400">
              {gstData.gstPurchases.length} Bills • {gstData.totalGstPurchaseBags} Bags
            </span>
          </div>
        </div>

        {/* Notice of Q Purchases Excluded */}
        <div className="p-2 bg-purple-950/70 rounded-xl border border-purple-600/40 text-[11px] flex items-center justify-between text-purple-200">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Q-Purchases Excluded from Auditor:</span>
          </div>
          <span className="font-black text-purple-300">
            {gstData.excludedQPurchases.length} Bills ({formatCurrency(gstData.totalQPurchaseAmount)})
          </span>
        </div>

        {/* Action Buttons: Download Excel & Share to Auditor on WhatsApp */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadGSTExcel}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={handleShareAuditorWhatsApp}
            className="py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Auditor</span>
          </button>
        </div>
      </div>

      {/* FINANCIAL YEAR AUTO-RESTART CARD (Requested by user) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-slate-800 uppercase">
              Financial Year System (வருடாந்திர கணக்கு)
            </h4>
          </div>
          <span className="text-xs font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
            FY {currentFY}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Indian Mandi Financial Year (April 1 to March 31) automatic-a calculate aagum. Oru Financial Year mudinju adutha year (April 1st) aarambikkum pothu, <strong>Bill No. தானாக 1-il irunthu marupadiyum thodangum.</strong>
        </p>
      </div>

      {/* MULTI-DEVICE 4-5 PHONES LIVE SYNC SECTION */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm">4 to 5 Mobiles Real-Time Sync</h3>
              <p className="text-[11px] text-blue-200">
                Any bill/receipt entered on one phone updates instantly on all other phones!
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
              syncStatus === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
            }`}
          >
            {syncStatus === 'connected' ? '● LIVE' : '◌ CONNECTING'}
          </span>
        </div>

        {/* Server URL Input */}
        <div className="space-y-1 bg-white/10 p-3 rounded-lg backdrop-blur-xs">
          <label className="block text-[11px] font-semibold text-blue-200 uppercase">
            Central Sync Server URL (Wi-Fi / Cloud)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrlInput}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="http://192.168.1.23:5000"
              className="flex-1 px-2.5 py-1.5 bg-slate-900/60 border border-blue-300/30 rounded text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveServerUrl}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync
            </button>
          </div>
          <p className="text-[10px] text-blue-200/70">
            Ella 4-5 phones-layum indha URL set aagi irukkum. Oru phone-la bill pota automatic-ah matha phones-ku update pogum!
          </p>
        </div>

        {/* Cloud Firebase Option Collapsible / Toggle */}
        <details className="text-xs text-blue-200">
          <summary className="cursor-pointer font-semibold flex items-center gap-1.5 hover:text-white">
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Cloud Database (Firebase) - Internet 4G/5G Sync Option</span>
          </summary>
          <div className="mt-2 p-2.5 bg-slate-900/70 rounded-lg space-y-2">
            <p className="text-[10px] text-slate-300">
              Veliya irundhalum 4G internet-la sync aaganumna, Firebase Console-la irundhu config JSON-ah inge paste pannalam:
            </p>
            <textarea
              rows={4}
              value={fbConfigInput}
              onChange={(e) => setFbConfigInput(e.target.value)}
              placeholder='{ "apiKey": "...", "projectId": "..." }'
              className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-[11px] font-mono text-emerald-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveFirebase}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Save Firebase Cloud Config
            </button>
          </div>
        </details>
      </div>

      {/* Shop Information Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Shop / Business Profile</h2>
            <p className="text-[11px] text-slate-400">These details will be printed on all PDF bills & receipts.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Shop / Business Name *
          </label>
          <input
            type="text"
            name="name"
            value={form.name || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Proprietor / Owner
            </label>
            <input
              type="text"
              name="proprietor"
              value={form.proprietor || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Shop Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Shop Address / Location
          </label>
          <input
            type="text"
            name="address"
            value={form.address || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              name="gstin"
              value={form.gstin || ''}
              onChange={handleChange}
              placeholder="e.g. 33BJGPV4768L1ZH"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              UPI ID (For Payments)
            </label>
            <input
              type="text"
              name="upiId"
              value={form.upiId || ''}
              onChange={handleChange}
              placeholder="e.g. murugan@upi"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Bill Terms / Footer Note
          </label>
          <input
            type="text"
            name="terms"
            value={form.terms || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          Save Shop Settings
        </button>
      </form>

      {/* Backup & Data Management */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Data Backup & Restore</h3>
        <p className="text-[11px] text-slate-400">
          Your bills and ledger are stored securely in your central database. Export backup anytime to stay 100% safe.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Backup Data
          </button>

          <label className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Restore Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetData}
            className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Sample Default Data
          </button>
        </div>
      </div>

      {/* Android & Phone Installation Guide */}
      <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-blue-950 text-xs">How to use on Phone</h4>
        </div>
        <ol className="text-xs text-blue-900/80 space-y-1 list-decimal list-inside">
          <li>Open this app in Chrome / browser on your phone.</li>
          <li>Tap the 3 dots menu in Chrome.</li>
          <li>Tap <strong>"Add to Home screen"</strong> (or "Install app").</li>
          <li>It opens like a full native phone app, with 1-tap WhatsApp sharing!</li>
        </ol>
      </div>
    </div>
  );
}
