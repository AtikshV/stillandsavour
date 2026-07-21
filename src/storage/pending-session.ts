import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pending_session';

export interface PendingSession {
  minutes: number;
  endsAt: number;
  notificationIds: string[];
}

export async function savePendingSession(session: PendingSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function loadPendingSession(): Promise<PendingSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.minutes === 'number' &&
      typeof parsed?.endsAt === 'number' &&
      Array.isArray(parsed?.notificationIds)
    ) {
      return parsed as PendingSession;
    }
  } catch {
    // Corrupt record — treat as if there were none.
  }
  return null;
}

export async function clearPendingSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
