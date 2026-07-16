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
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type Stats = {
  totalDays: number;
  last7Days: boolean[]; // index 0 = 6 days ago, index 6 = today
  totalMinutes: number;
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function computeStats(sessions: Session[]): Stats {
  const validSessions = sessions.filter(
    (s) => typeof s.minutes === 'number' && typeof s.completedAt === 'string'
  );

  const daySet = new Set(validSessions.map((s) => localDateKey(new Date(s.completedAt))));
  const totalDays = daySet.size;
  const totalMinutes = validSessions.reduce((sum, s) => sum + s.minutes, 0);

  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return daySet.has(localDateKey(d));
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
