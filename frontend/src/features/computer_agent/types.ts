export interface StepItem {
  step: number;
  thought: string;
  action: string;
  coordinates: [number | null, number | null];
  success: boolean;
  elapsed_seconds: number;
}

export const formatMessageTime = (rawTime?: string): string => {
  if (!rawTime) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // If already formatted with seconds (e.g. "07:37:01 PM" or "19:37:01"), return directly
  if (/\d{1,2}:\d{2}:\d{2}/.test(rawTime)) {
    return rawTime;
  }

  // If it's a valid date parseable string (ISO date etc), format with seconds
  const parsed = new Date(rawTime);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // If it's in "hh:mm AM/PM" or "hh:mm" format, append ":00" to always show seconds
  const matchHm = rawTime.match(/^(\d{1,2}:\d{2})(\s*[APap][Mm])?$/);
  if (matchHm) {
    const timePart = matchHm[1];
    const ampm = matchHm[2] ? matchHm[2].toUpperCase() : '';
    return `${timePart}:00${ampm ? ` ${ampm.trim()}` : ''}`;
  }

  return rawTime;
};

export const computerUsePresets = [
  {
    title: 'VS Code open பண்ணு',
    goal: 'VS Code open பண்ணு',
  },
  {
    title: 'Desktop Java folder open பண்ணு',
    goal: 'Desktop-la இருக்குற Java folder open பண்ணு',
  },
  {
    title: 'New file create panni palindrome code போடு',
    goal: 'New file create பண்ணி, check string palindrome code போடு',
  },
  {
    title: 'Code run பண்ணு',
    goal: 'Code run பண்ணு',
  },
  {
    title: 'Camera open panni photo edu',
    goal: 'Camera open panni photo edu',
  },
  {
    title: 'Delete "hello" and "hiii" chats',
    goal: '"hello" and "hiii" chats ah delete pannu',
  },
];
