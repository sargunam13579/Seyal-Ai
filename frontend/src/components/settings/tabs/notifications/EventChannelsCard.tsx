import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { NotificationSettings } from './types';

interface EventChannelsCardProps {
  notifSettings: NotificationSettings;
  updateNotifSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  renderNotifToggle: (checked: boolean, onChange: (val: boolean) => void) => React.ReactNode;
}

export const EventChannelsCard: React.FC<EventChannelsCardProps> = ({
  notifSettings,
  updateNotifSetting,
  renderNotifToggle,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Autonomous Task Event Triggers</h3>
            <p className="text-[11px] text-slate-400">Select which milestones trigger auditory and desktop alerts</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Task Completed Alert */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Task Completed Alert</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Notify immediately when an autonomous computer-use workflow or command finishes.
            </p>
          </div>
          {renderNotifToggle(notifSettings.taskCompleted, (val) =>
            updateNotifSetting('taskCompleted', val)
          )}
        </div>

        {/* Needs Operator Approval */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Needs Operator Approval</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Instant banner when the agent requires human confirmation (terminal command, payment, file deletion).
            </p>
          </div>
          {renderNotifToggle(notifSettings.needsApproval, (val) =>
            updateNotifSetting('needsApproval', val)
          )}
        </div>

        {/* Task Failure / Errors */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Task Errors & Execution Failures</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Alert if background processes or agent execution encounters unhandled exceptions or timeouts.
            </p>
          </div>
          {renderNotifToggle(notifSettings.taskFailed, (val) => updateNotifSetting('taskFailed', val))}
        </div>

        {/* Milestone Progress Steps */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Intermediate Milestone Steps</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verbose toast notifications for every sub-step during complex planning decomposition.
            </p>
          </div>
          {renderNotifToggle(notifSettings.milestoneSteps, (val) =>
            updateNotifSetting('milestoneSteps', val)
          )}
        </div>
      </div>
    </div>
  );
};
