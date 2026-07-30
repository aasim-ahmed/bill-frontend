import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { printerManager } from '../services/printing/printerManager';
import { buildReceiptData } from '../utils/receiptMapper';
import { createBill, updateBill } from '../api/bills';

export default function useCheckout({
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
}) {
  const [processing, setProcessing] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [, setLastSavedBill] = useState(null); // { id, created_at, cart snapshot, totals }
  const [receiptData, setReceiptData] = useState(null);

  const processAndPrint = async () => {
    if (!canSave || processing) return;
    setProcessing(true);
    setSaveError(false);

    // 1. Create immutable snapshot of current cart/totals state
    const billSnapshot = {
      cart: cart.map(item => ({ ...item })),
      subtotal,
      discountAmt,
      discountPct,
      total,
      cashierName: cashierName.trim(),
    };

    let savedBill = null;

    try {
      if (editingBillId) {
        // ── EDIT mode: PUT existing bill ────────────────────────────────
        const { data } = await updateBill(editingBillId, {
          items: billSnapshot.cart.map((item) =>
            item.isManual
              ? {
                name: item.name,
                price: Number(item.price),
                qty: Number(item.qty),
                isManual: true,
              }
              : {
                barcode: item.barcode,
                qty: Number(item.qty),
              }
          ),
          discount: billSnapshot.discountAmt,
          cashier_name: billSnapshot.cashierName,
        });

        const responseData = data.data;
        savedBill = {
          cart: responseData.items,
          subtotal: Number(responseData.subtotal),
          discountAmt: Number(responseData.discount),
          discountPct: Number(responseData.subtotal) > 0
            ? Number(((Number(responseData.discount) / Number(responseData.subtotal)) * 100).toFixed(1))
            : 0,
          total: Number(responseData.total),
          cashierName: billSnapshot.cashierName,
          id: responseData.id,
          created_at: responseData.created_at,
        };

        onEditComplete();
        showToast('Bill updated ✓');
      } else {
        // ── CREATE mode: POST new bill ──────────────────────────────────
        const { data } = await createBill({
          items: billSnapshot.cart.map((item) =>
            item.isManual
              ? {
                name: item.name,
                price: Number(item.price),
                qty: Number(item.qty),
                isManual: true,
              }
              : {
                barcode: item.barcode,
                qty: Number(item.qty),
              }
          ),
          subtotal: billSnapshot.subtotal,
          discount: billSnapshot.discountAmt,
          total: billSnapshot.total,
          cashier_name: billSnapshot.cashierName,
        });

        const responseData = data.data;
        savedBill = {
          ...billSnapshot,
          id: responseData.id,
          created_at: responseData.created_at,
        };

        setLastSavedBill(savedBill);
        showToast('Bill saved ✓');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast(`Failed to save: ${msg}`, 'error');
      setSaveError(true);
      setProcessing(false);
      return;
    }

    // 4. Print that exact saved bill (print never depends on cart state after save)
    try {
      const printData = buildReceiptData({
        cart: savedBill.cart,
        subtotal: savedBill.subtotal,
        discountAmt: savedBill.discountAmt,
        discountPct: savedBill.discountPct,
        total: savedBill.total,
        cashierName: savedBill.cashierName,
        billId: savedBill.id,
        createdAt: savedBill.created_at,
      });

      if (!Capacitor.isNativePlatform()) {
        setReceiptData(printData);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }

      await printerManager.printReceipt(printData);
      showToast('Printed successfully ✓');
    } catch (err) {
      showToast(`Bill saved, but printing failed.`, 'error');
    } finally {
      setReceiptData(null);
      clearCart(); // Clear cart only after save success is confirmed
      setProcessing(false);
    }
  };

  return {
    processing,
    saveError,
    receiptData,
    processAndPrint,
  };
}
