import React, { useEffect, useState } from 'react';
import { Download, Megaphone, Send } from 'lucide-react';
import {
  downloadExportFile,
  listAnnouncements,
  saveAnnouncement,
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
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#F47B4E]" />
          <h2 className="text-sm font-semibold text-slate-100">Publish Campus Notice</h2>
        </div>

        <form onSubmit={handlePublish} className="space-y-3 text-xs">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title..."
            className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-100"
            required
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message body..."
            rows={2}
            className="w-full bg-[#121417] border border-white/10 rounded-xl px-3.5 py-2 text-slate-100"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Publish Notice
          </button>
        </form>

        {announcements.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/8">
            {announcements.map((a) => (
              <div key={a.id} className="bg-[#121417] border border-white/8 rounded-xl p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-200">{a.title}</span>
                  <span className="text-slate-500">{a.created_at}</span>
                </div>
                <p className="text-slate-400 mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

