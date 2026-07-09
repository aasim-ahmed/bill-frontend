import { useState } from 'react';
import Billing from './pages/Billing';
import RecentBills from './pages/RecentBills';
import PrinterSettings from './pages/PrinterSettings';

const CASHIER_KEY = 'billingpos_cashier_name';

function App() {
  const [page, setPage] = useState('billing');
  const [editingBillId, setEditingBillId] = useState(null);

  const handleNavigate = (pg, billId) => {
    setPage(pg);
    setEditingBillId(billId || null);
  };

  const cashierName = localStorage.getItem(CASHIER_KEY) || '';

  return (
    <div className="min-h-screen bg-slate-50">
      {page === 'billing' && (
        <Billing
          onNavigate={handleNavigate}
          editingBillId={editingBillId}
          onEditComplete={() => setEditingBillId(null)}
        />
      )}
      {page === 'recent-bills' && (
        <RecentBills onNavigate={handleNavigate} cashierName={cashierName} />
      )}
      {page === 'printer-settings' && (
        <PrinterSettings onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
