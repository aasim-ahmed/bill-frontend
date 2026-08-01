export default function CartRow({
  item,
  itemKey,
  isEditing,
  editForm,
  setEditForm,
  onCancelEdit,
  onSaveEdit,
  onStartEdit,
  onDecrement,
  onIncrement,
  onRemove,
}) {
  return (
    <div
      key={itemKey}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-4 group"
    >
      {isEditing ? (
        <div className="w-full space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.updateDB}
                onChange={e => setEditForm({ ...editForm, updateDB: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Update product in database (future scans will use this price)
            </label>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => onSaveEdit(itemKey)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-800 text-base truncate flex items-center gap-2">
              {item.name}
              <button
                onClick={() => onStartEdit(item)}
                className="text-slate-300 hover:text-blue-500 transition sm:opacity-0 group-hover:opacity-100 p-1"
                title="Edit item"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span>₹{Number(item.price).toFixed(2)} each</span>
              {Number(item.price) === 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                  Price Missing
                </span>
              )}
            </div>
          </div>

          {/* Controls & Total */}
          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
            {/* Qty */}
            <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => onDecrement(itemKey)}
                className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm text-slate-600 font-bold transition flex items-center justify-center"
              >−</button>
              <span className="w-10 text-center font-semibold text-slate-800">{item.qty}</span>
              <button
                onClick={() => onIncrement(itemKey)}
                className="w-8 h-8 rounded-md hover:bg-white hover:shadow-sm text-slate-600 font-bold transition flex items-center justify-center"
              >+</button>
            </div>

            {/* Line Total */}
            <div className="text-base font-bold text-slate-800 w-20 text-right">
              ₹{(item.price * item.qty).toFixed(2)}
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(itemKey)}
              className="text-slate-300 hover:text-red-500 transition sm:opacity-0 group-hover:opacity-100 p-2"
              title="Remove item"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
