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
    SyncService.init({
      onStatusChange: (status) => {
        setSyncStatus(status);
      },
      onDataUpdate: (serverData) => {
        if (!serverData) return;
        if (serverData.shop) {
          setShop(serverData.shop);
          Storage.saveShopSettings(serverData.shop);
        }
        if (Array.isArray(serverData.items)) {
          setItems(serverData.items);
          Storage.saveItems(serverData.items);
        }
        if (Array.isArray(serverData.customers)) {
          setCustomers(serverData.customers);
          Storage.saveCustomers(serverData.customers);
        }
        if (Array.isArray(serverData.sales)) {
          setSales(serverData.sales);
          Storage.saveSales(serverData.sales);
        }
        if (Array.isArray(serverData.receipts)) {
          setReceipts(serverData.receipts);
          Storage.saveReceipts(serverData.receipts);
        }
        if (Array.isArray(serverData.purchases)) {
          setPurchases(serverData.purchases);
          Storage.savePurchases(serverData.purchases);
        }
        if (Array.isArray(serverData.suppliers)) {
          Storage.saveSuppliers(serverData.suppliers);
        }
        if (Array.isArray(serverData.supplierPayments)) {
          Storage.saveSupplierPayments(serverData.supplierPayments);
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
