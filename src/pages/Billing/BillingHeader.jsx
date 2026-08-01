import InstallAppButton from '../../components/InstallAppButton';

export default function BillingHeader({
  cashierName,
  onNavigate,
  onLogout,
  editMode,
  editingBillId,
  onCancelEdit,
}) {
  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm shrink-0 flex items-center gap-4">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight shrink-0">
          Naz<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-black tracking-tighter ml-0.5">Mart</span>
        </h1>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-4">
          <button
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100"
          >
            Billing
          </button>
          <button
            onClick={() => onNavigate?.('recent-bills')}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            Recent Bills
          </button>
          <button
            onClick={() => onNavigate?.('printer-settings')}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition flex items-center gap-1.5"
            title="Printer Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Printer</span>
          </button>
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <InstallAppButton />

          {/* Cashier badge — only shown once logged in */}
          {cashierName && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1.5">
                {/* Avatar circle */}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase shrink-0">
                  {cashierName.charAt(0)}
                </span>
                <span className="text-sm font-semibold text-blue-800 hidden sm:inline">
                  Cashier:&nbsp;<span className="font-bold">{cashierName}</span>
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                title="Log out"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Edit Mode Banner ──────────────────────────────────────────────── */}
      {editMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-amber-800 text-sm font-medium flex items-center gap-2 shrink-0">
          <span>Editing Bill #{editingBillId} — current product prices will be used on save</span>
          <button
            onClick={onCancelEdit}
            className="ml-auto text-xs font-bold text-amber-700 hover:text-amber-900 underline"
          >
            Cancel Edit
          </button>
        </div>
      )}
    </>
  );
}
