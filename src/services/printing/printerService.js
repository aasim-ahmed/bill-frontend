/**
 * printerService — unified printing API for NazMart.
 *
 * Public API:
 *   printerService.printReceipt(receiptData) → Promise<void>
 *
 * Behaviour:
 *   - Android (Capacitor native): discovers USB printer, requests permission
 *     (cached), generates ESC/POS bytes, sends via UsbEscPosPrinter plugin.
 *   - Desktop browser: renders receipt via window.print().
 *
 * No caller needs to know which platform is in use.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { buildReceiptBytes } from './receiptBuilder.js';

// ── Native plugin (Android only) ─────────────────────────────────────────────

const UsbEscPosPrinter = registerPlugin('UsbEscPosPrinter');

// ── Printer cache ─────────────────────────────────────────────────────────────

const PRINTER_CACHE_KEY = 'nazmart_cached_printer';

function loadCachedPrinter() {
  try {
    const raw = localStorage.getItem(PRINTER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePrinterToCache(printer) {
  try {
    localStorage.setItem(PRINTER_CACHE_KEY, JSON.stringify(printer));
  } catch {
    // localStorage unavailable — skip cache silently
  }
}

// ── Low-level USB helpers ─────────────────────────────────────────────────────

/**
 * Discover all USB printers connected to the device.
 * Returns an empty array on non-native platforms.
 *
 * @returns {Promise<Array<{deviceName, vendorId, productId}>>}
 */
async function getUsbPrinters() {
  if (!Capacitor.isNativePlatform()) return [];
  const response = await UsbEscPosPrinter.getDevices();
  return response.devices || [];
}

/**
 * Request USB permission for a specific printer.
 * Returns true if already granted or if the user grants it now.
 *
 * @param {number} vendorId
 * @param {number} productId
 * @returns {Promise<boolean>}
 */
async function requestUsbPermission(vendorId, productId) {
  if (!Capacitor.isNativePlatform()) return false;
  const response = await UsbEscPosPrinter.requestPermission({ vendorId, productId });
  return response.granted;
}

/**
 * Send raw ESC/POS bytes to the printer via USB bulk transfer.
 *
 * @param {number}     vendorId
 * @param {number}     productId
 * @param {Uint8Array} data
 * @returns {Promise<void>}
 */
async function sendBytesToPrinter(vendorId, productId, data) {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }

  const response = await UsbEscPosPrinter.print({
    vendorId,
    productId,
    data: btoa(binary),
  });

  if (!response.success) {
    throw new Error('USB bulk transfer failed.');
  }
}

// ── Native print flow ─────────────────────────────────────────────────────────

/**
 * Full native Android USB print flow:
 *   1. Check cache for previously used printer.
 *   2. If not cached (or device disappeared), discover printers.
 *   3. Request permission if not already granted.
 *   4. Send ESC/POS bytes.
 *   5. Cache the successful printer.
 *
 * @param {Object} receiptData — output of buildReceiptData()
 * @returns {Promise<void>}
 */
async function printNative(receiptData) {
  // 1. Try cached printer first
  let printer = loadCachedPrinter();

  if (printer) {
    // Verify device is still connected
    const connected = await getUsbPrinters();
    const stillHere = connected.some(
      (d) => d.vendorId === printer.vendorId && d.productId === printer.productId
    );
    if (!stillHere) printer = null;
  }

  // 2. Discover if no cached printer
  if (!printer) {
    const printers = await getUsbPrinters();
    if (printers.length === 0) {
      throw new Error('No USB printer found. Please connect a printer and try again.');
    }
    printer = printers[0];
  }

  // 3. Request permission (plugin returns granted:true immediately if already permitted)
  const granted = await requestUsbPermission(printer.vendorId, printer.productId);
  if (!granted) {
    throw new Error('USB printer permission was denied. Please allow access and try again.');
  }

  // 4. Build and send ESC/POS bytes
  const bytes = buildReceiptBytes(receiptData);
  await sendBytesToPrinter(printer.vendorId, printer.productId, bytes);

  // 5. Cache successful printer
  savePrinterToCache({ vendorId: printer.vendorId, productId: printer.productId });
}

// ── Browser print flow ────────────────────────────────────────────────────────

/**
 * Trigger the browser's native print dialog.
 * Resolves when the print dialog closes.
 *
 * @returns {Promise<void>}
 */
function printBrowser() {
  return new Promise((resolve) => {
    const finish = () => {
      window.removeEventListener('afterprint', finish);
      resolve();
    };

    window.addEventListener('afterprint', finish, { once: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Fallback: resolve after 500ms even if afterprint doesn't fire
        setTimeout(finish, 500);
      });
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const printerService = {
  /**
   * Print a receipt. Automatically selects native USB or browser printing
   * based on the current platform.
   *
   * @param {Object} receiptData — output of buildReceiptData() in Billing.jsx
   * @returns {Promise<void>}
   * @throws {Error} with a user-friendly message on failure
   */
  async printReceipt(receiptData) {
    if (Capacitor.isNativePlatform()) {
      await printNative(receiptData);
    } else {
      await printBrowser();
    }
  },
};