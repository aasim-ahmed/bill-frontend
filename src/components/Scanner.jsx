import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://bill-backend-w5f7.onrender.com';

const SOURCE_LABEL = {
  open_food_facts: 'Open Food Facts',
  upc_item_db: 'UPC Item DB',
  go_upc: 'go-upc',
  barcode_spider: 'Barcode Spider',
};

export default function Scanner({ onAddProduct }) {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productSource, setProductSource] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const inputRef = useRef(null);
  const priceInputRef = useRef(null);

  // Auto-focus barcode input
  useEffect(() => {
    if (!showModal && !isProcessing) {
      inputRef.current?.focus();
    }
  }, [showModal, isProcessing]);

  const handleBlur = () => {
    if (!showModal) {
      setTimeout(() => {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          inputRef.current?.focus();
        }
      }, 10);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = inputValue.replace(/\D/g, '');
      if (!barcode) return;

      setIsProcessing(true);
      try {
        const { data } = await axios.get(`${API}/api/products/${barcode}`);
        onAddProduct?.(data.data);
        setInputValue('');
      } catch (err) {
        if (!err.response || err.response.status !== 404) {
          setScanError('Error: unable to reach server — please check connection.');
          setTimeout(() => setScanError(''), 3500);
        } else {
          const errData = err.response?.data || {};
          setUnknownBarcode(barcode);
          setProductName(errData.productName || '');
          setProductImage(errData.imageUrl || '');
          setProductSource(errData.source || null);
          setProductPrice('');
          setModalError(errData.priceMissing ? 'Price is missing for this item. Please enter it now.' : '');
          setShowModal(true);
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Auto-focus price when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => priceInputRef.current?.focus(), 100);
  }, [showModal]);

  const handleModalKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveProduct();
    if (e.key === 'Escape') closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setModalError('');
  };

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
      setInputValue(''); // Clear on successful add
      closeModal();
    } catch (err) {
      if (err.response?.status === 409) {
        try {
          const { data } = await axios.get(`${API}/api/products/${unknownBarcode}`);
          onAddProduct?.(data.data);
          setInputValue('');
          closeModal();
          return;
        } catch (_) { }
      }
      setModalError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full relative">
      {/* Network Error Toast */}
      {scanError && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-max max-w-full px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg z-50 animate-fade-in-down">
          {scanError}
        </div>
      )}

      {/* Main Scanner Area */}
      <div className="w-full flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl relative transition-colors hover:border-slate-300">
        
        <label className="text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          USB Barcode Scanner
        </label>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isProcessing}
          placeholder="Scan barcode..."
          autoFocus
          className="w-full bg-white border-2 border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-center text-xl font-mono shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-300 text-slate-800 disabled:opacity-50"
        />

        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-blue-600 z-10">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-bold tracking-wide">Processing…</span>
          </div>
        )}
      </div>

      {/* ── Add Product Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onKeyDown={handleModalKeyDown}
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
