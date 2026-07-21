import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SINGLE_BELL_SOUND = 'bell_single_notification.wav';
const TRIPLE_BELL_SOUND = 'bell_triple_notification.wav';
const SINGLE_BELL_CHANNEL = 'single-bell';
const TRIPLE_BELL_CHANNEL = 'triple-bell';

// Bells are already played directly (expo-audio) while the app is running.
// These notifications exist purely so the OS can deliver the same sound
// while the app is backgrounded / the screen is locked, so suppress any
// foreground presentation to avoid a double bell.
export async function configureBellNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SINGLE_BELL_CHANNEL, {
      name: 'Interval bell',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SINGLE_BELL_SOUND,
    });
    await Notifications.setNotificationChannelAsync(TRIPLE_BELL_CHANNEL, {
      name: 'Session complete bell',
      importance: Notifications.AndroidImportance.HIGH,
      sound: TRIPLE_BELL_SOUND,
    });
  }
}

export async function requestBellPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

function elapsedTimesFor(totalSeconds: number, intervalSeconds: number | null): number[] {
  if (!intervalSeconds) return [];
  const times: number[] = [];
  for (let elapsed = intervalSeconds; elapsed < totalSeconds; elapsed += intervalSeconds) {
    times.push(elapsed);
  }
  return times;
}

// Schedules a background-delivered echo of every bell in the session
// (interval chimes + the final triple bell) as local notifications, so
// they still sound if the app gets backgrounded or the screen locks.
export async function scheduleBellNotifications(
  totalSeconds: number,
  intervalSeconds: number | null,
): Promise<string[]> {
  const ids: string[] = [];

  for (const elapsed of elapsedTimesFor(totalSeconds, intervalSeconds)) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'still and savour',
        body: 'presence chime',
        sound: SINGLE_BELL_SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: elapsed,
        channelId: SINGLE_BELL_CHANNEL,
      },
    });
    ids.push(id);
  }

  const finishedId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'still and savour',
      body: 'session complete',
      sound: TRIPLE_BELL_SOUND,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: totalSeconds,
      channelId: TRIPLE_BELL_CHANNEL,
    },
  });
  ids.push(finishedId);

  return ids;
}

export async function cancelBellNotifications(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
