import type { ConversationSummary } from '../../../types';

export const PINNED_STORAGE_KEY = 'seyal_pinned_agent_task_ids';
export const CONV_CACHE_KEY = 'seyal_agent_conv_cache';
export const RENAME_HISTORY_STORAGE_KEY = 'seyal_agent_rename_history';

export const getRenameHistory = (convId: string): string[] => {
  try {
    const raw = localStorage.getItem(RENAME_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed[convId]) ? parsed[convId] : [];
  } catch {
    return [];
  }
};

export const appendRenameHistory = (convId: string, oldTitle: string, newTitle: string) => {
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
  } catch {
    // Best effort
  }
};

export const getPinnedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getCachedConversations = (): ConversationSummary[] => {
  try {
    const raw = localStorage.getItem(CONV_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const formatDateTime = (dateStr: string | null | undefined) => {
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

export const generateConversationDescription = (
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
