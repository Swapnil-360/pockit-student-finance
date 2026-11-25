import React, { useEffect, useState } from 'react';
import {
  Users,
  Crown,
  Flame,
  Wallet,
  MessageSquare,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getOverview } from '../services/adminApi';

const COLORS = ['#F47B4E', '#10B981', '#38BDF8', '#F59E0B', '#A855F7', '#EC4899'];

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getOverview()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return <div className="p-8 text-slate-400 text-sm">Loading platform telemetry...</div>;
  }

  const kpis = [
    {
      label: 'Total Students',
      value: data?.total_users ?? 0,
      sub: `${data?.active_today ?? 0} active today`,
      icon: Users,
      accent: 'text-sky-400 bg-sky-400/10',
    },
    {
      label: 'Pro Subscribers',
      value: data?.pro_users ?? 0,
      sub: `৳${(data?.total_revenue_bdt ?? 0).toLocaleString()} verified revenue`,
      icon: Crown,
      accent: 'text-[#F47B4E] bg-[#F47B4E]/10',
    },
    {
      label: '30-Day Streak Users',
      value: data?.streak_30_plus_users ?? 0,
      sub: `${data?.first_100_remaining ?? 100}/100 founder spots left`,
      icon: Flame,
      accent: 'text-amber-400 bg-amber-400/10',
    },
    {
      label: 'Logged Volume',
      value: `৳${Math.round(data?.total_expense_volume_bdt ?? 0).toLocaleString()}`,
      sub: `${data?.total_transactions ?? 0} expense records`,
      icon: Wallet,
      accent: 'text-emerald-400 bg-emerald-400/10',
    },
    {
      label: 'Pending Offer Apps',
      value: data?.pending_offer_applications ?? 0,
      sub: '30-day Smart Coach requests',
      icon: CreditCard,
      accent: 'text-purple-400 bg-purple-400/10',
    },
    {
      label: 'ML Feedback Records',
      value: data?.total_feedback_records ?? 0,
      sub: `${data?.pending_payments ?? 0} pending payments`,
      icon: MessageSquare,
      accent: 'text-pink-400 bg-pink-400/10',
    },
  ];

  const tierPie = [
    { name: 'Pro Tier', value: data?.pro_users || 0 },
    { name: 'Free Tier', value: data?.free_users || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Platform Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live metrics aggregated from Supabase Cloud & student ledgers
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1D21] border border-white/10 text-xs font-semibold text-slate-200 hover:border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 flex items-start justify-between"
            >
              <div>
                <p className="text-xs font-medium text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{k.value}</p>
                <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${k.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#1A1D21] border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            Spending Breakdown Across Students (BDT)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.category_breakdown || []}>
                <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121417',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" fill="#F47B4E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Subscription Split</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={76}
                  paddingAngle={4}
                >
                  {tierPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121417',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F47B4E]" />
              Pro ({data?.pro_users ?? 0})
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              Free ({data?.free_users ?? 0})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

