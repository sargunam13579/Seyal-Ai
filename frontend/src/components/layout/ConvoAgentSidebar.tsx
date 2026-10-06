import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  MessageSquare,
  MessageSquarePlus,
  Trash2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ConversationSummary } from '../../types';
import { LoginPage } from '../auth/LoginPage';
import { EditProfileModal, HelpModal, UserAccountMenu } from '../profile';
import {
  SidebarTaskItem,
  SidebarFooter,
  TaskContextMenu,
  TaskDetailsModal,
} from './sidebar/index';

interface ConvoAgentSidebarProps {
  onSelectPrompt?: (promptText: string) => void;
}

const PINNED_STORAGE_KEY = 'seyal_pinned_agent_task_ids';
const CONV_CACHE_KEY = 'seyal_agent_conv_cache';
const RENAME_HISTORY_STORAGE_KEY = 'seyal_agent_rename_history';

const getRenameHistory = (convId: string): string[] => {
  try {
    const raw = localStorage.getItem(RENAME_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed[convId]) ? parsed[convId] : [];
  } catch {
    return [];
  }
};

const appendRenameHistory = (convId: string, oldTitle: string, newTitle: string) => {
  try {
    const raw = localStorage.getItem(RENAME_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const existing: string[] = Array.isArray(parsed[convId]) ? parsed[convId] : [];

    let updated: string[];
    if (existing.length === 0) {
      updated = [oldTitle, newTitle];
    } else {
      if (existing[existing.length - 1]?.toLowerCase() !== newTitle.toLowerCase()) {
        updated = [...existing, newTitle];
      } else {
        updated = existing;
      }
    }
    parsed[convId] = updated;
    localStorage.setItem(RENAME_HISTORY_STORAGE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.error('Failed to save rename history:', err);
  }
};

export const ConvoAgentSidebar: React.FC<ConvoAgentSidebarProps> = () => {
  const {
    activeConversationId,
    setActiveConversationId,
    identity,
    resetChatContext,
    setMessages,
    setActiveView,
    activeView,
    isComputerUseActive,
    conversationsVersion,
    isConvoSidebarCollapsed,
    setIsConvoSidebarCollapsed,
    openSettingsTab,
    setUserProfileAvatar,
  } = useSeyalAi();

  const { signOut, user } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [profileMenuOpen]);

  // Automatically close Info modal, 3-dots menus, and profile dropdown whenever navigating away
  // (e.g. going Back to Simple Chat, opening Settings, Dashboard, etc.)
  useEffect(() => {
    if (!isComputerUseActive || activeView !== 'assistant') {
      setInfoModalConv(null);
      setActiveMenu(null);
      setProfileMenuOpen(false);
      setCopiedId(false);
      setCopiedDesc(false);
    }
  }, [isComputerUseActive, activeView]);

  // Stale-while-revalidate: seed state from localStorage cache immediately (zero wait)
  const [conversations, setConversations] = useState<ConversationSummary[]>(() => {
    try {
      const cached = localStorage.getItem(CONV_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PINNED_STORAGE_KEY) || localStorage.getItem('seyal_pinned_conversation_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenu, setActiveMenu] = useState<{
    conv: ConversationSummary;
    isPinned: boolean;
    style: React.CSSProperties;
  } | null>(null);
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [infoModalConv, setInfoModalConv] = useState<ConversationSummary | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDeleteToast = (message: string, isError = false) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setDeleteToast({ message, isError });
    toastTimeoutRef.current = setTimeout(() => {
      setDeleteToast(null);
      toastTimeoutRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const [infoDetail, setInfoDetail] = useState<{
    loading: boolean;
    messageCount: number;
    startTime: string | null;
    endTime: string | null;
    durationLabel: string;
    description?: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = async () => {
    try {
      // Unlimited: fetches all conversation history without a 50-item cap
      const res = await api.listConversations(1, 0);
      const convs = res.conversations || [];
      setConversations(convs);
      // Update localStorage cache so next app-open is instant
      try { localStorage.setItem(CONV_CACHE_KEY, JSON.stringify(convs)); } catch { /* quota */ }
    } catch (err) {
      console.debug('Failed to load agent task conversations:', err);
    }
  };

  // Load once on mount (cache already shown), refresh when active conversation changes or conversationsVersion updates
  useEffect(() => {
    loadConversations();
  }, [activeConversationId, conversationsVersion]);

  // Periodic refresh while active conversation exists to catch dynamic AI title updates
  useEffect(() => {
    if (!activeConversationId) return;
    const interval = setInterval(() => {
      loadConversations();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  // Save pinned IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Best effort
    }
  }, [pinnedIds]);

  // Close 3-dot menu on outside click, scroll, or resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleClose = () => {
      setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'N/A';
    }
  };

  const generateConversationDescription = (
    messages: Array<{ role: string; content: string; timestamp?: string }>,
    title?: string
  ): string => {
    if (!messages || messages.length === 0) {
      const cleanTitle = (title || '').replace(/^\[Computer-Use\]\s*/i, '').trim();
      return cleanTitle
        ? `This task was initialized for "${cleanTitle}". No message exchange was recorded during the session.`
        : 'No conversation messages have been recorded for this task.';
    }

    const cleanSnippet = (txt: string, maxLen = 140) => {
      if (!txt) return '';
      let s = txt.replace(/```[\s\S]*?```/g, 'code snippet').replace(/`([^`]+)`/g, '$1');
      if (s.trim().startsWith('{') && s.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(s.trim());
          s = parsed.message || parsed.output || parsed.narration || parsed.summary || s;
        } catch {
          /* ignore */
        }
      }
      s = s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      return s.length > maxLen ? s.slice(0, maxLen - 3) + '...' : s;
    };

    const userMsgs = messages.filter((m) => m.role === 'user');
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');

    if (userMsgs.length === 0) {
      const mainOutput = assistantMsgs.map((a) => cleanSnippet(a.content, 120)).filter(Boolean).join(' ');
      return `Automated session operations were executed. Summary of recorded actions: ${mainOutput}`;
    }

    // Single turn conversation (1 user request)
    if (userMsgs.length === 1) {
      const firstReq = cleanSnippet(userMsgs[0].content, 100);
      const lastReply = assistantMsgs.length > 0 ? cleanSnippet(assistantMsgs[assistantMsgs.length - 1].content, 150) : '';

      if (lastReply) {
        return `This conversation focused on "${firstReq}". The assistant processed the request and concluded: ${lastReply}`;
      }
      return `This task was created for the instruction "${firstReq}", with no final response logged.`;
    }

    // Multi-turn conversation
    const firstReq = cleanSnippet(userMsgs[0].content, 80);
    const lastReq = cleanSnippet(userMsgs[userMsgs.length - 1].content, 80);
    const totalTurns = userMsgs.length;

    // Filter substantive requests (exclude simple single-word confirmations like "sari", "ok")
    const substantiveReqs = userMsgs
      .map((u) => cleanSnippet(u.content, 60))
      .filter((t) => t.length > 2 && !/^(ok|okay|sari|haan|yes|no|hmm|thanks|bye|done)$/i.test(t));

    const keyActions = assistantMsgs
      .map((a) => cleanSnippet(a.content, 100))
      .filter(Boolean);

    const lastReply = keyActions.length > 0 ? keyActions[keyActions.length - 1] : '';

    let paragraph = `In this ${totalTurns}-turn conversation, the user began by inquiring about "${firstReq}". `;

    if (substantiveReqs.length > 1) {
      const otherReqs = substantiveReqs.slice(1, 3).map((r) => `"${r}"`).join(' and ');
      paragraph += `The discussion also addressed ${otherReqs}. `;
    } else if (lastReq !== firstReq) {
      paragraph += `The interaction concluded with a follow-up: "${lastReq}". `;
    }

    if (lastReply) {
      paragraph += `The assistant handled the requests and concluded with: ${lastReply}`;
    } else {
      paragraph += `The assistant completed the requested operations across the session.`;
    }

    return paragraph;
  };

  const handleOpenInfoModal = async (conv: ConversationSummary) => {
    setInfoModalConv(conv);
    setActiveMenu(null);
    setCopiedId(false);
    setCopiedDesc(false);
    setInfoDetail({
      loading: true,
      messageCount: conv.message_count || 0,
      startTime: conv.created_at,
      endTime: conv.created_at,
      durationLabel: 'Loading...',
      description: 'Generating overview paragraph...',
    });

    try {
      const detail = await api.getConversation(conv.id);
      const msgs = detail?.messages || [];
      const count = msgs.length;
      const startTime = conv.created_at || (msgs.length > 0 ? msgs[0].timestamp : null);
      const endTime = msgs.length > 0 ? (msgs[msgs.length - 1].timestamp || startTime) : startTime;

      let durationLabel = '';
      if (startTime && endTime) {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        const diffMs = Math.max(0, endMs - startMs);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffHours > 0) {
          const remainingMins = diffMins % 60;
          durationLabel = `${diffHours}h ${remainingMins}m`;
        } else if (diffMins > 0) {
          durationLabel = `${diffMins} min${diffMins > 1 ? 's' : ''}`;
        } else {
          const diffSecs = Math.floor(diffMs / 1000);
          durationLabel = diffSecs > 10 ? `${diffSecs} secs` : '< 1 min';
        }
      }

      // Instant high-quality narrative paragraph overview
      const description = generateConversationDescription(msgs, conv.summary || undefined);

      setInfoDetail({
        loading: false,
        messageCount: count,
        startTime: startTime || null,
        endTime: endTime || null,
        durationLabel,
        description,
      });

      // Seamlessly refine with AI overview if available
      api.getConversationOverview(conv.id)
        .then((res) => {
          if (res?.overview) {
            setInfoDetail((prev) => {
              if (!prev) return prev;
              return { ...prev, description: res.overview };
            });
          }
        })
        .catch((err) => {
          console.debug('Background AI overview fetch fallback to heuristic:', err);
        });
    } catch (err) {
      console.debug('Failed to fetch conversation detail for info modal:', err);
      const fallbackTitle = (conv.summary || '').replace(/^\[Computer-Use\]\s*/i, '').trim();
      setInfoDetail({
        loading: false,
        messageCount: conv.message_count || 0,
        startTime: conv.created_at,
        endTime: conv.created_at,
        durationLabel: '',
        description: fallbackTitle
          ? `This task was initialized for "${fallbackTitle}". No messages were logged.`
          : 'No overview description available for this conversation.',
      });
    }
  };

  const handleSelectConversation = async (convId: string) => {
    if (renamingConvId === convId) return;
    // Immediately switch view so user doesn't see a blank screen
    setActiveConversationId(convId);
    setActiveView('assistant');
    // Clear stale messages immediately so the UI doesn't flash old content
    setMessages([]);
    try {
      const detail = await api.getConversation(convId);
      if (detail && detail.messages) {
        setMessages(
          detail.messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load agent task details:', err);
    }
  };

  const handleTogglePin = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [convId, ...prev]
    );
    setActiveMenu(null);
  };

  const handleStartRename = (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingConvId(conv.id);
    const cleanName = (conv.summary || 'Agent Task').replace(/^\[Computer-Use\]\s*/i, '');
    setRenameText(cleanName);
    setActiveMenu(null);
  };

  const handleOpenMenu = (conv: ConversationSummary, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenu?.conv.id === conv.id) {
      setActiveMenu(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      const spaceBelowInContainer = containerRect ? containerRect.bottom - rect.bottom : window.innerHeight - rect.bottom - 180;
      const spaceBelowWindow = window.innerHeight - rect.bottom;
      const openUp = spaceBelowInContainer < 220 || spaceBelowWindow < 230;

      const style: React.CSSProperties = {
        position: 'fixed',
        right: `${Math.max(12, window.innerWidth - rect.right)}px`,
        width: '148px',
        zIndex: 99999,
        ...(openUp
          ? { bottom: `${Math.max(10, window.innerHeight - rect.top + 6)}px` }
          : { top: `${rect.bottom + 6}px` }),
      };

      setActiveMenu({
        conv,
        isPinned,
        style,
      });
    }
  };

  const handleSaveRename = async (convId: string) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setRenamingConvId(null);
      return;
    }

    const currentConv = conversations.find((c) => c.id === convId);
    const oldCleanName = (currentConv?.summary || 'Agent Task').replace(/^\[Computer-Use\]\s*/i, '');

    // Check uniqueness among other Agent tasks (guarantees unique titles within Conversational Agent)
    const otherAgentTitles = conversations
      .filter((c) => c.id !== convId && (c.summary || '').startsWith('[Computer-Use]'))
      .map((c) => (c.summary || '').replace(/^\[Computer-Use\]\s*/i, '').trim().toLowerCase());

    let candidate = trimmed;
    if (otherAgentTitles.includes(candidate.toLowerCase())) {
      let counter = 2;
      while (otherAgentTitles.includes(`${candidate} (${counter})`.toLowerCase())) {
        counter++;
      }
      candidate = `${candidate} (${counter})`;
    }

    if (oldCleanName.toLowerCase() !== candidate.toLowerCase()) {
      appendRenameHistory(convId, oldCleanName, candidate);
    }

    const finalSummary = `[Computer-Use] ${candidate}`;
    try {
      const updated = await api.updateConversation(convId, finalSummary);
      const updatedSummary = updated.summary || finalSummary;
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, summary: updatedSummary } : c))
      );
      if (infoModalConv && infoModalConv.id === convId) {
        setInfoModalConv((prev) => (prev ? { ...prev, summary: updatedSummary } : null));
      }
    } catch (err) {
      console.error('Failed to rename agent task:', err);
    } finally {
      setRenamingConvId(null);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    setDeletingConvId(convId);
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setPinnedIds((prev) => prev.filter((id) => id !== convId));
      if (activeConversationId === convId) {
        resetChatContext();
      }
      showDeleteToast('1 chat deleted');
    } catch (err) {
      console.error('Failed to delete agent task:', err);
      showDeleteToast('Delete failed', true);
    } finally {
      setDeletingConvId(null);
    }
  };

  // Show all conversation history in the sidebar
  const agentConversations = conversations;

  // Sort conversations: Pinned first, then by date
  const sortedConversations = [...agentConversations].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredConversations = sortedConversations.filter((c) => {
    const displayTitle = (c.summary || 'Agent task').replace(/^\[Computer-Use\]\s*/i, '');
    return displayTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const top10Ids = filteredConversations.slice(0, 10).map((c) => c.id);
  const isMaxSelected = selectedConvIds.length >= 10;
  const hasTop10Selected = top10Ids.length > 0 && top10Ids.every((id) => selectedConvIds.includes(id));
  const isDeselectState = hasTop10Selected || isMaxSelected;

  const handleEnterSelectMode = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMultiSelectMode(true);
    setSelectedConvIds([convId]);
    setActiveMenu(null);
  };

  const handleToggleSelect = (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedConvIds((prev) => {
      if (prev.includes(convId)) {
        return prev.filter((id) => id !== convId);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, convId];
    });
  };

  const handleSelectTop10 = () => {
    if (isDeselectState) {
      setSelectedConvIds([]);
    } else {
      setSelectedConvIds(top10Ids);
    }
  };

  const handleExitSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedConvIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedConvIds.length === 0) return;
    const deleteCount = selectedConvIds.length;
    setIsBatchDeleting(true);
    try {
      // 1 single batch HTTP request to delete all selected conversations
      await api.batchDeleteConversations(selectedConvIds);
      setConversations((prev) => prev.filter((c) => !selectedConvIds.includes(c.id)));
      setPinnedIds((prev) => prev.filter((id) => !selectedConvIds.includes(id)));
      if (activeConversationId && selectedConvIds.includes(activeConversationId)) {
        resetChatContext();
      }
      setSelectedConvIds([]);
      setIsMultiSelectMode(false);
      showDeleteToast(`${deleteCount} ${deleteCount === 1 ? 'chat' : 'chats'} deleted`);
    } catch (err) {
      console.error('Failed to batch delete agent tasks:', err);
      showDeleteToast('Delete failed', true);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const [customDisplayName, setCustomDisplayName] = useState<string>(() => {
    return localStorage.getItem('seyal_user_display_name') || identity?.user_name || (user?.email ? user.email.split('@')[0] : 'User');
  });
  const [customUsername, setCustomUsername] = useState<string>(() => {
    return (
      localStorage.getItem('seyal_user_username') ||
      (user?.email ? user.email.split('@')[0] : 'user')
    );
  });
  const [avatarImage, setAvatarImage] = useState<string | null>(() => {
    return localStorage.getItem('seyal_user_avatar') || null;
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const getInitials = (nameStr: string): string => {
    if (!nameStr) return 'PG';
    const clean = nameStr.trim();
    const uppers = clean.match(/[A-Z]/g);
    if (uppers && uppers.length >= 2) {
      return uppers.slice(0, 2).join('');
    }
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const handleAvatarUpdate = () => {
      try {
        const stored = localStorage.getItem('seyal_user_avatar') || null;
        setAvatarImage(stored);
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

  const handleSaveProfile = async (
    trimmedDisplay: string,
    trimmedUser: string,
    newAvatar: string | null
  ) => {
    localStorage.setItem('seyal_user_display_name', trimmedDisplay);
    localStorage.setItem('seyal_user_username', trimmedUser);
    if (newAvatar) {
      localStorage.setItem('seyal_user_avatar', newAvatar);
    } else {
      localStorage.removeItem('seyal_user_avatar');
    }

    setCustomDisplayName(trimmedDisplay);
    setCustomUsername(trimmedUser);
    setAvatarImage(newAvatar);
    setUserProfileAvatar(newAvatar);
    window.dispatchEvent(new Event('seyal_avatar_updated'));

    await api.setupProfile({
      name: trimmedDisplay,
      age: 25,
      gender: 'male',
    }).catch(() => {});
  };

  const userName = customDisplayName || identity?.user_name || (user?.email ? user.email.split('@')[0] : 'User');
  const displayUserEmail = user?.email || (customUsername ? `${customUsername}@gmail.com` : 'user@example.com');

  const renderAddAccountModal = () => {
    if (!isAddAccountModalOpen) return null;

    return (
      <LoginPage
        isModal
        onClose={() => setIsAddAccountModalOpen(false)}
        onSuccess={() => {
          setIsAddAccountModalOpen(false);
          setProfileMenuOpen(false);
        }}
      />
    );
  };

  if (isConvoSidebarCollapsed) {
    return (
      <aside className="w-14 relative z-40 glass-panel rounded-none border-t-0 border-l-0 border-b-0 border-r border-cyan-500/20 flex flex-col justify-between py-3 px-1.5 select-none bg-slate-950/85 backdrop-blur-2xl shrink-0 h-full transition-all duration-300 ease-in-out">
        {/* Top Header: Open History Arrow Button (>) + Quick New Task */}
        <div className="flex flex-col items-center gap-3 pt-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsConvoSidebarCollapsed(false)}
            className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400 shadow-sm shadow-cyan-950/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            title="Open history (>)"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={async () => {
              await resetChatContext();
              loadConversations();
              setActiveView('assistant');
            }}
            className="w-9 h-9 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            title="New Agent Task"
          >
            <MessageSquarePlus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Middle Spacer */}
        <div className="flex-1" />

        {/* Bottom User Avatar */}
        <div className="flex flex-col items-center pb-1 shrink-0 relative" ref={profileMenuRef}>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setProfileMenuOpen((prev) => !prev);
            }}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-xs border border-cyan-300/40 shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer overflow-hidden"
            title={userName || 'User Profile & Settings'}
          >
            {avatarImage ? (
              <img
                src={avatarImage}
                alt="User Avatar"
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
            ) : (
              userName ? userName.charAt(0).toUpperCase() : 'U'
            )}
          </button>

          <UserAccountMenu
            isOpen={profileMenuOpen}
            onClose={() => setProfileMenuOpen(false)}
            userName={userName}
            userEmail={displayUserEmail}
            avatarImage={avatarImage}
            getInitials={getInitials}
            onOpenUpgradePlan={() => openSettingsTab('upgrade_plan')}
            onOpenPersonalization={() => openSettingsTab('personalization')}
            onOpenProfile={() => setIsEditProfileOpen(true)}
            onOpenSettings={() => openSettingsTab('general')}
            onOpenHelp={() => setIsHelpModalOpen(true)}
            onAddAccount={() => setIsAddAccountModalOpen(true)}
            onSignOut={signOut}
            className="fixed bottom-4 left-16"
          />
        </div>
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentDisplayName={customDisplayName}
          currentUsername={customUsername}
          currentAvatarImage={avatarImage}
          getInitials={getInitials}
          onSave={handleSaveProfile}
        />
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />
        {renderAddAccountModal()}
      </aside>
    );
  }

  return (
    <aside className="w-64 relative z-40 glass-panel rounded-none border-t-0 border-l-0 border-b-0 border-r border-cyan-500/20 flex flex-col justify-between py-4 px-2 select-none bg-slate-950/85 backdrop-blur-2xl shrink-0 h-full transition-all duration-300 ease-in-out">
      {/* Top Header: AGENT HISTORY + Search Icon OR Full-width Transparent Search Bar */}
      <div className="px-1.5 shrink-0">
        {/* Toggle Collapse Arrow Row: Right-aligned above Search Symbol */}
        <div className="flex items-center justify-end px-2 pt-0.5 pb-1">
          <button
            type="button"
            onClick={() => setIsConvoSidebarCollapsed(true)}
            className="p-1 rounded-lg bg-slate-900/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            title="Close history (<)"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
        {showSearchInput ? (
          /* Full Header Search Bar */
          <div className="h-10 flex items-center border-b border-cyan-500/30 pb-1 animate-fadeIn">
            <div className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/40 hover:bg-slate-900/60 focus-within:bg-slate-900/70 border border-cyan-500/35 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-500/30 rounded-xl backdrop-blur-md transition-all shadow-sm shadow-cyan-950/20">
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setShowSearchInput(false);
                  }
                }}
                placeholder="Search agent tasks..."
                className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              {/* Matching Chat Count (only shown when actively searching) */}
              {searchQuery.trim().length > 0 && (
                <span className="text-[11px] font-mono font-semibold text-cyan-400/90 bg-cyan-950/50 px-1.5 py-0.5 rounded-md border border-cyan-500/30 shrink-0 select-none animate-fadeIn">
                  {filteredConversations.length}
                </span>
              )}

              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchInput(false);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all shrink-0"
                title="Close search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Default Header Row */
          <div className="h-10 flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-800/80 transition-all">
            <div className="flex items-center gap-2 animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                AGENT HISTORY
              </span>
              <span className="text-xs font-mono text-slate-400 font-semibold">
                ({filteredConversations.length})
              </span>
            </div>

            <button
              onClick={() => setShowSearchInput(true)}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all hover:scale-105 active:scale-95"
              title="Search agent tasks"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Multi-Select Action Toolbar */}
        {isMultiSelectMode && (
          <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between text-xs animate-fadeIn shadow-lg shadow-cyan-950/40">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectTop10}
                disabled={isBatchDeleting}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeselectState
                  ? (top10Ids.length < 10 ? 'Deselect All' : 'Deselect 10')
                  : (top10Ids.length < 10 ? `Select All (${top10Ids.length})` : 'Select 10')}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBatchDelete}
                disabled={selectedConvIds.length === 0 || isBatchDeleting}
                className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 text-[11px] font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Delete selected tasks"
              >
                {isBatchDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span>{isBatchDeleting ? 'Deleting...' : `Delete${selectedConvIds.length > 0 ? ` (${selectedConvIds.length})` : ''}`}</span>
              </button>
              <button
                onClick={handleExitSelectMode}
                disabled={isBatchDeleting}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                title="Cancel selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle Scrollable Agent Tasks History */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-1 py-2 my-2 space-y-3 relative pb-14"
      >
        {filteredConversations.length === 0 ? (
          <div className="text-center py-14 px-3 mx-1 border border-dashed border-slate-800/80 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-medium">
              No agent tasks yet.
            </p>
            <p className="text-slate-600 text-[10px] mt-1">
              Start a computer-use task to see history.
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <SidebarTaskItem
              key={conv.id}
              conv={conv}
              isActive={activeConversationId === conv.id}
              isPinned={pinnedIds.includes(conv.id)}
              isMenuOpen={activeMenu?.conv.id === conv.id}
              isSelected={selectedConvIds.includes(conv.id)}
              isInfoViewing={infoModalConv?.id === conv.id}
              isMultiSelectMode={isMultiSelectMode}
              isLimitReached={isMultiSelectMode && selectedConvIds.length >= 10 && !selectedConvIds.includes(conv.id)}
              isDeleting={deletingConvId === conv.id}
              isBatchDeleting={isBatchDeleting}
              renamingConvId={renamingConvId}
              renameText={renameText}
              onRenameTextChange={setRenameText}
              onRenameSubmit={handleSaveRename}
              onRenameCancel={() => setRenamingConvId(null)}
              onSelectConversation={handleSelectConversation}
              onToggleSelect={handleToggleSelect}
              onOpenInfoModal={handleOpenInfoModal}
              onOpenMenu={handleOpenMenu}
              infoModalOpen={!!infoModalConv}
            />
          ))
        )}
      </div>

      {/* Bottom Footer: [New Agent Task] Button + User Avatar Profile */}
      <SidebarFooter
        userName={userName}
        avatarImage={avatarImage}
        onNewTask={async () => {
          await resetChatContext();
          loadConversations();
          setActiveView('assistant');
        }}
        onToggleProfileMenu={() => setProfileMenuOpen(!profileMenuOpen)}
        profileMenuRef={profileMenuRef}
      >
        <UserAccountMenu
          isOpen={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
          userName={userName}
          userEmail={displayUserEmail}
          avatarImage={avatarImage}
          getInitials={getInitials}
          onOpenUpgradePlan={() => openSettingsTab('upgrade_plan')}
          onOpenPersonalization={() => openSettingsTab('personalization')}
          onOpenProfile={() => setIsEditProfileOpen(true)}
          onOpenSettings={() => openSettingsTab('general')}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onAddAccount={() => setIsAddAccountModalOpen(true)}
          onSignOut={signOut}
          className="bottom-full left-0 mb-2 w-60"
        />
      </SidebarFooter>

      {/* 3-Dots Dropdown Menu rendered via Portal into document.body */}
      {isComputerUseActive && activeView === 'assistant' && (
        <TaskContextMenu
          activeMenu={activeMenu}
          menuRef={menuRef}
          onClose={() => setActiveMenu(null)}
          onOpenInfo={handleOpenInfoModal}
          onStartRename={handleStartRename}
          onTogglePin={handleTogglePin}
          onEnterSelectMode={handleEnterSelectMode}
          onDelete={handleDeleteConversation}
        />
      )}

      {/* Task Info Modal rendered via Portal into #convo-chat-area */}
      {isComputerUseActive && activeView === 'assistant' && (
        <TaskDetailsModal
          isOpen={!!infoModalConv}
          conv={infoModalConv}
          onClose={() => {
            setInfoModalConv(null);
            setCopiedId(false);
            setCopiedDesc(false);
          }}
          isPinned={infoModalConv ? pinnedIds.includes(infoModalConv.id) : false}
          infoDetail={infoDetail}
          renameHistory={infoModalConv ? getRenameHistory(infoModalConv.id) : []}
          formatDateTime={formatDateTime}
          copiedId={copiedId}
          copiedDesc={copiedDesc}
          onCopyId={(id: string) => {
            navigator.clipboard?.writeText(id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
          }}
          onCopyDesc={(desc: string) => {
            navigator.clipboard?.writeText(desc);
            setCopiedDesc(true);
            setTimeout(() => setCopiedDesc(false), 2000);
          }}
        />
      )}

      {/* ChatGPT-style Deletion Toast Notification (Top Center, 2.5s Auto-dismiss) */}
      {deleteToast &&
        createPortal(
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none animate-fadeIn">
            <div
              className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 backdrop-blur-2xl shadow-2xl transition-all ${
                deleteToast.isError
                  ? 'bg-rose-950/95 border-rose-500 text-white shadow-[0_8px_30px_rgba(244,63,94,0.45)] ring-2 ring-rose-500/40'
                  : 'bg-[#0b1b36] border-cyan-400 text-white shadow-[0_8px_30px_rgba(0,240,255,0.45)] ring-2 ring-cyan-400/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  deleteToast.isError
                    ? 'bg-rose-500 text-white shadow-rose-500/50'
                    : 'bg-cyan-400 text-slate-950 shadow-cyan-400/50'
                }`}
              >
                {deleteToast.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
              <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
                {deleteToast.message}
              </span>
            </div>
          </div>,
          document.body
        )}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentDisplayName={customDisplayName}
        currentUsername={customUsername}
        currentAvatarImage={avatarImage}
        getInitials={getInitials}
        onSave={handleSaveProfile}
      />
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
      {renderAddAccountModal()}
    </aside>
  );
};
