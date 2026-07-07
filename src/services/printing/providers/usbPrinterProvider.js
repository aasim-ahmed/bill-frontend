/**
 * USB Printer Provider
 * Wraps the existing UsbEscPosPrinter Capacitor plugin.
 * Does NOT contain any native Android implementation details.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

const UsbEscPosPrinter = registerPlugin('UsbEscPosPrinter');

/**
 * Return all currently connected USB printer devices.
 * @returns {Promise<Array<{deviceName: string, vendorId: number, productId: number}>>}
 */
export async function getUsbPrinters() {
  if (!Capacitor.isNativePlatform()) return [];
  const response = await UsbEscPosPrinter.getDevices();
  return response.devices || [];
}

/**
 * Request USB access permission for a specific device.
 * Returns true immediately if already granted.
 * @returns {Promise<boolean>}
 */
export async function requestUsbPermission(vendorId, productId) {
  if (!Capacitor.isNativePlatform()) return false;
  const response = await UsbEscPosPrinter.requestPermission({ vendorId, productId });
  return !!response.granted;
}

/**
 * Send ESC/POS bytes to a USB printer.
 * Handles device verification and permission internally.
 *
 * @param {{ vendorId: number, productId: number, name?: string }} printerConfig
 * @param {Uint8Array} bytes
 * @throws {Error} with .code set to a normalised error code
 */
export async function printUsb(printerConfig, bytes) {
  const { vendorId, productId } = printerConfig;

  // 1. Verify the device is still connected (one retry attempt)
  const devices = await getUsbPrinters();
  const found = devices.find(
    (d) => d.vendorId === vendorId && d.productId === productId,
  );
  if (!found) {
    const err = new Error('Saved USB printer is not connected. Please plug in the printer and try again.');
    err.code = 'PRINTER_NOT_FOUND';
    throw err;
  }

  // 2. Request permission (Android caches this after first grant)
  const granted = await requestUsbPermission(vendorId, productId);
  if (!granted) {
    const err = new Error('USB printer access was denied. Please allow access when prompted.');
    err.code = 'USB_PERMISSION_DENIED';
    throw err;
  }

  // 3. Encode and send
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const response = await UsbEscPosPrinter.print({
    vendorId,
    productId,
    data: btoa(binary),
  });

  if (!response.success) {
    const err = new Error('Printing failed. Please check the printer connection and try again.');
    err.code = 'PRINT_WRITE_FAILED';
    throw err;
  }
}
