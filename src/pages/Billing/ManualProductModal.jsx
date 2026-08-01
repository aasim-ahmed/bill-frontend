export default function ManualProductModal({
  showManualProduct,
  setShowManualProduct,
  manualProduct,
  setManualProduct,
  onSubmit,
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowManualProduct((prev) => !prev)}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition flex items-center justify-center gap-2"
      >
        <span className="text-xl leading-none">+</span>
        {showManualProduct ? 'Cancel Manual Product' : 'Add Product Manually'}
      </button>

      {showManualProduct && (
        <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={manualProduct.name}
              onChange={(e) =>
                setManualProduct((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="e.g. Loose Sugar"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Price
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={manualProduct.price}
                onChange={(e) =>
                  setManualProduct((prev) => ({
                    ...prev,
                    price: e.target.value,
                  }))
                }
                placeholder="₹0.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={manualProduct.qty}
                onChange={(e) =>
                  setManualProduct((prev) => ({
                    ...prev,
                    qty: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
          >
            Add to Bill
          </button>
        </div>
      )}
    </div>
  );
}
