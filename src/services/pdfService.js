import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency as Rs. X,XX,XXX.XX
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Helper to draw common KVK THANIYA MANDI Bill Header
 */
const drawShopHeader = (doc, shop, title = 'CASH / CREDIT BILL', headerColor = [22, 101, 192]) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top border line
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.5);

  // Top bar: GSTIN on Left, Cell Phones on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const gstinText = shop.gstin ? `GSTIN : ${shop.gstin}` : 'GSTIN : 33BJGPV4768L1ZH';
  const panText = shop.pan ? `PAN No: ${shop.pan}` : 'PAN No: BJGPV4768L';
  doc.text(`${gstinText}   ${panText}`, 14, 10);

  const cellText = shop.phone ? `Cell: ${shop.phone}` : 'Cell: 94866 - 68732 / 94439 - 95160';
  doc.text(cellText, pageWidth - 14, 10, { align: 'right' });

  // Blue Title Banner / Main Header
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.roundedRect(14, 14, pageWidth - 28, 22, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(shop.name || 'KVK THANIYA MANDI', pageWidth / 2, 23, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addr = shop.address || 'No.2/1, P.R.S.Road, Mukasipidariyur, CHENNIMALAI, Erode, Tamilnadu - 638 051.';
  doc.text(addr, pageWidth / 2, 29, { align: 'center' });

  // Document Title Pill (e.g. CASH / CREDIT BILL)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth / 2 - 32, 38, 64, 6.5, 1, 1, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title, pageWidth / 2, 42.5, { align: 'center' });
};

/**
 * 1. SALE INVOICE PDF GENERATOR
 */
export const generateSaleInvoicePDF = (sale, customer, shop) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const isQ = sale.isQSale || sale.billType === 'Q_SALE';
  const billTitle = isQ ? 'ESTIMATE / QUOTATION' : 'CASH / CREDIT BILL';
  const headerTheme = isQ ? [109, 40, 217] : [22, 101, 192];

  drawShopHeader(doc, shop, billTitle, headerTheme);

  // --- Customer & Invoice Info ---
  const startMetaY = 48;

  // Left: Messers / Customer Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, startMetaY, 105, 26, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Messers / Customer:', 18, startMetaY + 6);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(customer?.name || 'Cash Customer', 18, startMetaY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${customer?.phone || 'N/A'}`, 18, startMetaY + 17);
  if (customer?.address) {
    doc.text(customer.address, 18, startMetaY + 22, { maxWidth: 95 });
  }

  // Right: Bill Details Box (Crisp White Background, Clean Border, No Black Shadow)
  const rightX = pageWidth - 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(pageWidth - 72, startMetaY, 58, 26, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(isQ ? 'Q-Ref No:' : 'Bill No:', pageWidth - 68, startMetaY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(headerTheme[0], headerTheme[1], headerTheme[2]);
  const displayBillNo = String(sale.invoiceNo || '1').startsWith('Q-')
    ? String(sale.invoiceNo)
    : (isQ ? `Q-${sale.invoiceNo}` : (String(sale.invoiceNo || '1').startsWith('KVK') ? String(sale.invoiceNo) : `KVK ${sale.invoiceNo || '1'}`));
  doc.text(displayBillNo, rightX - 4, startMetaY + 7, { align: 'right' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - 68, startMetaY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(formatDate(sale.date), rightX - 4, startMetaY + 14, { align: 'right' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', pageWidth - 68, startMetaY + 21);
  const statusColor = sale.paymentStatus === 'PAID' ? [16, 185, 129] : [220, 38, 38];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text((sale.paymentStatus || 'CREDIT').toUpperCase(), rightX - 4, startMetaY + 21, { align: 'right' });

  // Reset text color
  doc.setTextColor(30, 41, 59);

  // --- Items Table ---
  const hasHsn = !isQ || (sale.items || []).some((i) => i.hsn || i.hsnCode);

  const head = hasHsn
    ? [['#', 'Item / Particulars Description', 'HSN/SAC', 'Qty / Weight', 'Rate (Rs.)', 'Amount (Rs.)']]
    : [['#', 'Item / Particulars Description', 'Qty / Weight', 'Rate (Rs.)', 'Amount (Rs.)']];

  const tableData = (sale.items || []).map((item, index) => {
    const row = [
      index + 1,
      item.name,
    ];
    if (hasHsn) {
      row.push(item.hsn || item.hsnCode || '-');
    }
    row.push(
      `${item.qty} ${item.unit || 'Bag'}`,
      Number(item.price).toFixed(2),
      (Number(item.qty) * Number(item.price)).toFixed(2)
    );
    return row;
  });

  autoTable(doc, {
    startY: startMetaY + 29,
    head,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [22, 101, 192],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8.5,
    },
    columnStyles: hasHsn
      ? {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        }
      : {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 32, halign: 'right' },
        },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    margin: { left: 14, right: 14 },
  });

  // --- Total Summary Box ---
  let currentY = doc.lastAutoTable.finalY + 6;
  const sumX = pageWidth - 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  doc.text('Subtotal:', sumX - 45, currentY);
  doc.text(formatCurrency(sale.subTotal || sale.grandTotal), sumX, currentY, { align: 'right' });
  currentY += 5.5;

  if (Number(sale.discount) > 0) {
    doc.text('Discount:', sumX - 45, currentY);
    doc.text(`- ${formatCurrency(sale.discount)}`, sumX, currentY, { align: 'right' });
    currentY += 5.5;
  }

  // Grand Total highlight box
  doc.setFillColor(241, 245, 249);
  doc.rect(sumX - 70, currentY - 2, 70, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(22, 101, 192);
  doc.text('Grand Total:', sumX - 66, currentY + 4);
  doc.text(formatCurrency(sale.grandTotal), sumX - 4, currentY + 4, { align: 'right' });
  currentY += 13;

  // Paid & Balance row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  if (Number(sale.paidAmount) > 0) {
    doc.text('Amount Received:', sumX - 45, currentY);
    doc.text(formatCurrency(sale.paidAmount), sumX, currentY, { align: 'right' });
    currentY += 5.5;
  }

  const balanceRemaining = Math.max(0, (Number(sale.grandTotal) || 0) - (Number(sale.paidAmount) || 0));
  if (balanceRemaining > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Balance Due:', sumX - 45, currentY);
    doc.text(formatCurrency(balanceRemaining), sumX, currentY, { align: 'right' });
    currentY += 5.5;
    doc.setTextColor(30, 41, 59);
  }

  // --- Terms & Signatory Footer ---
  const footerY = Math.max(currentY + 12, 255);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(shop.terms || 'Thank you for your business! Goods once sold cannot be taken back.', 14, footerY);

  if (shop.upiId) {
    doc.text(`Pay via UPI: ${shop.upiId}`, 14, footerY + 5);
  }

  // Authorized Signatory
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${shop.name || 'KVK THANIYA MANDI'}`, rightX - 52, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', rightX - 52, footerY + 16);
  doc.line(rightX - 55, footerY + 12, rightX, footerY + 12);

  return doc;
};

/**
 * 2. RECEIPT VOUCHER PDF GENERATOR
 */
export const generateReceiptPDF = (receipt, customer, shop, previousBalance = 0) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  drawShopHeader(doc, shop, 'PAYMENT RECEIPT VOUCHER', [16, 185, 129]);

  const startMetaY = 48;
  const rightX = pageWidth - 14;

  // Receipt Meta
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', 14, startMetaY);
  doc.setTextColor(16, 185, 129);
  doc.text(`No. ${receipt.receiptNo || '1'}`, 38, startMetaY);

  doc.setTextColor(30, 41, 59);
  doc.text('Date:', rightX - 45, startMetaY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(receipt.date), rightX, startMetaY, { align: 'right' });

  // Customer Card Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startMetaY + 6, pageWidth - 28, 25, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Received with thanks from:', 20, startMetaY + 13);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(customer?.name || 'Customer', 20, startMetaY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${customer?.phone || 'N/A'} ${customer?.address ? ` | ${customer.address}` : ''}`, 20, startMetaY + 26);

  // Amount Received Big Highlight
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(14, startMetaY + 35, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AMOUNT RECEIVED', 20, startMetaY + 44);

  doc.setFontSize(16);
  doc.text(formatCurrency(receipt.amount), pageWidth - 20, startMetaY + 49, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Mode: ${(receipt.paymentMode || 'Cash').toUpperCase()} ${receipt.notes ? `(${receipt.notes})` : ''}`, 20, startMetaY + 53);

  // Ledger Balance Impact Table
  const paid = Number(receipt.amount) || 0;
  const prevBal = Number(previousBalance) || 0;
  const remBal = prevBal - paid;

  autoTable(doc, {
    startY: startMetaY + 65,
    head: [['Particulars', 'Amount (Rs.)']],
    body: [
      ['Previous Balance Due', prevBal.toFixed(2)],
      ['Current Payment Received', `- ${paid.toFixed(2)}`],
      ['Remaining Balance Due', remBal.toFixed(2)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
  });

  // Footer & Signature
  const footerY = doc.lastAutoTable.finalY + 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('This is an official computer generated receipt voucher.', 14, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${shop.name || 'KVK THANIYA MANDI'}`, rightX - 52, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', rightX - 52, footerY + 16);
  doc.line(rightX - 55, footerY + 12, rightX, footerY + 12);

  return doc;
};

/**
 * 3. CUSTOMER LEDGER STATEMENT PDF GENERATOR
 */
export const generateLedgerStatementPDF = (customer, transactions, shop, balanceSummary) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  drawShopHeader(doc, shop, 'STATEMENT OF ACCOUNT / LEDGER', [30, 41, 59]);

  const startMetaY = 48;
  const rightX = pageWidth - 14;

  // Customer & Date
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('STATEMENT FOR:', 14, startMetaY);
  doc.setFontSize(11);
  doc.text(customer?.name || 'Customer', 14, startMetaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Phone: ${customer?.phone || 'N/A'} | ${customer?.address || ''}`, 14, startMetaY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Statement Date:', rightX - 45, startMetaY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date().toISOString()), rightX, startMetaY, { align: 'right' });

  // Summary Tiles
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startMetaY + 15, pageWidth - 28, 16, 2, 2, 'F');

  const colWidth = (pageWidth - 28) / 3;
  // Box 1: Total Sales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('TOTAL SALES (DEBIT)', 20, startMetaY + 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(22, 101, 192);
  doc.text(formatCurrency(balanceSummary?.totalSales || 0), 20, startMetaY + 28);

  // Box 2: Total Received
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL RECEIVED (CREDIT)', 20 + colWidth, startMetaY + 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(balanceSummary?.totalPaid || 0), 20 + colWidth, startMetaY + 28);

  // Box 3: Net Outstanding
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CLOSING BALANCE DUE', 20 + colWidth * 2, startMetaY + 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const due = balanceSummary?.netDue || 0;
  doc.setTextColor(due > 0 ? 220 : 16, due > 0 ? 38 : 185, due > 0 ? 38 : 129);
  doc.text(formatCurrency(due), 20 + colWidth * 2, startMetaY + 28);

  // Ledger Table
  const tableData = (transactions || []).map((t, idx) => [
    idx + 1,
    formatDate(t.date),
    t.refNo || t.type,
    t.description || '',
    t.debit > 0 ? Number(t.debit).toFixed(2) : '-',
    t.credit > 0 ? Number(t.credit).toFixed(2) : '-',
    Number(t.balance).toFixed(2),
  ]);

  autoTable(doc, {
    startY: startMetaY + 36,
    head: [['#', 'Date', 'Ref / No.', 'Particulars', 'Debit (+)', 'Credit (-)', 'Balance (Rs.)']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 26, halign: 'left' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // Footer & Signature
  const finalY = doc.lastAutoTable.finalY + 15;
  const footerY = Math.max(finalY, 255);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Please verify all transactions. Contact us immediately for any discrepancies.', 14, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${shop.name || 'KVK THANIYA MANDI'}`, rightX - 52, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', rightX - 52, footerY + 16);
  doc.line(rightX - 55, footerY + 12, rightX, footerY + 12);

  return doc;
};
