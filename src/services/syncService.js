import { Storage } from './storage';
import { firebaseActions } from './firebaseService';

const SERVER_URL_KEY = 'quickbill_server_url';

export const getServerUrl = () => {
  // If running in browser on Render cloud, ngrok, or custom domain
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return window.location.origin;
    }
    if (window.location.port === '5000') {
      return window.location.origin;
    }
  }

  const saved = localStorage.getItem(SERVER_URL_KEY);
  // Ignore stale local Wi-Fi IP so 5G cellular network connects to Render cloud directly
  if (saved && !saved.includes('192.168.1.')) {
    return saved;
  }

  return 'https://kvk-1.onrender.com';
};

export const setServerUrl = (url) => {
  localStorage.setItem(SERVER_URL_KEY, url);
};

let ws = null;
let statusCallback = null;
let updateCallback = null;
let reconnectTimer = null;
let pollTimer = null;
let pingTimer = null;
let isPolling = false;
let lastKnownHash = '';

export const SyncService = {
  init: ({ onStatusChange, onDataUpdate }) => {
    statusCallback = onStatusChange;
    updateCallback = onDataUpdate;
    SyncService.connect();
    SyncService.startPolling();
    SyncService.startPingHeartbeat();
    SyncService.bindVisibilityEvents();
  },

  bindVisibilityEvents: () => {
    if (typeof window === 'undefined') return;
    if (window.__syncEventsBound) return;
    window.__syncEventsBound = true;

    // Instant sync when user opens phone, unlocks screen, or switches back to Mandi app tab
    const handleWakeup = () => {
      SyncService.pollNow();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        SyncService.connect();
      }
    };

    window.addEventListener('focus', handleWakeup);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleWakeup();
    });
    window.addEventListener('online', handleWakeup);
  },

  startPolling: () => {
    if (pollTimer) clearInterval(pollTimer);
    // Ultra-fast background polling (every 1 second) so data entered on Phone 1 shows on Phone 2 in 1s max
    pollTimer = setInterval(() => {
      SyncService.pollNow();
    }, 1000);
  },

  startPingHeartbeat: () => {
    if (pingTimer) clearInterval(pingTimer);
    // Ping WebSocket every 10s so Render proxy never drops idle connection
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'PING', t: Date.now() }));
        } catch {}
      } else if (!ws || ws.readyState === WebSocket.CLOSED) {
        SyncService.connect();
      }
    }, 10000);
  },

  pollNow: async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      const serverUrl = getServerUrl();
      const res = await fetch(`${serverUrl}/api/state`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const hash = `${data.lastUpdated || ''}_${data.sales?.length || 0}_${data.receipts?.length || 0}_${data.purchases?.length || 0}_${data.customers?.length || 0}_${data.items?.length || 0}_${data.expenses?.length || 0}`;
        if (hash !== lastKnownHash) {
          lastKnownHash = hash;
          if (data && updateCallback) {
            updateCallback(data);
          }
        }
        if (statusCallback) statusCallback('connected');
      } else {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          if (statusCallback) statusCallback('offline');
        }
      }
    } catch {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (statusCallback) statusCallback('offline');
      }
    } finally {
      isPolling = false;
    }
  },

  connect: () => {
    const serverUrl = getServerUrl();
    
    // Auto-detect secure wss:// for https:// or ws:// for http://
    let wsUrl;
    if (serverUrl.startsWith('https://')) {
      wsUrl = serverUrl.replace(/^https:\/\//i, 'wss://');
    } else {
      wsUrl = serverUrl.replace(/^http:\/\//i, 'ws://');
    }

    try {
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try { ws.close(); } catch {}
      }

      console.log('Connecting to Live Sync WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to Live Sync WebSocket:', wsUrl);
        if (statusCallback) statusCallback('connected');
        if (reconnectTimer) clearTimeout(reconnectTimer);

        // Fetch latest state immediately on connect
        SyncService.pollNow();

        // Share active local backup with server safely
        try {
          const backup = Storage.exportBackupData();
          ws.send(JSON.stringify({
            type: 'SYNC_ACTION',
            action: 'CLIENT_SYNC_STATE',
            payload: backup,
          }));
        } catch (e) {
          console.warn('Error sending initial client sync state:', e);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'PONG') {
            return;
          }
          if (msg.type === 'INIT_STATE' || msg.type === 'LIVE_UPDATE') {
            const data = msg.fullData || msg.data;
            if (data) {
              lastKnownHash = `${data.lastUpdated || ''}_${data.sales?.length || 0}_${data.receipts?.length || 0}_${data.purchases?.length || 0}_${data.customers?.length || 0}_${data.items?.length || 0}_${data.expenses?.length || 0}`;
              if (updateCallback) {
                updateCallback(data, msg.buildVersion);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing sync message:', e);
        }
      };

      ws.onclose = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          SyncService.connect();
        }, 1500);
      };

      ws.onerror = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => SyncService.connect(), 1500);
      };
    } catch {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => SyncService.connect(), 2000);
    }
  },

  // Dispatch an action to all connected phones (dual channel: WebSocket + REST POST)
  dispatch: async (action, payload) => {
    // 1. WebSocket send (instant real-time push to other phones)
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'SYNC_ACTION', action, payload }));
      } catch (e) {
        console.warn('WS send failed, using REST fallback', e);
      }
    }

    // 2. ALWAYS also send HTTP POST /api/action for guaranteed persistence and server broadcast
    try {
      const serverUrl = getServerUrl();
      const res = await fetch(`${serverUrl}/api/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.db) {
          lastKnownHash = `${json.db.lastUpdated || ''}_${json.db.sales?.length || 0}_${json.db.receipts?.length || 0}_${json.db.purchases?.length || 0}_${json.db.customers?.length || 0}_${json.db.items?.length || 0}_${json.db.expenses?.length || 0}`;
        }
      }
    } catch (e) {
      console.warn('HTTP fallback action POST failed:', e);
    }

    // 3. Mirror to Firebase if configured
    try {
      if (action === 'SAVE_SALE') await firebaseActions.saveSale(payload);
      else if (action === 'DELETE_SALE') await firebaseActions.deleteSale(payload);
      else if (action === 'SAVE_RECEIPT') await firebaseActions.saveReceipt(payload);
      else if (action === 'DELETE_RECEIPT') await firebaseActions.deleteReceipt(payload);
      else if (action === 'SAVE_CUSTOMER') await firebaseActions.saveCustomer(payload);
      else if (action === 'DELETE_CUSTOMER') await firebaseActions.deleteCustomer(payload);
      else if (action === 'SAVE_ITEMS') await firebaseActions.saveItems(payload);
      else if (action === 'SAVE_SHOP') await firebaseActions.saveShop(payload);
    } catch {
      // Ignore
    }
  },
};
