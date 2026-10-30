import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import type { ConversationSummary } from '../../../types';
import {
  PINNED_STORAGE_KEY,
  CONV_CACHE_KEY,
  getPinnedIds,
  getCachedConversations,
  appendRenameHistory,
} from './types';

interface UseSidebarConversationsProps {
  activeConversationId: string | null;
  conversationsVersion: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  resetChatContext: () => void;
  setActiveMenu: (val: any) => void;
  infoModalConv: ConversationSummary | null;
  setInfoModalConv: React.Dispatch<React.SetStateAction<ConversationSummary | null>>;
}

export const useSidebarConversations = ({
  activeConversationId,
  conversationsVersion,
  scrollContainerRef,
  resetChatContext,
  setActiveMenu,
  infoModalConv,
  setInfoModalConv,
}: UseSidebarConversationsProps) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>(() => getCachedConversations());
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedIds());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchResults, setSearchResults] = useState<ConversationSummary[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [deleteToast, setDeleteToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  const loadConversations = async (resetPage = true) => {
    try {
      const res = await api.listConversations(1, PAGE_SIZE);
      const convs = res.conversations || [];
      if (resetPage) {
        setConversations(convs);
        setPage(1);
      } else {
        setConversations((prev) => {
          const map = new Map<string, ConversationSummary>();
          convs.forEach((c) => map.set(c.id, c));
          prev.forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          return Array.from(map.values());
        });
      }
      setHasMore(convs.length < res.total);
      try {
        localStorage.setItem(CONV_CACHE_KEY, JSON.stringify(convs));
      } catch {
        /* quota */
      }
    } catch (err) {
      console.debug('Failed to load agent task conversations:', err);
    }
  };

  const loadMoreConversations = async () => {
    if (isLoadingMore || !hasMore || searchResults !== null) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.listConversations(nextPage, PAGE_SIZE);
      const newConvs = res.conversations || [];
      if (newConvs.length === 0) {
        setHasMore(false);
      } else {
        setConversations((prev) => {
          const map = new Map<string, ConversationSummary>();
          prev.forEach((c) => map.set(c.id, c));
          newConvs.forEach((c) => map.set(c.id, c));
          const combined = Array.from(map.values());
          if (res.total && combined.length >= res.total) {
            setHasMore(false);
          }
          return combined;
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.debug('Failed to load more conversations:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Debounced Server-Side Search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.listConversations(1, 50, trimmed);
        setSearchResults(res.conversations || []);
      } catch (err) {
        console.debug('Server search fallback to local filter:', err);
        const localMatches = conversations.filter((c) =>
          (c.summary || '').toLowerCase().includes(trimmed.toLowerCase())
        );
        setSearchResults(localMatches);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, conversations]);

  // Infinite Scroll event listener
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (searchResults !== null) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom && hasMore && !isLoadingMore) {
        loadMoreConversations();
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, page, searchResults, scrollContainerRef]);

  // Load once on mount, refresh when active conversation changes or conversationsVersion updates
  useEffect(() => {
    loadConversations();
  }, [activeConversationId, conversationsVersion]);

  // Periodic refresh while active conversation exists
  useEffect(() => {
    if (!activeConversationId) return;
    let interval: any = null;

    const startInterval = () => {
      if (interval) clearInterval(interval);
      if (!document.hidden) {
        interval = setInterval(() => {
          loadConversations(false);
        }, 4000);
      }
    };

    startInterval();

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else {
        loadConversations(false);
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeConversationId]);

  // Save pinned IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Best effort
    }
  }, [pinnedIds]);

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

  const handleSaveRename = async (convId: string) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setRenamingConvId(null);
      return;
    }

    const currentConv = conversations.find((c) => c.id === convId);
    const oldCleanName = (currentConv?.summary || 'Agent Task').replace(/^\[Computer-Use\]\s*/i, '');

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

  const handleBatchDelete = async () => {
    if (selectedConvIds.length === 0) return;
    const deleteCount = selectedConvIds.length;
    setIsBatchDeleting(true);
    try {
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

  // Sort conversations: Pinned first, then by date
  const agentConversations = searchResults !== null ? searchResults : conversations;
  const sortedConversations = [...agentConversations].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const top10Ids = sortedConversations.slice(0, 10).map((c) => c.id);
  const isMaxSelected = selectedConvIds.length >= 10;
  const hasTop10Selected = top10Ids.length > 0 && top10Ids.every((id) => selectedConvIds.includes(id));
  const isDeselectState = hasTop10Selected || isMaxSelected;

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

  return {
    conversations,
    setConversations,
    pinnedIds,
    setPinnedIds,
    searchQuery,
    setSearchQuery,
    showSearchInput,
    setShowSearchInput,
    searchResults,
    isSearching,
    page,
    hasMore,
    isLoadingMore,
    renamingConvId,
    setRenamingConvId,
    renameText,
    setRenameText,
    deletingConvId,
    isMultiSelectMode,
    selectedConvIds,
    isBatchDeleting,
    deleteToast,
    sortedConversations,
    isDeselectState,
    loadConversations,
    handleTogglePin,
    handleStartRename,
    handleSaveRename,
    handleDeleteConversation,
    handleEnterSelectMode,
    handleToggleSelect,
    handleSelectTop10,
    handleExitSelectMode,
    handleBatchDelete,
  };
};
