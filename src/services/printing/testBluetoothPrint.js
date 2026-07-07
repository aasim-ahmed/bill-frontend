import { bluetoothPrinterService } from './bluetoothPrinterService';

/**
 * Temporary isolated test helper for Phase 2 Bluetooth printing verification.
 * 
 * @param {string} [explicitAddress] Optional specific MAC address to connect to.
 * @returns {Promise<{success: boolean, message: string, connectedDevice?: any, bytesSent?: number}>}
 */
export async function testBluetoothPrint(explicitAddress = null) {
    let connected = false;

    try {
        const isSupported = await bluetoothPrinterService.isSupported();
        if (!isSupported.supported) {
            throw new Error('Bluetooth is not supported on this device.');
        }

        const isEnabled = await bluetoothPrinterService.isEnabled();
        if (!isEnabled.enabled) {
            throw new Error('Bluetooth is disabled. Please enable it first.');
        }

        let addressToConnect = explicitAddress;

        if (!addressToConnect) {
            const pairedDevices = await bluetoothPrinterService.getPairedDevices();
            
            if (pairedDevices.length === 0) {
                throw new Error('No paired Bluetooth devices found.');
            }

            if (pairedDevices.length === 1) {
                // Safely auto-select if there's exactly one paired device
                addressToConnect = pairedDevices[0].address;
                console.log(`Auto-selecting only paired device: ${pairedDevices[0].name} (${addressToConnect})`);
            } else {
                throw new Error('Multiple paired devices found. Please provide an explicit MAC address to avoid printing to unintended devices.');
            }
        }

        console.log(`Connecting to Bluetooth device: ${addressToConnect}...`);
        const connectResult = await bluetoothPrinterService.connect(addressToConnect);
        
        if (!connectResult.connected) {
            throw new Error('Failed to connect to the printer.');
        }

        connected = true;
        console.log(`Connected successfully to ${connectResult.name}`);

        const connectionStatus = await bluetoothPrinterService.isConnected();
        if (!connectionStatus.connected) {
            throw new Error('Verification failed: isConnected() returned false after successful connect.');
        }

        // Build a tiny ESC/POS payload
        const ESC = 0x1B;
        const GS = 0x1D;
        
        // Command byte arrays
        const initCmd = [ESC, 0x40];
        const textBytes = Array.from('HELLO NAZMART\n').map(c => c.charCodeAt(0));
        const feedCmd = [ESC, 0x64, 0x04]; // Feed 4 lines
        const cutCmd = [GS, 0x56, 0x00]; // Full cut

        const payload = new Uint8Array([
            ...initCmd,
            ...textBytes,
            ...feedCmd,
            ...cutCmd
        ]);

        console.log('Sending print payload...');
        const printResult = await bluetoothPrinterService.printEscPos(payload);

        return {
            success: true,
            message: 'Physical test completed successfully.',
            connectedDevice: connectResult,
            bytesSent: printResult.bytesSent
        };

    } catch (error) {
        console.error('Bluetooth test failed:', error);
        return {
            success: false,
            message: error.message || 'Unknown error occurred during test.',
        };
    } finally {
        if (connected) {
            console.log('Disconnecting printer...');
            await bluetoothPrinterService.disconnect();
            console.log('Disconnected.');
        }
    }
}
