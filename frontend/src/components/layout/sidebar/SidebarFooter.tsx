import React from 'react';
import { MessageSquarePlus, ChevronRight } from 'lucide-react';

export interface SidebarFooterProps {
  userName: string;
  avatarImage: string | null;
  onNewTask: () => void;
  onToggleProfileMenu: () => void;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  userName,
  avatarImage,
  onNewTask,
  onToggleProfileMenu,
  profileMenuRef,
  children,
}) => {
  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-3 shrink-0 px-1">
      {/* [New Agent Task] Button */}
      <button
        onClick={onNewTask}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 font-semibold text-xs tracking-wider transition-all shadow-sm shadow-cyan-950/30 cursor-pointer"
      >
        <MessageSquarePlus className="w-4 h-4 text-cyan-400" />
        <span>New Agent Task</span>
      </button>

      {/* User Profile Pop-up Menu Trigger & Menu Box */}
      <div ref={profileMenuRef} className="relative">
        {/* Dropdown Menu (UserAccountMenu) */}
        {children}

        {/* User Profile Avatar Footer Card */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleProfileMenu();
          }}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/70 hover:border-slate-700 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-xs border border-cyan-300/40 shadow-sm shrink-0 overflow-hidden">
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
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-slate-200 truncate">{userName || 'User'}</span>
              <span className="text-[10px] font-mono text-cyan-400">Online • Active</span>
            </div>
          </div>
          <div className="flex items-center text-slate-500 hover:text-white transition-all mr-0.5">
            <ChevronRight className="w-4 h-4 transform rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
};
