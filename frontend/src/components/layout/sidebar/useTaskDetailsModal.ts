import { useState } from 'react';
import { api } from '../../../services/api';
import type { ConversationSummary } from '../../../types';
import { generateConversationDescription } from './types';

export interface TaskInfoDetailState {
  loading: boolean;
  messageCount: number;
  startTime: string | null;
  endTime: string | null;
  durationLabel: string;
  description?: string;
}

export const useTaskDetailsModal = () => {
  const [infoModalConv, setInfoModalConv] = useState<ConversationSummary | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [infoDetail, setInfoDetail] = useState<TaskInfoDetailState | null>(null);

  const handleOpenInfoModal = async (
    conv: ConversationSummary,
    setActiveMenu?: (val: any) => void
  ) => {
    setInfoModalConv(conv);
    if (setActiveMenu) setActiveMenu(null);
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

      const description = generateConversationDescription(msgs, conv.summary || undefined);

      setInfoDetail({
        loading: false,
        messageCount: count,
        startTime: startTime || null,
        endTime: endTime || null,
        durationLabel,
        description,
      });

      api
        .getConversationOverview(conv.id)
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

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyDesc = (desc: string) => {
    navigator.clipboard?.writeText(desc);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleCloseInfoModal = () => {
    setInfoModalConv(null);
    setCopiedId(false);
    setCopiedDesc(false);
  };

  return {
    infoModalConv,
    setInfoModalConv,
    copiedId,
    copiedDesc,
    infoDetail,
    handleOpenInfoModal,
    handleCopyId,
    handleCopyDesc,
    handleCloseInfoModal,
  };
};
