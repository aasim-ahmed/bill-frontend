import { registerPlugin } from '@capacitor/core';

const BluetoothEscPosPrinter = registerPlugin('BluetoothEscPosPrinter');

class BluetoothPrinterService {
    /**
     * Check if Bluetooth is supported on this device.
     * @returns {Promise<{supported: boolean}>}
     */
    async isSupported() {
        if (!BluetoothEscPosPrinter) {
            return { supported: false };
        }
        try {
            return await BluetoothEscPosPrinter.isBluetoothSupported();
        } catch (error) {
            console.error('Error checking if Bluetooth is supported:', error);
            return { supported: false };
        }
    }

    /**
     * Check if Bluetooth is enabled.
     * @returns {Promise<{enabled: boolean}>}
     */
    async isEnabled() {
        if (!BluetoothEscPosPrinter) {
            return { enabled: false };
        }
        try {
            return await BluetoothEscPosPrinter.isBluetoothEnabled();
        } catch (error) {
            console.error('Error checking if Bluetooth is enabled:', error);
            return { enabled: false };
        }
    }

    /**
     * Request user to enable Bluetooth.
     * @returns {Promise<void>}
     */
    async enable() {
        if (!BluetoothEscPosPrinter) {
            throw new Error('BluetoothEscPosPrinter plugin not found');
        }
        await BluetoothEscPosPrinter.enableBluetooth();
    }

    /**
     * Get a list of paired (bonded) devices.
     * @returns {Promise<Array<{name: string, address: string}>>}
     */
    async getPairedDevices() {
        if (!BluetoothEscPosPrinter) {
            return [];
        }
        try {
            const result = await BluetoothEscPosPrinter.getPairedDevices();
            return result.devices || [];
        } catch (error) {
            console.error('Error getting paired devices:', error);
            throw error;
        }
    }

    /**
     * Scan for nearby Bluetooth devices.
     * @returns {Promise<Array<{name: string, address: string, bonded: boolean}>>}
     */
    async scan() {
        if (!BluetoothEscPosPrinter) {
            return [];
        }
        try {
            const result = await BluetoothEscPosPrinter.scanDevices();
            return result.devices || [];
        } catch (error) {
            console.error('Error scanning devices:', error);
            throw error;
        }
    }
    
    /**
     * Check permissions (Standard Capacitor Plugin feature)
     */
    async checkPermissions() {
        if (!BluetoothEscPosPrinter?.checkPermissions) return { granted: false };
        return await BluetoothEscPosPrinter.checkPermissions();
    }
    
    /**
     * Request permissions (Standard Capacitor Plugin feature)
     */
    async requestPermissions() {
        if (!BluetoothEscPosPrinter?.requestBluetoothPermissions) return { connectGranted: false, scanGranted: false };
        return await BluetoothEscPosPrinter.requestBluetoothPermissions();
    }

    /**
     * Connect to a Bluetooth printer by MAC address.
     * @param {string} address 
     * @returns {Promise<{connected: boolean, address: string, name: string}>}
     */
    async connect(address) {
        if (!BluetoothEscPosPrinter) {
            throw new Error('BluetoothEscPosPrinter plugin not found');
        }
        if (!address) {
            throw new Error('MAC address is required to connect');
        }
        try {
            return await BluetoothEscPosPrinter.connect({ address });
        } catch (error) {
            console.error('Error connecting to Bluetooth printer:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the currently connected Bluetooth printer.
     * @returns {Promise<{disconnected: boolean}>}
     */
    async disconnect() {
        if (!BluetoothEscPosPrinter) {
            return { disconnected: true };
        }
        try {
            return await BluetoothEscPosPrinter.disconnect();
        } catch (error) {
            console.error('Error disconnecting from Bluetooth printer:', error);
            return { disconnected: true }; // Treat as disconnected on error
        }
    }

    /**
     * Check if currently connected to a Bluetooth printer.
     * @returns {Promise<{connected: boolean}>}
     */
    async isConnected() {
        if (!BluetoothEscPosPrinter) {
            return { connected: false };
        }
        try {
            return await BluetoothEscPosPrinter.isConnected();
        } catch (error) {
            console.error('Error checking Bluetooth connection status:', error);
            return { connected: false };
        }
    }

    /**
     * Print raw ESC/POS commands (Uint8Array).
     * @param {Uint8Array} data 
     * @returns {Promise<{success: boolean, bytesSent: number}>}
     */
    async printEscPos(data) {
        if (!BluetoothEscPosPrinter) {
            throw new Error('BluetoothEscPosPrinter plugin not found');
        }
        if (!(data instanceof Uint8Array)) {
            throw new Error('Data must be a Uint8Array');
        }

        try {
            // Convert Uint8Array to Base64 safely without spreading (prevents stack overflow on large data)
            let binary = '';
            const len = data.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(data[i]);
            }
            const base64Data = btoa(binary);

            return await BluetoothEscPosPrinter.print({ data: base64Data });
        } catch (error) {
            console.error('Error printing to Bluetooth printer:', error);
            throw error;
        }
    }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
