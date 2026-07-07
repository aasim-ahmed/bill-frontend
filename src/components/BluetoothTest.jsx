import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { bluetoothPrinterService } from '../services/printing/bluetoothPrinterService';

export default function BluetoothTest() {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState('');
  const [devices, setDevices] = useState([]);
  const [showSelector, setShowSelector] = useState(false);

  // Only render on native Android
  if (Capacitor.getPlatform() !== 'android') {
    return null;
  }

  const runTest = async (explicitAddress = null) => {
    let connected = false;
    try {
      setShowSelector(false);
      
      const isSupported = await bluetoothPrinterService.isSupported();
      if (!isSupported.supported) throw new Error('Bluetooth not supported');
      
      const isEnabled = await bluetoothPrinterService.isEnabled();
      if (!isEnabled.enabled) throw new Error('Bluetooth is disabled');

      let targetAddress = explicitAddress;

      if (!targetAddress) {
        setStage('Requesting Bluetooth permission...');
        const permResult = await bluetoothPrinterService.requestPermissions();
        setStage(`Permission result: connect=${permResult.connectGranted} scan=${permResult.scanGranted}`);
        
        if (!permResult.connectGranted) {
            throw new Error('Bluetooth connection permission denied');
        }
        if (!permResult.scanGranted) {
            throw new Error('Bluetooth scan permission denied');
        }

        setStage('Loading paired devices...');
        const paired = await bluetoothPrinterService.getPairedDevices();
        if (paired.length === 0) {
          throw new Error('Zero paired devices found. Please pair a printer in Android Settings first.');
        }

        if (paired.length === 1) {
          targetAddress = paired[0].address;
          setStage(`Selected: ${paired[0].name} ${targetAddress}`);
        } else {
          setDevices(paired);
          setShowSelector(true);
          setStage('Waiting for device selection...');
          return; // Stop execution here, wait for user selection
        }
      }

      setStage(`Connecting to ${targetAddress}...`);
      const connectResult = await bluetoothPrinterService.connect(targetAddress);
      
      if (!connectResult.connected) {
        throw new Error('Connection failed natively.');
      }
      
      connected = true;
      
      setStage(`Checking connection status...`);
      const connStatus = await bluetoothPrinterService.isConnected();
      setStage(`Connected: ${connStatus.connected}`);
      
      if (!connStatus.connected) {
        throw new Error('isConnected() returned false after successful connect.');
      }

      setStage('Sending bytes...');
      const ESC = 0x1B;
      const GS = 0x1D;
      
      const initCmd = [ESC, 0x40];
      const textBytes = Array.from('HELLO NAZMART\n').map(c => c.charCodeAt(0));
      const feedCmd = [ESC, 0x64, 0x04];
      const cutCmd = [GS, 0x56, 0x00];

      const payload = new Uint8Array([
          ...initCmd,
          ...textBytes,
          ...feedCmd,
          ...cutCmd
      ]);

      const printResult = await bluetoothPrinterService.printEscPos(payload);
      setStage(`Print result: success=${printResult.success}, bytes=${printResult.bytesSent}`);

    } catch (err) {
      setStage(`Error: ${err.message}`);
    } finally {
      if (connected) {
        setStage(prev => prev + '\nDisconnecting...');
        await bluetoothPrinterService.disconnect();
        setStage(prev => prev + '\nDisconnected.');
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white p-4 rounded-lg shadow-xl mb-2 border border-slate-200 max-w-sm w-80 text-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Bluetooth Print Test</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>
          
          <button 
            onClick={() => runTest()}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 mb-4"
          >
            Start Test
          </button>

          {showSelector && (
            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded p-2">
              <p className="font-semibold text-xs text-slate-500 mb-1">Select Device:</p>
              {devices.map(d => (
                <button
                  key={d.address}
                  onClick={() => runTest(d.address)}
                  className="w-full text-left p-2 hover:bg-slate-100 rounded text-xs border border-slate-100"
                >
                  <div className="font-medium">{d.name}</div>
                  <div className="text-slate-500">{d.address}</div>
                </button>
              ))}
            </div>
          )}

          <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs font-mono whitespace-pre-wrap min-h-20">
            {stage || 'Ready.'}
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg font-medium hover:bg-blue-700"
        >
          🟦 Test Bluetooth Printer
        </button>
      )}
    </div>
  );
}
