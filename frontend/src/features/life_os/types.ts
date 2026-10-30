export interface HabitItem {
  id: string;
  name: string;
  category: 'health' | 'productivity' | 'learning' | 'focus';
  streakDays: number;
  completedToday: boolean;
}

export interface DailyBriefingState {
  date: string;
  briefingText: string;
  habits: HabitItem[];
  priorities: string[];
}
