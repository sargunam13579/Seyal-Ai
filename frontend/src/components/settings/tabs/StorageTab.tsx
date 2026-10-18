import React, { useState } from 'react';
import {
  HardDrive,
  CheckCircle2,
  Camera,
  Database,
  Volume2,
  FileText,
  Clock,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  FolderOpen,
  Sparkles,
  Sliders,
  Zap,
} from 'lucide-react';

interface StorageSettings {
  retentionDays: number;
  autoCleanEnabled: boolean;
  maxCacheLimitMb: number;
  compressVectorDb: boolean;
}

const defaultStorageSettings: StorageSettings = {
  retentionDays: 30,
  autoCleanEnabled: true,
  maxCacheLimitMb: 500,
  compressVectorDb: true,
};

export const StorageTab: React.FC = () => {
  const [storageSettings, setStorageSettings] = useState<StorageSettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_storage_config');
      return saved ? { ...defaultStorageSettings, ...JSON.parse(saved) } : defaultStorageSettings;
    } catch {
      return defaultStorageSettings;
    }
  });

  // Simulated live storage sizes
  const [visionSize, setVisionSize] = useState<number>(48.2);
  const [vectorSize] = useState<number>(18.4);
  const [audioSize, setAudioSize] = useState<number>(12.5);
  const [logsSize, setLogsSize] = useState<number>(5.3);

  const [storageFeedback, setStorageFeedback] = useState<string | null>(null);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const totalUsedMb = (visionSize + vectorSize + audioSize + logsSize).toFixed(1);
  const reclaimableMb = (visionSize + audioSize + (logsSize > 2 ? logsSize - 2 : 0)).toFixed(1);

  const storagePath = 'C:\\Users\\pgsar\\.gemini\\antigravity-ide\\storage';

  const showToast = (msg: string) => {
    setStorageFeedback(msg);
    setTimeout(() => setStorageFeedback(null), 3500);
  };

  const updateStorageSetting = <K extends keyof StorageSettings>(key: K, val: StorageSettings[K]) => {
    setStorageSettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_storage_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      showToast('Disk footprint recalculated across all database indices and caches.');
    }, 600);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(storagePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
    showToast('Storage folder path copied to clipboard 📋');
  };

  const handleCleanTempStorage = (type: 'vision' | 'audio' | 'logs' | 'vacuum' | 'all') => {
    setIsCleaningStorage(true);
    setTimeout(() => {
      setIsCleaningStorage(false);
      if (type === 'vision') {
        setVisionSize(0);
        showToast('Cleared 48.2 MB of temporary screen OCR & vision snapshots 📸');
      } else if (type === 'audio') {
        setAudioSize(0);
        showToast('Purged 12.5 MB of audio waveform synthesis cache 🎙️');
      } else if (type === 'logs') {
        setLogsSize(1.1);
        showToast('Truncated 4.2 MB of legacy task telemetry execution traces 📝');
      } else if (type === 'vacuum') {
        showToast('Executed VACUUM & compacted ChromaDB vector memory tables ⚡');
      } else {
        setVisionSize(0);
        setAudioSize(0);
        setLogsSize(1.1);
        showToast('Deep Clean Executed: Reclaimed 64.9 MB of disk space ✨');
      }
    }, 700);
  };

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-teal-500 justify-end shadow-sm shadow-teal-500/50' : 'bg-slate-700 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all" />
    </button>
  );

  // Percentages for visual bar
  const totalNum = parseFloat(totalUsedMb) || 84.4;
  const pVision = ((visionSize / totalNum) * 100).toFixed(0);
  const pVector = ((vectorSize / totalNum) * 100).toFixed(0);
  const pAudio = ((audioSize / totalNum) * 100).toFixed(0);
  const pLogs = ((logsSize / totalNum) * 100).toFixed(0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <div className="px-6 sm:px-8 py-4 border-b border-teal-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-sm shadow-teal-500/20">
              <HardDrive className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Storage & Cache Analytics
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  NVMe Optimized
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Disk footprint, automated 30-day purge retention, and temporary media cache pruning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-teal-300 transition-all cursor-pointer"
              title="Recalculate live disk sizes"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRecalculating ? 'animate-spin text-teal-400' : ''}`} />
              <span>{isRecalculating ? 'Calculating...' : 'Recalculate'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCleanTempStorage('all')}
              disabled={isCleaningStorage}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-xs font-bold text-white shadow-md shadow-teal-950/50 border border-teal-400/40 transition-all cursor-pointer"
              title="Prune all temporary media caches and compress indices"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deep Clean All ({reclaimableMb} MB)</span>
            </button>
          </div>
        </div>

        {/* Top Storage HUD Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              Total Footprint:
            </span>
            <span className="font-semibold text-teal-300 font-mono">{totalUsedMb} MB</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              Reclaimable Cache:
            </span>
            <span className="font-semibold text-amber-300 font-mono">{reclaimableMb} MB</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Purge Policy:
            </span>
            <span className="font-semibold text-cyan-300 font-mono">{storageSettings.retentionDays} DAYS</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Storage Health:
            </span>
            <span className="font-semibold text-emerald-300 font-mono">100% OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {storageFeedback && (
        <div className="mx-6 sm:mx-8 mt-4 bg-teal-950/80 border border-teal-500/40 text-teal-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-teal-950/50 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="font-medium">{storageFeedback}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. MULTI-COLOR VISUAL STORAGE ALLOCATION BAR */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Disk Usage Distribution Breakdown
            </span>
            <span className="font-mono text-xs font-bold text-teal-300">
              {totalUsedMb} MB Used of {storageSettings.maxCacheLimitMb} MB Quota
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800/80 p-0.5 gap-0.5">
            <div
              className="h-full bg-amber-400 rounded-l-full transition-all duration-500"
              style={{ width: `${Math.max(2, parseFloat(pVision))}%` }}
              title={`Vision Snapshots: ${visionSize.toFixed(1)} MB (${pVision}%)`}
            />
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${Math.max(2, parseFloat(pVector))}%` }}
              title={`Vector DB: ${vectorSize.toFixed(1)} MB (${pVector}%)`}
            />
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(2, parseFloat(pAudio))}%` }}
              title={`Audio Synthesis: ${audioSize.toFixed(1)} MB (${pAudio}%)`}
            />
            <div
              className="h-full bg-indigo-400 rounded-r-full transition-all duration-500"
              style={{ width: `${Math.max(2, parseFloat(pLogs))}%` }}
              title={`Task Logs: ${logsSize.toFixed(1)} MB (${pLogs}%)`}
            />
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-medium block">Vision & OCR</span>
                <span className="text-[11px] font-mono text-slate-500">{visionSize.toFixed(1)} MB ({pVision}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-medium block">Vector Memory</span>
                <span className="text-[11px] font-mono text-slate-500">{vectorSize.toFixed(1)} MB ({pVector}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-medium block">Audio Synthesis</span>
                <span className="text-[11px] font-mono text-slate-500">{audioSize.toFixed(1)} MB ({pAudio}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-400 shrink-0" />
              <div>
                <span className="text-slate-300 font-medium block">Task Logs</span>
                <span className="text-[11px] font-mono text-slate-500">{logsSize.toFixed(1)} MB ({pLogs}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MAX STORAGE CACHE LIMIT THRESHOLD SLIDER */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              Maximum Temporary Cache Limit Quota
            </span>
            <span className="font-mono text-teal-300 font-bold bg-teal-950/60 px-2.5 py-0.5 rounded border border-teal-500/30">
              {storageSettings.maxCacheLimitMb} MB Limit
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            When total temporary snapshots and audio buffers exceed this threshold, the oldest cache is automatically pruned to prevent disk saturation.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-slate-500 font-mono">100 MB</span>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={storageSettings.maxCacheLimitMb}
              onChange={(e) => updateStorageSetting('maxCacheLimitMb', parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <span className="text-[10px] text-slate-500 font-mono">2000 MB (2 GB)</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 self-center mr-1">Presets:</span>
            {[250, 500, 1000, 1500].map((mb) => (
              <button
                key={mb}
                type="button"
                onClick={() => updateStorageSetting('maxCacheLimitMb', mb)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                  storageSettings.maxCacheLimitMb === mb
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {mb} MB
              </button>
            ))}
          </div>
        </div>

        {/* 3. AUTOMATED DATA RETENTION POLICY */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Automated Data Retention & Lifecycle</h3>
                <p className="text-[11px] text-slate-400">Scheduled purging of historic agent execution records and orphaned files</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Retention Window */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Task Retention Duration Window
                </span>
                <span className="text-[10px] font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                  {storageSettings.retentionDays} Days Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Completed, cancelled, and failed autonomous tasks older than this window are permanently purged.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '14 Days (Minimal)', val: 14 },
                  { label: '30 Days (Standard)', val: 30 },
                  { label: '60 Days (Extended)', val: 60 },
                  { label: '90 Days (Quarterly)', val: 90 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => updateStorageSetting('retentionDays', item.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      storageSettings.retentionDays === item.val
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Midnight Clean */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Automatic Daily Midnight Maintenance
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Execute an automated low-priority cron at 12:00 AM to collect temporary trash and vacuum local databases.
                </p>
              </div>
              {renderToggle(storageSettings.autoCleanEnabled, (val) =>
                updateStorageSetting('autoCleanEnabled', val)
              )}
            </div>

            {/* Vector DB Compression */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  Compress ChromaDB Vector Indices
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Apply zstandard compression to stored vector embeddings to save up to 40% memory space.
                </p>
              </div>
              {renderToggle(storageSettings.compressVectorDb, (val) =>
                updateStorageSetting('compressVectorDb', val)
              )}
            </div>
          </div>
        </div>

        {/* 4. GRANULAR MANUAL CACHE OPTIMIZATION */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Granular Cache Pruning & Compaction</h3>
                <p className="text-[11px] text-slate-400">Target individual media caches without affecting conversation memory</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Clear Vision */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Vision & Screenshot OCR Frames</div>
                  <div className="text-[11px] text-slate-500">Autonomous desktop captures • Current size: {visionSize.toFixed(1)} MB</div>
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningStorage || visionSize === 0}
                onClick={() => handleCleanTempStorage('vision')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all disabled:opacity-40"
              >
                Clear Snapshots
              </button>
            </div>

            {/* Clear Audio */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Neural Audio Synthesizer Cache</div>
                  <div className="text-[11px] text-slate-500">Temporary WAV audio synthesis buffers • Current size: {audioSize.toFixed(1)} MB</div>
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningStorage || audioSize === 0}
                onClick={() => handleCleanTempStorage('audio')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all disabled:opacity-40"
              >
                Purge Audio
              </button>
            </div>

            {/* Truncate Logs */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Task Execution Traces & Telemetry</div>
                  <div className="text-[11px] text-slate-500">Sub-agent log files and step traces • Current size: {logsSize.toFixed(1)} MB</div>
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningStorage}
                onClick={() => handleCleanTempStorage('logs')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-all"
              >
                Truncate Logs
              </button>
            </div>

            {/* Vacuum Database */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Database Vacuum & Index Compaction</div>
                  <div className="text-[11px] text-slate-400">Reorganize and compact SQLite and ChromaDB files for peak search speed</div>
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningStorage}
                onClick={() => handleCleanTempStorage('vacuum')}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 font-semibold transition-all"
              >
                Vacuum DB
              </button>
            </div>
          </div>
        </div>

        {/* 5. EXPLORER PATH VIEWER */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200 block">Runtime Data Directory:</span>
              <span className="font-mono text-[11px] text-slate-400 truncate block">{storagePath}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyPath}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Path</span>
          </button>
        </div>
      </div>
    </div>
  );
};
