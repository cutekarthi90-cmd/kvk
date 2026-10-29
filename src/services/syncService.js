import { Storage } from './storage';
import { firebaseActions } from './firebaseService';

const SERVER_URL_KEY = 'quickbill_server_url';

export const getServerUrl = () => {
  const saved = localStorage.getItem(SERVER_URL_KEY);
  if (saved) return saved;

  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
    // If accessed via HTTPS (like ngrok, cloud, domain)
    if (window.location.protocol === 'https:' || window.location.hostname.includes('ngrok')) {
      return window.location.origin;
    }
    // If accessed on local port 5000
    if (window.location.port === '5000') {
      return window.location.origin;
    }
  }

  const host = window.location.hostname || '192.168.1.23';
  return `http://${host}:5000`;
};

export const setServerUrl = (url) => {
  localStorage.setItem(SERVER_URL_KEY, url);
};

let ws = null;
let statusCallback = null;
let updateCallback = null;
let reconnectTimer = null;

export const SyncService = {
  init: ({ onStatusChange, onDataUpdate }) => {
    statusCallback = onStatusChange;
    updateCallback = onDataUpdate;
    SyncService.connect();
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

    if (statusCallback) statusCallback('connecting');

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

        // Notify server of active client data so waking server preserves local bills
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
          if (msg.type === 'INIT_STATE' || msg.type === 'LIVE_UPDATE') {
            const data = msg.fullData || msg.data;
            if (data && updateCallback) {
              updateCallback(data);
            }
          }
        } catch (e) {
          console.error('Error parsing sync message:', e);
        }
      };

      ws.onclose = () => {
        // Fallback check: test if REST API is responsive
        fetch(`${serverUrl}/api/state`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
          .then((res) => res.json())
          .then((data) => {
            // Server is reachable via REST even if WS proxy had delay
            if (statusCallback) statusCallback('connected');
            if (data && updateCallback) updateCallback(data);
          })
          .catch(() => {
            if (statusCallback) statusCallback('offline');
          });

        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          SyncService.connect();
        }, 3000);
      };

      ws.onerror = () => {
        // Test REST API connectivity
        fetch(`${serverUrl}/api/state`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
          .then((res) => res.json())
          .then((data) => {
            if (statusCallback) statusCallback('connected');
            if (data && updateCallback) updateCallback(data);
          })
          .catch(() => {
            if (statusCallback) statusCallback('offline');
          });
      };
    } catch (e) {
      if (statusCallback) statusCallback('offline');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => SyncService.connect(), 4000);
    }
  },

  // Dispatch an action to all connected phones
  dispatch: async (action, payload) => {
    let sentViaWs = false;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'SYNC_ACTION', action, payload }));
        sentViaWs = true;
      } catch (e) {
        console.warn('WS send failed, using REST fallback', e);
      }
    }

    // Always ensure REST API syncs if WS wasn't open
    if (!sentViaWs) {
      try {
        const serverUrl = getServerUrl();
        await fetch(`${serverUrl}/api/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ action, payload }),
        });
      } catch (e) {
        console.warn('HTTP fallback failed:', e);
      }
    }

    // Also push to Firebase if configured
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
