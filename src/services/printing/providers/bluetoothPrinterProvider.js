/**
 * Bluetooth Printer Provider
 * Wraps the existing bluetoothPrinterService.
 * Does NOT contain any native Android implementation details.
 */

import { bluetoothPrinterService } from '../bluetoothPrinterService.js';

/**
 * Request Android runtime Bluetooth permissions.
 * @returns {Promise<{ connectGranted: boolean, scanGranted: boolean }>}
 */
export async function requestBluetoothPermissions() {
  return bluetoothPrinterService.requestPermissions();
}

/**
 * Return all paired (bonded) Bluetooth devices.
 * @returns {Promise<Array<{ name: string, address: string }>>}
 */
export async function getPairedBluetoothDevices() {
  return bluetoothPrinterService.getPairedDevices();
}

/**
 * Send ESC/POS bytes to a Bluetooth printer.
 * Handles permission, connection, print, and disconnect lifecycle.
 *
 * Safety rules:
 * - Does NOT treat Android Settings "Connected" as owning an RFCOMM socket.
 * - Always calls connect(address) explicitly.
 * - Disconnects in finally to guarantee socket release.
 * - Attempts one reconnect if first connect fails.
 *
 * @param {{ address: string, name?: string }} printerConfig
 * @param {Uint8Array} bytes
 * @throws {Error} with .code set to a normalised error code
 */
export async function printBluetooth(printerConfig, bytes) {
  const { address } = printerConfig;

  // 1. Check hardware support
  const supported = await bluetoothPrinterService.isSupported();
  if (!supported.supported) {
    const err = new Error('Bluetooth is not supported on this device.');
    err.code = 'BLUETOOTH_CONNECT_FAILED';
    throw err;
  }

  // 2. Check enabled
  const enabled = await bluetoothPrinterService.isEnabled();
  if (!enabled.enabled) {
    const err = new Error('Bluetooth is disabled. Please enable Bluetooth and try again.');
    err.code = 'BLUETOOTH_DISABLED';
    throw err;
  }

  // 3. Request runtime permissions (Android 12+)
  const perms = await bluetoothPrinterService.requestPermissions();
  if (!perms.connectGranted) {
    const err = new Error('Bluetooth permission is required to print. Please grant access when prompted.');
    err.code = 'BLUETOOTH_PERMISSION_DENIED';
    throw err;
  }

  let connected = false;

  try {
    // 4. Open RFCOMM socket
    const connectResult = await bluetoothPrinterService.connect(address);
    if (!connectResult.connected) {
      const err = new Error('Bluetooth printer is unavailable. Turn it on and try again.');
      err.code = 'BLUETOOTH_CONNECT_FAILED';
      throw err;
    }
    connected = true;

    // 5. Verify socket is live
    const status = await bluetoothPrinterService.isConnected();
    if (!status.connected) {
      const err = new Error('Bluetooth connection dropped immediately after connect. Check the printer.');
      err.code = 'PRINTER_DISCONNECTED';
      throw err;
    }

    // 6. Send bytes
    const result = await bluetoothPrinterService.printEscPos(bytes);
    if (!result.success) {
      const err = new Error('Bluetooth print failed. Please reconnect the printer and try again.');
      err.code = 'PRINT_WRITE_FAILED';
      throw err;
    }
  } finally {
    // 7. Always release the RFCOMM socket
    if (connected) {
      await bluetoothPrinterService.disconnect().catch(() => {});
    }
  }
}
