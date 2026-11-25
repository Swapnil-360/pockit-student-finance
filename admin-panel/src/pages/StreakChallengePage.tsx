import React, { useEffect, useState } from 'react';
import { Flame, Crown, Plus, Trash2, Check, XCircle, Trophy, Search } from 'lucide-react';
import {
  getStreakLeaderboardAdmin,
  listOffers,
  upsertOffer,
  deleteOffer,
  listOfferApplications,
  reviewOfferApplication,
} from '../services/adminApi';

export const StreakChallengePage: React.FC = () => {
  const [lb, setLb] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minStreak, setMinStreak] = useState('30');
  const [rewardDays, setRewardDays] = useState('30');
  const [maxClaims, setMaxClaims] = useState('100');
  const [lbSearch, setLbSearch] = useState('');

  const load = () => {
    getStreakLeaderboardAdmin().then(setLb);
    listOffers().then((res) => setOffers(res.offers || []));
    listOfferApplications().then((res) => setApps(res.applications || []));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await upsertOffer({
      title,
      description,
      min_streak: parseInt(minStreak, 10) || 30,
      reward_days: parseInt(rewardDays, 10) || 30,
      max_claims: parseInt(maxClaims, 10) || 100,
      is_active: true,
    });
    setTitle('');
    setDescription('');
    load();
  };

  const handleReviewApp = async (appId: string, action: 'approve' | 'reject') => {
    await reviewOfferApplication(appId, action);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">
          Streak Leaderboard, First-100 & Dynamic Offers
        </h1>
        <p className="text-xs text-slate-400">
          Manage streak-based Pro offers, approve 30-day Smart Coach applications, and monitor top users
        </p>
      </div>

      {/* 1. 30-Day Offer Applications Queue */}
      <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#F47B4E]" />
            <h2 className="text-sm font-semibold text-slate-100">
              30-Day Free Smart Coach Applications ({apps.length})
            </h2>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            {lb?.first_100_remaining ?? 100} / 100 Founder Spots Left
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/8 text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Offer</th>
                <th className="py-2.5 px-3">Streak</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No 30-day offer applications submitted yet.
                  </td>
                </tr>
              ) : (
                apps.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">{a.user_name}</div>
                      <div className="text-slate-400">{a.user_email}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.offer_title}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-semibold">{a.streak_at_apply}d</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          a.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : a.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      {a.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReviewApp(a.id, 'approve')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve Pro
                          </button>
                          <button
                            onClick={() => handleReviewApp(a.id, 'reject')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Dynamic Streak Offers Manager + Top Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Offers Manager */}
        <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Publish Streak-Based Offer</h2>
          <form onSubmit={handleCreateOffer} className="space-y-3 text-xs">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Offer title (e.g. 14-Day Consistency Bonus)"
              className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-100"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown to students in app..."
              rows={2}
              className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2 text-slate-100"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Min Streak (d)</label>
                <input
                  type="number"
                  value={minStreak}
                  onChange={(e) => setMinStreak(e.target.value)}
                  className="w-full bg-[#121417] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Free Pro Days</label>
                <input
                  type="number"
                  value={rewardDays}
                  onChange={(e) => setRewardDays(e.target.value)}
                  className="w-full bg-[#121417] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Max Claims</label>
                <input
                  type="number"
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(e.target.value)}
                  className="w-full bg-[#121417] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-100"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F47B4E] text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Publish Offer
            </button>
          </form>

          <div className="space-y-2 pt-3 border-t border-white/8">
            {offers.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between bg-[#121417] border border-white/8 rounded-xl p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">{o.title}</p>
                  <p className="text-slate-400">
                    Min {o.min_streak}d • {o.reward_days}d Pro • Cap {o.max_claims}
                  </p>
                </div>
                <button
                  onClick={() => deleteOffer(o.id).then(load)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Leaderboard */}
        <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-100">Live Streak Leaderboard</h2>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                value={lbSearch}
                onChange={(e) => setLbSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="bg-[#121417] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 w-56"
              />
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
            {(lb?.top_10 || [])
              .filter((entry: any) => {
                const q = lbSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (entry.email || '').toLowerCase().includes(q) ||
                  (entry.display_name || '').toLowerCase().includes(q) ||
                  (entry.full_name || '').toLowerCase().includes(q)
                );
              })
              .map((entry: any) => (
                <div
                  key={entry.user_id}
                  className="flex items-center justify-between bg-[#121417] border border-white/8 rounded-xl px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 flex items-center justify-center font-bold text-slate-200">
                      {entry.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 truncate">
                        {entry.full_name || entry.display_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {entry.email || entry.user_id}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold shrink-0 ml-2">
                    <Flame className="w-3.5 h-3.5" />
                    {entry.current_streak}d
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

