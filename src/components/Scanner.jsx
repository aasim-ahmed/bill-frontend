import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useZxing } from 'react-zxing';
import axios from 'axios';

const API = 'https://bill-backend-w5f7.onrender.com';

// Minimum ms between two accepted scans — prevents double-fire from the same barcode
const SCAN_DEBOUNCE_MS = 1500;

// Source badge labels
const SOURCE_LABEL = {
  open_food_facts: 'Open Food Facts',
  upc_item_db: 'UPC Item DB',
  go_upc: 'go-upc',
  barcode_spider: 'Barcode Spider',
};

/**
 * Props:
 *   onAddProduct(product)  – called when a product is ready to add
 *   isScanning              – controlled by parent (Billing.jsx)
 *   setIsScanning           – setter from parent
 */
export default function Scanner({ onAddProduct, isScanning, setIsScanning }) {
  const [isProcessing, setIsProcessing] = useState(false);  // true while API call is in-flight
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanError, setScanError] = useState('');     // toast for network errors

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productSource, setProductSource] = useState(null);  // which API found it
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const priceInputRef = useRef(null);
  const lastScanRef = useRef(0);   // timestamp of last accepted scan

  // ── Scanner ─────────────────────────────────────────────────────────────────
  const { ref } = useZxing({
    paused: !isScanning,
    onDecodeResult: useCallback((result) => {
      const now = Date.now();
      if (now - lastScanRef.current < SCAN_DEBOUNCE_MS) return;  // debounce
      lastScanRef.current = now;

      const barcode = result.getText().trim();
      if (!barcode) return;

      console.log('[Scanner] barcode:', JSON.stringify(barcode));
      setScannedBarcode(barcode);
      setIsScanning(false);
      fetchProduct(barcode);
    }, []),
  });

  // ── Fetch product ────────────────────────────────────────────────────────────
  const fetchProduct = async (barcode) => {
    setIsProcessing(true);
    try {
      const { data } = await axios.get(`${API}/api/products/${barcode}`);
      console.log('[fetchProduct] DB hit:', data.data);
      onAddProduct?.(data.data);
    } catch (err) {
      // Differentiate between 404 (expected, open modal) and 500/Network Error
      if (!err.response || err.response.status !== 404) {
        console.error('[fetchProduct] Network/Server Error:', err.message);
        setScanError('Error: unable to reach server — please check connection.');
        setTimeout(() => setScanError(''), 3500);
        return;
      }

      const errData = err.response?.data || {};
      console.log('[fetchProduct] 404 payload:', errData);
      setUnknownBarcode(barcode);
      setProductName(errData.productName || '');
      setProductImage(errData.imageUrl || '');
      setProductSource(errData.source || null);
      setProductPrice('');
      // If price is missing (from DB cache), prompt user immediately
      setModalError(errData.priceMissing ? 'Price is missing for this item. Please enter it now.' : '');
      setShowModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Auto-focus price when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (showModal) setTimeout(() => priceInputRef.current?.focus(), 100);
  }, [showModal]);

  // ── Keyboard shortcuts inside modal ─────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveProduct();
    if (e.key === 'Escape') closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setModalError('');
  };

  // ── Save product ─────────────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!productName.trim()) return setModalError('Product name is required.');
    const priceNum = parseFloat(productPrice);
    if (isNaN(priceNum) || priceNum < 0) return setModalError('Enter a valid price (≥ 0).');

    setSaving(true);
    setModalError('');
    try {
      const { data } = await axios.post(`${API}/api/products`, {
        name: productName.trim(),
        price: priceNum,
        barcode: unknownBarcode,
      });
      onAddProduct?.(data.data);
      closeModal();
    } catch (err) {
      // 409 = barcode was already cached by the backend → fetch and add
      if (err.response?.status === 409) {
        try {
          const { data } = await axios.get(`${API}/api/products/${unknownBarcode}`);
          onAddProduct?.(data.data);
          closeModal();
          return;
        } catch (_) { }
      }
      setModalError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center w-full h-full relative">

      {/* Network Error Toast */}
      {scanError && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-max max-w-full px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg z-50 animate-fade-in-down">
          {scanError}
        </div>
      )}

      {/* Main Scanner Area */}
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[250px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden relative group transition-colors hover:border-slate-300">

        {/* Camera view */}
        {isScanning ? (
          <>
            <video ref={ref} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

            {/* Scanning Indicator Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              Scanning Barcode…
            </div>
          </>
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-3 text-blue-600">
            <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm font-bold tracking-wide">Processing…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <span className="text-sm font-medium">Camera inactive</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => setIsScanning((s) => !s)}
        disabled={isProcessing}
        className={`w-full mt-4 py-3 px-4 font-bold text-base rounded-xl transition shadow-sm ${isScanning
          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50'
          }`}
      >
        {isScanning ? 'Stop Camera' : 'Start Camera'}
      </button>

      {/* Last Scanned Status */}
      {scannedBarcode && !isProcessing && !isScanning && (
        <div className="w-full mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
          <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider block mb-0.5">Scanned Successfully</span>
          <strong className="text-slate-800 text-sm font-mono tracking-wide">{scannedBarcode}</strong>
        </div>
      )}

      {/* ── Add Product Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onKeyDown={handleKeyDown}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">New Product</h3>
                <p className="text-xs text-slate-500 font-mono tracking-wide mt-0.5">{unknownBarcode}</p>
              </div>
              {productSource && SOURCE_LABEL[productSource] && (
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100">
                  Auto-filled
                </span>
              )}
            </div>

            <div className="p-6">
              {/* Image preview */}
              <div className="flex justify-center mb-6">
                {productImage ? (
                  <img
                    src={productImage}
                    alt="Product"
                    className="h-32 w-32 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                    onError={() => setProductImage('')}
                  />
                ) : (
                  <div className="h-32 w-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                    <svg className="h-8 w-8 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium text-slate-800"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (₹)</label>
                  <input
                    ref={priceInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium text-slate-800"
                    placeholder="0.00"
                  />
                  {modalError && (
                    <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {modalError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Saving…</>
                ) : 'Save Product'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
