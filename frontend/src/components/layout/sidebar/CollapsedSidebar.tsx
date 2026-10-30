import React from 'react';
import { ChevronRight, MessageSquarePlus } from 'lucide-react';

interface CollapsedSidebarProps {
  onExpand: () => void;
  onNewTask: () => void;
  userName: string;
  avatarImage: string | null;
  profileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

export const CollapsedSidebar: React.FC<CollapsedSidebarProps> = ({
  onExpand,
  onNewTask,
  userName,
  avatarImage,
  setProfileMenuOpen,
  profileMenuRef,
  children,
}) => {
  return (
    <aside className="w-14 relative z-40 glass-panel rounded-none border-t-0 border-l-0 border-b-0 border-r border-cyan-500/20 flex flex-col justify-between py-3 px-1.5 select-none bg-slate-950/85 backdrop-blur-2xl shrink-0 h-full transition-all duration-300 ease-in-out">
      {/* Top Header: Open History Arrow Button (>) + Quick New Task */}
      <div className="flex flex-col items-center gap-3 pt-1 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400 shadow-sm shadow-cyan-950/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
          title="Open history (>)"
        >
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onNewTask}
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

        {children}
      </div>
    </aside>
  );
};
