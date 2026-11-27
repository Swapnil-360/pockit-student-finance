import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  Flame,
  Download,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getAdminToken, clearAdminToken } from './services/adminApi';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { FeedbackMlPage } from './pages/FeedbackMlPage';
import { StreakChallengePage } from './pages/StreakChallengePage';
import { ExportsAndSettingsPage } from './pages/ExportsAndSettingsPage';

type NavKey = 'overview' | 'users' | 'subscriptions' | 'streak' | 'feedback' | 'exports';

export const App: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(Boolean(getAdminToken()));
  const [tab, setTab] = useState<NavKey>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onErr = (e: PromiseRejectionEvent) => {
      if (e.reason?.message === 'UNAUTHORIZED') {
        clearAdminToken();
        setAuthed(false);
      }
    };
    window.addEventListener('unhandledrejection', onErr);
    return () => window.removeEventListener('unhandledrejection', onErr);
  }, []);

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
  }

  const navItems: { key: NavKey; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Students', icon: Users },
    { key: 'streak', label: 'Streak & Offers', icon: Flame },
    { key: 'subscriptions', label: 'Payments', icon: CreditCard },
    { key: 'feedback', label: 'Feedback & ML', icon: MessageSquare },
    { key: 'exports', label: 'Exports & Notices', icon: Download },
  ];

  const handleLogout = () => {
    clearAdminToken();
    setAuthed(false);
  };

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-[#16191D] border-r border-white/8 p-5 justify-between">
        <div>
          <div className="mb-8 px-2">
            <img
              src="./pockit_header_logo_dark.png"
              alt="Pockit"
              className="h-9 object-contain"
            />
            <p className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase mt-2">
              Admin Console
            </p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#F47B4E]/15 text-[#F47B4E]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#16191D] border-b border-white/8">
          <img
            src="./pockit_header_logo_dark.png"
            alt="Pockit"
            className="h-8 object-contain"
          />
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="p-2 rounded-lg bg-white/5 text-slate-300"
          >
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileMenu && (
          <div className="md:hidden bg-[#16191D] border-b border-white/8 p-3 space-y-1">
            {navItems.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.key}
                  onClick={() => {
                    setTab(n.key);
                    setMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    tab === n.key ? 'bg-[#F47B4E]/15 text-[#F47B4E]' : 'text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}

        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
          {tab === 'overview' && <OverviewPage />}
          {tab === 'users' && <UsersPage />}
          {tab === 'streak' && <StreakChallengePage />}
          {tab === 'subscriptions' && <SubscriptionsPage />}
          {tab === 'feedback' && <FeedbackMlPage />}
          {tab === 'exports' && <ExportsAndSettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;

