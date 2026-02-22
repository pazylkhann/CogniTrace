import { create } from 'zustand';

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface AISuggestion {
  id: string;
  type: 'review' | 'challenge' | 'practice';
  title: string;
  subtitle: string;
  subject?: string;
  reason: string;
  actionPath?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'teacher_feedback' | 'ranking' | 'achievement' | 'reminder';
}

export interface ActivityFeedItem {
  id: string;
  label: string;
  detail?: string;
  time: string;
  verdict?: 'correct' | 'partial' | 'incorrect';
}

const XP_PER_LEVEL = 500;
const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: '1',
    type: 'review',
    title: 'Review: Circular Logic in Physics',
    subtitle: 'Based on your last scan',
    subject: 'physics',
    reason: 'You had 2 logical gaps in circular motion — a quick review will solidify it.',
    actionPath: '/analysis',
  },
  {
    id: '2',
    type: 'challenge',
    title: 'Challenge: Advanced Calculus',
    subtitle: 'Matches your interest in Engineering',
    subject: 'mathematics',
    reason: 'Your class is covering integration by parts. Try a challenge problem.',
    actionPath: '/analysis',
  },
  {
    id: '3',
    type: 'practice',
    title: 'Trigonometry: Reduction Formulas',
    subtitle: 'AI Study Coach recommendation',
    subject: 'mathematics',
    reason: 'You often miss reduction formulas. Practice 3 short exercises.',
    actionPath: '/analysis',
  },
];

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Teacher checked your work',
    message: 'Your solution to "Quadratic applications" was reviewed. Check feedback.',
    time: '10 min ago',
    read: false,
    type: 'teacher_feedback',
  },
  {
    id: 'n2',
    title: 'You moved up in the ranking',
    message: 'You are now #2 in your class. Keep it up!',
    time: '1 hour ago',
    read: false,
    type: 'ranking',
  },
  {
    id: 'n3',
    title: 'New achievement',
    message: '5 correct solutions in a row — "On Fire" badge unlocked.',
    time: 'Yesterday',
    read: true,
    type: 'achievement',
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'u1', name: 'Alex Chen', points: 1240, rank: 1 },
  { id: 'current', name: 'You', points: 980, rank: 2, isCurrentUser: true },
  { id: 'u2', name: 'Sam Rivera', points: 910, rank: 3 },
];

interface GamificationState {
  cogniPoints: number;
  level: number;
  xpToNextLevel: number;
  suggestions: AISuggestion[];
  notifications: NotificationItem[];
  leaderboard: LeaderboardEntry[];
  activityFeed: ActivityFeedItem[];
  aiCoachTips: string[];
  setCogniPoints: (n: number) => void;
  addPoints: (n: number) => void;
  setSuggestions: (s: AISuggestion[]) => void;
  setNotifications: (n: NotificationItem[]) => void;
  markNotificationRead: (id: string) => void;
  setLeaderboard: (l: LeaderboardEntry[]) => void;
  setActivityFeed: (a: ActivityFeedItem[]) => void;
  setAICoachTips: (t: string[]) => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  cogniPoints: 980,
  level: 4,
  xpToNextLevel: 320,
  suggestions: MOCK_SUGGESTIONS,
  notifications: MOCK_NOTIFICATIONS,
  leaderboard: MOCK_LEADERBOARD,
  activityFeed: [
    { id: 'a1', label: 'Physics — Circular motion', detail: 'Correct', time: '2h ago', verdict: 'correct' },
    { id: 'a2', label: 'Math — Integration', detail: 'Partial', time: '5h ago', verdict: 'partial' },
    { id: 'a3', label: 'Chemistry — Stoichiometry', detail: 'Checked', time: 'Yesterday', verdict: 'correct' },
  ],
  aiCoachTips: [
    'You often make mistakes in trigonometry. We recommend reviewing reduction formulas.',
    'Your brain is most productive now — good time for complex logic.',
  ],
  setCogniPoints: (n) => set({ cogniPoints: n }),
  addPoints: (n) => set((s) => ({ cogniPoints: s.cogniPoints + n })),
  setSuggestions: (suggestions) => set({ suggestions }),
  setNotifications: (notifications) => set({ notifications }),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setActivityFeed: (activityFeed) => set({ activityFeed }),
  setAICoachTips: (aiCoachTips) => set({ aiCoachTips }),
}));
