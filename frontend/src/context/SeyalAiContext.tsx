import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { connectionManager, type ConnectionState, type ReadinessInfo } from '../services/ConnectionManager';
import type {
  HealthResponse,
  IdentityResponse,
  LaptopStatusResponse,
  DeviceNode,
  ActivityEvent,
  MessageItem,
} from '../types';
import { loadSavedRadialOrder, saveRadialOrder } from '../config/radialActionsConfig';

export type NavView =
  | 'dashboard'
  | 'assistant'
  | 'computer_use'
  | 'system'
  | 'applications'
  | 'files'
  | 'devices'
  | 'automations'
  | 'activity'
  | 'settings';

export const getWelcomeGreetingText = (userName = 'User'): string => {
  const displayUser = userName && userName.trim() ? userName.trim() : 'User';
  return `Hey ${displayUser}! Welcome back. Naan ready. Sollunga, enna pannalam?`;
};

export const createWelcomeMessage = (userName = 'User', _assistantName = 'Seyal AI'): MessageItem => {
  return {
    id: 'welcome-message',
    role: 'assistant',
    content: getWelcomeGreetingText(userName),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    model_used: 'gemini-2.5-flash',
  };
};

interface SeyalAiContextType {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  identity: IdentityResponse | null;
  health: HealthResponse | null;
  readiness: ReadinessInfo | null;
  laptopStatus: LaptopStatusResponse | null;
  devices: DeviceNode[];
  activities: ActivityEvent[];
  pendingConfirmationPrompt: string | null;
  isBackendConnected: boolean;
  connectionState: ConnectionState;
  isLoading: boolean;
  isComputerUseActive: boolean;
  setIsComputerUseActive: (active: boolean) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  messages: MessageItem[];
  setMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>;
  computerUseMessages: MessageItem[];
  setComputerUseMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>;
  computerUseConversationId: string | null;
  setComputerUseConversationId: (id: string | null) => void;
  refreshState: () => Promise<void>;
  requestNameChange: (targetName: string) => Promise<string>;
  confirmAction: (confirmed: boolean) => Promise<{ success: boolean; message: string }>;
  cancelPendingConfirmation: () => Promise<void>;
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  triggerEmergencyStop: () => void;
  resetChatContext: () => Promise<void>;
  conversationsVersion: number;
  refreshConversations: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isConvoSidebarCollapsed: boolean;
  setIsConvoSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isHeroLogoOpen: boolean;
  setIsHeroLogoOpen: (open: boolean) => void;
  isHeroLogoClosing: boolean;
  heroLogoTrigger: number;
  openHeroLogo: () => void;
  closeHeroLogo: () => void;
  radialButtonOrder: string[];
  setRadialButtonOrder: (order: string[]) => void;
  isTextInputPopupOpen: boolean;
  setIsTextInputPopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
  openSettingsTab: (tab: string) => void;
  userProfileAvatar: string | null;
  setUserProfileAvatar: (avatar: string | null) => void;
}

const SeyalAiContext = createContext<SeyalAiContextType | undefined>(undefined);

