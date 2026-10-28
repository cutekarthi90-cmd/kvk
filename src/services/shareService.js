// Direct WhatsApp & SMS Sharing Service for KVK THANIYA MANDI
import { Capacitor } from '@capacitor/core';

// Format phone number for WhatsApp: ensure 91 country code for Indian numbers
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  return cleaned;
};

/**
 * DIRECT WHATSAPP SHARING:
 * Directly opens WhatsApp chat for that specific customer number with the bill text!
 * No annoying Android "Share 1 file" system picker sheet!
 * Automatically saves the PDF invoice in the background.
 */
export const sharePdfToWhatsApp = async ({
  doc,
  fileName = 'document.pdf',
  phone = '',
  customerName = '',
  messageText = '',
}) => {
  const targetPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(messageText);

  // 1. Always download/save the PDF in the background
  try {
    if (doc) {
      doc.save(fileName);
    }
  } catch (err) {
    console.warn('PDF download error:', err);
  }

  // 2. Direct WhatsApp to Customer Mobile Number!
  if (targetPhone) {
    // Uses direct WhatsApp API link which triggers WhatsApp app directly to that customer
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodedText}`;
    
    // In mobile browsers and PWAs, window.location.href triggers native app opening instantly
    window.location.href = whatsappUrl;

    return {
      success: true,
      mode: 'direct_whatsapp',
      info: 'Opening WhatsApp directly to customer...',
    };
  }

  return {
    success: false,
    info: 'Customer phone number is missing',
  };
};

/**
 * Direct SMS sending via phone's native Messages app
 */
export const sendDirectSMS = (phone, messageText) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(messageText);
  window.location.href = `sms:${cleanPhone}?body=${encoded}`;
  return true;
};
