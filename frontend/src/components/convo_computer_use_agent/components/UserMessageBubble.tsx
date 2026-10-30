import React from 'react';
import { User } from 'lucide-react';
import type { MessageItem } from '../../../types';
import { formatMessageTime } from '../types';

interface UserMessageBubbleProps {
  message: MessageItem;
  userProfileAvatar?: string | null;
}

export const UserMessageBubble: React.FC<UserMessageBubbleProps> = ({
  message,
  userProfileAvatar,
}) => {
  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
      className="flex items-start gap-3.5 w-full group justify-end"
    >
      <div className="relative max-w-[85%] p-5 rounded-2xl text-sm sm:text-base leading-relaxed bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-md shadow-cyan-950/20">
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* User Message Footer */}
        <div className="mt-3 pt-2 border-t border-cyan-400/30 flex items-center justify-end text-xs text-cyan-100/80">
          <span className="text-[10px] font-mono opacity-80">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
      </div>

      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-1 ring-white/10">
        {userProfileAvatar ? (
          <img
            src={userProfileAvatar}
            alt="User"
            className="w-full h-full object-cover rounded-full"
            style={{ imageRendering: 'auto', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
          />
        ) : (
          <User className="w-4.5 h-4.5" />
        )}
      </div>
    </div>
  );
};
