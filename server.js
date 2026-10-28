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
    { id: 'item-1', name: 'Ponni Boiled Rice 25kg', price: 1350, unit: 'Bag' },
    { id: 'item-2', name: 'Raw Rice 25kg', price: 1250, unit: 'Bag' },
    { id: 'item-3', name: 'Kambu (Pearl Millet)', price: 1050, unit: 'Bag' },
    { id: 'item-4', name: 'Ragi (Finger Millet)', price: 1150, unit: 'Bag' },
    { id: 'item-5', name: 'Cholam (Sorghum)', price: 1000, unit: 'Bag' },
    { id: 'item-6', name: 'Coriander Seeds (Dhaniya)', price: 1300, unit: 'Bag' },
    { id: 'item-7', name: 'Groundnut (Kadalai)', price: 2400, unit: 'Bag' },
    { id: 'item-8', name: 'Gingelly Seeds (Ellu)', price: 3800, unit: 'Bag' },
    { id: 'item-9', name: 'Toor Dal', price: 3300, unit: 'Bag' },
    { id: 'item-10', name: 'Urad Dal', price: 2800, unit: 'Bag' },
    { id: 'item-11', name: 'Moong Dal', price: 2500, unit: 'Bag' },
    { id: 'item-12', name: 'Horse Gram (Kollu)', price: 1300, unit: 'Bag' },
    { id: 'item-13', name: 'Green Gram (Pachai Payaru)', price: 2200, unit: 'Bag' },
    { id: 'item-14', name: 'Bengal Gram (Kondakadalai)', price: 1900, unit: 'Bag' },
    { id: 'item-15', name: 'Sesame Oil (Tin/Bag)', price: 2900, unit: 'Bag' },
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
});
