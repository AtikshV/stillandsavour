import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'background_sound_pref';

export type BackgroundSoundPref = 'music' | 'off';

export async function loadBackgroundSoundPref(): Promise<BackgroundSoundPref> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === 'off') return 'off';
  return 'music';
}

export async function saveBackgroundSoundPref(value: BackgroundSoundPref): Promise<void> {
  await AsyncStorage.setItem(KEY, value);
}
