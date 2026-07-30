export const buildReceiptData = ({
  cart,
  subtotal,
  discountAmt,
  discountPct,
  total,
  cashierName,
  billId,
  createdAt,
}) => ({
  billNumber: billId ? `#${billId}` : '—',
  date: createdAt
    ? new Date(createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-IN'),
  cashier: cashierName || '—',
  items: (cart || []).map((item) => ({
    name: item.name,
    qty: item.qty,
    price: Number(item.price),
    total: Number((Number(item.price) * Number(item.qty)).toFixed(2)),
  })),
  subtotal: Number(subtotal),
  discountAmt: Number(discountAmt),
  discountPct: Number(discountPct),
  tax: 0,
  total: Number(total),
});

export const billToReceiptData = (bill) => ({
  billNumber: `#${bill.id}`,
  date: bill.created_at
    ? new Date(bill.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—',
  cashier: bill.cashier_name || '—',
  items: (bill.items || []).map((item) => ({
    name: item.name,
    qty: item.qty,
    price: Number(item.price),
    total: Number((Number(item.price) * Number(item.qty)).toFixed(2)),
  })),
  subtotal: Number(bill.subtotal),
  discountAmt: Number(bill.discount),
  discountPct: Number(bill.subtotal) > 0
    ? Number(((Number(bill.discount) / Number(bill.subtotal)) * 100).toFixed(1))
    : 0,
  tax: 0,
  total: Number(bill.total),
});
