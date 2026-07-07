/**
 * Printer settings persistence.
 *
 * Versioned localStorage schema:
 *
 * USB:
 * { version: 1, type: 'usb', printer: { name, vendorId, productId } }
 *
 * Bluetooth:
 * { version: 1, type: 'bluetooth', printer: { name, address } }
 *
 * Browser:
 * { version: 1, type: 'browser', printer: null }
 */

const STORAGE_KEY = 'nazmart_printer_settings';
const CURRENT_VERSION = 1;

function isValid(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.version !== CURRENT_VERSION) return false;
  if (!['usb', 'bluetooth', 'browser'].includes(s.type)) return false;
  if (s.type === 'usb')
    return s.printer &&
      typeof s.printer.vendorId === 'number' &&
      typeof s.printer.productId === 'number';
  if (s.type === 'bluetooth')
    return s.printer &&
      typeof s.printer.address === 'string' &&
      s.printer.address.length > 0;
  return true; // browser
}

/** Load saved printer settings. Returns null if missing or corrupt. */
export function loadPrinterSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist printer settings. Silently skips on error. */
export function savePrinterSettings(settings) {
  try {
    if (!isValid(settings)) throw new Error('Invalid printer settings shape');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('[printerSettings] save failed:', e);
  }
}

/** Remove saved printer settings. */
export function clearPrinterSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

export function makeUsbSettings(printer) {
  return {
    version: CURRENT_VERSION,
    type: 'usb',
    printer: {
      name: printer.deviceName || printer.name || 'USB Printer',
      vendorId: Number(printer.vendorId),
      productId: Number(printer.productId),
    },
  };
}

export function makeBluetoothSettings(device) {
  return {
    version: CURRENT_VERSION,
    type: 'bluetooth',
    printer: {
      name: device.name || 'Bluetooth Printer',
      address: device.address,
    },
  };
}

export function makeBrowserSettings() {
  return {
    version: CURRENT_VERSION,
    type: 'browser',
    printer: null,
  };
}
