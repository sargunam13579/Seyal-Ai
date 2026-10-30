import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SeyalAiProvider, useSeyalAi } from './context/SeyalAiContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConfirmationModal } from './shared';
import { ConvoComputerUseAgentView } from './features/computer_agent';
import { HeroAgentLogoOrb } from './features/computer_agent/HeroAgentLogoOrb';

// Lazy-load secondary views for code-splitting and faster initial bundle startup
const SystemControlView = React.lazy(() => import('./components/views/SystemControlView').then(m => ({ default: m.SystemControlView })));
const ApplicationsView = React.lazy(() => import('./components/views/ApplicationsView').then(m => ({ default: m.ApplicationsView })));
const FilesView = React.lazy(() => import('./components/views/FilesView').then(m => ({ default: m.FilesView })));
const DevicesView = React.lazy(() => import('./components/views/DevicesView').then(m => ({ default: m.DevicesView })));
const AutomationsView = React.lazy(() => import('./components/views/AutomationsView').then(m => ({ default: m.AutomationsView })));
const ActivityView = React.lazy(() => import('./components/views/ActivityView').then(m => ({ default: m.ActivityView })));
import { SettingsView } from './components/views/SettingsView';
import { AuthProvider, useAuth } from './context/AuthContext';
const LoginPage = React.lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ProfileSetupPage = React.lazy(() => import('./components/auth/ProfileSetupPage').then(m => ({ default: m.ProfileSetupPage })));
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
  } = useSeyalAi();
  const {
    cancelCurrentSpeech,
    getNextTurnId,
    getCurrentTurnId,
    setProcessing,
  } = useVoice();

  const welcomeExecutedRef = useRef<boolean>(false);

  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const handleAbort = () => {
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        streamAbortControllerRef.current = null;
        setProcessing(false);
      }
    };
    window.addEventListener('seyal_abort_stream', handleAbort);
    return () => window.removeEventListener('seyal_abort_stream', handleAbort);
  }, [setProcessing]);

  // Central sendUserMessage for global voice / chat processing
  const sendUserMessage = async (messageText: string, source: 'voice' | 'chat' = 'voice', files: File[] = []) => {

    const query = messageText.trim();
    if (!query) return;

    // 1. Create unique requestId / turnId
    const turnId = getNextTurnId();
    console.log(`[USER TURN START] turnId=${turnId} source=${source} text="${query}"`);

    // 2. Cancel any active stream & TTS speech immediately
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
    }
    const currentAbortController = new AbortController();
    streamAbortControllerRef.current = currentAbortController;

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
        },
        currentAbortController.signal
      );

      setProcessing(false);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log(`[STREAM ABORTED BY USER] turnId=${turnId}`);
        setProcessing(false);
        return;
      }

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

  const isMainWorkspace =
    activeView === 'assistant' || activeView === 'computer_use' || activeView === 'dashboard';

  const renderSecondaryView = () => {
    switch (activeView) {
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
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#060911] text-slate-100 select-none">
      {/* Top Header HUD - Always visible for Seyal AI Conversational Computer-Use Agent */}
      <Header />

      {/* Method A & B: Sleek ChatGPT-style network indicator — shows ONLY if hardware is literally offline */}
      {connectionState === 'OFFLINE' && (
        <div className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs px-6 py-1.5 flex items-center justify-between font-mono shrink-0 transition-all duration-300 backdrop-blur-md">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
            Internet disconnected — local computer actions available, cloud intelligence paused
          </span>
          <span className="text-[11px] opacity-70">Offline</span>
        </div>
      )}

      {/* Main OS Body: Sidebar + Active View Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar onSelectPrompt={(prompt) => sendUserMessage(prompt, 'chat')} />
        <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          {/* Main Agent Workspace: Always kept alive in background to preserve continuous voice, speaking & desktop agent tasks */}
          <div className={`h-full w-full flex-col min-h-0 ${isMainWorkspace ? 'flex' : 'hidden'}`}>
            <ConvoComputerUseAgentView />
          </div>

          {/* Dedicated Instant Settings Workspace: Kept alive to eliminate loading latency and retain active tab state */}
          <div className={`h-full w-full min-h-0 ${activeView === 'settings' ? 'flex' : 'hidden'}`}>
            <SettingsView />
          </div>

          {/* Secondary Views (Files, Applications, Devices, etc.) */}
          {!isMainWorkspace && activeView !== 'settings' && (
            <div className="h-full w-full overflow-y-auto p-4 md:p-6 lg:p-7">
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
              <React.Suspense fallback={
                <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-2" />
                  Loading view...
                </div>
              }>
                {renderSecondaryView()}
              </React.Suspense>
            </div>
          )}
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
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">Loading Seyal AI...</div>}>
        <LoginPage />
      </React.Suspense>
    );
  }

  if (profileSetupRequired) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center text-cyan-400 font-mono text-xs animate-pulse">Loading setup...</div>}>
        <ProfileSetupPage
          onComplete={() => setProfileSetupRequired(false)}
        />
      </React.Suspense>
    );
  }

  return (
    <SeyalAiProvider>
      <VoiceProvider>
        <MainContent />
      </VoiceProvider>
    </SeyalAiProvider>
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
