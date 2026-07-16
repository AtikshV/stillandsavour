import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'meditation_sessions';

export type Session = {
  minutes: number;
  completedAt: string; // ISO date string
};

export async function saveSession(minutes: number): Promise<void> {
  const existing = await loadSessions();
  existing.push({ minutes, completedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEY, JSON.stringify(existing));
}

export async function loadSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export type Stats = {
  totalDays: number;
  last7Days: boolean[]; // index 0 = 6 days ago, index 6 = today
  totalMinutes: number;
};

export function computeStats(sessions: Session[]): Stats {
  const daySet = new Set(sessions.map((s) => new Date(s.completedAt).toDateString()));

  const totalDays = daySet.size;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return daySet.has(d.toDateString());
  });

  return { totalDays, last7Days, totalMinutes };
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
