import React, { useEffect, useState } from 'react';
import { Check, XCircle, RefreshCw } from 'lucide-react';
import { listSubscriptions, updateSubscriptionStatus } from '../services/adminApi';

export const SubscriptionsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listSubscriptions()
      .then((res) => setPayments(res.payments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    await updateSubscriptionStatus(id, status);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Subscriptions & bKash / Nagad TrxIDs</h1>
          <p className="text-xs text-slate-400">
            Audit, approve, or revoke Pro Smart Coach subscription transactions
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1D21] border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-[#1A1D21] border border-white/8 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/8 text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-4">TrxID</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">User ID</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No subscription payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-semibold text-slate-200">{p.payment_method}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{p.trx_id}</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">৳{p.amount}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{String(p.user_id).slice(0, 12)}...</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : p.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleAction(p.id, 'approved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(p.id, 'rejected')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

