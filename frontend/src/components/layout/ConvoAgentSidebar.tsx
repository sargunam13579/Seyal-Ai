import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useSeyalAi } from '../../context/SeyalAiContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ConversationSummary } from '../../types';
import { UserAccountMenu } from '../profile/UserAccountMenu';

const LoginPage = React.lazy(() => import('../auth/LoginPage').then(m => ({ default: m.LoginPage })));
const EditProfileModal = React.lazy(() => import('../profile/EditProfileModal').then(m => ({ default: m.EditProfileModal })));
const HelpModal = React.lazy(() => import('../profile/HelpModal').then(m => ({ default: m.HelpModal })));

import {
  SidebarTaskItem,
  SidebarFooter,
  TaskContextMenu,
  TaskDetailsModal,
  SidebarSearchHeader,
  BatchDeleteBar,
  CollapsedSidebar,
  useSidebarConversations,
  useUserProfile,
  useTaskDetailsModal,
  getRenameHistory,
  formatDateTime,
} from './sidebar/index';

interface ConvoAgentSidebarProps {
  onSelectPrompt?: (promptText: string) => void;
}

export const ConvoAgentSidebar: React.FC<ConvoAgentSidebarProps> = () => {
  const {
    activeConversationId,
    setActiveConversationId,
    conversationsVersion,
    resetChatContext,
    setActiveView,
    setMessages,
    isComputerUseActive,
    activeView,
    isConvoSidebarCollapsed,
    setIsConvoSidebarCollapsed,
    openSettingsTab,
    identity,
    setUserProfileAvatar,
  } = useSeyalAi();

  const { user, signOut } = useAuth();

  const [activeMenu, setActiveMenu] = useState<{
    conv: ConversationSummary;
    isPinned: boolean;
    style: React.CSSProperties;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // User Profile, credentials, and settings modals
  const {
    profileMenuOpen,
    setProfileMenuOpen,
    profileMenuRef,
    customDisplayName,
    customUsername,
    avatarImage,
    isEditProfileOpen,
    setIsEditProfileOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isAddAccountModalOpen,
    setIsAddAccountModalOpen,
    userName,
    displayUserEmail,
    getInitials,
    handleSaveProfile,
  } = useUserProfile({
    user,
    identity,
    setUserProfileAvatar,
  });

  // Task Details Overview Modal
  const {
    infoModalConv,
    setInfoModalConv,
    copiedId,
    copiedDesc,
    infoDetail,
    handleOpenInfoModal,
    handleCopyId,
    handleCopyDesc,
    handleCloseInfoModal,
  } = useTaskDetailsModal();

  // Conversations query, cache, pagination, and multi-select deletion
  const {
    pinnedIds,
    searchQuery,
    setSearchQuery,
    showSearchInput,
    setShowSearchInput,
    searchResults,
    isSearching,
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
  } = useSidebarConversations({
    activeConversationId,
    conversationsVersion,
    scrollContainerRef,
    resetChatContext,
    setActiveMenu,
    infoModalConv,
    setInfoModalConv,
  });

  // Automatically close sidebar when exiting Assistant view or when computer-use becomes active
  useEffect(() => {
    if (activeView !== 'assistant' || isComputerUseActive) {
      setInfoModalConv(null);
      setActiveMenu(null);
    }
  }, [isComputerUseActive, activeView, setInfoModalConv]);

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

  const handleSelectConversation = async (convId: string) => {
    if (renamingConvId === convId) return;
    setActiveConversationId(convId);
    setActiveView('assistant');
    setMessages([]);
    try {
      const detail = await api.getConversation(convId);
      if (detail && detail.messages) {
        setMessages(
          detail.messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            model_used: m.model_used,
            tool_calls: m.tool_calls,
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

  const handleNewTask = async () => {
    await resetChatContext();
    loadConversations();
    setActiveView('assistant');
  };

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
      <CollapsedSidebar
        onExpand={() => setIsConvoSidebarCollapsed(false)}
        onNewTask={handleNewTask}
        userName={userName}
        avatarImage={avatarImage}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
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
          className="fixed bottom-4 left-16"
        />
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      </CollapsedSidebar>
    );
  }

  const top10Count = sortedConversations.slice(0, 10).length;

  return (
    <aside className="w-64 relative z-40 glass-panel rounded-none border-t-0 border-l-0 border-b-0 border-r border-cyan-500/20 flex flex-col justify-between py-4 px-2 select-none bg-slate-950/85 backdrop-blur-2xl shrink-0 h-full transition-all duration-300 ease-in-out">
      {/* Search Header */}
      <SidebarSearchHeader
        showSearchInput={showSearchInput}
        setShowSearchInput={setShowSearchInput}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalMatches={sortedConversations.length}
        onCollapse={() => setIsConvoSidebarCollapsed(true)}
      />

      {/* Multi-Select Toolbar & Toast */}
      <BatchDeleteBar
        isMultiSelectMode={isMultiSelectMode}
        selectedConvIds={selectedConvIds}
        isBatchDeleting={isBatchDeleting}
        isDeselectState={isDeselectState}
        top10Count={top10Count}
        onSelectTop10={handleSelectTop10}
        onBatchDelete={handleBatchDelete}
        onExitSelectMode={handleExitSelectMode}
        deleteToast={deleteToast}
      />

      {/* Middle Scrollable Agent Tasks History */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-1 py-2 my-2 space-y-3 relative pb-14"
      >
        {sortedConversations.length === 0 ? (
          <div className="text-center py-14 px-3 mx-1 border border-dashed border-slate-800/80 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-medium">
              {isSearching
                ? 'Searching conversations...'
                : searchResults !== null
                ? `No tasks matching "${searchQuery}"`
                : 'No agent tasks yet.'}
            </p>
            <p className="text-slate-600 text-[10px] mt-1">
              {searchResults !== null
                ? 'Try searching with different keywords.'
                : 'Start a computer-use task to see history.'}
            </p>
          </div>
        ) : (
          sortedConversations.map((conv: ConversationSummary) => (
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
              onOpenInfoModal={(c) => handleOpenInfoModal(c, setActiveMenu)}
              onOpenMenu={handleOpenMenu}
              infoModalOpen={!!infoModalConv}
            />
          ))
        )}

        {/* Searching database feedback */}
        {isSearching && (
          <div className="flex items-center justify-center py-3 text-cyan-400 gap-2 text-xs font-mono animate-fadeIn">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Searching database...</span>
          </div>
        )}

        {/* Infinite scroll loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-3 text-cyan-400/80 gap-2 text-xs font-mono animate-fadeIn">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading older tasks...</span>
          </div>
        )}
      </div>

      {/* Bottom Footer: [New Agent Task] Button + User Avatar Profile */}
      <SidebarFooter
        userName={userName}
        avatarImage={avatarImage}
        onNewTask={handleNewTask}
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

      {/* 3-Dots Dropdown Menu */}
      {isComputerUseActive && activeView === 'assistant' && (
        <TaskContextMenu
          activeMenu={activeMenu}
          menuRef={menuRef}
          onClose={() => setActiveMenu(null)}
          onOpenInfo={(c) => handleOpenInfoModal(c, setActiveMenu)}
          onStartRename={handleStartRename}
          onTogglePin={handleTogglePin}
          onEnterSelectMode={handleEnterSelectMode}
          onDelete={handleDeleteConversation}
        />
      )}

      <React.Suspense fallback={null}>
        {/* Task Info Modal */}
        {isComputerUseActive && activeView === 'assistant' && (
          <TaskDetailsModal
            isOpen={!!infoModalConv}
            conv={infoModalConv}
            onClose={handleCloseInfoModal}
            isPinned={infoModalConv ? pinnedIds.includes(infoModalConv.id) : false}
            infoDetail={infoDetail}
            renameHistory={infoModalConv ? getRenameHistory(infoModalConv.id) : []}
            formatDateTime={formatDateTime}
            copiedId={copiedId}
            copiedDesc={copiedDesc}
            onCopyId={handleCopyId}
            onCopyDesc={handleCopyDesc}
          />
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
      </React.Suspense>
    </aside>
  );
};
