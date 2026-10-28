import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';

const STORAGE_KEY = 'quickbill_firebase_config';

export const getSavedFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const saveFirebaseConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

let db = null;
let appInstance = null;

export const initFirebase = (customConfig = null) => {
  const config = customConfig || getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApps()[0];
    }
    db = getFirestore(appInstance);
    return db;
  } catch (err) {
    console.warn('Firebase init error:', err);
    return null;
  }
};

/**
 * Real-time listeners for all collections
 */
export const subscribeToFirebase = ({
  onShopChange,
  onItemsChange,
  onCustomersChange,
  onSalesChange,
  onReceiptsChange,
}) => {
  if (!db) {
    initFirebase();
  }
  if (!db) return () => {};

  const unsubs = [];

  try {
    // 1. Shop Settings Doc
    const shopRef = doc(db, 'kvk_shop', 'settings');
    unsubs.push(
      onSnapshot(shopRef, (snap) => {
        if (snap.exists() && onShopChange) {
          onShopChange(snap.data());
        }
      })
    );

    // 2. Items Collection
    const itemsRef = collection(db, 'kvk_items');
    unsubs.push(
      onSnapshot(itemsRef, (snap) => {
        if (onItemsChange) {
          const itemsList = [];
          snap.forEach((d) => itemsList.push({ id: d.id, ...d.data() }));
          if (itemsList.length > 0) onItemsChange(itemsList);
        }
      })
    );

    // 3. Customers Collection
    const customersRef = collection(db, 'kvk_customers');
    unsubs.push(
      onSnapshot(customersRef, (snap) => {
        if (onCustomersChange) {
          const custList = [];
          snap.forEach((d) => custList.push({ id: d.id, ...d.data() }));
          onCustomersChange(custList);
        }
      })
    );

    // 4. Sales Collection
    const salesRef = collection(db, 'kvk_sales');
    unsubs.push(
      onSnapshot(salesRef, (snap) => {
        if (onSalesChange) {
          const salesList = [];
          snap.forEach((d) => salesList.push({ id: d.id, ...d.data() }));
          salesList.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
          onSalesChange(salesList);
        }
      })
    );

    // 5. Receipts Collection
    const receiptsRef = collection(db, 'kvk_receipts');
    unsubs.push(
      onSnapshot(receiptsRef, (snap) => {
        if (onReceiptsChange) {
          const receiptsList = [];
          snap.forEach((d) => receiptsList.push({ id: d.id, ...d.data() }));
          receiptsList.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
          onReceiptsChange(receiptsList);
        }
      })
    );
  } catch (err) {
    console.error('Firebase subscription error:', err);
  }

  return () => {
    unsubs.forEach((u) => u());
  };
};

// Write actions to Firebase
export const firebaseActions = {
  saveSale: async (sale) => {
    if (!db) return;
    await setDoc(doc(db, 'kvk_sales', sale.id), sale);
  },
  deleteSale: async (saleId) => {
    if (!db) return;
    await deleteDoc(doc(db, 'kvk_sales', saleId));
  },
  saveReceipt: async (receipt) => {
    if (!db) return;
    await setDoc(doc(db, 'kvk_receipts', receipt.id), receipt);
  },
  deleteReceipt: async (receiptId) => {
    if (!db) return;
    await deleteDoc(doc(db, 'kvk_receipts', receiptId));
  },
  saveCustomer: async (customer) => {
    if (!db) return;
    await setDoc(doc(db, 'kvk_customers', customer.id), customer);
  },
  deleteCustomer: async (customerId) => {
    if (!db) return;
    await deleteDoc(doc(db, 'kvk_customers', customerId));
  },
  saveItems: async (items) => {
    if (!db) return;
    for (const item of items) {
      await setDoc(doc(db, 'kvk_items', item.id), item);
    }
  },
  saveShop: async (shop) => {
    if (!db) return;
    await setDoc(doc(db, 'kvk_shop', 'settings'), shop);
  },
};
