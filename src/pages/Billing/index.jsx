import { useState, useEffect } from 'react';
import Scanner from '../../components/Scanner';
import CashierLoginModal from '../../components/CashierLoginModal';
import Receipt from '../../components/printing/Receipt';
import { CASHIER_KEY } from '../../constants/storageKeys';
import useCart from '../../hooks/useCart';
import useCheckout from '../../hooks/useCheckout';
import { createProduct } from '../../api/products';
import { getBillById } from '../../api/bills';
import BillingHeader from './BillingHeader';
import CartTable from './CartTable';
import CheckoutFooter from './CheckoutFooter';
import ManualProductModal from './ManualProductModal';

export default function Billing({ onNavigate, editingBillId, onEditComplete }) {
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
  const {
    cart,
    setCart,
    discount,
    setDiscount,

    subtotal,
    discountPct,
    discountAmt,
    total,

    addProduct,
    addManualItem,
    removeProduct,
    clearCart: clearCartItems,

    incrementQty,
    decrementQty,

    editingItem,
    editForm,
    setEditForm,

    startEdit,
    cancelEdit,
    saveEdit,

    hasPriceZero,

    getItemKey,
  } = useCart();

  const [toast, setToast] = useState(null);  // { msg, type }

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ── Manual product state ─────────────────────────────────────────────────────
  const [showManualProduct, setShowManualProduct] = useState(false);
  const [manualProduct, setManualProduct] = useState({
    name: '',
    price: '',
    qty: 1,
  });

  // ── Edit mode: fetch bill for editing ──────────────────────────────────────
  const editMode = Boolean(editingBillId);
  useEffect(() => {
    if (!editingBillId) return;
    setLoadingEdit(true);
    getBillById(editingBillId)
      .then(({ data }) => {
        const bill = data.data;
        setCart(
          bill.items.map((item, index) => {
            const isManual = item.isManual === true || !item.barcode;

            return {
              ...item,
              barcode: isManual ? undefined : item.barcode,
              manualId: isManual
                ? item.manualId ||
                `manual-edit-${editingBillId}-${index}-${Date.now()}`
                : undefined,
              name: item.name,
              price: Number(item.price),
              qty: Number(item.qty),
              isManual,
            };
          })
        );
        const pct = bill.subtotal > 0 ? (Number(bill.discount) / Number(bill.subtotal)) * 100 : 0;
        setDiscount(String(pct));
      })
      .catch(() => showToast('Failed to load bill for editing', 'error'))
      .finally(() => setLoadingEdit(false));
  }, [editingBillId]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  const handleAddProduct = (product) => {
    addProduct(product, {
      onIncrement: () => showToast(`+1  ${product.name}`),
      onAdd: () => showToast(`Added: ${product.name}`),
    });
  };

  const handleAddManualProduct = () => {
    const name = manualProduct.name.trim();
    const price = Number(manualProduct.price);
    const qty = Number(manualProduct.qty);

    if (!name) {
      showToast('Enter product name', 'error');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showToast('Enter a valid price greater than 0', 'error');
      return;
    }

    if (!Number.isInteger(qty) || qty < 1) {
      showToast('Enter a valid quantity', 'error');
      return;
    }

    const newManualItem = {
      manualId: `manual-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name,
      price,
      qty,
      isManual: true,
    };

    addManualItem(newManualItem);

    setManualProduct({
      name: '',
      price: '',
      qty: 1,
    });

    setShowManualProduct(false);

    showToast(`Added: ${name}`);
  };

  const clearCart = () => {
    clearCartItems();

    setManualProduct({
      name: '',
      price: '',
      qty: 1,
    });

    setShowManualProduct(false);
  };

  const handleSaveEdit = async (itemKey) => {
    const result = saveEdit(itemKey);

    if (!result.ok && result.error === 'invalid-price') {
      showToast('Invalid price', 'error');
      return;
    }

    if (!result.ok && result.error === 'item-not-found') {
      showToast('Item not found in cart', 'error');
      return;
    }

    const { targetItem, name, priceNum, updateDB } = result;

    // Manual products are bill-only.
    // Never sync them into Products DB.
    if (targetItem.isManual) {
      showToast('Manual item updated');
      return;
    }

    // Barcode product: preserve existing optional DB sync behavior
    if (updateDB) {
      try {
        await createProduct({
          barcode: targetItem.barcode,
          name,
          price: priceNum,
        });

        showToast('Cart & Database updated');
      } catch (error) {
        showToast('Cart updated, but DB sync failed', 'error');
      }
    } else {
      showToast('Cart updated');
    }
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const canSave = cart.length > 0 && !hasPriceZero && cashierName.trim();

  // ── Process & Print ─────────────────────────────────────────────────────────
  const {
    processing,
    saveError,
    receiptData,
    processAndPrint: handleProcessAndPrint,
  } = useCheckout({
    cart,
    subtotal,
    discountAmt,
    discountPct,
    total,
    cashierName,
    editingBillId,
    canSave,
    clearCart,
    onEditComplete,
    showToast,
  });

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

      <BillingHeader
        cashierName={cashierName}
        onNavigate={onNavigate}
        onLogout={handleLogout}
        editMode={editMode}
        editingBillId={editingBillId}
        onCancelEdit={() => { onEditComplete(); clearCart(); }}
      />

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

              {/* Manual Product */}
              <ManualProductModal
                showManualProduct={showManualProduct}
                setShowManualProduct={setShowManualProduct}
                manualProduct={manualProduct}
                setManualProduct={setManualProduct}
                onSubmit={handleAddManualProduct}
              />
            </div>
          </div>

          {/* ── Cart panel ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden md:h-full relative">
            <CartTable
              cart={cart}
              loadingEdit={loadingEdit}
              getItemKey={getItemKey}
              editingItem={editingItem}
              editForm={editForm}
              setEditForm={setEditForm}
              cancelEdit={cancelEdit}
              handleSaveEdit={handleSaveEdit}
              startEdit={startEdit}
              decrementQty={decrementQty}
              incrementQty={incrementQty}
              removeProduct={removeProduct}
              clearCart={clearCart}
            />

            {/* Sticky Checkout Footer */}
            <CheckoutFooter
              cashierName={cashierName}
              discount={discount}
              setDiscount={setDiscount}
              subtotal={subtotal}
              discountPct={discountPct}
              discountAmt={discountAmt}
              total={total}
              hasPriceZero={hasPriceZero}
              canSave={canSave}
              processing={processing}
              saveError={saveError}
              onProcessAndPrint={handleProcessAndPrint}
            />

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
