import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// High performance GZIP compression for mobile phones
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default database structure for KVK THANIYA MANDI
const DEFAULT_DB = {
  shop: {
    name: 'KVK THANIYA MANDI',
    proprietor: '',
    phone: '9486668732 / 9443995160',
    address: 'No.2/1, P.R.S. Road, Mukasipidariyur, CHENNIMALAI, Erode - 638 051',
    gstin: '33BJGPV4768L1ZH',
    pan: 'BJGPV4768L',
    upiId: '',
    terms: 'Thank you for your business! Goods once sold will not be taken back.',
  },
  items: [
    { id: 'item-1', name: 'Ponni Boiled Rice (50kg)', price: 2700, unit: 'Bag' },
    { id: 'item-2', name: 'Raw Rice (50kg)', price: 2500, unit: 'Bag' },
    { id: 'item-3', name: 'Kambu - Pearl Millet (50kg)', price: 2100, unit: 'Bag' },
    { id: 'item-4', name: 'Ragi - Finger Millet (50kg)', price: 2300, unit: 'Bag' },
    { id: 'item-5', name: 'Cholam - Sorghum (50kg)', price: 2000, unit: 'Bag' },
    { id: 'item-6', name: 'Dhaniya - Coriander (50kg)', price: 6500, unit: 'Bag' },
    { id: 'item-7', name: 'Groundnut - Kadalai (50kg)', price: 6000, unit: 'Bag' },
    { id: 'item-8', name: 'Ellu - Gingelly Seeds (50kg)', price: 9500, unit: 'Bag' },
    { id: 'item-9', name: 'Toor Dal (50kg)', price: 8250, unit: 'Bag' },
    { id: 'item-10', name: 'Urad Dal (50kg)', price: 7000, unit: 'Bag' },
    { id: 'item-11', name: 'Moong Dal (50kg)', price: 6250, unit: 'Bag' },
    { id: 'item-12', name: 'Kollu - Horse Gram (50kg)', price: 3250, unit: 'Bag' },
    { id: 'item-13', name: 'Pachai Payaru (50kg)', price: 5500, unit: 'Bag' },
    { id: 'item-14', name: 'Kondakadalai - Bengal Gram (50kg)', price: 4750, unit: 'Bag' },
    { id: 'item-15', name: 'Sesame Oil (Tin/Bag)', price: 4350, unit: 'Bag' },
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'Veehech Coco Substrates',
      phone: '9486668732',
      address: 'SF 71, Chennimalai Road, Thulukampalayam, Perundurai TK, Erode',
      notes: 'GSTIN: 33AE...',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      name: 'Ramesh Agro Store',
      phone: '9789123456',
      address: 'Main Road, Chennimalai',
      notes: 'Regular wholesale buyer',
      createdAt: new Date().toISOString(),
    },
  ],
  sales: [],
  receipts: [],
  purchases: [],
  suppliers: [],
  supplierPayments: [],
  salesReturns: [],
  expenses: [],
  interestLoans: [],
  interestPayments: [],
  lastUpdated: new Date().toISOString(),
};

const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item) => ({ ...item, unit: 'Bag' }));
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db:', err);
    return DEFAULT_DB;
  }
};

const writeDB = (data) => {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
};

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Broadcast helper: sends message to all connected phones
const broadcast = (message, senderWs = null) => {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(payload);
    }
  });
};

