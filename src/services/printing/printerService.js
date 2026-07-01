import { Capacitor } from '@capacitor/core';

export const printerService = {
  /**
   * Retrieves a list of connected USB printer devices.
   * @returns {Promise<Array>} Array of device objects containing vendorId, productId, deviceName
   */
  async getUsbPrinters() {
    if (!Capacitor.isNativePlatform()) {
      console.warn("USB Printers are only available on native Android platform");
      return [];
    }

    try {
      const response = await Capacitor.Plugins.UsbEscPosPrinter.getDevices();
      return response.devices || [];
    } catch (error) {
      console.error("Failed to get USB printers:", error);
      throw error;
    }
  },

  /**
   * Requests USB permission from the user for a specific device.
   * @param {number} vendorId - The vendor ID of the printer
   * @param {number} productId - The product ID of the printer
   * @returns {Promise<boolean>} True if permission is granted, otherwise throws error
   */
  async requestUsbPermission(vendorId, productId) {
    if (!Capacitor.isNativePlatform()) {
      console.warn("USB Printers are only available on native Android platform");
      return false;
    }

    try {
      const response = await Capacitor.Plugins.UsbEscPosPrinter.requestPermission({ vendorId, productId });
      return response.granted;
    } catch (error) {
      console.error("Failed to request USB permission:", error);
      throw error;
    }
  },

  /**
   * Sends raw ESC/POS byte data to the printer.
   * @param {number} vendorId - The vendor ID of the printer
   * @param {number} productId - The product ID of the printer
   * @param {Uint8Array} data - The raw byte data to send
   * @returns {Promise<boolean>} True if successful, throws on error
   */
  async printEscPos(vendorId, productId, data) {
    if (!Capacitor.isNativePlatform()) {
      console.warn("USB Printers are only available on native Android platform");
      return false;
    }

    try {
      let binary = '';
      for (let i = 0; i < data.byteLength; i++) {
        binary += String.fromCharCode(data[i]);
      }
      const dataBase64 = window.btoa(binary);

      const response = await Capacitor.Plugins.UsbEscPosPrinter.print({
        vendorId,
        productId,
        data: dataBase64
      });
      return response.success;
    } catch (error) {
      console.error("Failed to print ESC/POS data:", error);
      throw error;
    }
  }
};
