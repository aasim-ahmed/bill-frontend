import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'https://bill-backend-w5f7.onrender.com';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const rupee = (n) => `₹${Number(n).toFixed(2)}`;

// ── Detail Modal ──────────────────────────────────────────────────────────────
function BillDetailModal({ billId, onClose }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/bills/${billId}`)
      .then(({ data }) => setBill(data.data))
      .catch(() => setError('Failed to load bill details.'))
      .finally(() => setLoading(false));
  }, [billId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Bill #{billId}</h3>
            {bill && (
              <p className="text-xs text-slate-400 mt-0.5">{fmt(bill.created_at)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {bill && !loading && (
            <>
              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cashier</span>
                  <span className="font-semibold text-slate-800">{bill.cashier_name || '—'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer</span>
                  <span className="font-semibold text-slate-800">{bill.customer_name || '—'}</span>
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold">Item</th>
                      <th className="px-4 py-2.5 text-center font-bold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-bold">Price</th>
                      <th className="px-4 py-2.5 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(bill.items || []).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name || item.barcode}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{rupee(item.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{rupee(item.price * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>{rupee(bill.subtotal)}</span>
                </div>
                {Number(bill.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span><span>− {rupee(bill.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-2">
                  <span>Grand Total</span>
                  <span className="text-blue-600">{rupee(bill.total)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecentBills({ onNavigate, cashierName }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);  // for detail modal
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBills = bills.filter(bill =>
    !searchTerm || (bill.customer_name && bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchBills = useCallback(() => {
    setLoading(true);
    setError('');
    axios.get(`${API}/api/bills?limit=50`)
      .then(({ data }) => setBills(data.data || []))
      .catch(() => setError('Failed to load recent bills. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm shrink-0 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight shrink-0">
          Naz<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-black tracking-tighter ml-0.5">Mart</span>
        </h1>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-4">
          <button
            onClick={() => onNavigate('billing')}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            Billing
          </button>
          <button
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100"
          >
            Recent Bills
          </button>
        </nav>

        {/* Cashier badge */}
        {cashierName && (
          <div className="flex items-center gap-2 ml-auto bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase shrink-0">
              {cashierName.charAt(0)}
            </span>
            <span className="text-sm font-semibold text-blue-800 hidden sm:inline">
              Cashier:&nbsp;<span className="font-bold">{cashierName}</span>
            </span>
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Bills</h2>
              <p className="text-sm text-slate-400 mt-0.5">Last 50 transactions · newest first</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={fetchBills}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition shadow-sm"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
              <svg className="animate-spin h-10 w-10 text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm font-medium">Loading bills…</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex items-center gap-3 text-sm font-medium">
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredBills.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">
                {searchTerm ? 'No bills found matching your search.' : 'No bills yet. Complete a checkout to see it here.'}
              </p>
            </div>
          )}

          {/* ── Desktop Table ──────────────────────────────────────────── */}
          {!loading && !error && filteredBills.length > 0 && (
            <>
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-bold">#</th>
                      <th className="px-5 py-3.5 text-left font-bold">Date / Time</th>
                      <th className="px-5 py-3.5 text-left font-bold">Cashier</th>
                      <th className="px-5 py-3.5 text-left font-bold">Customer</th>
                      <th className="px-5 py-3.5 text-left font-bold">Items</th>
                      <th className="px-5 py-3.5 text-right font-bold">Discount</th>
                      <th className="px-5 py-3.5 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => setSelectedId(bill.id)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-400">#{bill.id}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{fmt(bill.created_at)}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{bill.cashier_name || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{bill.customer_name || '—'}</td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                              {bill.items_count || 0}
                            </span>
                            <span className="text-slate-500 text-xs truncate">{bill.items_names || ''}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">
                          {Number(bill.discount) > 0 ? `− ${rupee(bill.discount)}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-blue-600 text-base">
                          {rupee(bill.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ───────────────────────────────────────── */}
              <div className="md:hidden space-y-3">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => setSelectedId(bill.id)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400">#{bill.id}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{fmt(bill.created_at)}</p>
                      </div>
                      <span className="text-xl font-black text-blue-600 tracking-tight shrink-0">
                        {rupee(bill.total)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cashier</span>
                        <span className="font-semibold text-slate-700">{bill.cashier_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                        <span className="font-semibold text-slate-700">{bill.customer_name || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 truncate flex-1">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold mr-1.5">
                          {bill.items_count || 0}
                        </span>
                        {bill.items_names || 'No items'}
                      </span>
                      {Number(bill.discount) > 0 && (
                        <span className="text-xs font-medium text-emerald-600 shrink-0 ml-2">
                          − {rupee(bill.discount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Bill Detail Modal ────────────────────────────────────────────── */}
      {selectedId && (
        <BillDetailModal
          billId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
