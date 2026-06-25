import React from 'react';

/**
 * Receipt component optimised for 80mm (≈302px at 203 DPI) thermal paper.
 *
 * Props:
 *   data {Object} — output of buildReceiptData() from printUtils.js
 *   data.billNumber   {string}
 *   data.date          {string}
 *   data.cashier       {string}
 *   data.customer      {string}
 *   data.items         {Array<{ name, qty, price, total }>}
 *   data.subtotal      {number}
 *   data.discountAmt   {number}
 *   data.discountPct   {number}
 *   data.tax           {number}
 *   data.total         {number}
 *
 *   companyName    {string}  — defaults to 'NazMart'
 *   companyAddress {string}  — defaults to store address
 *   companyGst     {string}  — optional GST number
 *   logoUrl        {string}  — optional logo image URL/path
 *   thankYouMsg    {string}  — footer message
 */
export default function Receipt({
  data,
  companyName = 'NazMart',
  companyAddress = 'Your Neighbourhood Store',
  companyGst = '',
  logoUrl = '',
  thankYouMsg = 'Thank you for shopping with us!',
}) {
  if (!data) return null;

  return (
    <div id="receipt-print-area" className="receipt-root">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="receipt-header">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={companyName}
            className="receipt-logo"
          />
        )}
        <div className="receipt-company-name">{companyName}</div>
        <div className="receipt-company-address">{companyAddress}</div>
        {companyGst && (
          <div className="receipt-gst">GST: {companyGst}</div>
        )}
      </div>

      <div className="receipt-divider" />

      {/* ── Bill Info ───────────────────────────────────────────── */}
      <div className="receipt-info">
        <div className="receipt-info-row">
          <span>Bill No:</span>
          <span>{data.billNumber}</span>
        </div>
        <div className="receipt-info-row">
          <span>Date:</span>
          <span>{data.date}</span>
        </div>
        <div className="receipt-info-row">
          <span>Cashier:</span>
          <span>{data.cashier}</span>
        </div>
        <div className="receipt-info-row">
          <span>Customer:</span>
          <span>{data.customer}</span>
        </div>
      </div>

      <div className="receipt-divider receipt-divider-double" />

      {/* ── Items Table ─────────────────────────────────────────── */}
      <table className="receipt-table">
        <thead>
          <tr>
            <th className="receipt-th-item">Item</th>
            <th className="receipt-th-qty">Qty</th>
            <th className="receipt-th-price">Price</th>
            <th className="receipt-th-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="receipt-item-row">
              <td className="receipt-td-item">{item.name}</td>
              <td className="receipt-td-qty">{item.qty}</td>
              <td className="receipt-td-price">{formatCurrency(item.price)}</td>
              <td className="receipt-td-total">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-divider" />

      {/* ── Totals ──────────────────────────────────────────────── */}
      <div className="receipt-totals">
        <div className="receipt-total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(data.subtotal)}</span>
        </div>
        {data.discountAmt > 0 && (
          <div className="receipt-total-row receipt-discount-row">
            <span>Discount ({data.discountPct}%)</span>
            <span>-{formatCurrency(data.discountAmt)}</span>
          </div>
        )}
        {data.tax > 0 && (
          <div className="receipt-total-row">
            <span>Tax</span>
            <span>{formatCurrency(data.tax)}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider receipt-divider-double" />

      {/* ── Grand Total ─────────────────────────────────────────── */}
      <div className="receipt-grand-total">
        <span>TOTAL</span>
        <span>{formatCurrency(data.total)}</span>
      </div>

      <div className="receipt-divider receipt-divider-double" />

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="receipt-footer">
        <div className="receipt-thank-you">{thankYouMsg}</div>
        <div className="receipt-visit">Visit again!</div>
      </div>
    </div>
  );
}