export const SeyalAiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<NavView>('assistant');
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('general');
  const [isComputerUseActive, setIsComputerUseActive] = useState<boolean>(true);
  const [conversationsVersion, setConversationsVersion] = useState<number>(0);

  const openSettingsTab = useCallback((tab: string) => {
    setActiveSettingsTab(tab);
    setActiveView('settings');
  }, []);

  // Frequent Task Shortcuts (Action Popup 8-buttons custom ordering)
  const [radialButtonOrder, setRadialButtonOrderState] = useState<string[]>(() => loadSavedRadialOrder());

  const setRadialButtonOrder = useCallback((order: string[]) => {
    setRadialButtonOrderState(order);
    saveRadialOrder(order);
  }, []);

  // Convo sidebar collapse state: defaults to OPEN (false)
  const [isConvoSidebarCollapsed, setIsConvoSidebarCollapsed] = useState<boolean>(false);

  // Hero Logo Orb state: waits 1 second after app launch before opening
  const [isHeroLogoOpen, setIsHeroLogoOpen] = useState<boolean>(false);
  const [isHeroLogoClosing, setIsHeroLogoClosing] = useState<boolean>(false);
  const [heroLogoTrigger, setHeroLogoTrigger] = useState<number>(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Floating text input bar popup state (defaults to open in original view)
  const [isTextInputPopupOpen, setIsTextInputPopupOpen] = useState<boolean>(true);

  const openHeroLogo = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsHeroLogoClosing(false);
    setIsHeroLogoOpen(true);
    setHeroLogoTrigger((prev) => prev + 1);
  }, []);

  const closeHeroLogo = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setIsHeroLogoClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsHeroLogoOpen(false);
      setIsHeroLogoClosing(false);
      closeTimerRef.current = null;
    }, 1100);
  }, []);

  // Launch popup with flight animation 1 second after app opens
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHeroLogoOpen(true);
      setHeroLogoTrigger((prev) => prev + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);



  // Clear any legacy persisted collapsed state so it always defaults to open
  useEffect(() => {
    try {
      localStorage.removeItem('seyal_sidebar_collapsed');
      localStorage.removeItem('seyal_simple_sidebar_collapsed');
      localStorage.removeItem('seyal_convo_sidebar_collapsed');
    } catch { }
  }, []);

  const handleSetIsConvoSidebarCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsConvoSidebarCollapsed((prev) => (typeof val === 'function' ? val(prev) : val));
  }, []);

  const refreshConversations = useCallback(() => {
    setConversationsVersion((v) => v + 1);
  }, []);

  // Initialise identity with the user name from the Supabase JWT metadata so the
  // greeting and avatar render instantly (before the /api/identity round-trip completes).
  const initialUserName: string =
    (user?.user_metadata?.name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    '';
  const [identity, setIdentity] = useState<IdentityResponse | null>(
    initialUserName
      ? ({ user_name: initialUserName } as IdentityResponse)
      : null
  );
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [laptopStatus, setLaptopStatus] = useState<LaptopStatusResponse | null>(null);
  const [devices, setDevices] = useState<DeviceNode[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [pendingConfirmationPrompt, setPendingConfirmationPrompt] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(connectionManager.getState());
  const [readiness, setReadiness] = useState<ReadinessInfo | null>(connectionManager.getReadiness());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Conversational Computer-Use Agent conversation states
  const [computerUseConversationId, setComputerUseConversationId] = useState<string | null>(null);
  const [computerUseMessages, setComputerUseMessages] = useState<MessageItem[]>([]);

  const activeConversationId = computerUseConversationId;
  const setActiveConversationId = (id: string | null) => {
    setComputerUseConversationId(id);
  };

  const messages = computerUseMessages;
  const setMessages: React.Dispatch<React.SetStateAction<MessageItem[]>> = (val) => {
    setComputerUseMessages(val);
  };

  const [userProfileAvatar, setUserProfileAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem('seyal_user_avatar') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAvatarUpdate = () => {
      try {
        const stored = localStorage.getItem('seyal_user_avatar') || null;
        setUserProfileAvatar(stored);
      } catch {
        // ignore
      }
    };
    window.addEventListener('seyal_avatar_updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('seyal_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  const userHasInteractedRef = useRef<boolean>(false);

  const addActivity = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setActivities((prev) => [newEvent, ...prev.slice(0, 49)]);
  }, []);

  const isBackendConnected = connectionState === 'CONNECTED' || connectionState === 'DEGRADED' || connectionState === 'OFFLINE';

  useEffect(() => {
    connectionManager.start();
    const unsubscribe = connectionManager.subscribe((state, healthData, readyData) => {
      setConnectionState(state);
      if (healthData) setHealth(healthData);
      setReadiness(readyData);
      setIsLoading(false);
    });
    return () => {
      unsubscribe();
      connectionManager.stop();
    };
  }, []);

  // Decoupled App State Sync: Fetches identity, laptop telemetry, and devices without impacting liveness
  const refreshState = useCallback(async () => {
    try {
      const idData = await api.getIdentity().catch(() => null);
      if (idData) {
        setIdentity(idData);

        if (idData.has_pending_confirmation && !pendingConfirmationPrompt) {
          setPendingConfirmationPrompt(
            idData.pending_action
              ? `Action pending: ${idData.pending_action}`
              : 'Confirmation required for pending action'
          );
        } else if (!idData.has_pending_confirmation) {
          setPendingConfirmationPrompt(null);
        }
      }

      // Best effort telemetry
      try {
        const laptop = await api.getLaptopStatus();
        setLaptopStatus(laptop);
      } catch {
        // Laptop telemetry optional
      }

      try {
        const devData = await api.listDevices();
        setDevices(devData.devices || []);
      } catch {
        // Devices list optional
      }
    } catch (err) {
      console.warn('Error refreshing state:', err);
    }
  }, [pendingConfirmationPrompt]);

  useEffect(() => {
    if (isBackendConnected) {
      refreshState();
      const interval = setInterval(refreshState, 15000);
      return () => clearInterval(interval);
    }
  }, [refreshState, isBackendConnected]);

  const requestNameChange = async (targetName: string): Promise<string> => {
    try {
      const res = await api.requestNameChange(targetName);
      setPendingConfirmationPrompt(res.confirmation_prompt);
      addActivity({
        type: 'identity',
        title: 'Identity Change Requested',
        detail: `Request initiated to rename assistant to '${targetName}'`,
        status: 'info',
      });
      await refreshState();
      return res.confirmation_prompt;
    } catch (err: any) {
      addActivity({
        type: 'identity',
        title: 'Rename Request Failed',
        detail: err?.response?.data?.detail || err.message,
        status: 'error',
      });
      throw err;
    }
  };

  const confirmAction = async (confirmed: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.confirmPendingAction(confirmed);
      setPendingConfirmationPrompt(null);
      addActivity({
        type: 'identity',
        title: confirmed ? 'Action Approved' : 'Action Rejected',
        detail: res.message,
        status: confirmed ? 'success' : 'warning',
      });
      await refreshState();
      return { success: res.confirmed, message: res.message };
    } catch (err: any) {
      addActivity({
        type: 'identity',
        title: 'Confirmation Error',
        detail: err?.response?.data?.detail || err.message,
        status: 'error',
      });
      throw err;
    }
  };

  const cancelPendingConfirmation = async (): Promise<void> => {
    try {
      await api.cancelPendingConfirmation();
      setPendingConfirmationPrompt(null);
      await refreshState();
    } catch (err) {
      console.error('Cancel pending failed', err);
    }
  };

  const triggerEmergencyStop = () => {
    addActivity({
      type: 'security',
      title: '🚨 EMERGENCY KILL SWITCH TRIGGERED',
      detail: 'Manual emergency stop triggered by operator',
      status: 'error',
    });
    // Attempt resetting chat or canceling any confirmation
    api.cancelPendingConfirmation().catch(() => { });
  };

  const resetChatContext = async () => {
    try {
      if (!isComputerUseActive) {
        await api.resetChat();
      }
      setMessages([]);
      setActiveConversationId(null);
      userHasInteractedRef.current = false;
      addActivity({
        type: 'chat',
        title: isComputerUseActive ? 'Agent Session Reset' : 'Context Reset',
        detail: isComputerUseActive ? 'Computer-Use Agent session cleared.' : 'Conversation session cleared.',
        status: 'info',
      });
    } catch (err: any) {
      console.error('Reset chat failed:', err);
    }
  };

  return (
    <SeyalAiContext.Provider
      value={{
        activeView,
        setActiveView,
        isComputerUseActive,
        setIsComputerUseActive,
        identity,
        health,
        laptopStatus,
        devices,
        activities,
        pendingConfirmationPrompt,
        isBackendConnected,
        connectionState,
        readiness,
        isLoading,
        activeConversationId,
        setActiveConversationId,
        messages,
        setMessages,
        computerUseMessages,
        setComputerUseMessages,
        computerUseConversationId,
        setComputerUseConversationId,
        refreshState,
        requestNameChange,
        confirmAction,
        cancelPendingConfirmation,
        addActivity,
        triggerEmergencyStop,
        resetChatContext,
        conversationsVersion,
        refreshConversations,
        isSidebarCollapsed: isConvoSidebarCollapsed,
        setIsSidebarCollapsed: handleSetIsConvoSidebarCollapsed,
        isConvoSidebarCollapsed,
        setIsConvoSidebarCollapsed: handleSetIsConvoSidebarCollapsed,
        isHeroLogoOpen,
        setIsHeroLogoOpen,
        isHeroLogoClosing,
        heroLogoTrigger,
        openHeroLogo,
        closeHeroLogo,
        radialButtonOrder,
        setRadialButtonOrder,
        isTextInputPopupOpen,
        setIsTextInputPopupOpen,
        activeSettingsTab,
        setActiveSettingsTab,
        openSettingsTab,
        userProfileAvatar,
        setUserProfileAvatar,
      }}
    >
      {children}
    </SeyalAiContext.Provider>
  );
};

export const useSeyalAi = (): SeyalAiContextType => {
  const context = useContext(SeyalAiContext);
  if (!context) {
    throw new Error('useSeyalAi must be used within a SeyalAiProvider');
  }
  return context;
};

