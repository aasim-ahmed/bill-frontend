/**
 * Printer Manager — unified print orchestration for NazMart.
 *
 * Public API:
 *   printerManager.printReceipt(receiptData)    → Promise<void>
 *   printerManager.getConfiguredPrinter()        → settings | null
 *   printerManager.setConfiguredPrinter(config)  → void
 *   printerManager.clearConfiguredPrinter()      → void
 *
 * Routing:
 *   non-native platform  → browser provider
 *   native + type=usb    → USB provider
 *   native + type=bt     → Bluetooth provider
 *   native + no config   → throws NO_PRINTER_CONFIGURED
 *
 * Guarantees:
 *   - In-flight guard prevents duplicate print jobs.
 *   - All errors are normalised to user-friendly messages before re-throwing.
 *   - Guard is always released in finally.
 */

import { Capacitor } from '@capacitor/core';
import {
  loadPrinterSettings,
  savePrinterSettings,
  clearPrinterSettings,
} from './printerSettings.js';
import { buildReceiptBytes } from './receiptBuilder.js';
import { printUsb } from './providers/usbPrinterProvider.js';
import { printBluetooth } from './providers/bluetoothPrinterProvider.js';
import { printBrowser } from './providers/browserPrinterProvider.js';

// ── In-flight guard ───────────────────────────────────────────────────────────
let _printing = false;

// ── Error normalisation ───────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  NO_PRINTER_CONFIGURED:    'No printer is configured. Open Printer Settings to choose a printer.',
  PRINTER_NOT_FOUND:        'Saved printer is not connected. Check the connection and try again.',
  USB_PERMISSION_DENIED:    'USB printer access was denied. Please allow access when prompted.',
  BLUETOOTH_PERMISSION_DENIED: 'Bluetooth permission is required. Please grant access when prompted.',
  BLUETOOTH_DISABLED:       'Bluetooth is disabled. Please enable Bluetooth and try again.',
  BLUETOOTH_CONNECT_FAILED: 'Bluetooth printer is unavailable. Turn it on and try again.',
  PRINTER_DISCONNECTED:     'Printer disconnected during printing. Please try again.',
  PRINT_WRITE_FAILED:       'Printing failed. Please reconnect the printer and try again.',
  PRINT_TIMEOUT:            'Printer timed out. Please check the connection.',
  BROWSER_PRINT_FAILED:     'Browser printing failed. Please try again.',
  UNKNOWN_PRINT_ERROR:      'An error occurred while printing.',
};

function normalizeError(err) {
  const code  = err.code || 'UNKNOWN_PRINT_ERROR';
  const text  = ERROR_MESSAGES[code] || err.message || ERROR_MESSAGES.UNKNOWN_PRINT_ERROR;
  const out   = new Error(text);
  out.code    = code;
  out.original = err;
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────
export const printerManager = {
  /** Return the currently saved printer configuration, or null. */
  getConfiguredPrinter() {
    return loadPrinterSettings();
  },

  /** Persist a new printer configuration. */
  setConfiguredPrinter(settings) {
    savePrinterSettings(settings);
  },

  /** Remove the saved printer configuration. */
  clearConfiguredPrinter() {
    clearPrinterSettings();
  },

  /**
   * Print a receipt using the saved configuration.
   *
   * On non-native (browser/desktop):
   *   - Calls window.print(). Caller must have mounted the Receipt DOM first.
   *
   * On native Android:
   *   - Builds ESC/POS bytes from receiptData.
   *   - Routes to the configured USB or Bluetooth provider.
   *   - Throws a user-friendly Error if no printer is configured.
   *
   * @param {Object} receiptData — output of buildReceiptData() in Billing.jsx
   * @throws {Error} with .code and a user-friendly .message
   */
  async printReceipt(receiptData) {
    if (_printing) {
      throw new Error('A print job is already in progress. Please wait.');
    }
    _printing = true;

    try {
      // ── Browser / web platform ──────────────────────────────────────────
      if (!Capacitor.isNativePlatform()) {
        await printBrowser();
        return;
      }

      // ── Native Android ──────────────────────────────────────────────────
      const settings = loadPrinterSettings();
      if (!settings) {
        const err = new Error();
        err.code = 'NO_PRINTER_CONFIGURED';
        throw err;
      }

      const bytes = buildReceiptBytes(receiptData);

      if (settings.type === 'usb') {
        await printUsb(settings.printer, bytes);

      } else if (settings.type === 'bluetooth') {
        await printBluetooth(settings.printer, bytes);

      } else if (settings.type === 'browser') {
        // Browser printing on native: best-effort window.print()
        await printBrowser();

      } else {
        const err = new Error();
        err.code = 'UNKNOWN_PRINT_ERROR';
        throw err;
      }
    } catch (err) {
      throw normalizeError(err);
    } finally {
      _printing = false;
    }
  },
};
