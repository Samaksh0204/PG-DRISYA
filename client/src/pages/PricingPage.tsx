import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Honest pricing: nothing is charged today. Paid plans can be added once a payment
// provider (e.g. Razorpay) is integrated and the features behind them exist.
export function PricingPage() {
  const { navigate } = useApp();
  const included = [
    'Unlimited listings (each reviewed by our team)',
    'Up to 15 photos per listing',
    'Visit scheduling and booking requests',
    'Instant Book',
    'In-app messages and notifications',
    'Reply to reviews',
    'Map pin in search',
  ];
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white sm:text-4xl">Simple pricing</h1>
        <p className="mt-3 text-ink-600 dark:text-ink-300">Drisya is free for tenants and hosts while we launch. No brokerage, no commission, no card needed.</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-lg font-semibold">Tenants</h2>
          <p className="mt-2 text-4xl font-bold">₹0</p>
          <p className="text-sm text-ink-500">always</p>
          <ul className="mt-6 space-y-2 text-sm">
            {['Search, map and filters', 'Message hosts', 'Book visits', 'Request to book', 'Wishlist', 'Drisya Expert help'].map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-teal-600" /> {f}</li>)}
          </ul>
          <button onClick={() => navigate('/search')} className="btn-outline mt-8 w-full">Find a PG</button>
        </div>
        <div className="card border-2 border-brand-500 p-8">
          <h2 className="text-lg font-semibold">Hosts</h2>
          <p className="mt-2 text-4xl font-bold">₹0</p>
          <p className="text-sm text-ink-500">during launch</p>
          <ul className="mt-6 space-y-2 text-sm">{included.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-teal-600" /> {f}</li>)}</ul>
          <button onClick={() => navigate('/owner')} className="btn-primary mt-8 w-full">List your PG</button>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-ink-500">If we introduce paid features later, we'll tell hosts well in advance. Existing free features will not be taken away without notice.</p>
    </div>
  );
}
