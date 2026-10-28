// Local Storage Service for QuickBill - KVK Thaniya Mandi

const STORAGE_KEYS = {
  SHOP: 'quickbill_shop_settings',
  ITEMS: 'quickbill_items',
  CUSTOMERS: 'quickbill_customers',
  SALES: 'quickbill_sales',
  RECEIPTS: 'quickbill_receipts',
  PURCHASES: 'quickbill_purchases',
  SUPPLIERS: 'quickbill_suppliers',
  SUPPLIER_PAYMENTS: 'quickbill_supplier_payments',
};

const DEFAULT_SHOP = {
  name: 'KVK THANIYA MANDI',
  proprietor: '',
  phone: '9486668732 / 9443995160',
  address: 'No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI, Erode - 638 051',
  gstin: '33BJGPV4768L1ZH',
  pan: 'BJGPV4768L',
  upiId: '',
  terms: 'Thank you for your business! Goods once sold will not be taken back.',
};

// 15 Default Thaniya Mandi items with initial stock (Standard Per Bag = 50kg)
const DEFAULT_ITEMS = [
  { id: 'item-1', name: 'Ponni Boiled Rice (50kg)', price: 2700, purchasePrice: 2400, unit: 'Bag', initialStock: 50 },
  { id: 'item-2', name: 'Raw Rice (50kg)', price: 2500, purchasePrice: 2200, unit: 'Bag', initialStock: 40 },
  { id: 'item-3', name: 'Kambu - Pearl Millet (50kg)', price: 2100, purchasePrice: 1700, unit: 'Bag', initialStock: 200 },
  { id: 'item-4', name: 'Ragi - Finger Millet (50kg)', price: 2300, purchasePrice: 1900, unit: 'Bag', initialStock: 150 },
  { id: 'item-5', name: 'Cholam - Sorghum (50kg)', price: 2000, purchasePrice: 1600, unit: 'Bag', initialStock: 180 },
  { id: 'item-6', name: 'Dhaniya - Coriander (50kg)', price: 6500, purchasePrice: 5250, unit: 'Bag', initialStock: 100 },
  { id: 'item-7', name: 'Groundnut - Kadalai (50kg)', price: 6000, purchasePrice: 4900, unit: 'Bag', initialStock: 120 },
  { id: 'item-8', name: 'Ellu - Gingelly Seeds (50kg)', price: 9500, purchasePrice: 8000, unit: 'Bag', initialStock: 80 },
  { id: 'item-9', name: 'Toor Dal (50kg)', price: 8250, purchasePrice: 7000, unit: 'Bag', initialStock: 150 },
  { id: 'item-10', name: 'Urad Dal (50kg)', price: 7000, purchasePrice: 5900, unit: 'Bag', initialStock: 120 },
  { id: 'item-11', name: 'Moong Dal (50kg)', price: 6250, purchasePrice: 5250, unit: 'Bag', initialStock: 100 },
  { id: 'item-12', name: 'Kollu - Horse Gram (50kg)', price: 3250, purchasePrice: 2500, unit: 'Bag', initialStock: 90 },
  { id: 'item-13', name: 'Pachai Payaru (50kg)', price: 5500, purchasePrice: 4500, unit: 'Bag', initialStock: 110 },
  { id: 'item-14', name: 'Kondakadalai - Bengal Gram (50kg)', price: 4750, purchasePrice: 3900, unit: 'Bag', initialStock: 100 },
  { id: 'item-15', name: 'Sesame Oil (Tin/Bag)', price: 4350, purchasePrice: 3675, unit: 'Bag', initialStock: 60 },
];

const DEFAULT_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Veehech Coco Substrates',
    phone: '9486668732',
    address: 'SF 71, Chennimalai Road, Thulukampalayam, Perundurai TK, Erode',
    notes: 'GSTIN: 33AE...',
    openingBalance: 0,
    openingBalanceType: 'DEBIT',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Ramesh Agro Store',
    phone: '9789123456',
    address: 'Main Road, Chennimalai',
    notes: 'Regular wholesale buyer',
    openingBalance: 0,
    openingBalanceType: 'DEBIT',
    createdAt: new Date().toISOString(),
  },
];

