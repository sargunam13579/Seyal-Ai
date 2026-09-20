import React from 'react';
import { ConvoAgentSidebar } from './ConvoAgentSidebar';

interface SidebarProps {
  onSelectPrompt?: (promptText: string) => void;
}

/**
 * Root Sidebar Component — Conversational Computer Use Agent Sidebar.
 */
export const Sidebar: React.FC<SidebarProps> = ({ onSelectPrompt }) => {
  return <ConvoAgentSidebar onSelectPrompt={onSelectPrompt} />;
};
