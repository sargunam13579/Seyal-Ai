import React from 'react';
import {
  Clock,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  FileText,
  Check,
} from 'lucide-react';

interface RemindersSectionProps {
  filteredReminders: any[];
  searchQuery: string;
  isAddingReminder: boolean;
  setIsAddingReminder: (v: boolean) => void;
  newReminderTitle: string;
  setNewReminderTitle: (v: string) => void;
  newReminderTime: string;
  setNewReminderTime: (v: string) => void;
  newReminderNotes: string;
  setNewReminderNotes: (v: string) => void;
  onAddReminder: () => void;
  onCompleteReminder: (id: string, title?: string) => void;
}

export const RemindersSection: React.FC<RemindersSectionProps> = ({
  filteredReminders,
  searchQuery,
  isAddingReminder,
  setIsAddingReminder,
  newReminderTitle,
  setNewReminderTitle,
  newReminderTime,
  setNewReminderTime,
  newReminderNotes,
  setNewReminderNotes,
  onAddReminder,
  onCompleteReminder,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Active One-Time Reminders
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tasks that auto-clear from memory as soon as completed or dismissed.
          </p>
        </div>
        <button
          onClick={() => setIsAddingReminder(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm shadow-amber-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Reminder
        </button>
      </div>

      {/* Add Reminder Form */}
      {isAddingReminder && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-slate-900/90 shadow-lg shadow-black/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Create One-Time Reminder
            </span>
            <button
              onClick={() => setIsAddingReminder(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Reminder Title / Action
              </label>
              <input
                type="text"
                placeholder="e.g. Review pull request, Take medicine, Call client"
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Target Time / Condition (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 18:00, Tomorrow morning, After meeting"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Additional Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Check PR #42 on GitHub repository"
                value={newReminderNotes}
                onChange={(e) => setNewReminderNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Time Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 self-center mr-1">Quick times:</span>
            {['Today 6:00 PM', 'Tonight 9:30 PM', 'Tomorrow 10:00 AM', 'In 1 Hour'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNewReminderTime(t)}
                className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsAddingReminder(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onAddReminder}
              disabled={!newReminderTitle.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              Arm Reminder
            </button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="space-y-2.5">
        {filteredReminders.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 bg-slate-900/30">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs">
              {searchQuery ? 'No reminders match your search.' : 'No active reminders.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Say &quot;Remind me to submit project tomorrow&quot; or click &quot;Add Reminder&quot;.
            </p>
          </div>
        ) : (
          filteredReminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/80 transition-all shadow-sm group"
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => onCompleteReminder(r.id, r.title)}
                  className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors p-0.5 rounded cursor-pointer"
                  title="Mark Complete & Remove"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div>
                  <p className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                    {r.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {r.target_time && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <Calendar className="w-3.5 h-3.5" />
                        {r.target_time}
                      </span>
                    )}
                    {r.notes && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        {r.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onCompleteReminder(r.id, r.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Done & Clear
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
