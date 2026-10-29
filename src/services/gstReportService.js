// GST Monthly Report Service for Auditor Office (Excel / CSV & WhatsApp)
// KVK THANIYA MANDI

import { formatCurrency, formatDate } from './pdfService';

/**
 * Get all available months from sales and purchases (e.g. "2026-10", "2026-09"...)
 */
export const getAvailableMonths = (sales = [], purchases = []) => {
  const monthsSet = new Set();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthsSet.add(currentMonth);

  sales.forEach((s) => {
    if (s.date) monthsSet.add(s.date.substring(0, 7));
  });

  purchases.forEach((p) => {
    if (p.date) monthsSet.add(p.date.substring(0, 7));
  });

  return Array.from(monthsSet).sort().reverse();
};

/**
 * Format month string "2026-10" to readable English/Tamil "October 2026 / அக்டோபர் 2026"
 */
export const formatMonthLabel = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Filter sales and GST purchases for a specific month
 * IMPORTANT AUDITOR RULE: Q-Purchases are 100% EXCLUDED from the auditor report!
 */
export const getMonthlyGSTData = (monthStr, sales = [], purchases = []) => {
  const monthSales = sales.filter((s) => (s.date || '').startsWith(monthStr));
  
  // Exclude all Q Purchases (Kachha / Quotation purchases)
  const monthGstPurchases = purchases.filter(
    (p) => (p.date || '').startsWith(monthStr) && !p.isQPurchase && p.billType !== 'Q_PURCHASE'
  );

  const excludedQPurchases = purchases.filter(
    (p) => (p.date || '').startsWith(monthStr) && (p.isQPurchase || p.billType === 'Q_PURCHASE')
  );

  // Sales Totals
  const totalSalesAmount = monthSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
  const totalSalesBags = monthSales.reduce(
    (sum, s) => sum + (s.items || []).reduce((isum, i) => isum + (Number(i.qty) || 0), 0),
    0
  );

  // Purchase Totals (GST only)
  const totalGstPurchaseAmount = monthGstPurchases.reduce(
    (sum, p) => sum + (Number(p.grandTotal) || 0),
    0
  );
  const totalGstPurchaseBags = monthGstPurchases.reduce(
    (sum, p) => sum + (p.items || []).reduce((isum, i) => isum + (Number(i.qty) || 0), 0),
    0
  );

  const totalQPurchaseAmount = excludedQPurchases.reduce(
    (sum, p) => sum + (Number(p.grandTotal) || 0),
    0
  );

  return {
    monthStr,
    monthLabel: formatMonthLabel(monthStr),
    sales: monthSales,
    gstPurchases: monthGstPurchases,
    excludedQPurchases,
    totalSalesAmount,
    totalSalesBags,
    totalGstPurchaseAmount,
    totalGstPurchaseBags,
    totalQPurchaseAmount,
  };
};

/**
 * Export Monthly GST Report as Excel-compatible CSV with UTF-8 BOM
 */
