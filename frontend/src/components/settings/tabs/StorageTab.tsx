import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';
import {
  defaultStorageSettings,
  StorageHeaderHUD,
  StorageDistributionBar,
  CacheQuotaThresholdCard,
  DataRetentionPolicyCard,
  GranularCachePruningCard,
  RuntimeDirectoryCard,
} from './storage';
import type { StorageSettings } from './storage';

export const StorageTab: React.FC = () => {
  const [storageSettings, setStorageSettings] = useState<StorageSettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_storage_config');
      return saved ? { ...defaultStorageSettings, ...JSON.parse(saved) } : defaultStorageSettings;
    } catch {
      return defaultStorageSettings;
    }
  });

  // Real live storage sizes
  const [visionSize, setVisionSize] = useState<number>(0);
  const [vectorSize, setVectorSize] = useState<number>(0);
  const [audioSize, setAudioSize] = useState<number>(0);
  const [logsSize, setLogsSize] = useState<number>(0);
  const [storagePath, setStoragePath] = useState<string>('~/.seyal_ai');

  const [storageFeedback, setStorageFeedback] = useState<string | null>(null);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const totalUsedMb = (visionSize + vectorSize + audioSize + logsSize).toFixed(1);
  const reclaimableMb = (visionSize + audioSize + (logsSize > 1 ? logsSize - 1 : 0)).toFixed(1);

  const showToast = (msg: string) => {
    setStorageFeedback(msg);
    setTimeout(() => setStorageFeedback(null), 3500);
  };

  const loadLiveStats = useCallback(async () => {
    try {
      const stats = await api.getStorageStats();
      if (stats) {
        setVisionSize(stats.visionSize || 0);
        setVectorSize(stats.vectorSize || 0);
        setAudioSize(stats.audioSize || 0);
        setLogsSize(stats.logsSize || 0);
        if (stats.storagePath) setStoragePath(stats.storagePath);
      }
    } catch (e) {
      console.warn('Notice loading storage stats:', e);
    }
  }, []);

  useEffect(() => {
    loadLiveStats();
  }, [loadLiveStats]);

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

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await loadLiveStats();
    setIsRecalculating(false);
    showToast('Disk footprint recalculated across all database indices and caches.');
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(storagePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
    showToast('Storage folder path copied to clipboard 📋');
  };

  const handleCleanTempStorage = async (type: 'vision' | 'audio' | 'logs' | 'vacuum' | 'all') => {
    setIsCleaningStorage(true);
    try {
      const res = await api.cleanStorage(type);
      await loadLiveStats();
      if (type === 'vision') {
        showToast(`Cleared ${res.freedMb} MB of temporary screen OCR & vision snapshots 📸`);
      } else if (type === 'audio') {
        showToast(`Purged ${res.freedMb} MB of audio waveform synthesis cache 🎙️`);
      } else if (type === 'logs') {
        showToast(`Truncated ${res.freedMb} MB of legacy task telemetry traces 📝`);
      } else if (type === 'vacuum') {
        showToast('Executed VACUUM & compacted local SQLite database tables ⚡');
      } else {
        showToast(`Deep Clean Executed: Reclaimed ${res.freedMb} MB of disk space ✨`);
      }
    } catch (e: any) {
      showToast(`Clean failed: ${e.message}`);
    } finally {
      setIsCleaningStorage(false);
    }
  };

  // Percentages for visual bar
  const totalNum = parseFloat(totalUsedMb) || 84.4;
  const pVision = ((visionSize / totalNum) * 100).toFixed(0);
  const pVector = ((vectorSize / totalNum) * 100).toFixed(0);
  const pAudio = ((audioSize / totalNum) * 100).toFixed(0);
  const pLogs = ((logsSize / totalNum) * 100).toFixed(0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <StorageHeaderHUD
        storageSettings={storageSettings}
        totalUsedMb={totalUsedMb}
        reclaimableMb={reclaimableMb}
        isRecalculating={isRecalculating}
        isCleaningStorage={isCleaningStorage}
        onRecalculate={handleRecalculate}
        onCleanAll={() => handleCleanTempStorage('all')}
      />

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
        <StorageDistributionBar
          totalUsedMb={totalUsedMb}
          maxCacheLimitMb={storageSettings.maxCacheLimitMb}
          visionSize={visionSize}
          vectorSize={vectorSize}
          audioSize={audioSize}
          logsSize={logsSize}
          pVision={pVision}
          pVector={pVector}
          pAudio={pAudio}
          pLogs={pLogs}
        />

        {/* 2. MAX STORAGE CACHE LIMIT THRESHOLD SLIDER */}
        <CacheQuotaThresholdCard
          maxCacheLimitMb={storageSettings.maxCacheLimitMb}
          onUpdateLimit={(val) => updateStorageSetting('maxCacheLimitMb', val)}
        />

        {/* 3. AUTOMATED DATA RETENTION POLICY */}
        <DataRetentionPolicyCard
          storageSettings={storageSettings}
          onUpdateSetting={updateStorageSetting}
        />

        {/* 4. GRANULAR MANUAL CACHE OPTIMIZATION */}
        <GranularCachePruningCard
          visionSize={visionSize}
          audioSize={audioSize}
          logsSize={logsSize}
          isCleaningStorage={isCleaningStorage}
          onCleanTempStorage={handleCleanTempStorage}
        />

        {/* 5. EXPLORER PATH VIEWER */}
        <RuntimeDirectoryCard
          storagePath={storagePath}
          copiedPath={copiedPath}
          onCopyPath={handleCopyPath}
        />
      </div>
    </div>
  );
};
