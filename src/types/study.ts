export type PriorityLevel = 'high' | 'medium' | 'low';

export interface SubjectCategory {
  id: string;
  name: string;
  color: string;
}

export interface StudyTask {
  id: string;
  title: string;
  notes?: string;
  /** Gregorian ISO date string YYYY-MM-DD */
  dateISO: string;
  subjectId: string;
  priority: PriorityLevel;
  completed: boolean;
  reminderEnabled: boolean;
  /** 24-hour time string HH:mm */
  reminderTime: string;
  /** ISO timestamp when reminder was dismissed or completed, or snoozed-until HH:mm */
  reminderDismissedAt?: string;
  snoozedUntilISO?: string;
  createdAt: string;
}

export type CompletionFilter = 'all' | 'pending' | 'completed';

export interface TaskFilterState {
  subjectId: string; // 'all' or subject id
  priority: PriorityLevel | 'all';
  completion: CompletionFilter;
  search: string;
}
