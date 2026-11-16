import React from 'react';
import { ShoppingCart, Receipt, Truck, BookOpen, Package, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, dueInterestCount = 0 }) {
  const tabs = [
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'receipts', label: 'Receipt', icon: Receipt },
    { id: 'purchase', label: 'Purchase', icon: Truck },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'items', label: 'Stock', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-6 px-1 py-1 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-normal'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform relative ${
                  isActive ? 'bg-blue-50 scale-105' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.id === 'ledger' && dueInterestCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-rose-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {dueInterestCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
