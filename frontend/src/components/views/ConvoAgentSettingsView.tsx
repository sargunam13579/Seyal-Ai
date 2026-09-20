import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Settings,
  User,
  Sparkles,
  Laptop,
  ShieldCheck,
  Bell,
  Sliders,
  ListTodo,
  Shield,
  Key,
  HardDrive,
  Database,
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import {
  GeneralTab,
  AccountTab,
  UpgradePlanTab,
  ComputerAwarenessTab,
  PermissionsTab,
  NotificationsTab,
  PersonalizationTab,
  VoiceTab,
  AgentTaskManagerTab,
  SafetyTab,
  SecurityLoginTab,
  StorageTab,
  DataControlsTab,
} from '../settings/tabs';

interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCustomWaveform?: boolean;
}

export const ConvoAgentSettingsView: React.FC = () => {
  const { setActiveView, activeSettingsTab, setActiveSettingsTab } = useNexus();

  // Active tab state — sync with activeSettingsTab from context
  const [activeTab, setActiveTab] = useState<string>(activeSettingsTab || 'general');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (activeSettingsTab) {
      setActiveTab(activeSettingsTab);
    }
  }, [activeSettingsTab]);

  // List of all 13 settings categories
  const sidebarItems: SidebarItem[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'account', label: 'Account', icon: User },
    { id: 'upgrade_plan', label: 'Upgrade plan', icon: Sparkles },
    { id: 'computer_control', label: 'Computer Awareness & Control', icon: Laptop },
    { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'personalization', label: 'Personalization', icon: Sliders },
    { id: 'voice', label: 'Voice', isCustomWaveform: true },
    { id: 'agent_task_manager', label: 'Agent Task Manager', icon: ListTodo },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'security_login', label: 'Security and login', icon: Key },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'data_controls', label: 'Data controls', icon: Database },
  ];

  const filteredSidebarItems = sidebarItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full p-2.5 sm:p-4 flex overflow-hidden select-none animate-fadeIn bg-[#060911]">
      {/* Modern Glass Settings Frame */}
      <div className="w-full h-full bg-[#0a1020]/95 border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-950/30 flex overflow-hidden text-slate-100 relative backdrop-blur-xl">
        
        {/* Left Category Navigation Sidebar */}
        <div className="w-64 sm:w-72 shrink-0 bg-[#060a14]/90 border-r border-cyan-500/20 flex flex-col p-3.5 sm:p-4">
          {/* Back to Chat button & Search settings input */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setActiveView('assistant')}
              className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-all shrink-0 flex items-center justify-center group cursor-pointer"
              title="Back to Chat"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-cyan-400/80 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings"
                className="w-full bg-slate-900/60 border border-slate-700/50 focus:border-cyan-500/60 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
              />
            </div>
          </div>

          {/* 13 Categories Navigation List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
            {filteredSidebarItems.map((item) => {
              const isActive = activeTab === item.id;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setActiveSettingsTab(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm shadow-cyan-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  {/* Waveform icon for Voice matching screenshot */}
                  {item.isCustomWaveform ? (
                    <svg
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 3v18M16 7v10M8 7v10M20 11v2M4 11v2" />
                    </svg>
                  ) : IconComponent ? (
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Modular Content Area: Dynamic Render of the 13 Component Tabs */}
        <div className="flex-1 flex flex-col bg-[#080e1d]/85 overflow-hidden">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'upgrade_plan' && <UpgradePlanTab />}
          {activeTab === 'computer_control' && <ComputerAwarenessTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'personalization' && <PersonalizationTab />}
          {activeTab === 'voice' && <VoiceTab />}
          {activeTab === 'agent_task_manager' && <AgentTaskManagerTab />}
          {activeTab === 'safety' && <SafetyTab />}
          {activeTab === 'security_login' && <SecurityLoginTab />}
          {activeTab === 'storage' && <StorageTab />}
          {activeTab === 'data_controls' && <DataControlsTab />}

          {/* Fallback Placeholder for Unknown Tab */}
          {![
            'general',
            'account',
            'upgrade_plan',
            'computer_control',
            'permissions',
            'notifications',
            'personalization',
            'voice',
            'agent_task_manager',
            'safety',
            'security_login',
            'storage',
            'data_controls',
          ].includes(activeTab) && (
            <div className="flex-1 flex flex-col h-full animate-fadeIn">
              <div className="px-8 py-5 border-b border-cyan-500/20 shrink-0 sticky top-0 bg-[#080e1d]/95 backdrop-blur-md z-40">
                <h2 className="text-base font-semibold text-slate-100 capitalize">
                  {activeTab.replace('_', ' ')}
                </h2>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900/70 border border-slate-700/50 flex items-center justify-center text-cyan-400 mb-3 shadow-md shadow-cyan-950/20">
                  <Settings className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Standard preferences for this category are managed automatically by the NEXUS OS layer.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
