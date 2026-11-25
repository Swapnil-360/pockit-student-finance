import React, { useEffect, useState } from 'react';
import { BrainCircuit, Download, CheckCircle2, Clock } from 'lucide-react';
import {
  listFeedback,
  updateFeedbackStatus,
  getModelInfo,
  downloadExportFile,
} from '../services/adminApi';

export const FeedbackMlPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const load = () => {
    listFeedback().then((res) => setItems(res.items || []));
    getModelInfo().then(setModelInfo);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (id: string, status: 'new' | 'reviewed' | 'resolved') => {
    await updateFeedbackStatus(id, status);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Feedback & ML Retraining Console</h1>
          <p className="text-xs text-slate-400">
            Review month-end student outcomes, triage notes, and export retraining datasets
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadExportFile('/api/admin/export/feedback?format=csv', 'pockit_feedback_dataset.csv')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Feedback CSV
          </button>
          <button
            onClick={() => downloadExportFile('/api/admin/export/feedback?format=json', 'pockit_feedback_dataset.json')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Feedback JSON
          </button>
          <button
            onClick={() => downloadExportFile('/api/admin/export/retraining?format=csv', 'pockit_retraining_dataset.csv')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F47B4E] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Retraining CSV
          </button>
        </div>
      </div>

      {/* ML Model Summary */}
      {modelInfo && (
        <div className="bg-[#1A1D21] border border-white/8 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F47B4E]/15 text-[#F47B4E]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-400">Active Pipeline</p>
              <p className="font-semibold text-slate-100">{modelInfo.model_path}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-400">Model Size</p>
            <p className="font-semibold text-slate-100 mt-0.5">{modelInfo.model_size_kb} KB</p>
          </div>
          <div>
            <p className="text-slate-400">Collected Outcome Rows</p>
            <p className="font-semibold text-emerald-400 mt-0.5">{modelInfo.retraining_records_count} records</p>
          </div>
          <div>
            <p className="text-slate-400">Last Modified</p>
            <p className="font-semibold text-slate-200 mt-0.5">{modelInfo.last_modified || '-'}</p>
          </div>
        </div>
      )}

      {/* Feedback Table */}
      <div className="bg-[#1A1D21] border border-white/8 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/8 text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Source / Date</th>
              <th className="py-3.5 px-4">Student / Risk</th>
              <th className="py-3.5 px-4">Category / Outcome</th>
              <th className="py-3.5 px-4">Message / Note</th>
              <th className="py-3.5 px-4">Triage</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No feedback or month-end check-ins submitted yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">
                      {item.source === 'app_feedback' ? 'App Feedback' : item.month || '-'}
                    </div>
                    <div className="text-[11px] text-slate-400">{item.created_at || item.month || ''}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {item.source === 'app_feedback' ? (
                      <div>
                        <div className="font-medium text-slate-200">{item.user_name || 'Student'}</div>
                        <div className="text-[11px] text-slate-400">{item.user_email || item.user_id}</div>
                      </div>
                    ) : (
                      <span>{item.predicted_risk_pct ?? 0}% risk</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.source === 'app_feedback' ? (
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400">
                        {item.category || 'General'} • {item.rating ?? 5}/5
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          item.actual_ran_out_of_money
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {item.actual_ran_out_of_money ? 'Yes (Ran Out)' : 'No (Safe)'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs">{item.notes || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 font-semibold">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleStatus(item.id, 'reviewed')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" /> Review
                    </button>
                    <button
                      onClick={() => handleStatus(item.id, 'resolved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
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

