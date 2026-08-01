export default function CartSummary({
  subtotal,
  discountPct,
  discountAmt,
  total,
}) {
  return (
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
  );
}
