import React, { useState, useEffect } from 'react';
import { Store, UserPlus, Wifi, WifiOff, Download, HelpCircle, X, Check, Smartphone } from 'lucide-react';

export default function Header({ shop, activeTab, onOpenAddCustomer, syncStatus = 'connected' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    // Capture PWA install event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen when app is installed
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Install error:', err);
        setShowHelpModal(true);
      }
    } else {
      setShowHelpModal(true);
    }
  };

  const titles = {
    sales: 'Sales & Billing',
    receipts: 'Receipt Voucher',
    purchase: 'Purchase & Stock',
    ledger: 'Customer Ledger',
    items: 'Stock & Items',
    settings: 'Shop Settings',
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        {/* Top Install App Banner (Only visible if not installed yet) */}
        {!isStandalone && !isDismissed && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold shadow-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Download className="w-4 h-4 text-emerald-300 animate-bounce shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                Install KVK App on Phone
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-md shadow-xs text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
              >
                <span>Install</span>
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-1 text-blue-200 hover:text-white"
                title="Help to Install"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 text-blue-300 hover:text-white"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate leading-tight">
                {shop.name || 'KVK THANIYA MANDI'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-blue-600 font-medium">
                  {titles[activeTab] || 'Billing'}
                </span>

                {/* Real-time Multi-Device Sync Indicator */}
                {syncStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE SYNC
                  </span>
                ) : syncStatus === 'connecting' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200" title="Device is 100% ready to bill. Cloud waking up in background.">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    DEVICE READY ⚡
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    LOCAL READY ⚡
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* HOW TO INSTALL MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Phone-la App Install Panna
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <div className="font-bold text-slate-900">Chrome 3 Dots Click Pannunga</div>
                  <div className="text-slate-500 mt-0.5">
                    Phone Chrome-la right top corner-la irukkara <strong>3 dots (⋮)</strong>-a click pannunga.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <div className="font-bold text-slate-900">"Install app" Alladhu "Add to Home screen"</div>
                  <div className="text-slate-500 mt-0.5">
                    Menu list-la <strong>"Install app"</strong> (alladhu <strong>"Add to Home screen" / "முகப்புத் திரையில் சேர்"</strong>) nu irukkum, adhai tap pannunga.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <div className="font-bold text-slate-900">"Install" Confirm Pannunga</div>
                  <div className="text-slate-500 mt-0.5">
                    Popup-la <strong>"Install"</strong> click pannuna udane ungal phone home screen-la KVK Mandi App icon vanthuvidum!
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowHelpModal(false);
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                }
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Purinjithu / Sari</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