export const exportMonthlyGSTExcel = (gstData, shop = {}) => {
  const { monthLabel, sales, gstPurchases, totalSalesAmount, totalGstPurchaseAmount } = gstData;

  const rows = [];

  // Title Headers
  rows.push([`"${shop.name || 'KVK THANIYA MANDI'}"`]);
  rows.push([`"GSTIN: ${shop.gstin || '33BJGPV4768L1ZH'} | PAN: ${shop.pan || 'BJGPV4768L'}"`]);
  rows.push([`"MONTHLY GST REPORT FOR AUDITOR OFFICE - ${monthLabel.toUpperCase()}"`]);
  rows.push([`"Generated on: ${new Date().toLocaleDateString('en-IN')}"`]);
  rows.push([]);

  // SECTION 1: OUTWARD SUPPLIES (SALES)
  rows.push(['"--- SECTION 1: GSTR-1 OUTWARD SUPPLIES (SALES BILLS) ---"']);
  rows.push([
    '"S.No"',
    '"Date"',
    '"Invoice No"',
    '"Customer Name"',
    '"Customer Phone"',
    '"Customer GSTIN"',
    '"Items Details"',
    '"Total Bags (50kg)"',
    '"Taxable Value (Rs.)"',
    '"Payment Status"',
  ]);

  sales.forEach((s, idx) => {
    const itemsDesc = (s.items || [])
      .map((i) => `${i.name} (${i.qty} Bag @ Rs.${i.price})`)
      .join('; ');
    const bagsCount = (s.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    rows.push([
      idx + 1,
      `"${s.date}"`,
      `"No. ${s.invoiceNo}"`,
      `"${(s.customerName || 'Cash Customer').replace(/"/g, '""')}"`,
      `"${s.customerPhone || ''}"`,
      `"${s.customerGstin || 'URP'}"`,
      `"${itemsDesc.replace(/"/g, '""')}"`,
      bagsCount,
      Number(s.grandTotal).toFixed(2),
      `"${s.paymentStatus}"`,
    ]);
  });

  rows.push([
    '""',
    '""',
    '""',
    '"TOTAL SALES"',
    '""',
    '""',
    '""',
    gstData.totalSalesBags,
    totalSalesAmount.toFixed(2),
    '""',
  ]);
  rows.push([]);
  rows.push([]);

  // SECTION 2: INWARD SUPPLIES (PURCHASES) - STRICTLY EXCLUDING Q PURCHASE
  rows.push([
    '"--- SECTION 2: GSTR-2B INWARD SUPPLIES (REGULAR GST PURCHASES ONLY) ---"',
  ]);
  rows.push(['"*NOTE: Unofficial Q-Purchases are STRICTLY EXCLUDED from this report*"']);
  rows.push([
    '"S.No"',
    '"Date"',
    '"Bill No / Ref"',
    '"Supplier Name"',
    '"Supplier Phone"',
    '"Supplier GSTIN"',
    '"Items Details"',
    '"Total Bags (50kg)"',
    '"Discount on Payment (Rs.)"',
    '"Taxable Value (Rs.)"',
  ]);

  gstPurchases.forEach((p, idx) => {
    const itemsDesc = (p.items || [])
      .map((i) => `${i.name} (${i.qty} Bag @ Rs.${i.price})`)
      .join('; ');
    const bagsCount = (p.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const disc = Number(p.discount) || 0;

    rows.push([
      idx + 1,
      `"${p.date}"`,
      `"${p.billNo || `PUR-${idx + 1}`}"`,
      `"${(p.supplierName || 'Mandi Supplier').replace(/"/g, '""')}"`,
      `"${p.supplierPhone || ''}"`,
      `"${p.supplierGstin || 'URP'}"`,
      `"${itemsDesc.replace(/"/g, '""')}"`,
      bagsCount,
      disc.toFixed(2),
      Number(p.grandTotal).toFixed(2),
    ]);
  });

  rows.push([
    '""',
    '""',
    '""',
    '"TOTAL GST PURCHASES"',
    '""',
    '""',
    '""',
    gstData.totalGstPurchaseBags,
    '""',
    totalGstPurchaseAmount.toFixed(2),
  ]);
  rows.push([]);
  rows.push([]);

  // SECTION 3: MONTHLY GST AUDITOR SUMMARY
  rows.push(['"--- SECTION 3: MONTHLY GST EXECUTIVE AUDITOR SUMMARY ---"']);
  rows.push(['"Description"', '"Amount (Rs.)"']);
  rows.push(['"Total Outward Supplies (Gross Sales Turnover)"', totalSalesAmount.toFixed(2)]);
  rows.push(['"Total Inward Supplies (Gross GST Purchases Turnover)"', totalGstPurchaseAmount.toFixed(2)]);
  rows.push(['"Total Sales Invoices Count"', sales.length]);
  rows.push(['"Total GST Purchase Bills Count"', gstPurchases.length]);

  // Convert array of rows to CSV string
  const csvContent = rows.map((e) => e.join(',')).join('\r\n');
  
  // Add UTF-8 BOM so Excel opens Tamil & English characters cleanly without gibberish
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanShop = (shop.name || 'KVK_MANDI').replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${cleanShop}_GST_Report_${gstData.monthStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

/**
 * Text message to share GST Monthly Summary to Auditor on WhatsApp
 */
export const getAuditorWhatsAppText = (gstData, shop = {}) => {
  const { monthLabel, sales, gstPurchases, totalSalesAmount, totalGstPurchaseAmount } = gstData;

  return (
    `🌾 *${shop.name || 'KVK THANIYA MANDI'}* 🌾\n` +
    `GSTIN: *${shop.gstin || '33BJGPV4768L1ZH'}* | PAN: *${shop.pan || 'BJGPV4768L'}*\n` +
    `Chennimalai, Erode - 638 051\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📊 *AUDITOR OFFICE MONTHLY GST REPORT*\n` +
    `📅 Period: *${monthLabel.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `*1. OUTWARD SUPPLIES (SALES)*\n` +
    `• Total Invoices: *${sales.length} Bills*\n` +
    `• Total Bags Sold: *${gstData.totalSalesBags} Bags (50kg)*\n` +
    `• Gross Sales Turnover: *Rs. ${totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n\n` +
    `*2. INWARD SUPPLIES (PURCHASES)*\n` +
    `• Total GST Purchase Bills: *${gstPurchases.length} Bills*\n` +
    `• Total Bags Purchased: *${gstData.totalGstPurchaseBags} Bags*\n` +
    `• Gross GST Purchase Turnover: *Rs. ${totalGstPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*(Detailed Excel CSV Statement downloaded & ready for GSTR-1 / 3B filing)*\n` +
    `Sent from KVK Billing App.`
  );
};
