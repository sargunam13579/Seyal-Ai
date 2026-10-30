import React from 'react';
import { AlertTriangle, Trash2, Sparkles } from 'lucide-react';

interface DangerZonePurgeCardProps {
  onPurgeConversations: () => void;
  onWipeKnowledge: () => void;
  onFactoryReset: () => void;
}

export const DangerZonePurgeCard: React.FC<DangerZonePurgeCardProps> = ({
  onPurgeConversations,
  onWipeKnowledge,
  onFactoryReset,
}) => {
  return (
    <>
      {/* 3. DANGER ZONE (GRANULAR OPTIONS) */}
      <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-200">Danger Zone (Selective & Nuclear Purges)</h3>
              <p className="text-[11px] text-slate-400">Irreversible deletion of local database tables and stored credentials</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Clear Chats Only */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200">Purge Conversation History Only</div>
              <p className="text-[11px] text-slate-400">Clears all chat logs from SQLite, preserving your knowledge facts and settings.</p>
            </div>
            <button
              type="button"
              onClick={onPurgeConversations}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 font-semibold transition-all cursor-pointer self-start sm:self-auto"
            >
              Clear Chats
            </button>
          </div>

          {/* Clear Knowledge Vault Only */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200">Wipe User Knowledge Vault & Rules</div>
              <p className="text-[11px] text-slate-400">Deletes all saved facts, reminders, and standing autonomous watchers.</p>
            </div>
            <button
              type="button"
              onClick={onWipeKnowledge}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 font-semibold transition-all cursor-pointer self-start sm:self-auto"
            >
              Wipe Knowledge
            </button>
          </div>

          {/* Complete Nuclear Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-rose-950/50 to-slate-950/70 border border-rose-500/50 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-rose-200 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Factory Nuclear Wipe (Reset Everything)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Irreversibly resets local SQLite database, clears vector memories and runtime state, and restores initial factory configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={onFactoryReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md shadow-rose-950/60 cursor-pointer self-start sm:self-auto"
            >
              Factory Reset
            </button>
          </div>
        </div>
      </div>

      {/* 4. PRIVACY GUARANTEE NOTICE */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-300">End-to-End Local Isolation Guarantee</p>
          <p className="text-slate-400 mt-0.5">
            Seyal AI operates on your hardware. Unlike centralized cloud assistants, your prompt tokens and screen captures remain quarantined within your local device boundary.
          </p>
        </div>
      </div>
    </>
  );
};
