// Direct WhatsApp & SMS Sharing Service for KVK THANIYA MANDI

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
 * Instantly opens WhatsApp directly into the customer's chat with prefilled text!
 * No contact picker, no app selection prompt, no confusing share sheets.
 */
export const openDirectWhatsApp = (phone, messageText) => {
  if (!phone) return false;
  const targetPhone = formatWhatsAppPhone(phone);
  if (!targetPhone) return false;

  const encodedText = encodeURIComponent(messageText);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

  // Direct redirection to WhatsApp
  window.location.href = whatsappUrl;
  return true;
};

/**
 * Share PDF to WhatsApp (Direct without interrupting download prompts)
 */
export const sharePdfToWhatsApp = async ({
  doc,
  fileName = 'document.pdf',
  phone = '',
  customerName = '',
  messageText = '',
}) => {
  return openDirectWhatsApp(phone, messageText);
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

/**
 * Download PDF file directly to device
 */
export const downloadPdfFile = (doc, fileName = 'document.pdf') => {
  try {
    if (doc) {
      doc.save(fileName);
      return true;
    }
  } catch (err) {
    console.error('PDF download error:', err);
  }
  return false;
};
