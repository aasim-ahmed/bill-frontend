import CartSummary from './CartSummary';

export default function CheckoutFooter({
  cashierName,
  discount,
  setDiscount,
  subtotal,
  discountPct,
  discountAmt,
  total,
  hasPriceZero,
  canSave,
  processing,
  saveError,
  onProcessAndPrint,
}) {
  return (
    <div className="bg-white border-t border-slate-200 p-5 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none z-10">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        {/* Inputs */}
        <div className="space-y-4">
          {/* Cashier row — read-only, set at login */}
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
        <CartSummary
          subtotal={subtotal}
          discountPct={discountPct}
          discountAmt={discountAmt}
          total={total}
        />
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
        {/* Process & Print Button */}
        <button
          onClick={onProcessAndPrint}
          disabled={!canSave || processing}
          className={`flex-1 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2
            ${!canSave
              ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500'
              : saveError
                ? 'bg-red-500 hover:bg-red-600 hover:shadow-lg'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
            }`}
        >
          {processing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing & Printing...
            </>
          ) : saveError ? 'Failed — Try Again' : 'Process & Print'}
        </button>
      </div>
    </div>
  );
}
