import { useState } from 'react';
import Billing from './pages/Billing';
import RecentBills from './pages/RecentBills';
import BluetoothTest from './components/BluetoothTest';

const CASHIER_KEY = 'billingpos_cashier_name';

function App() {
  const [page, setPage] = useState('billing'); // 'billing' | 'recent-bills'

  // Read cashierName here so RecentBills can show the badge without prop drilling
  const cashierName = localStorage.getItem(CASHIER_KEY) || '';

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {page === 'billing' && (
        <Billing onNavigate={setPage} />
      )}
      {page === 'recent-bills' && (
        <RecentBills onNavigate={setPage} cashierName={cashierName} />
      )}
      <BluetoothTest />
    </div>
  );
}

export default App;
