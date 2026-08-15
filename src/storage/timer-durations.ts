import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'timer_durations';

export const DEFAULT_TIMER_DURATIONS = [10, 20, 40, 60];
export const MIN_TIMER_MINUTES = 5;
export const MAX_TIMER_MINUTES = 90;
export const TIMER_STEP_MINUTES = 5;

export async function loadTimerDurations(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_TIMER_DURATIONS;
  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_TIMER_DURATIONS.length &&
      parsed.every(
        (n) => typeof n === 'number' && n >= MIN_TIMER_MINUTES && n <= MAX_TIMER_MINUTES
      )
    ) {
      return parsed;
    }
  } catch {}
  return DEFAULT_TIMER_DURATIONS;
}

export async function saveTimerDurations(durations: number[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(durations));
}
