import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  loadPrinterSettings,
  clearPrinterSettings,
  makeUsbSettings,
  makeBluetoothSettings,
  makeBrowserSettings,
} from '../services/printing/printerSettings';
import { printerManager } from '../services/printing/printerManager';
import {
  getUsbPrinters,
  printUsb,
} from '../services/printing/providers/usbPrinterProvider';
import {
  requestBluetoothPermissions,
  getPairedBluetoothDevices,
  printBluetooth,
} from '../services/printing/providers/bluetoothPrinterProvider';
import { buildReceiptBytes } from '../services/printing/receiptBuilder';

const IS_NATIVE = Capacitor.isNativePlatform();

/** Minimal test receipt for verifying printer connectivity. */
function makeTestReceiptData() {
  return {
    billNumber: 'TEST',
    date: new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
    cashier: 'NazMart',
    customer: 'Printer Test',
    items: [{ name: 'Test Item', qty: 1, price: 10, total: 10 }],
    subtotal: 10,
    discountAmt: 0,
    discountPct: 0,
    tax: 0,
    total: 10,
  };
}

export default function PrinterSettings({ onNavigate }) {
  const [tab, setTab]           = useState(IS_NATIVE ? 'usb' : 'browser');
  const [savedConfig, setSaved] = useState(() => loadPrinterSettings());
  const [busy, setBusy]         = useState(false);
  const [status, setStatus]     = useState(null); // { text, type: 'info'|'ok'|'error' }

  // USB state
  const [usbDevices, setUsbDevices] = useState([]);

  // Bluetooth state
  const [btDevices, setBtDevices] = useState([]);

  const reloadConfig = () => setSaved(loadPrinterSettings());

  const msg = (text, type = 'info') => setStatus({ text, type });
  const clearMsg = () => setStatus(null);

  const handleForget = () => {
    clearPrinterSettings();
    reloadConfig();
    setUsbDevices([]);
    setBtDevices([]);
    msg('Printer forgotten. Select a new printer below.', 'info');
  };

  const switchTab = (t) => {
    setTab(t);
    setUsbDevices([]);
    setBtDevices([]);
    clearMsg();
  };

  // ── USB ────────────────────────────────────────────────────────────────────

  const handleDiscoverUsb = async () => {
    if (busy) return;
    setBusy(true);
    setUsbDevices([]);
    msg('Discovering USB printers…');
    try {
      const devices = await getUsbPrinters();
      setUsbDevices(devices);
      if (devices.length === 0) {
        msg('No USB printers found. Connect the printer via OTG cable and try again.', 'error');
      } else {
        msg(`Found ${devices.length} printer${devices.length > 1 ? 's' : ''}. Tap "Test & Save" to verify and save.`, 'info');
      }
    } catch (e) {
      msg('Discovery failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTestSaveUsb = async (printer) => {
    if (busy) return;
    setBusy(true);
    msg(`Connecting to ${printer.deviceName || printer.name || 'printer'}…`);
    try {
      const bytes = buildReceiptBytes(makeTestReceiptData());
      await printUsb(printer, bytes);
      printerManager.setConfiguredPrinter(makeUsbSettings(printer));
      reloadConfig();
      msg('✓ Test print successful! USB printer saved.', 'ok');
    } catch (e) {
      msg('Test failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Bluetooth ──────────────────────────────────────────────────────────────

  const handleLoadBluetooth = async () => {
    if (busy) return;
    setBusy(true);
    setBtDevices([]);
    msg('Requesting Bluetooth permissions…');
    try {
      const perms = await requestBluetoothPermissions();
      if (!perms.connectGranted) {
        msg('Bluetooth permission denied. Please grant access when prompted.', 'error');
        return;
      }
      msg('Loading paired devices…');
      const devices = await getPairedBluetoothDevices();
      setBtDevices(devices);
      if (devices.length === 0) {
        msg('No paired devices found. Pair your printer in Android Settings first, then try again.', 'error');
      } else {
        msg(`Found ${devices.length} paired device${devices.length > 1 ? 's' : ''}. Tap "Test & Save" next to your printer.`, 'info');
      }
    } catch (e) {
      msg('Failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTestSaveBluetooth = async (device) => {
    if (busy) return;
    setBusy(true);
    msg(`Connecting to ${device.name || device.address}…`);
    try {
      const bytes = buildReceiptBytes(makeTestReceiptData());
      await printBluetooth({ address: device.address }, bytes);
      printerManager.setConfiguredPrinter(makeBluetoothSettings(device));
      reloadConfig();
      msg('✓ Test print successful! Bluetooth printer saved.', 'ok');
    } catch (e) {
      msg('Test failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Browser ────────────────────────────────────────────────────────────────

  const handleSaveBrowser = () => {
    printerManager.setConfiguredPrinter(makeBrowserSettings());
    reloadConfig();
    msg('✓ Browser printing saved. Use "Print Bill" to open the print dialog.', 'ok');
  };

  // ── Status badge colour ────────────────────────────────────────────────────

  const statusCls =
    status?.type === 'ok'    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
    status?.type === 'error' ? 'bg-red-50 border-red-200 text-red-800'             :
                               'bg-blue-50 border-blue-200 text-blue-800';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm shrink-0 flex items-center gap-4">
        <button
          onClick={() => onNavigate?.('billing')}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition px-2 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-slate-900">Printer Settings</h1>
      </header>

      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-xl mx-auto space-y-5">

          {/* ── Current printer card ─────────────────────────────────────── */}
          {savedConfig ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Printer
                </p>
                <p className="text-base font-bold text-slate-900">
                  {savedConfig.printer?.name || 'Browser Printing'}
                </p>
                <p className="text-sm text-slate-500 mt-0.5 capitalize">
                  {savedConfig.type} printing
                  {savedConfig.type === 'usb' &&
                    ` · VID:${savedConfig.printer.vendorId} PID:${savedConfig.printer.productId}`}
                  {savedConfig.type === 'bluetooth' &&
                    ` · ${savedConfig.printer.address}`}
                </p>
              </div>
              <button
                onClick={handleForget}
                className="shrink-0 text-sm font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Forget
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm font-medium">
              No printer configured. Select a printer type below to get started.
            </div>
          )}

          {/* ── Transport tabs (Android only) ────────────────────────────── */}
          {IS_NATIVE && (
            <div className="flex gap-2">
              {[
                { key: 'usb',       label: 'USB' },
                { key: 'bluetooth', label: 'Bluetooth' },
                { key: 'browser',   label: 'Browser' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                    tab === key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Status message ───────────────────────────────────────────── */}
          {status && (
            <div className={`rounded-xl px-4 py-3 border text-sm font-medium ${statusCls}`}>
              {status.text}
            </div>
          )}

          {/* ── USB tab ─────────────────────────────────────────────────── */}
          {IS_NATIVE && tab === 'usb' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 mb-1">USB Printer</h2>
                <p className="text-sm text-slate-500">
                  Connect your thermal printer via a USB OTG cable, then tap Discover.
                </p>
              </div>
              <button
                onClick={handleDiscoverUsb}
                disabled={busy}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {busy ? 'Working…' : 'Discover USB Printers'}
              </button>

              {usbDevices.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Printer
                  </p>
                  {usbDevices.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border border-slate-200 rounded-xl p-4 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {d.deviceName || `USB Device ${idx + 1}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          VID:{d.vendorId} · PID:{d.productId}
                        </p>
                      </div>
                      <button
                        onClick={() => handleTestSaveUsb(d)}
                        disabled={busy}
                        className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        Test &amp; Save
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Bluetooth tab ────────────────────────────────────────────── */}
          {IS_NATIVE && tab === 'bluetooth' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 mb-1">Bluetooth Printer</h2>
                <p className="text-sm text-slate-500">
                  Pair your printer in Android Settings first, then power it on and tap Load Paired Devices.
                </p>
              </div>
              <button
                onClick={handleLoadBluetooth}
                disabled={busy}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {busy ? 'Working…' : 'Load Paired Devices'}
              </button>

              {btDevices.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Printer
                  </p>
                  {btDevices.map((d) => (
                    <div
                      key={d.address}
                      className="flex items-center justify-between border border-slate-200 rounded-xl p-4 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {d.name || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.address}</p>
                      </div>
                      <button
                        onClick={() => handleTestSaveBluetooth(d)}
                        disabled={busy}
                        className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        Test &amp; Save
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Browser tab (also shown on non-native) ───────────────────── */}
          {(!IS_NATIVE || tab === 'browser') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 mb-1">Browser Printing</h2>
                <p className="text-sm text-slate-500">
                  Opens the browser's print dialog. Works on desktop and laptop browsers.
                </p>
              </div>
              <button
                onClick={handleSaveBrowser}
                disabled={busy}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Use Browser Printing
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