wss.on('connection', (ws) => {
  const currentData = readDB();
  ws.send(JSON.stringify({ type: 'INIT_STATE', data: currentData }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'SYNC_ACTION') {
        const db = readDB();
        const { action, payload } = msg;

        if (action === 'SAVE_SALE') {
          db.sales = [payload, ...(db.sales || [])];
        } else if (action === 'DELETE_SALE') {
          db.sales = (db.sales || []).filter((s) => s.id !== payload);
        } else if (action === 'SAVE_RECEIPT') {
          db.receipts = [payload, ...(db.receipts || [])];
        } else if (action === 'DELETE_RECEIPT') {
          db.receipts = (db.receipts || []).filter((r) => r.id !== payload);
        } else if (action === 'SAVE_CUSTOMER') {
          const idx = (db.customers || []).findIndex((c) => c.id === payload.id);
          if (idx >= 0) {
            db.customers[idx] = payload;
          } else {
            db.customers = [payload, ...(db.customers || [])];
          }
        } else if (action === 'DELETE_CUSTOMER') {
          db.customers = (db.customers || []).filter((c) => c.id !== payload);
        } else if (action === 'SAVE_ITEMS') {
          db.items = payload;
        } else if (action === 'SAVE_SHOP') {
          db.shop = payload;
        } else if (action === 'SAVE_PURCHASE') {
          db.purchases = [payload, ...(db.purchases || [])];
        } else if (action === 'DELETE_PURCHASE') {
          db.purchases = (db.purchases || []).filter((p) => p.id !== payload);
        } else if (action === 'SAVE_SUPPLIERS') {
          db.suppliers = payload;
        } else if (action === 'SAVE_SUPPLIER_PAYMENTS') {
          db.supplierPayments = payload;
        } else if (action === 'ADD_SUPPLIER_PAYMENT') {
          db.supplierPayments = [payload, ...(db.supplierPayments || [])];
        } else if (action === 'SAVE_SALES_RETURN') {
          db.salesReturns = [payload, ...(db.salesReturns || [])];
        } else if (action === 'DELETE_SALES_RETURN') {
          db.salesReturns = (db.salesReturns || []).filter((r) => r.id !== payload);
        } else if (action === 'SAVE_EXPENSE') {
          db.expenses = [payload, ...(db.expenses || [])];
        } else if (action === 'DELETE_EXPENSE') {
          db.expenses = (db.expenses || []).filter((e) => e.id !== payload);
        } else if (action === 'SAVE_INTEREST_LOAN') {
          db.interestLoans = [payload, ...(db.interestLoans || [])];
        } else if (action === 'DELETE_INTEREST_LOAN') {
          db.interestLoans = (db.interestLoans || []).filter((l) => l.id !== payload);
        } else if (action === 'SAVE_INTEREST_PAYMENT') {
          db.interestPayments = [payload, ...(db.interestPayments || [])];
        } else if (action === 'CLIENT_SYNC_STATE') {
          try {
            const clientData = typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (Array.isArray(clientData.sales) && clientData.sales.length >= (db.sales || []).length) db.sales = clientData.sales;
            if (Array.isArray(clientData.purchases) && clientData.purchases.length >= (db.purchases || []).length) db.purchases = clientData.purchases;
            if (Array.isArray(clientData.receipts) && clientData.receipts.length >= (db.receipts || []).length) db.receipts = clientData.receipts;
            if (Array.isArray(clientData.customers)) db.customers = clientData.customers;
            if (Array.isArray(clientData.items)) db.items = clientData.items;
            if (Array.isArray(clientData.suppliers)) db.suppliers = clientData.suppliers;
            if (Array.isArray(clientData.supplierPayments)) db.supplierPayments = clientData.supplierPayments;
            if (Array.isArray(clientData.salesReturns)) db.salesReturns = clientData.salesReturns;
            if (Array.isArray(clientData.expenses)) db.expenses = clientData.expenses;
            if (Array.isArray(clientData.interestLoans)) db.interestLoans = clientData.interestLoans;
            if (Array.isArray(clientData.interestPayments)) db.interestPayments = clientData.interestPayments;
          } catch (e) {
            console.error('Error syncing client state:', e);
          }
        }

        writeDB(db);

        // Instantly notify ALL other phones connected!
        broadcast({ type: 'LIVE_UPDATE', action, payload, fullData: db }, ws);
        ws.send(JSON.stringify({ type: 'ACTION_ACK', action, success: true }));
      }
    } catch (err) {
      console.error('Error handling ws message:', err);
    }
  });
});

// REST Endpoints
app.get('/api/state', (req, res) => {
  res.json(readDB());
});

