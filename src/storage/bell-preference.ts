import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bell_interval_pref';

export type BellInterval = 'off' | 'midpoint' | 10;

export async function loadBellInterval(): Promise<BellInterval> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === 'off' || raw === 'midpoint') return raw;
  if (raw === '10') return 10;
  return 'midpoint';
}

export async function saveBellInterval(value: BellInterval): Promise<void> {
  await AsyncStorage.setItem(KEY, String(value));
}
