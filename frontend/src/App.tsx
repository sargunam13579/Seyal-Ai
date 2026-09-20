import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NexusProvider, useNexus } from './context/NexusContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { ConvoComputerUseAgentView } from './components/convo_computer_use_agent';
import { SystemControlView } from './components/views/SystemControlView';
import { ApplicationsView } from './components/views/ApplicationsView';
import { HeroAgentLogoOrb } from './components/convo_computer_use_agent/HeroAgentLogoOrb';
import { FilesView } from './components/views/FilesView';
import { DevicesView } from './components/views/DevicesView';
import { AutomationsView } from './components/views/AutomationsView';
import { ActivityView } from './components/views/ActivityView';
import { SettingsView } from './components/views/SettingsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ProfileSetupPage } from './components/auth/ProfileSetupPage';
import { api } from './services/api';
import type { MessageItem } from './types';

const MainContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    isBackendConnected,
    connectionState,
    isLoading,
    setMessages,
    addActivity,
    activeConversationId,
    setActiveConversationId,
    refreshConversations,
    isHeroLogoOpen,
    isHeroLogoClosing,
    heroLogoTrigger,
  } = useNexus();
  const {
    cancelCurrentSpeech,
    getNextTurnId,
    getCurrentTurnId,
    setProcessing,
  } = useVoice();

  const welcomeExecutedRef = useRef<boolean>(false);

  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);


  // Central sendUserMessage for global voice / chat processing
  const sendUserMessage = async (messageText: string, source: 'voice' | 'chat' = 'voice', files: File[] = []) => {

    const query = messageText.trim();
    if (!query) return;

    // 1. Create unique requestId / turnId
    const turnId = getNextTurnId();
    console.log(`[USER TURN START] turnId=${turnId} source=${source} text="${query}"`);

    // 2. Cancel any active TTS speech immediately
    cancelCurrentSpeech(`user_${source}_input`);
    console.log(`[TTS CANCELLED] turnId=${turnId}`);
    setProcessing(true);

    const targetConvId = activeConversationIdRef.current;


    const userMsg: MessageItem = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    // Render user text in chat
    setMessages((prev) => [...prev, userMsg]);

    addActivity({
      type: 'chat',
      title: source === 'voice' ? 'Voice Directive' : 'Chat Directive',
      detail: query.slice(0, 90),
      status: 'info',
    });

    try {
      console.log(`[FRONTEND STREAM REQUEST] turnId=${turnId}`);
      let streamedContent = '';
      let assistantAdded = false;

      await api.sendMessageStream(
        query,
        targetConvId || undefined,
        files,
        (chunk) => {
          if (turnId !== getCurrentTurnId()) return;
          streamedContent += chunk;
          if (!assistantAdded) {
            assistantAdded = true;
            setProcessing(false);
            const assistantMsg: MessageItem = {
              role: 'assistant',
              content: streamedContent,
              model_used: 'gemini-2.5-flash',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.role === 'assistant') {
                updated[lastIdx] = { ...updated[lastIdx], content: streamedContent };
              }
              return updated;
            });
          }
        },
        (startedConvId) => {
          if (turnId !== getCurrentTurnId()) return;
          if (startedConvId) {
            setActiveConversationId(startedConvId);
            activeConversationIdRef.current = startedConvId;
            refreshConversations();
          }
        },
        (completedConvId) => {
          if (turnId !== getCurrentTurnId()) return;
          if (completedConvId) {
            setActiveConversationId(completedConvId);
            activeConversationIdRef.current = completedConvId;
            refreshConversations();
          }
        }
      );

      setProcessing(false);
    } catch (err: any) {
      if (turnId !== getCurrentTurnId()) {
        console.warn(`[STALE RESPONSE IGNORED ON ERROR] id=${turnId}`);
        return;
      }

      console.error('[AI] Request failed:', err);
      const rawDetail = String(err?.response?.data?.detail || err?.message || '');
      const finalErrorText = 'Please check your internet connection.';

      const errorMsg: MessageItem = {
        role: 'assistant',
        content: finalErrorText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setProcessing(false);

      addActivity({
        type: 'chat',
        title: 'Network Notice',
        detail: rawDetail || 'Connection timeout / offline',
        status: 'error',
      });
    } finally {
      if (turnId === getCurrentTurnId()) {
        setProcessing(false);
      }
    }
  };

  const sendUserMessageRef = useRef(sendUserMessage);
  useEffect(() => {
    sendUserMessageRef.current = sendUserMessage;
  });

  // Session startup: Ready and idle until user provides first input
  useEffect(() => {
    if (welcomeExecutedRef.current) return;
    if (!isBackendConnected && isLoading) return;
    welcomeExecutedRef.current = true;
  }, [isBackendConnected, isLoading]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
      case 'assistant':
      case 'computer_use':
        return <ConvoComputerUseAgentView />;
      case 'system':
        return <SystemControlView />;
      case 'applications':
        return <ApplicationsView />;
      case 'files':
        return <FilesView />;
      case 'devices':
        return <DevicesView />;
      case 'automations':
        return <AutomationsView />;
      case 'activity':
        return <ActivityView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ConvoComputerUseAgentView />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#060911] text-slate-100 select-none">
      {/* Top Header HUD - Always visible for Seyal AI Conversational Computer-Use Agent */}
      <Header />

      {/* Sleek connection state HUD — only shows if actively reconnecting */}
      {connectionState === 'RECONNECTING' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs px-6 py-1.5 flex items-center justify-between font-tech shrink-0 transition-all duration-300">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            Connecting to AI Engine... (automatic background recovery active)
          </span>
          <span className="font-mono text-[11px] opacity-80">Auto-Reconnecting</span>
        </div>
      )}

      {/* Main OS Body: Sidebar + Active View Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar onSelectPrompt={(prompt) => sendUserMessage(prompt, 'chat')} />
        <main className={`flex-1 min-h-0 overflow-y-auto ${activeView === 'assistant' || activeView === 'computer_use' || activeView === 'settings' ? 'p-0' : 'p-4 md:p-6 lg:p-7'}`}>
          {/* Back arrow — shown on secondary views (for convo agent settings, back button is embedded inside the search bar) */}
          {activeView !== 'assistant' && activeView !== 'computer_use' && activeView !== 'settings' && (
            <button
              onClick={() => setActiveView('assistant')}
              className="mb-4 flex items-center gap-2 text-slate-400 hover:text-cyan-300 transition-colors group"
              title="Back to Agent"
            >
              <span className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-cyan-500/50 flex items-center justify-center transition-colors group-hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium tracking-wide">Back</span>
            </button>
          )}
          {renderView()}
        </main>
      </div>

      <ConfirmationModal />

      {/* Global Center Hero App Logo Popup (Synchronously hidden on Settings view, zero flicker on return) */}
      {(isHeroLogoOpen || isHeroLogoClosing) && (
        <div className={activeView === 'settings' ? 'hidden pointer-events-none' : 'contents'}>
          <HeroAgentLogoOrb key={heroLogoTrigger} isClosing={isHeroLogoClosing} />
        </div>
      )}
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { session } = useAuth();
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);
  const checkedUserIdRef = useRef<string | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      checkedUserIdRef.current = null;
      return;
    }

    // If profile has already been verified for this logged-in user, do not re-sync
    if (checkedUserIdRef.current === userId) {
      return;
    }

    const checkAndSyncProfile = async () => {
      try {
        const res = await api.getProfile();

        if (res.setup_required) {
          // If setup is required in local DB, check if user already has profile in Supabase Cloud
          const metadata = session?.user?.user_metadata;
          const hasName = Boolean(metadata?.name || metadata?.full_name);
          const hasMotherTongue = Boolean(metadata?.mother_tongue);
          const hasKnownLanguages = Boolean(
            (Array.isArray(metadata?.known_languages) && metadata.known_languages.length > 0) ||
            metadata?.known_languages
          );

          if (hasName && hasMotherTongue && hasKnownLanguages) {
            try {
              const langs = Array.isArray(metadata.known_languages)
                ? metadata.known_languages
                : [metadata.known_languages];

              await api.setupProfile({
                name: (metadata.name || metadata.full_name).trim(),
                dob: metadata.dob || undefined,
                age: Number(metadata.age) || 25,
                gender: metadata.gender || 'other',
                mother_tongue: metadata.mother_tongue,
                known_languages: langs,
              });
              setProfileSetupRequired(false);
            } catch (syncErr) {
              console.warn('Failed to sync cloud profile to local DB (will not block user):', syncErr);
              setProfileSetupRequired(false);
            }
          } else {
            // Truly new user with no profile data in DB -> show Onboarding Wizard
            setProfileSetupRequired(true);
          }
        } else {
          setProfileSetupRequired(false);
        }
        checkedUserIdRef.current = userId;
      } catch (err: any) {
        console.warn('Profile check notice (proceeding to app):', err);
        setProfileSetupRequired(false);
        checkedUserIdRef.current = userId;
      }
    };

    checkAndSyncProfile();
  }, [userId, session]);

  if (!session) {
    return <LoginPage />;
  }

  if (profileSetupRequired) {
    return (
      <ProfileSetupPage
        onComplete={() => setProfileSetupRequired(false)}
      />
    );
  }

  return (
    <NexusProvider>
      <VoiceProvider>
        <MainContent />
      </VoiceProvider>
    </NexusProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