app.post('/api/action', (req, res) => {
  const { action, payload } = req.body;
  const db = readDB();

  if (action === 'SAVE_SALE') {
    db.sales = [payload, ...(db.sales || [])];
  } else if (action === 'DELETE_SALE') {
    db.sales = (db.sales || []).filter((s) => s.id !== payload);
  } else if (action === 'SAVE_RECEIPT') {
    db.receipts = [payload, ...(db.receipts || [])];
  } else if (action === 'DELETE_RECEIPT') {
    db.receipts = (db.receipts || []).filter((r) => r.id !== payload);
  } else if (action === 'SAVE_CUSTOMER') {
    const idx = (db.customers || []).findIndex((c) => c.id === payload.id);
    if (idx >= 0) {
      db.customers[idx] = payload;
    } else {
      db.customers = [payload, ...(db.customers || [])];
    }
  } else if (action === 'DELETE_CUSTOMER') {
    db.customers = (db.customers || []).filter((c) => c.id !== payload);
  } else if (action === 'SAVE_ITEMS') {
    db.items = payload;
  } else if (action === 'SAVE_SHOP') {
    db.shop = payload;
  } else if (action === 'SAVE_PURCHASE') {
    db.purchases = [payload, ...(db.purchases || [])];
  } else if (action === 'DELETE_PURCHASE') {
    db.purchases = (db.purchases || []).filter((p) => p.id !== payload);
  } else if (action === 'SAVE_SUPPLIERS') {
    db.suppliers = payload;
  } else if (action === 'SAVE_SUPPLIER_PAYMENTS') {
    db.supplierPayments = payload;
  } else if (action === 'ADD_SUPPLIER_PAYMENT') {
    db.supplierPayments = [payload, ...(db.supplierPayments || [])];
  } else if (action === 'SAVE_SALES_RETURN') {
    db.salesReturns = [payload, ...(db.salesReturns || [])];
  } else if (action === 'DELETE_SALES_RETURN') {
    db.salesReturns = (db.salesReturns || []).filter((r) => r.id !== payload);
  } else if (action === 'SAVE_EXPENSE') {
    db.expenses = [payload, ...(db.expenses || [])];
  } else if (action === 'DELETE_EXPENSE') {
    db.expenses = (db.expenses || []).filter((e) => e.id !== payload);
  } else if (action === 'SAVE_INTEREST_LOAN') {
    db.interestLoans = [payload, ...(db.interestLoans || [])];
  } else if (action === 'DELETE_INTEREST_LOAN') {
    db.interestLoans = (db.interestLoans || []).filter((l) => l.id !== payload);
  } else if (action === 'SAVE_INTEREST_PAYMENT') {
    db.interestPayments = [payload, ...(db.interestPayments || [])];
  } else if (action === 'CLIENT_SYNC_STATE') {
    try {
      const clientData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (Array.isArray(clientData.sales) && clientData.sales.length >= (db.sales || []).length) db.sales = clientData.sales;
      if (Array.isArray(clientData.purchases) && clientData.purchases.length >= (db.purchases || []).length) db.purchases = clientData.purchases;
      if (Array.isArray(clientData.receipts) && clientData.receipts.length >= (db.receipts || []).length) db.receipts = clientData.receipts;
      if (Array.isArray(clientData.customers)) db.customers = clientData.customers;
      if (Array.isArray(clientData.items)) db.items = clientData.items;
      if (Array.isArray(clientData.suppliers)) db.suppliers = clientData.suppliers;
      if (Array.isArray(clientData.supplierPayments)) db.supplierPayments = clientData.supplierPayments;
      if (Array.isArray(clientData.salesReturns)) db.salesReturns = clientData.salesReturns;
      if (Array.isArray(clientData.expenses)) db.expenses = clientData.expenses;
      if (Array.isArray(clientData.interestLoans)) db.interestLoans = clientData.interestLoans;
      if (Array.isArray(clientData.interestPayments)) db.interestPayments = clientData.interestPayments;
    } catch (e) {
      console.error('Error syncing client state:', e);
    }
  }

  writeDB(db);
  broadcast({ type: 'LIVE_UPDATE', action, payload, fullData: db });
  res.json({ success: true, db });
});

// Serve the lightning-fast production bundle directly to phones!
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '7d',
    etag: true,
  }));

  // Fallback for SPA routing in Express 5
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  KVK THANIYA MANDI - Lightning Fast Production Server`);
  console.log(`  Phone & PC URL: http://192.168.1.23:${PORT}`);
  console.log(`  Local PC URL:   http://localhost:${PORT}`);
  console.log(`====================================================`);

  // Auto-ping to prevent Render sleep during active usage
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://kvk-1.onrender.com';
  if (renderUrl.startsWith('https')) {
    setInterval(() => {
      fetch(`${renderUrl}/api/state`).catch(() => {});
    }, 12 * 60 * 1000); // Ping every 12 mins
  }
});
