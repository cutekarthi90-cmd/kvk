import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SaleScreen from './components/SaleScreen';
import ReceiptScreen from './components/ReceiptScreen';
import PurchaseScreen from './components/PurchaseScreen';
import LedgerScreen from './components/LedgerScreen';
import ItemsScreen from './components/ItemsScreen';
import SettingsScreen from './components/SettingsScreen';
import CustomerModal from './components/CustomerModal';
import { Storage } from './services/storage';
import { SyncService } from './services/syncService';
import { subscribeToFirebase } from './services/firebaseService';

export default function App() {
  const [activeTab, setActiveTab] = useState('sales');
  const [shop, setShop] = useState(() => Storage.getShopSettings());
  const [items, setItems] = useState(() => Storage.getItems());
  const [customers, setCustomers] = useState(() => Storage.getCustomers());
  const [sales, setSales] = useState(() => Storage.getSales());
  const [receipts, setReceipts] = useState(() => Storage.getReceipts());
  const [purchases, setPurchases] = useState(() => Storage.getPurchases());

  const [syncStatus, setSyncStatus] = useState('connecting');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState('');

  // 1. Initialize Real-Time Multi-Device Sync on mount
  useEffect(() => {
    // Check if a newer version of the web app is deployed on server
    const checkAppVersion = async () => {
      try {
        const res = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const { version } = await res.json();
          const currentVersion = localStorage.getItem('kvk_bundle_version');
          if (currentVersion && version && currentVersion !== version) {
            console.log('New app version detected, reloading...');
            localStorage.setItem('kvk_bundle_version', version);
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            window.location.reload();
          } else if (version) {
            localStorage.setItem('kvk_bundle_version', version);
          }
        }
      } catch {}
    };

    checkAppVersion();
    const handleFocus = () => checkAppVersion();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkAppVersion();
    });

    SyncService.init({
      onStatusChange: (status) => {
        setSyncStatus(status);
      },
      onDataUpdate: (serverData, buildVersion) => {
        if (!serverData) return;

        // Auto-reload if a new build version was deployed on Render
        if (buildVersion) {
          const currentVersion = localStorage.getItem('kvk_bundle_version');
          if (currentVersion && currentVersion !== buildVersion) {
            localStorage.setItem('kvk_bundle_version', buildVersion);
            if ('caches' in window) {
              caches.keys().then((names) => {
                Promise.all(names.map((n) => caches.delete(n))).finally(() => {
                  window.location.reload();
                });
              });
            } else {
              window.location.reload();
            }
            return;
          }
          localStorage.setItem('kvk_bundle_version', buildVersion);
        }

        // Merge safely so phone's active data is never wiped by an ephemeral waking server
        const merged = Storage.mergeSafeServerData(serverData);
        if (!merged) return;

        if (merged.shop) {
          setShop(merged.shop);
          Storage.saveShopSettings(merged.shop);
        }
        if (Array.isArray(merged.items)) {
          setItems(merged.items);
          Storage.saveItems(merged.items);
        }
        if (Array.isArray(merged.customers)) {
          setCustomers(merged.customers);
          Storage.saveCustomers(merged.customers);
        }
        if (Array.isArray(merged.sales)) {
          setSales(merged.sales);
          Storage.saveSales(merged.sales);
        }
        if (Array.isArray(merged.receipts)) {
          setReceipts(merged.receipts);
          Storage.saveReceipts(merged.receipts);
        }
        if (Array.isArray(merged.purchases)) {
          setPurchases(merged.purchases);
          Storage.savePurchases(merged.purchases);
        }
        if (Array.isArray(merged.suppliers)) {
          Storage.saveSuppliers(merged.suppliers);
        }
        if (Array.isArray(merged.supplierPayments)) {
          Storage.saveSupplierPayments(merged.supplierPayments);
        }
      },
    });

    // 2. Also listen to Firebase Cloud Sync if configured
    const unsubFirebase = subscribeToFirebase({
      onShopChange: (newShop) => {
        setShop(newShop);
        Storage.saveShopSettings(newShop);
      },
      onItemsChange: (newItems) => {
        setItems(newItems);
        Storage.saveItems(newItems);
      },
      onCustomersChange: (newCustomers) => {
        setCustomers(newCustomers);
        Storage.saveCustomers(newCustomers);
      },
      onSalesChange: (newSales) => {
        setSales(newSales);
        Storage.saveSales(newSales);
      },
      onReceiptsChange: (newReceipts) => {
        setReceipts(newReceipts);
        Storage.saveReceipts(newReceipts);
      },
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubFirebase) unsubFirebase();
    };
  }, []);

  // Reload all data if restored from backup
  const handleReloadAll = () => {
    setShop(Storage.getShopSettings());
    setItems(Storage.getItems());
    setCustomers(Storage.getCustomers());
    setSales(Storage.getSales());
    setReceipts(Storage.getReceipts());
    setPurchases(Storage.getPurchases());
  };

  const handleSaveShop = (newShop) => {
    setShop(newShop);
    Storage.saveShopSettings(newShop);
    SyncService.dispatch('SAVE_SHOP', newShop);
  };

  const handleSaveItems = (newItems) => {
    setItems(newItems);
    Storage.saveItems(newItems);
    SyncService.dispatch('SAVE_ITEMS', newItems);
  };

  // Add or update customer
  const handleSaveCustomer = (customerData) => {
    setCustomers((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === customerData.id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = customerData;
      } else {
        updated = [customerData, ...prev];
      }
      Storage.saveCustomers(updated);
      return updated;
    });
    setEditingCustomer(null);
    SyncService.dispatch('SAVE_CUSTOMER', customerData);
  };

  const handleDeleteCustomer = (customerId) => {
    Storage.recordDeletedId(customerId);
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== customerId);
      Storage.saveCustomers(updated);
      return updated;
    });
    SyncService.dispatch('DELETE_CUSTOMER', customerId);
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  // Sales handlers
  const handleSaveSale = (newSale) => {
    setSales((prev) => {
      const updated = [newSale, ...prev];
      Storage.saveSales(updated);
      return updated;
    });
    SyncService.dispatch('SAVE_SALE', newSale);
  };

  const handleDeleteSale = (saleId) => {
    Storage.recordDeletedId(saleId);
    setSales((prev) => {
      const updated = prev.filter((s) => s.id !== saleId);
      Storage.saveSales(updated);
      return updated;
    });
    SyncService.dispatch('DELETE_SALE', saleId);
  };

  // Receipts handlers
  const handleSaveReceipt = (newReceipt) => {
    setReceipts((prev) => {
      const updated = [newReceipt, ...prev];
      Storage.saveReceipts(updated);
      return updated;
    });
    SyncService.dispatch('SAVE_RECEIPT', newReceipt);
  };

  const handleDeleteReceipt = (receiptId) => {
    Storage.recordDeletedId(receiptId);
    setReceipts((prev) => {
      const updated = prev.filter((r) => r.id !== receiptId);
      Storage.saveReceipts(updated);
      return updated;
    });
    SyncService.dispatch('DELETE_RECEIPT', receiptId);
  };

  // Purchase handlers
  const handleSavePurchase = (newPurchase) => {
    setPurchases((prev) => {
      const updated = [newPurchase, ...prev];
      Storage.savePurchases(updated);
      return updated;
    });
    SyncService.dispatch('SAVE_PURCHASE', newPurchase);
  };

  const handleDeletePurchase = (purchaseId) => {
    Storage.recordDeletedId(purchaseId);
    setPurchases((prev) => {
      const updated = prev.filter((p) => p.id !== purchaseId);
      Storage.savePurchases(updated);
      return updated;
    });
    SyncService.dispatch('DELETE_PURCHASE', purchaseId);
  };

  // Quick navigation handlers from Ledger
  const handleQuickSale = (customerId) => {
    setPreselectedCustomerId(customerId);
    setActiveTab('sales');
  };

  const handleQuickReceipt = (customerId) => {
    setPreselectedCustomerId(customerId);
    setActiveTab('receipts');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header
        shop={shop}
        activeTab={activeTab}
        onOpenAddCustomer={handleOpenAddCustomer}
        syncStatus={syncStatus}
      />

      <main className="flex-1 w-full max-w-md mx-auto">
        {activeTab === 'sales' && (
          <SaleScreen
            customers={customers}
            items={items}
            shop={shop}
            sales={sales}
            onSaveSale={handleSaveSale}
            onDeleteSale={handleDeleteSale}
            onOpenAddCustomer={handleOpenAddCustomer}
            preselectedCustomerId={preselectedCustomerId}
          />
        )}

        {activeTab === 'receipts' && (
          <ReceiptScreen
            customers={customers}
            receipts={receipts}
            shop={shop}
            onSaveReceipt={handleSaveReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onOpenAddCustomer={handleOpenAddCustomer}
            preselectedCustomerId={preselectedCustomerId}
          />
        )}

        {activeTab === 'purchase' && (
          <PurchaseScreen
            items={items}
            purchases={purchases}
            onSavePurchase={handleSavePurchase}
            onDeletePurchase={handleDeletePurchase}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerScreen
            customers={customers}
            shop={shop}
            sales={sales}
            receipts={receipts}
            purchases={purchases}
            onOpenAddCustomer={handleOpenAddCustomer}
            onEditCustomer={handleOpenEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onQuickSale={handleQuickSale}
            onQuickReceipt={handleQuickReceipt}
          />
        )}

        {activeTab === 'items' && (
          <ItemsScreen
            items={items}
            sales={sales}
            purchases={purchases}
            onSaveItems={handleSaveItems}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            shop={shop}
            onSaveShop={handleSaveShop}
            onReloadAll={handleReloadAll}
            syncStatus={syncStatus}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        existingCustomer={editingCustomer}
      />
    </div>
  );
}
