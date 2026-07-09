import React, { useState, useEffect, useRef } from 'react';

/**
 * CashierLoginModal
 * Shown once per session (or until logout).
 * Props:
 *   onLogin(name: string) — called when the cashier submits their name
 */
export default function CashierLoginModal({ onLogin }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus the input when the modal mounts
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      return;
    }
    onLogin(trimmed);
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Header strip */}
        <div className="bg-blue-600 px-6 py-5 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
            {/* Person icon */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Welcome to NazMart Billing</h2>
          <p className="text-blue-100 text-sm mt-1">Enter your name to start the session</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Cashier Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Aasim Ahmed"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800
                         focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold
                       rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Start Session →
          </button>
        </form>

      </div>
    </div>
  );
}
