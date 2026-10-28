import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// Format phone number for WhatsApp: ensure 91 country code for Indian numbers if not already present
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  return cleaned;
};

/**
 * Universal PDF WhatsApp Sharing:
 * Supports:
 * 1. Capacitor Native Android (Writes to cache -> Shares via Android Intent to WhatsApp)
 * 2. Web Share API (Mobile Chrome / Safari native share sheet)
 * 3. Fallback (Direct PDF download + Opens WhatsApp Web/App chat)
 */
export const sharePdfToWhatsApp = async ({
  doc,
  fileName = 'document.pdf',
  phone = '',
  customerName = '',
  messageText = '',
}) => {
  const isNative = Capacitor.isNativePlatform();
  const pdfBlob = doc.output('blob');
  const targetPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(messageText);

  // 1. CAPACITOR NATIVE ANDROID
  if (isNative) {
    try {
      const base64Data = await blobToBase64(pdfBlob);
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        text: messageText,
        url: saved.uri,
        dialogTitle: 'Share PDF via WhatsApp',
      });

      return { success: true, mode: 'capacitor_native' };
    } catch (e) {
      console.warn('Capacitor native share failed, falling back:', e);
    }
  }

  // 2. MOBILE BROWSER WEB SHARE API (Supports file attachment directly!)
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: fileName,
        text: messageText,
      });
      return { success: true, mode: 'web_share_file' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, using download fallback:', err);
      } else {
        return { success: true, mode: 'cancelled_by_user' };
      }
    }
  }

  // 3. FALLBACK: DOWNLOAD PDF + OPEN WHATSAPP CHAT
  doc.save(fileName);

  if (targetPhone) {
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  }

  return {
    success: true,
    mode: 'download_and_whatsapp_chat',
    info: 'PDF downloaded! WhatsApp chat opened to attach the file.',
  };
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};
