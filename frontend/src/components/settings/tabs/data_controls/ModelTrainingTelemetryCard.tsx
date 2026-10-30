import React from 'react';
import { ShieldCheck, EyeOff } from 'lucide-react';
import type { DataControlSettings } from './types';

interface ModelTrainingTelemetryCardProps {
  dataControlSettings: DataControlSettings;
  onUpdateSetting: <K extends keyof DataControlSettings>(key: K, val: DataControlSettings[K]) => void;
  onToggleIncognito: (val: boolean) => void;
}

export const ModelTrainingTelemetryCard: React.FC<ModelTrainingTelemetryCardProps> = ({
  dataControlSettings,
  onUpdateSetting,
  onToggleIncognito,
}) => {
  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-blue-500 justify-end shadow-sm shadow-blue-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Model Training Exemption & Telemetry</h3>
            <p className="text-[11px] text-slate-400">Strict zero-retention policies for local and inference data</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Zero Model Training Guarantee */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span>Zero Model Training Guarantee</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                ENFORCED BY DESIGN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your conversations, camera captures, and microphone audio are strictly quarantined. They are never shared with public model training corpora or advertising systems.
            </p>
          </div>
          <div
            className="w-11 h-6 flex items-center rounded-full p-1 bg-emerald-500/40 justify-end cursor-not-allowed opacity-90"
            title="Permanently locked for your privacy"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-200 shadow-md" />
          </div>
        </div>

        {/* Ephemeral Incognito Mode */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Ephemeral Incognito Session Mode</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When enabled, new chat messages are held only in RAM and discarded upon app close. No messages will be saved to your local disk.
            </p>
          </div>
          {renderToggle(dataControlSettings.ephemeralIncognitoMode, onToggleIncognito)}
        </div>

        {/* Anonymous Diagnostics */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Anonymous Crash Stack Diagnostics
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Help improve Seyal AI by allowing stripped, anonymized crash logs to be submitted when unexpected desktop errors occur.
            </p>
          </div>
          {renderToggle(dataControlSettings.anonymousDiagnostics, (val) =>
            onUpdateSetting('anonymousDiagnostics', val)
          )}
        </div>

        {/* Cloud Profile Sync */}
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">
              Supabase Cloud Profile Sync
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Synchronize your active subscription tier and avatar preferences securely with your Supabase authenticated account.
            </p>
          </div>
          {renderToggle(dataControlSettings.cloudProfileSync, (val) =>
            onUpdateSetting('cloudProfileSync', val)
          )}
        </div>
      </div>
    </div>
  );
};
