import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import Scanner from '../components/Scanner';
import CashierLoginModal from '../components/CashierLoginModal';
import Receipt from '../components/printing/Receipt';
import InstallAppButton from '../components/InstallAppButton';

const API = 'https://bill-backend-w5f7.onrender.com';
const CASHIER_KEY = 'billingpos_cashier_name';

export default function Billing({ onNavigate }) {
  // ── Cashier session ──────────────────────────────────────────────────────────
  // Initialise from localStorage so the name survives a page refresh.
  const [cashierName, setCashierName] = useState(
    () => localStorage.getItem(CASHIER_KEY) || ''
  );

  const handleLogin = (name) => {
    localStorage.setItem(CASHIER_KEY, name);
    setCashierName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem(CASHIER_KEY);
    setCashierName('');
    clearCart();
  };

  // ── Cart / bill state ────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [customer, setCustomer] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [toast, setToast] = useState(null);  // { msg, type }

  // ── Receipt / print state ─────────────────────────────────────────────────
  const [lastSavedBill, setLastSavedBill] = useState(null); // { id, created_at, cart snapshot, totals }
  const [receiptData, setReceiptData] = useState(null);
  const [printing, setPrinting] = useState(false);

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editingItem, setEditingItem] = useState(null); // barcode
  const [editForm, setEditForm] = useState({ name: '', price: '', updateDB: true });

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  const handleAddProduct = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.barcode === product.barcode);
      if (existing) {
        showToast(`+1  ${product.name}`);
        return prev.map((i) =>
          i.barcode === product.barcode ? { ...i, qty: i.qty + 1 } : i
        );
      }
      showToast(`Added: ${product.name}`);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const changeQty = (barcode, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.barcode === barcode ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (barcode) =>
    setCart((prev) => prev.filter((i) => i.barcode !== barcode));

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setCustomer('');
    setEditingItem(null);
  };

  const handleSaveEdit = async (barcode) => {
    const priceNum = parseFloat(editForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Invalid price', 'error');
      return;
    }
    const name = editForm.name.trim() || 'Unknown Product';

    // Update cart instantly (recalculates all totals automatically on render)
    setCart(prev => prev.map(item =>
      item.barcode === barcode ? { ...item, name, price: priceNum } : item
    ));
    setEditingItem(null);

    // Sync to DB if requested (using existing POST /api/products upsert route)
    if (editForm.updateDB) {
      try {
        await axios.post(`${API}/api/products`, { barcode, name, price: priceNum });
        showToast('Cart & Database updated');
      } catch (error) {
        showToast('Cart updated, but DB sync failed', 'error');
      }
    } else {
      showToast('Cart updated (Cart only)');
    }
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountPct = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const discountAmt = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
  const total = parseFloat((subtotal - discountAmt).toFixed(2));
  const hasPriceZero = cart.some((i) => Number(i.price) === 0);
  // cashierName comes from the login modal; customer must still be filled in
  const canSave = cart.length > 0 && !hasPriceZero && cashierName.trim() && customer.trim();

  // ── Save bill ─────────────────────────────────────────────────────────────────
  const handleSaveBill = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    try {
      const { data } = await axios.post(`${API}/api/bills`, {
        items: cart.map(({ barcode, qty }) => ({ barcode, qty })),
        subtotal,
        discount: discountAmt,
        total,
        cashier_name: cashierName.trim(),
        customer_name: customer.trim(),
      });
      const savedBill = data.data;
      // Snapshot everything needed for the receipt before clearing
      setLastSavedBill({
        id: savedBill.id,
        created_at: savedBill.created_at,
        cart: [...cart],
        subtotal,
        discountAmt,
        discountPct,
        total,
        cashierName: cashierName.trim(),
        customerName: customer.trim(),
      });
      showToast('Bill saved ✓  —  Ready to print');
      clearCart();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Failed to save: ${msg}`, 'error');
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  // ── Print bill ─────────────────────────────────────────────────────────────────
  const handlePrintBill = async () => {
    if (!lastSavedBill) return;
    setPrinting(true);
    const rd = buildReceiptData({
      cart: lastSavedBill.cart,
      subtotal: lastSavedBill.subtotal,
      discountAmt: lastSavedBill.discountAmt,
      discountPct: lastSavedBill.discountPct,
      total: lastSavedBill.total,
      cashierName: lastSavedBill.cashierName,
      customerName: lastSavedBill.customerName,
      billId: lastSavedBill.id,
      createdAt: lastSavedBill.created_at,
    });
    setReceiptData(rd);
    // Wait for React to render the receipt, then print
    await triggerPrint();
    setPrinting(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:h-screen md:overflow-hidden font-sans text-slate-800">

      {/* ── Cashier login modal (blocks UI until a name is provided) ─────────── */}
      {!cashierName && <CashierLoginModal onLogin={handleLogin} />}

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white text-sm font-semibold tracking-wide transition-all
            ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm shrink-0 flex items-center gap-4">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight shrink-0">
          Naz<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-black tracking-tighter ml-0.5">Mart</span>
        </h1>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-4">
          <button
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100"
          >
            Billing
          </button>
          <button
            onClick={() => onNavigate?.('recent-bills')}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            Recent Bills
          </button>
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <InstallAppButton />

          {/* Cashier badge — only shown once logged in */}
          {cashierName && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1.5">
                {/* Avatar circle */}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase shrink-0">
                  {cashierName.charAt(0)}
                </span>
                <span className="text-sm font-semibold text-blue-800 hidden sm:inline">
                  Cashier:&nbsp;<span className="font-bold">{cashierName}</span>
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto md:overflow-hidden p-4 lg:p-6">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Scanner panel ──────────────────────────────────────────────── */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan Product
              </h2>

              <Scanner
                onAddProduct={handleAddProduct}
              />
            </div>
          </div>

          {/* ── Cart panel ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden md:h-full relative">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                Current Bill
                {cart.length > 0 && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    {cart.length} items
                  </span>
                )}
              </h2>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-sm font-semibold text-slate-400 hover:text-red-500 disabled:opacity-50 transition"
              >
                Clear All
              </button>
            </div>

            {/* Cart items list (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-10">
                  <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium">Cart is empty. Scan an item to start.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.barcode}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-4 group"
                  >
                    {editingItem === item.barcode ? (
                      <div className="w-full space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.price}
                              onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.updateDB}
                              onChange={e => setEditForm({ ...editForm, updateDB: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Update product in database (future scans will use this price)
                          </label>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(item.barcode)}
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-base truncate flex items-center gap-2">
                            {item.name}
                            <button
                              onClick={() => {
                                setEditingItem(item.barcode);
                                setEditForm({ name: item.name, price: item.price, updateDB: true });
                              }}
                              className="text-slate-300 hover:text-blue-500 transition sm:opacity-0 group-hover:opacity-100 p-1"
                              title="Edit item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span>₹{Number(item.price).toFixed(2)} each</span>
                            {Number(item.price) === 0 && (
                              <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                                Price Missing
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controls & Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                          {/* Qty */}
                          <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                            <button
                              onClick={() => changeQty(item.barcode, -1)}
                              className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm text-slate-600 font-bold transition flex items-center justify-center"
                            >−</button>
                            <span className="w-10 text-center font-semibold text-slate-800">{item.qty}</span>
                            <button
                              onClick={() => changeQty(item.barcode, +1)}
                              className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm text-slate-600 font-bold transition flex items-center justify-center"
                            >+</button>
                          </div>

                          {/* Line Total */}
                          <div className="text-base font-bold text-slate-800 w-20 text-right">
                            ₹{(item.price * item.qty).toFixed(2)}
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeItem(item.barcode)}
                            className="text-slate-300 hover:text-red-500 transition sm:opacity-0 group-hover:opacity-100 p-2"
                            title="Remove item"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Sticky Checkout Footer */}
            <div className="bg-white border-t border-slate-200 p-5 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none z-10">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                {/* Inputs */}
                <div className="space-y-4">
                  {/* Cashier row — read-only, set at login */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cashier
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 truncate">
                        {cashierName || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="e.g. Alice"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Apply Discount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0" max="100" step="0.5"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                      <span className="absolute left-1/2 sm:left-1/4 translate-x-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold pointer-events-none">%</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex flex-col justify-end">
                  <div className="space-y-2 mb-4 text-slate-600">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Subtotal</span>
                      <span className="text-slate-800">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="flex justify-between text-sm font-medium text-emerald-600">
                        <span>Discount ({discountPct}%)</span>
                        <span>− ₹{discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                    <span className="text-base font-bold text-slate-800">Grand Total</span>
                    <span className="text-3xl font-black text-blue-600 tracking-tight">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Price-zero warning */}
              {hasPriceZero && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">One or more items have price = ₹0. Update the product price to proceed.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* Save Button */}
                <button
                  onClick={handleSaveBill}
                  disabled={!canSave || saving}
                  className={`flex-1 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2
                    ${!canSave
                      ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500'
                      : saveError
                        ? 'bg-red-500 hover:bg-red-600 hover:shadow-lg'
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Processing Bill...
                    </>
                  ) : saveError ? 'Failed — Try Saving Again' : 'Complete Checkout'}
                </button>

                {/* Print Bill Button — only visible after a bill is saved */}
                {lastSavedBill && (
                  <button
                    onClick={handlePrintBill}
                    disabled={printing}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Print last saved bill"
                  >
                    {printing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Printing…
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Bill
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Receipt render area (hidden on screen, visible only to @media print) ── */}
      {receiptData && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '80mm',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <Receipt data={receiptData} />
        </div>
      )}
    </div>
  );
}
