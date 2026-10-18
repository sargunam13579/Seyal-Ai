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
  Brain,
  Cpu,
  Network,
} from 'lucide-react';
import { useSeyalAi } from '../../context/SeyalAiContext';

// Statically import the default landing tab (GeneralTab) for instant 0ms rendering
import { GeneralTab } from '../settings/tabs/GeneralTab';

// Dynamic code-splitting: Lazy-load individual settings tabs on demand
const AccountTab = React.lazy(() => import('../settings/tabs/AccountTab').then((m) => ({ default: m.AccountTab })));
const UpgradePlanTab = React.lazy(() => import('../settings/tabs/UpgradePlanTab').then((m) => ({ default: m.UpgradePlanTab })));
const ComputerAwarenessTab = React.lazy(() => import('../settings/tabs/ComputerAwarenessTab').then((m) => ({ default: m.ComputerAwarenessTab })));
const PermissionsTab = React.lazy(() => import('../settings/tabs/PermissionsTab').then((m) => ({ default: m.PermissionsTab })));
const NotificationsTab = React.lazy(() => import('../settings/tabs/NotificationsTab').then((m) => ({ default: m.NotificationsTab })));
const PersonalizationTab = React.lazy(() => import('../settings/tabs/PersonalizationTab').then((m) => ({ default: m.PersonalizationTab })));
const UserKnowledgeTab = React.lazy(() => import('../settings/tabs/UserKnowledgeTab').then((m) => ({ default: m.UserKnowledgeTab })));
const VoiceTab = React.lazy(() => import('../settings/tabs/VoiceTab').then((m) => ({ default: m.VoiceTab })));
const AgentTaskManagerTab = React.lazy(() => import('../settings/tabs/AgentTaskManagerTab').then((m) => ({ default: m.AgentTaskManagerTab })));
const SafetyTab = React.lazy(() => import('../settings/tabs/SafetyTab').then((m) => ({ default: m.SafetyTab })));
const SecurityLoginTab = React.lazy(() => import('../settings/tabs/SecurityLoginTab').then((m) => ({ default: m.SecurityLoginTab })));
const StorageTab = React.lazy(() => import('../settings/tabs/StorageTab').then((m) => ({ default: m.StorageTab })));
const DataControlsTab = React.lazy(() => import('../settings/tabs/DataControlsTab').then((m) => ({ default: m.DataControlsTab })));
const AiModelsTab = React.lazy(() => import('../settings/tabs/AiModelsTab').then((m) => ({ default: m.AiModelsTab })));
const McpIntegrationsTab = React.lazy(() => import('../settings/tabs/McpIntegrationsTab').then((m) => ({ default: m.McpIntegrationsTab })));

// Background prefetch cache for zero-latency tab switching on hover
const TAB_LOADERS: Record<string, () => Promise<any>> = {
  account: () => import('../settings/tabs/AccountTab'),
  upgrade_plan: () => import('../settings/tabs/UpgradePlanTab'),
  ai_models: () => import('../settings/tabs/AiModelsTab'),
  computer_control: () => import('../settings/tabs/ComputerAwarenessTab'),
  mcp_integrations: () => import('../settings/tabs/McpIntegrationsTab'),
  permissions: () => import('../settings/tabs/PermissionsTab'),
  notifications: () => import('../settings/tabs/NotificationsTab'),
  personalization: () => import('../settings/tabs/PersonalizationTab'),
  user_knowledge: () => import('../settings/tabs/UserKnowledgeTab'),
  voice: () => import('../settings/tabs/VoiceTab'),
  agent_task_manager: () => import('../settings/tabs/AgentTaskManagerTab'),
  safety: () => import('../settings/tabs/SafetyTab'),
  security_login: () => import('../settings/tabs/SecurityLoginTab'),
  storage: () => import('../settings/tabs/StorageTab'),
  data_controls: () => import('../settings/tabs/DataControlsTab'),
};

const prefetchTab = (tabId: string) => {
  if (TAB_LOADERS[tabId]) {
    TAB_LOADERS[tabId]().catch(() => {});
  }
};

interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCustomWaveform?: boolean;
}

export const ConvoAgentSettingsView: React.FC = () => {
  const { setActiveView, activeSettingsTab, setActiveSettingsTab } = useSeyalAi();

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
    { id: 'ai_models', label: 'AI Models & Providers', icon: Cpu },
    { id: 'computer_control', label: 'Computer Awareness & Control', icon: Laptop },
    { id: 'mcp_integrations', label: 'MCP & Integrations', icon: Network },
    { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'personalization', label: 'Personalization', icon: Sliders },
    { id: 'user_knowledge', label: 'User Knowledge & Rules', icon: Brain },
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
                  onMouseEnter={() => prefetchTab(item.id)}
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
          {/* General Tab renders synchronously with 0ms delay */}
          {activeTab === 'general' ? (
            <GeneralTab />
          ) : (
            <React.Suspense
              fallback={
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-cyan-400 font-mono text-xs">
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
                  <span className="text-slate-400 text-xs">Loading {sidebarItems.find(s => s.id === activeTab)?.label || 'settings'}...</span>
                </div>
              }
            >
              {activeTab === 'account' && <AccountTab />}
              {activeTab === 'upgrade_plan' && <UpgradePlanTab />}
              {activeTab === 'ai_models' && <AiModelsTab />}
              {activeTab === 'computer_control' && <ComputerAwarenessTab />}
              {activeTab === 'mcp_integrations' && <McpIntegrationsTab />}
              {activeTab === 'permissions' && <PermissionsTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'personalization' && <PersonalizationTab />}
              {activeTab === 'user_knowledge' && (
                <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                  <UserKnowledgeTab />
                </div>
              )}
              {activeTab === 'voice' && <VoiceTab />}
              {activeTab === 'agent_task_manager' && <AgentTaskManagerTab />}
              {activeTab === 'safety' && <SafetyTab />}
              {activeTab === 'security_login' && <SecurityLoginTab />}
              {activeTab === 'storage' && <StorageTab />}
              {activeTab === 'data_controls' && <DataControlsTab />}
            </React.Suspense>
          )}

          {/* Fallback Placeholder for Unknown Tab */}
          {![
            'general',
            'account',
            'upgrade_plan',
            'ai_models',
            'computer_control',
            'mcp_integrations',
            'permissions',
            'notifications',
            'personalization',
            'user_knowledge',
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
                  Standard preferences for this category are managed automatically by the Seyal AI layer.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
