/**
 * Receipt ESC/POS builder.
 *
 * Converts a ReceiptData object (produced by buildReceiptData in Billing.jsx)
 * into a Uint8Array of ESC/POS bytes ready for USB thermal printing.
 *
 * ReceiptData shape:
 * {
 *   billNumber  : string,
 *   date        : string,
 *   cashier     : string,
 *   items       : Array<{ name: string, qty: number, price: number, total: number }>,
 *   subtotal    : number,
 *   discountAmt : number,
 *   discountPct : number,
 *   tax         : number,
 *   total       : number,
 * }
 */

import { EscPosBuilder } from './escpos/builder.js';

const STORE_NAME = 'NazMart';
const STORE_ADDRESS = 'Your Neighbourhood Store';
const THANK_YOU = 'Thank you for shopping!';
const VISIT_AGAIN = 'Please visit again.';
const POWERED_BY = 'Powered by Zapprex Technologies';

/** Format a rupee amount: ₹ symbol encoded as ? for Latin-1 printers, then amount. */
const formatRupee = (amount) => `Rs.${Number(amount).toFixed(2)}`;

/**
 * Build ESC/POS bytes for a complete receipt.
 *
 * @param {Object} receiptData — output of buildReceiptData()
 * @returns {Uint8Array}
 */
export function buildReceiptBytes(receiptData) {
  const b = new EscPosBuilder();

  // ── Initialize ───────────────────────────────────────────────────────────
  b.init().defaultLineSpacing();

  // ── Header ───────────────────────────────────────────────────────────────
  b.center()
    .doubleSize()
    .boldOn()
    .textLine(STORE_NAME)
    .boldOff()
    .normalSize()
    .textLine(STORE_ADDRESS)
    .newline();

  b.divider();

  // ── Bill info ─────────────────────────────────────────────────────────────
  b.left();
  b.row('Bill No:', receiptData.billNumber);
  b.row('Date:', receiptData.date);
  b.row('Cashier:', receiptData.cashier);

  b.divider();

  // ── Column headers ───────────────────────────────────────────────────────
  // Format: Item (left) | Qty | Price | Amt (right)
  b.boldOn();
  b.left().textLine(
    padRight('Item', 22) +
    padLeft('Qty', 4) +
    padLeft('Price', 8) +
    padLeft('Amt', 8)
  );
  b.boldOff();
  b.divider();

  // ── Line items ───────────────────────────────────────────────────────────
  for (const item of receiptData.items) {
    const nameLine = truncate(item.name, 22);
    const qtyStr = String(item.qty);
    const priceStr = formatRupee(item.price);
    const totalStr = formatRupee(item.total);

    // If name fits on the same line, print everything on one row
    if (nameLine.length <= 22) {
      b.left().textLine(
        padRight(nameLine, 22) +
        padLeft(qtyStr, 4) +
        padLeft(priceStr, 8) +
        padLeft(totalStr, 8)
      );
    } else {
      // Long name: name on first line, figures on second
      b.left().textLine(nameLine);
      b.left().textLine(
        padRight('', 22) +
        padLeft(qtyStr, 4) +
        padLeft(priceStr, 8) +
        padLeft(totalStr, 8)
      );
    }
  }
  
  b.divider();

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalProducts = receiptData.items.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );

  b.row('Total Products:', String(totalProducts));
  b.row('Subtotal:', formatRupee(receiptData.subtotal));

  if (receiptData.discountAmt > 0) {
    b.row(
      `Discount (${receiptData.discountPct}%):`,
      `-${formatRupee(receiptData.discountAmt)}`
    );
  }

  if (receiptData.tax > 0) {
    b.row('Tax:', formatRupee(receiptData.tax));
  }

  b.divider();

  // Grand total — double size + bold
  b.center().doubleSize().boldOn();
  b.textLine(`TOTAL  ${formatRupee(receiptData.total)}`);
  b.boldOff().normalSize();

  b.divider();

  // ── Footer ───────────────────────────────────────────────────────────────
  b.center()
    .textLine(THANK_YOU)
    .textLine(VISIT_AGAIN)
    .newline()
    .textLine(POWERED_BY)
    .newline();

  b.divider();

  // Feed and cut
  b.feed(4).cut();

  return b.build();
}

// ── String helpers ───────────────────────────────────────────────────────────

function padRight(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function padLeft(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(-width) : ' '.repeat(width - s.length) + s;
}

function truncate(str, maxLen) {
  const s = String(str);
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
}
