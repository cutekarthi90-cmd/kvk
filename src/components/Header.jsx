import React from 'react';
import { Store, UserPlus, Wifi, WifiOff } from 'lucide-react';

export default function Header({ shop, activeTab, onOpenAddCustomer, syncStatus = 'connected' }) {
  const titles = {
    sales: 'Sales & Billing',
    receipts: 'Receipt Voucher',
    ledger: 'Customer Ledger',
    items: '15 Items Master',
    settings: 'Shop Settings',
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
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
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE SYNC
                </span>
              ) : syncStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition-colors shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Customer</span>
        </button>
      </div>
    </header>
  );
}
