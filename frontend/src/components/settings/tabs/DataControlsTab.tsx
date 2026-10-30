import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../../services/api';
import {
  defaultDataControlSettings,
  DataControlsHeaderHUD,
  ExportDataArchivesCard,
  ModelTrainingTelemetryCard,
  DangerZonePurgeCard,
} from './data_controls';
import type { DataControlSettings } from './data_controls';

export const DataControlsTab: React.FC = () => {
  const [dataControlSettings, setDataControlSettings] = useState<DataControlSettings>(() => {
    try {
      const saved = localStorage.getItem('seyal_datacontrols_config');
      return saved ? { ...defaultDataControlSettings, ...JSON.parse(saved) } : defaultDataControlSettings;
    } catch {
      return defaultDataControlSettings;
    }
  });

  const [dataControlMsg, setDataControlMsg] = useState<string | null>(null);
  const [isExportingData, setIsExportingData] = useState(false);
  const [exportTypeLoading, setExportTypeLoading] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDataControlMsg(msg);
    setTimeout(() => setDataControlMsg(null), 3500);
  };

  const updateDataControlSetting = <K extends keyof DataControlSettings>(key: K, val: DataControlSettings[K]) => {
    setDataControlSettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('seyal_datacontrols_config', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleExportConversations = async () => {
    setIsExportingData(true);
    setExportTypeLoading('chats');
    try {
      const convs = await api.listConversations();
      const blob = new Blob([JSON.stringify(convs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Conversation export completed successfully! 💬');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportTasks = async () => {
    setIsExportingData(true);
    setExportTypeLoading('tasks');
    try {
      const tasks = await api.listTasks();
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_tasks_audit_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Task audit log export completed successfully! 📝');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportKnowledge = async () => {
    setIsExportingData(true);
    setExportTypeLoading('knowledge');
    try {
      const hub = await api.getUserHub();
      const blob = new Blob([JSON.stringify(hub, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_knowledge_vault_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('User Knowledge & Rules vault exported! 🧠');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleExportMasterArchive = async () => {
    setIsExportingData(true);
    setExportTypeLoading('master');
    try {
      const [convs, tasks, hub] = await Promise.all([
        api.listConversations().catch(() => []),
        api.listTasks().catch(() => ({ tasks: [] })),
        api.getUserHub().catch(() => ({})),
      ]);

      const masterPayload = {
        app: 'Seyal AI Desktop',
        export_date: new Date().toISOString(),
        version: '2.5.0-autonomous',
        conversations: convs,
        agent_tasks: tasks?.tasks || tasks || [],
        user_hub: hub,
      };

      const blob = new Blob([JSON.stringify(masterPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seyal_complete_data_archive_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Complete Master Data Archive downloaded successfully! 📦');
    } catch (err: any) {
      showToast(`Master export failed: ${err.message}`);
    } finally {
      setIsExportingData(false);
      setExportTypeLoading(null);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset data control preferences to standard factory defaults?')) return;
    setDataControlSettings(defaultDataControlSettings);
    try {
      localStorage.setItem('seyal_datacontrols_config', JSON.stringify(defaultDataControlSettings));
    } catch (e) {
      console.error(e);
    }
    showToast('Data controls reset to factory defaults');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      {/* Sticky Cyber Header */}
      <DataControlsHeaderHUD
        dataControlSettings={dataControlSettings}
        isExportingData={isExportingData}
        exportTypeLoading={exportTypeLoading}
        onResetDefaults={handleResetDefaults}
        onExportMasterArchive={handleExportMasterArchive}
      />

      {/* Toast Notification Banner */}
      {dataControlMsg && (
        <div className="mx-6 sm:mx-8 mt-4 bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-lg shadow-blue-950/50 animate-in fade-in">
          <Check className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-medium">{dataControlMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 space-y-6 w-full max-w-5xl mx-auto">
        {/* 1. EXPORT PERSONAL DATA ARCHIVES */}
        <ExportDataArchivesCard
          isExportingData={isExportingData}
          exportTypeLoading={exportTypeLoading}
          onExportConversations={handleExportConversations}
          onExportTasks={handleExportTasks}
          onExportKnowledge={handleExportKnowledge}
        />

        {/* 2. MODEL TRAINING & TELEMETRY PRIVACY */}
        <ModelTrainingTelemetryCard
          dataControlSettings={dataControlSettings}
          onUpdateSetting={updateDataControlSetting}
          onToggleIncognito={(val) => {
            updateDataControlSetting('ephemeralIncognitoMode', val);
            showToast(`Incognito Session Mode ${val ? 'Enabled' : 'Disabled'}`);
          }}
        />

        {/* 3. DANGER ZONE (GRANULAR OPTIONS) & 4. PRIVACY GUARANTEE */}
        <DangerZonePurgeCard
          onPurgeConversations={async () => {
            if (confirm('Permanently delete all conversation history?')) {
              try {
                await api.purgeConversations();
                showToast('Purged all local conversation chat logs 🗑️');
              } catch (e: any) {
                showToast(`Purge failed: ${e.message}`);
              }
            }
          }}
          onWipeKnowledge={async () => {
            if (confirm('Permanently wipe your personal knowledge vault and standing rules?')) {
              try {
                await api.wipeUserKnowledge();
                showToast('Wiped User Knowledge Vault 🧠');
              } catch (e: any) {
                showToast(`Wipe failed: ${e.message}`);
              }
            }
          }}
          onFactoryReset={async () => {
            if (confirm('🚨 CRITICAL WARNING: This will completely wipe all local chats, tasks, memory, and settings. Continue?')) {
              if (confirm('Are you ABSOLUTELY certain? This action cannot be reversed.')) {
                try {
                  await api.factoryReset();
                  localStorage.clear();
                  showToast('Factory Nuclear Wipe executed. System restored to clean state.');
                  setTimeout(() => window.location.reload(), 1500);
                } catch (e: any) {
                  showToast(`Factory reset failed: ${e.message}`);
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
};
