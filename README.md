# KVK THANIYA MANDI - Multi-Device Billing & Inventory App

A lightning-fast, mobile-first Billing, Inventory, and Ledger application built for **KVK THANIYA MANDI** (Chennimalai, Erode).

Designed for concurrent real-time use across 4–5 mobile phones with instant live synchronization, automatic WhatsApp PDF sharing, regular SMS messaging, purchase stock management, and customer opening balance.

---

## 🌟 Key Features

1. **Tap Pad with Extra Large Letters**:
   - Touch cards designed specifically for mobile screens with bold, readable text.
   - 15 pre-configured grain & mandi items (Ponni Boiled Rice, Kambu, Ragi, Cholam, Coriander Seeds, Groundnut, Gingelly, Dals, etc.).
   - Live stock indicator on each item card.

2. **Single-Button Save & Send**:
   - Only ONE primary button: **`SAVE & SEND BILL`**.
   - Saving immediately triggers WhatsApp PDF sharing and provides a direct 1-tap SMS option.
   - Bill numbers start from **No. 1** and are editable on screen.

3. **1-Tap WhatsApp & SMS Resend for Any Past Bill**:
   - Switch to the **Past Bills** tab.
   - Search by Bill No. or Customer Name.
   - Tap **WhatsApp PDF** or **SMS** next to any bill to re-send anytime.

4. **Customer Opening Balance & Ledger**:
   - Customer Master supports **Opening Balance** (`Debit` / `Credit`).
   - Automatically included in customer net dues, statements, and WhatsApp PDF summaries.

5. **Purchase Bill Entry & Live Stock Tracking**:
   - Record purchases with supplier name, bill number, items, and cost rate.
   - **Current Stock = Initial Stock + Purchases - Sales**.
   - Automatic low-stock warnings and live stock inventory view.

6. **24/7 Cloud Ready (Render & GitHub)**:
   - Zero local server dependency when deployed on Render.
   - Automatic HTTPS (`wss://`) real-time WebSocket sync across all 4G/5G mobile phones worldwide.

---

## 🚀 How to Deploy on GitHub & Render.com

### Step 1: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Enter Repository name: `kvk-thaniya-mandi`
3. Choose **Private** or **Public**.
4. Click **Create repository**.
5. Copy your repository URL (e.g. `https://github.com/YOUR_USERNAME/kvk-thaniya-mandi.git`).

### Step 2: Push this Code to GitHub
Run in terminal / PowerShell:
```bash
git remote add origin https://github.com/YOUR_USERNAME/kvk-thaniya-mandi.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy Free on Render.com
1. Go to [render.com](https://render.com) and Sign In with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your `kvk-thaniya-mandi` repository.
4. Render automatically detects the configuration from `render.yaml` or set:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Deploy Web Service**.
6. In ~2 minutes, Render will give you a permanent live URL:
   `https://kvk-thaniya-mandi.onrender.com`

---

## 📱 Using on Mobile Phones
1. Open the Render URL (or local `http://<IP>:5000`) in Chrome on any mobile phone.
2. Tap the Chrome menu (`⋮`) -> **"Install app"** or **"Add to Home screen"**.
3. The app installs as a native full-screen app with the KVK Thaniya Mandi logo.
4. All phones stay connected in real-time. Any bill created on Phone 1 updates Phones 2, 3, 4, 5 instantly!
