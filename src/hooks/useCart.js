import { useCallback, useMemo, useState } from 'react';
import { getItemKey } from '../utils/calculations';

export default function useCart() {
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [editingItem, setEditingItem] = useState(null); // item key
  const [editForm, setEditForm] = useState({ name: '', price: '', updateDB: true });

  const addProduct = useCallback((product, callbacks = {}) => {
    setCart((prev) => {
      // Scanner/search products are normal barcode products.
      // Manual products will use manualId as their identity.
      const productKey = product.isManual
        ? product.manualId
        : product.barcode;

      const existing = prev.find((item) => {
        const itemKey = item.isManual
          ? item.manualId
          : item.barcode;

        return itemKey === productKey;
      });

      if (existing) {
        callbacks.onIncrement?.();

        return prev.map((item) => {
          const itemKey = item.isManual
            ? item.manualId
            : item.barcode;

          return itemKey === productKey
            ? {
              ...item,
              qty: item.qty + (Number(product.qty) || 1),
            }
            : item;
        });
      }

      callbacks.onAdd?.();

      return [
        ...prev,
        {
          ...product,
          qty: Number(product.qty) || 1,
        },
      ];
    });
  }, []);

  const addManualItem = useCallback((item) => {
    setCart((prev) => [...prev, item]);
  }, []);

  const changeQty = useCallback((itemKey, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          const key = i.isManual ? i.manualId : i.barcode;

          return key === itemKey
            ? { ...i, qty: i.qty + delta }
            : i;
        })
        .filter((i) => i.qty > 0)
    );
  }, []);

  const incrementQty = useCallback((itemKey) => {
    changeQty(itemKey, +1);
  }, [changeQty]);

  const decrementQty = useCallback((itemKey) => {
    changeQty(itemKey, -1);
  }, [changeQty]);

  const removeProduct = useCallback((itemKey) => {
    setCart((prev) =>
      prev.filter((i) => getItemKey(i) !== itemKey)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount('');
    setEditingItem(null);
  }, []);

  const startEdit = useCallback((item) => {
    setEditingItem(getItemKey(item));
    setEditForm({ name: item.name, price: item.price, updateDB: true });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  const saveEdit = useCallback((itemKey) => {
    const priceNum = parseFloat(editForm.price);

    if (isNaN(priceNum) || priceNum < 0) {
      return { ok: false, error: 'invalid-price' };
    }

    const name = editForm.name.trim() || 'Unknown Product';

    // Find the exact cart item first
    const targetItem = cart.find(
      (item) => getItemKey(item) === itemKey
    );

    if (!targetItem) {
      return { ok: false, error: 'item-not-found' };
    }

    // Update exact cart item
    setCart((prev) =>
      prev.map((item) =>
        getItemKey(item) === itemKey
          ? { ...item, name, price: priceNum }
          : item
      )
    );

    setEditingItem(null);

    return {
      ok: true,
      targetItem,
      name,
      priceNum,
      updateDB: editForm.updateDB,
    };
  }, [cart, editForm]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );

  const discountPct = useMemo(
    () => Math.min(Math.max(parseFloat(discount) || 0, 0), 100),
    [discount]
  );

  const discountAmt = useMemo(
    () => parseFloat(((subtotal * discountPct) / 100).toFixed(2)),
    [discountPct, subtotal]
  );

  const total = useMemo(
    () => parseFloat((subtotal - discountAmt).toFixed(2)),
    [discountAmt, subtotal]
  );

  const hasPriceZero = useMemo(
    () => cart.some((i) => Number(i.price) === 0),
    [cart]
  );

  return {
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
    clearCart,

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
  };
}
