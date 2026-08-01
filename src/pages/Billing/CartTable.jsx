import CartRow from './CartRow';

export default function CartTable({
  cart,
  loadingEdit,
  getItemKey,
  editingItem,
  editForm,
  setEditForm,
  cancelEdit,
  handleSaveEdit,
  startEdit,
  decrementQty,
  incrementQty,
  removeProduct,
  clearCart,
}) {
  return (
    <>
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
        {loadingEdit ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-10">
            <svg className="animate-spin h-10 w-10 text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm font-medium">Loading bill for editing…</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-10">
            <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-medium">Cart is empty. Scan an item to start.</p>
          </div>
        ) : (
          cart.map((item) => {
            const itemKey = getItemKey(item);

            return (
              <CartRow
                key={itemKey}
                item={item}
                itemKey={itemKey}
                isEditing={editingItem === itemKey}
                editForm={editForm}
                setEditForm={setEditForm}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleSaveEdit}
                onStartEdit={startEdit}
                onDecrement={decrementQty}
                onIncrement={incrementQty}
                onRemove={removeProduct}
              />
            );
          })
        )}
      </div>
    </>
  );
}
