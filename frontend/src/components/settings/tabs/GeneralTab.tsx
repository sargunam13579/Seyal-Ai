import React, { useState } from 'react';
import { useSeyalAi } from '../../../context/SeyalAiContext';

export const GeneralTab: React.FC = () => {
  const { identity, requestNameChange } = useSeyalAi();

  // Assistant name state
  const [targetName, setTargetName] = useState('');
  const [nameChangeStatus, setNameChangeStatus] = useState<string | null>(null);
  const [isChangingName, setIsChangingName] = useState(false);

  const handleNameChangeRequest = async () => {
    if (!targetName.trim()) return;
    setIsChangingName(true);
    setNameChangeStatus(null);

    try {
      const prompt = await requestNameChange(targetName.trim());
      setNameChangeStatus(prompt || `Confirmation requested to rename assistant to '${targetName}'`);
      setTargetName('');
    } catch (err: any) {
      setNameChangeStatus(`Error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsChangingName(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40">
        <h2 className="text-base font-semibold text-slate-100">General</h2>
      </div>

      <div className="p-8 sm:p-10 space-y-6 w-full max-w-3xl">
        {/* Assistant Identity */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider">
              Assistant Identity
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Primary persona name and callsign used across all system interactions
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-1">
            <span className="text-[11px] text-slate-400">Current Assistant Name</span>
            <div className="text-lg font-bold text-white uppercase tracking-wider font-tech">
              {identity?.assistant_name || 'Seyal AI'}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="block text-xs text-slate-300">
              Change Assistant Persona Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="e.g. Seyal AI"
                className="flex-1 bg-slate-900/80 border border-slate-700/70 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans"
              />
              <button
                type="button"
                disabled={!targetName.trim() || isChangingName}
                onClick={handleNameChangeRequest}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/40 disabled:opacity-40 text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                {isChangingName ? 'Requesting...' : 'Change Name'}
              </button>
            </div>
            {nameChangeStatus && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono mt-2">
                {nameChangeStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
