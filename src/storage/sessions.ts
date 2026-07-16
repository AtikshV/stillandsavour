import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'meditation_stats';

// Aggregate record: totalDays/totalMinutes only ever grow, recentDays holds
// just the trailing 7-day window. Storage stays constant-size regardless of
// how long the app has been used, unlike a per-session log would.
type StoredStats = {
  totalDays: number;
  totalMinutes: number;
  recentDays: string[]; // day-keys (YYYY-MM-DD) with a session, within the trailing 7 days
};

export type Stats = {
  totalDays: number;
  last7Days: boolean[]; // index 0 = 6 days ago, index 6 = today
  totalMinutes: number;
};

const EMPTY_STATS: StoredStats = { totalDays: 0, totalMinutes: 0, recentDays: [] };

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function last7DayKeys(now: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return localDateKey(d);
  });
}

async function readStoredStats(): Promise<StoredStats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) return EMPTY_STATS;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.totalDays === 'number' &&
      typeof parsed.totalMinutes === 'number' &&
      Array.isArray(parsed.recentDays)
    ) {
      return parsed;
    }
  } catch {
    // fall through to default
  }
  return EMPTY_STATS;
}

export async function saveSession(minutes: number): Promise<void> {
  const stats = await readStoredStats();
  const now = new Date();
  const today = localDateKey(now);
  const window = new Set(last7DayKeys(now));

  const recentDays = stats.recentDays.filter((d) => window.has(d));
  const isNewDay = !recentDays.includes(today);
  if (isNewDay) recentDays.push(today);

  const next: StoredStats = {
    totalDays: stats.totalDays + (isNewDay ? 1 : 0),
    totalMinutes: stats.totalMinutes + minutes,
    recentDays,
  };

  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
}

export async function loadStats(): Promise<Stats> {
  const stats = await readStoredStats();
  const days = last7DayKeys(new Date());
  const recentSet = new Set(stats.recentDays.filter((d) => days.includes(d)));

  return {
    totalDays: stats.totalDays,
    totalMinutes: stats.totalMinutes,
    last7Days: days.map((d) => recentSet.has(d)),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
