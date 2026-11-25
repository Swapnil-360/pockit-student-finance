import React, { useEffect, useState } from 'react';
import { Search, Crown, KeyRound, Flame, Trash2, X, Eye } from 'lucide-react';
import {
  listUsers,
  getUserDetail,
  setUserPro,
  resetUserPin,
  adjustUserStreak,
  deleteUser,
} from '../services/adminApi';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [streakEdit, setStreakEdit] = useState('');

  const load = () => {
    setLoading(true);
    listUsers(search, filterTier)
      .then((res) => setUsers(res.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filterTier]);

  const openInspector = async (uid: string) => {
    const detail = await getUserDetail(uid);
    setSelected(detail);
    setStreakEdit(String(detail?.user?.current_streak ?? 0));
  };

  const handleTogglePro = async (uid: string, currentPro: boolean) => {
    await setUserPro(uid, !currentPro, 30);
    await load();
    if (selected?.user?.id === uid) openInspector(uid);
  };

  const handleResetPin = async (uid: string) => {
    await resetUserPin(uid);
    alert('User PIN has been cleared.');
    load();
  };

  const handleAdjustStreak = async (uid: string) => {
    const val = parseInt(streakEdit, 10);
    if (isNaN(val) || val < 0) return;
    await adjustUserStreak(uid, val);
    await load();
    openInspector(uid);
  };

  const handleDelete = async (uid: string, email: string) => {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    await deleteUser(uid);
    setSelected(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Students Directory</h1>
          <p className="text-xs text-slate-400">
            Inspect profiles, manage Pro access, reset PINs, and moderate streaks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search name or email..."
              className="bg-[#1A1D21] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#F47B4E]"
            />
          </div>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-[#1A1D21] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Users</option>
            <option value="pro">Pro Only</option>
            <option value="free">Free Only</option>
            <option value="streak30">30+ Day Streak</option>
          </select>
          <button
            onClick={load}
            className="px-3.5 py-2 rounded-xl bg-[#F47B4E] text-white text-xs font-semibold cursor-pointer"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1A1D21] border border-white/8 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/8 text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Student</th>
              <th className="py-3.5 px-4">Tier</th>
              <th className="py-3.5 px-4">Streak</th>
              <th className="py-3.5 px-4">Budget / Rent</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No users matched your filter.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-100">
                      {u.full_name} {u.calling_name ? `(${u.calling_name})` : ''}
                    </div>
                    <div className="text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                        u.is_pro
                          ? 'bg-[#F47B4E]/15 text-[#F47B4E]'
                          : 'bg-slate-700/40 text-slate-300'
                      }`}
                    >
                      {u.is_pro ? 'PRO' : 'FREE'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      {u.current_streak || 0}d
                    </span>
                    <span className="text-slate-500 ml-1.5">(best {u.longest_streak || 0}d)</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    ৳{(u.monthly_allowance || 0).toLocaleString()} / ৳{(u.monthly_rent || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openInspector(u.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspector Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-md bg-[#1A1D21] border-l border-white/10 h-full overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{selected.user.full_name}</h2>
                <p className="text-xs text-slate-400">{selected.user.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#121417] border border-white/8 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Direct Admin Actions
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTogglePro(selected.user.id, selected.user.is_pro)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F47B4E]/15 text-[#F47B4E] text-xs font-semibold cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  {selected.user.is_pro ? 'Revoke Pro' : 'Grant 30d Pro'}
                </button>
                <button
                  onClick={() => handleResetPin(selected.user.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-semibold cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Reset PIN
                </button>
                <button
                  onClick={() => handleDelete(selected.user.id, selected.user.email)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <input
                  type="number"
                  value={streakEdit}
                  onChange={(e) => setStreakEdit(e.target.value)}
                  className="w-24 bg-[#1A1D21] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <button
                  onClick={() => handleAdjustStreak(selected.user.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold cursor-pointer"
                >
                  Set Streak Days
                </button>
              </div>
            </div>

            {/* Baseline Summary */}
            <div className="bg-[#121417] border border-white/8 rounded-xl p-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-300">Baseline & Living Setup</p>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <span>Allowance: ৳{selected.profile?.monthly_allowance_fixed ?? 0}</span>
                <span>Rent: ৳{selected.profile?.monthly_rent_fixed ?? 0}</span>
                <span>Mess Meal: ৳{selected.profile?.mess_meal_fixed ?? 0}</span>
                <span>Savings: ৳{selected.profile?.target_savings ?? 0}</span>
                <span>Living: {selected.profile?.where_you_live || '-'}</span>
                <span>University: {selected.profile?.university_type || '-'}</span>
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-[#121417] border border-white/8 rounded-xl p-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-300">
                Recent Expenses ({selected.expenses?.length || 0})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(selected.expenses || []).map((ex: any) => (
                  <div key={ex.id} className="flex justify-between text-slate-400">
                    <span>
                      {ex.date} • {ex.category}
                    </span>
                    <span className="text-slate-200 font-semibold">৳{ex.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

