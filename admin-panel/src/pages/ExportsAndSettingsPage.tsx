import React, { useEffect, useState } from 'react';
import { Download, Megaphone, Send, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  downloadExportFile,
  listAnnouncements,
  saveAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from '../services/adminApi';

export const ExportsAndSettingsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    listAnnouncements().then((res) => setAnnouncements(res.announcements || []));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    await saveAnnouncement(title, message, true);
    setTitle('');
    setMessage('');
    load();
  };

  const exports = [
    {
      name: 'Student Financial Behavior Research Dataset',
      desc: 'Complete dataset with all student onboarding inputs, fixed obligations, category spending, time-of-day patterns, and month-end money-depletion flags.',
      csv: '/api/admin/export/research-dataset?format=csv',
      json: '/api/admin/export/research-dataset?format=json',
      file: 'pockit_student_research_dataset',
    },
    {
      name: 'Users & Profiles Directory',
      desc: 'All registered students, demographics, living setup, Pro status, and streak totals.',
      csv: '/api/admin/export/users?format=csv',
      json: '/api/admin/export/users?format=json',
      file: 'pockit_users',
    },
    {
      name: 'Expenses & Transactions Audit',
      desc: 'Up to 2,000 recent student expenses with category, payment method, and date.',
      csv: '/api/admin/export/transactions?format=csv',
      json: '/api/admin/export/transactions?format=json',
      file: 'pockit_transactions',
    },
    {
      name: 'User App Feedback & Bug Reports Dataset',
      desc: 'In-app user feedback, star ratings, categories, and month-end outcome notes with triage status.',
      csv: '/api/admin/export/feedback?format=csv',
      json: '/api/admin/export/feedback?format=json',
      file: 'pockit_feedback_dataset',
    },
    {
      name: 'ML Retraining Dataset',
      desc: 'Month-end student check-ins formatted directly for scikit-learn retraining.',
      csv: '/api/admin/export/retraining?format=csv',
      json: '/api/admin/export/retraining?format=json',
      file: 'pockit_retraining_dataset',
    },
    {
      name: 'First-100 30-Day Streak Winners',
      desc: 'Ordered winner list with claim ranks and dates.',
      csv: '/api/admin/export/streak-winners?format=csv',
      json: '/api/admin/export/streak-winners?format=json',
      file: 'pockit_streak_winners',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Data Export Center & Announcements</h1>
        <p className="text-xs text-slate-400">
          Download clean CSV/JSON reports or broadcast notices to students
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exports.map((ex) => (
          <div
            key={ex.file}
            className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-100">{ex.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{ex.desc}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadExportFile(ex.csv, `${ex.file}.csv`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F47B4E] text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => downloadExportFile(ex.json, `${ex.file}.json`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#F47B4E]" />
            <h2 className="text-sm font-semibold text-slate-100">Publish App Notification &amp; Campus Notice</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setTitle('Smart Coach Pro Giveaway Running!');
                setMessage('Maintain a 30-day streak or join our current campus giveaway to unlock 30 days of Smart Coach Pro for free. Tap the Streak banner on Home to check spots!');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F47B4E]/15 text-[#F47B4E] font-semibold cursor-pointer hover:bg-[#F47B4E]/25"
            >
              + Pro Giveaway Template
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle('New Pockit Update Available');
                setMessage('We just rolled out faster loading, improved Mess Meal daily tracking, and customizable daily reminders. Reopen Pockit to apply the update!');
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 font-semibold cursor-pointer hover:bg-sky-500/25"
            >
              + App Update Template
            </button>
          </div>
        </div>

        <form onSubmit={handlePublish} className="space-y-3 text-xs">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title (e.g. Smart Coach Pro Giveaway Running!)..."
            className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-100"
            required
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message body shown in app Notification Bell & phone banner..."
            rows={2}
            className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2 text-slate-100"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer hover:bg-emerald-500"
          >
            <Send className="w-3.5 h-3.5" /> Publish to App Notifications
          </button>
        </form>

        {announcements.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/8">
            {announcements.map((a) => (
              <div key={a.id} className="bg-[#121417] border border-white/8 rounded-xl p-3 text-xs flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                      {a.is_active ? 'Live in App' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">{a.message}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">{a.created_at}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleAnnouncement(a.id, !a.is_active);
                      load();
                    }}
                    title={a.is_active ? 'Pause notice' : 'Activate notice'}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 cursor-pointer"
                  >
                    {a.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteAnnouncement(a.id);
                      load();
                    }}
                    title="Delete notice"
                    className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