export const Storage = {
  getShopSettings: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOP);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.name && parsed.name !== 'SRI MURUGAN TRADERS') {
          return parsed;
        }
      }
      Storage.saveShopSettings(DEFAULT_SHOP);
      return DEFAULT_SHOP;
    } catch {
      return DEFAULT_SHOP;
    }
  },
  saveShopSettings: (settings) => {
    localStorage.setItem(STORAGE_KEYS.SHOP, JSON.stringify(settings));
  },

  getItems: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep user items as they are, simply ensuring unit is Bag
          return parsed.map((item) => ({
            ...item,
            unit: 'Bag',
          }));
        }
      }
      Storage.saveItems(DEFAULT_ITEMS);
      return DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  },
  saveItems: (items) => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  getCustomers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      Storage.saveCustomers(DEFAULT_CUSTOMERS);
      return DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  },
  saveCustomers: (customers) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getSales: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveSales: (sales) => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  },

  getReceipts: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveReceipts: (receipts) => {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  },

  getPurchases: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  savePurchases: (purchases) => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  },

  getSuppliers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      if (data) return JSON.parse(data);
      // Auto-extract from existing purchases if any
      const purchases = Storage.getPurchases();
      const map = {};
      purchases.forEach((p) => {
        if (p.supplierName && !map[p.supplierName.trim()]) {
          map[p.supplierName.trim()] = {
            id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: p.supplierName.trim(),
            phone: p.supplierPhone || '',
          };
        }
      });
      const extracted = Object.values(map);
      if (extracted.length > 0) {
        Storage.saveSuppliers(extracted);
        return extracted;
      }
      return [
        { id: 'sup-1', name: 'Raju Agro Pollachi', phone: '9842112345' },
        { id: 'sup-2', name: 'Murugan Grains Kangayam', phone: '9443354321' },
      ];
    } catch {
      return [];
    }
  },
  saveSuppliers: (suppliers) => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  getSupplierPayments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIER_PAYMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveSupplierPayments: (payments) => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_PAYMENTS, JSON.stringify(payments));
  },

  // Calculate supplier balance: Total Purchases - Immediate Paid - Later Supplier Payments
  getSupplierBalance: (supplierName) => {
    if (!supplierName) return { totalPurchases: 0, totalPaid: 0, netDue: 0 };
    const sName = supplierName.trim().toLowerCase();
    const purchases = Storage.getPurchases().filter(
      (p) => (p.supplierName || '').trim().toLowerCase() === sName
    );
    const payments = Storage.getSupplierPayments().filter(
      (p) => (p.supplierName || '').trim().toLowerCase() === sName
    );

    const totalPurchases = purchases.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
    const immediatePaid = purchases.reduce(
      (sum, p) => sum + (p.paymentStatus === 'PAID' ? Number(p.grandTotal) || 0 : 0),
      0
    );
    const laterPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalPaid = immediatePaid + laterPaid;
    const netDue = Math.max(0, totalPurchases - totalPaid);

    return {
      totalPurchases,
      totalPaid,
      netDue,
    };
  },

  // Calculate live item stock: Initial Stock + Total Purchased - Total Sold
  getItemStock: (itemId) => {
    const items = Storage.getItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;

    const initial = Number(item.initialStock) || 0;
    const purchases = Storage.getPurchases();
    const sales = Storage.getSales();

    let purchasedQty = 0;
    purchases.forEach((p) => {
      (p.items || []).forEach((pi) => {
        if (pi.id === itemId) {
          purchasedQty += Number(pi.qty) || 0;
        }
      });
    });

    let soldQty = 0;
    sales.forEach((s) => {
      (s.items || []).forEach((si) => {
        if (si.id === itemId) {
          soldQty += Number(si.qty) || 0;
        }
      });
    });

    return initial + purchasedQty - soldQty;
  },

  // Calculate customer balance including Opening Balance
  getCustomerBalance: (customerId) => {
    const cust = Storage.getCustomers().find((c) => c.id === customerId);
    const opBal = Number(cust?.openingBalance) || 0;
    const opType = cust?.openingBalanceType || 'DEBIT';

    const sales = Storage.getSales().filter((s) => s.customerId === customerId);
    const receipts = Storage.getReceipts().filter((r) => r.customerId === customerId);

    const totalSales = sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const immediatePaid = sales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const totalPaid = totalReceipts + immediatePaid;

    let netDue = 0;
    if (opType === 'CREDIT') {
      netDue = totalSales - totalPaid - opBal;
    } else {
      netDue = opBal + totalSales - totalPaid;
    }

    return {
      openingBalance: opBal,
      openingBalanceType: opType,
      totalSales,
      totalPaid,
      netDue,
    };
  },

  // Full customer ledger transactions sorted by date ascending with Opening Balance
  getCustomerLedger: (customerId) => {
    const cust = Storage.getCustomers().find((c) => c.id === customerId);
    const opBal = Number(cust?.openingBalance) || 0;
    const opType = cust?.openingBalanceType || 'DEBIT';

    const sales = Storage.getSales().filter((s) => s.customerId === customerId);
    const receipts = Storage.getReceipts().filter((r) => r.customerId === customerId);

    const transactions = [];

    // 1. Opening Balance Transaction if present
    if (opBal > 0) {
      const opDate = cust.createdAt ? cust.createdAt.split('T')[0] : '2026-01-01';
      transactions.push({
        id: `cust-${customerId}-opbal`,
        date: opDate,
        createdAt: cust.createdAt || '2026-01-01',
        type: 'OPENING',
        refNo: 'OP-BAL',
        description: 'Opening Balance (பழைய பாக்கி)',
        debit: opType === 'DEBIT' ? opBal : 0,
        credit: opType === 'CREDIT' ? opBal : 0,
      });
    }

    sales.forEach((s) => {
      transactions.push({
        id: s.id,
        date: s.date,
        createdAt: s.createdAt || s.date,
        type: 'SALE',
        refNo: String(s.invoiceNo || '1'),
        description: `Sale: ${s.items.length} items (${s.items.map((i) => i.name).slice(0, 2).join(', ')}${s.items.length > 2 ? '...' : ''})`,
        debit: Number(s.grandTotal) || 0,
        credit: 0,
        paidAmount: Number(s.paidAmount) || 0,
        items: s.items,
        raw: s,
      });

      if (Number(s.paidAmount) > 0) {
        transactions.push({
          id: `${s.id}-paid`,
          date: s.date,
          createdAt: s.createdAt || s.date,
          type: 'RECEIPT',
          refNo: `${s.invoiceNo} (Paid)`,
          description: `Immediate payment on Bill #${s.invoiceNo}`,
          debit: 0,
          credit: Number(s.paidAmount) || 0,
          paymentMode: s.paymentMode || 'Cash',
          raw: s,
        });
      }
    });

    receipts.forEach((r) => {
      transactions.push({
        id: r.id,
        date: r.date,
        createdAt: r.createdAt || r.date,
        type: 'RECEIPT',
        refNo: String(r.receiptNo || '1'),
        description: `Receipt: ${r.paymentMode || 'Cash'} ${r.notes ? `(${r.notes})` : ''}`,
        debit: 0,
        credit: Number(r.amount) || 0,
        paymentMode: r.paymentMode,
        raw: r,
      });
    });

    // Sort by date ascending (keep opening balance first if same date)
    transactions.sort((a, b) => {
      if (a.type === 'OPENING') return -1;
      if (b.type === 'OPENING') return 1;
      return new Date(a.date) - new Date(b.date);
    });

    // Calculate running balance
    let running = 0;
    return transactions.map((t) => {
      running = running + t.debit - t.credit;
      return {
        ...t,
        balance: running,
      };
    });
  },

  exportBackupData: () => {
    return JSON.stringify({
      shop: Storage.getShopSettings(),
      items: Storage.getItems(),
      customers: Storage.getCustomers(),
      sales: Storage.getSales(),
      receipts: Storage.getReceipts(),
      purchases: Storage.getPurchases(),
      exportDate: new Date().toISOString(),
      version: '2.0',
    }, null, 2);
  },

  restoreBackupData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.shop) Storage.saveShopSettings(data.shop);
      if (Array.isArray(data.items)) Storage.saveItems(data.items);
      if (Array.isArray(data.customers)) Storage.saveCustomers(data.customers);
      if (Array.isArray(data.sales)) Storage.saveSales(data.sales);
      if (Array.isArray(data.receipts)) Storage.saveReceipts(data.receipts);
      if (Array.isArray(data.purchases)) Storage.savePurchases(data.purchases);
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  },

  resetToDefault: () => {
    Storage.saveShopSettings(DEFAULT_SHOP);
    Storage.saveItems(DEFAULT_ITEMS);
    Storage.saveCustomers(DEFAULT_CUSTOMERS);
    Storage.saveSales([]);
    Storage.saveReceipts([]);
    Storage.savePurchases([]);
  },
};
