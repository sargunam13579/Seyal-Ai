export interface PersonalAgentContext {
  userId: string;
  userName: string;
  standingRulesCount: number;
  lastActive: string;
}

export interface PersonalNoteItem {
  id: string;
  title: string;
  content: string;
  category: 'preference' | 'rule' | 'context';
  updatedAt: string;
}
