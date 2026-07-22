import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BellInterval, loadBellInterval, saveBellInterval } from '@/storage/bell-preference';
import { Stats, formatDuration, loadStats, saveSession } from '@/storage/sessions';

const BELL_OPTIONS: { label: string; value: BellInterval }[] = [
  { label: 'off', value: 'off' },
  { label: 'midpoint', value: 'midpoint' },
  { label: 'every 10 min', value: 10 },
];

const TIMERS = [
  { label: '10', minutes: 10 },
  { label: '20', minutes: 20 },
  { label: '40', minutes: 40 },
  { label: '60', minutes: 60 },
];

const BASE_WIDTH = 390;
const MAX_BUTTON = 200;
const MAX_CIRCLE = 400;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerScreen() {
  const { width, height } = useWindowDimensions();
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalDays: 0, last7Days: Array(7).fill(false), totalMinutes: 0 });
  const [bellInterval, setBellInterval] = useState<BellInterval>('midpoint');

  const singleBell = useAudioPlayer(require('../../assets/sounds/bell_single.mp3'));
  const tripleBell = useAudioPlayer(require('../../assets/sounds/bell_triple.mp3'));

  const timerRunningRef = useRef(false);

  const refreshStats = useCallback(async () => {
    setStats(await loadStats());
  }, []);

  useEffect(() => {
    refreshStats().catch(() => {});
    loadBellInterval().then(setBellInterval).catch(() => {});
  }, []);

  function selectBellInterval(value: BellInterval) {
    setBellInterval(value);
    saveBellInterval(value).catch(() => {});
  }

  // --- Layout decisions ---
  const isLandscape = width > height;
  const shortEdge = Math.min(width, height);
  const scale = Math.min(shortEdge / BASE_WIDTH, 1.4);

  const gutter = Math.round(24 * scale);
  const gap = Math.round(16 * scale);

  const cols = isLandscape ? 4 : 2;
  const availableForButtons = isLandscape
    ? height - gutter * 2 - gap
    : width - gutter * 2 - gap;
  const rawButton = isLandscape
    ? Math.min(height - gutter * 2, (width - gutter * 2 - gap * 3) / 4)
    : (availableForButtons - gap) / 2;
  const buttonSize = Math.min(Math.round(rawButton), MAX_BUTTON);

  const rawCircle = isLandscape ? height * 0.6 : width * 0.74;
  const circleSize = Math.min(Math.round(rawCircle), MAX_CIRCLE);

  const numFont = Math.round(Math.min(buttonSize * 0.44, 58 * scale));
  const unitFont = Math.round(Math.min(buttonSize * 0.1, 14 * scale));
  const clockFont = Math.round(Math.min(circleSize * 0.22, 72 * scale));
  const timerLabelFont = Math.round(Math.min(circleSize * 0.048, 14 * scale));
  const titleFont = Math.round(Math.min(16 * scale, 22));
  const cancelFont = Math.round(Math.min(13 * scale, 16));
  const statNumFont = Math.round(Math.min(20 * scale, 26));
  const statLabelFont = Math.round(Math.min(10 * scale, 13));
  const bellLabelFont = Math.round(Math.min(13 * scale, 16));

  useEffect(() => {
    if (activeTimer === null) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    if (!finished || activeTimer === null) return;
    timerRunningRef.current = false;
    tripleBell.seekTo(0);
    tripleBell.play();
    deactivateKeepAwake().catch(() => {});
    saveSession(activeTimer).then(refreshStats).catch(() => {});
  }, [finished, activeTimer]);

  // Interval bell (off / midpoint / every N minutes)
  useEffect(() => {
    if (activeTimer === null || secondsLeft === 0 || bellInterval === 'off') return;
    const totalSeconds = activeTimer * 60;
    const intervalSeconds = bellInterval === 'midpoint' ? totalSeconds / 2 : bellInterval * 60;
    const elapsed = totalSeconds - secondsLeft;
    if (elapsed > 0 && elapsed % intervalSeconds === 0) {
      singleBell.seekTo(0);
      singleBell.play();
    }
  }, [secondsLeft]);

  // Re-acquire wake lock when app returns to foreground mid-session
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && timerRunningRef.current) {
        activateKeepAwakeAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  function startTimer(minutes: number) {
    timerRunningRef.current = true;
    setFinished(false);
    setActiveTimer(minutes);
    setSecondsLeft(minutes * 60);
    singleBell.seekTo(0);
    singleBell.play();
    activateKeepAwakeAsync().catch(() => {});
  }

  function cancel() {
    timerRunningRef.current = false;
    setActiveTimer(null);
    setSecondsLeft(0);
    setFinished(false);
    deactivateKeepAwake().catch(() => {});
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: titleFont }]}>still and savour</Text>
      </View>

      {activeTimer !== null ? (
        <View style={[styles.activeContainer, isLandscape && styles.activeContainerLandscape]}>
          <View
            style={[
              styles.timerCircle,
              { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
            ]}
          >
            <Text style={[styles.timerDisplay, { fontSize: clockFont }]}>
              {formatTime(secondsLeft)}
            </Text>
            <Text style={[styles.timerLabel, { fontSize: timerLabelFont, marginTop: timerLabelFont }]}>
              {`${activeTimer} min`}
            </Text>
          </View>

          <Pressable style={styles.cancelButton} onPress={cancel}>
            <Text style={[styles.cancelText, { fontSize: cancelFont }]}>
              {finished ? 'done' : 'cancel'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.grid,
              {
                flexDirection: 'row',
                flexWrap: cols === 4 ? 'nowrap' : 'wrap',
                gap,
                paddingHorizontal: gutter,
              },
            ]}
          >
            {TIMERS.map(({ label, minutes }) => (
              <Pressable
                key={minutes}
                style={({ pressed }) => [
                  styles.timerButton,
                  { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
                  pressed && styles.timerButtonPressed,
                ]}
                onPress={() => startTimer(minutes)}
              >
                <Text style={[styles.buttonMinutes, { fontSize: numFont, lineHeight: numFont * 1.1 }]}>
                  {label}
                </Text>
                <Text style={[styles.buttonUnit, { fontSize: unitFont }]}>min</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.bellRow}>
            <Text style={[styles.bellLabel, { fontSize: bellLabelFont }]}>presence chime</Text>
            <View style={styles.bellChips}>
              {BELL_OPTIONS.map(({ label, value }) => (
                <Pressable
                  key={label}
                  style={[styles.bellChip, bellInterval === value && styles.bellChipActive]}
                  onPress={() => selectBellInterval(value)}
                >
                  <Text
                    style={[
                      styles.bellChipText,
                      { fontSize: statLabelFont },
                      bellInterval === value && styles.bellChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statTop, { height: statNumFont * 1.3 }]}>
                <Text style={[styles.statNumber, { fontSize: statNumFont }]}>
                  {stats.totalDays}
                </Text>
              </View>
              <Text style={[styles.statLabel, { fontSize: statLabelFont }]}>days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statTop, { height: statNumFont * 1.3 }]}>
                <View style={[styles.dotsRow, { gap: Math.round(4 * scale) }]}>
                  {stats.last7Days.map((active, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { width: Math.round(7 * scale), height: Math.round(7 * scale), borderRadius: Math.round(4 * scale) },
                        active && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.statLabel, { fontSize: statLabelFont }]}>last 7 days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statTop, { height: statNumFont * 1.3 }]}>
                <Text style={[styles.statNumber, { fontSize: statNumFont }]}>
                  {formatDuration(stats.totalMinutes)}
                </Text>
              </View>
              <Text style={[styles.statLabel, { fontSize: statLabelFont }]}>total time</Text>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0E',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontWeight: '300',
    letterSpacing: 5,
    color: '#6B6B80',
  },
  bellRow: {
    alignItems: 'center',
    gap: 8,
  },
  bellChips: {
    flexDirection: 'row',
    gap: 8,
  },
  bellChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#28283C',
    backgroundColor: '#16161F',
  },
  bellChipActive: {
    borderColor: '#7070FF',
    backgroundColor: '#1E1E30',
  },
  bellChipText: {
    fontWeight: '400',
    letterSpacing: 2,
    color: '#3A3A52',
    textTransform: 'lowercase',
  },
  bellChipTextActive: {
    color: '#C8C8D8',
  },
  bellLabel: {
    fontWeight: '400',
    letterSpacing: 3,
    color: '#6B6B80',
    textTransform: 'lowercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E1E2E',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statTop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#1E1E2E',
  },
  statNumber: {
    fontWeight: '300',
    color: '#C8C8D8',
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: '#2A2A3E',
  },
  dotActive: {
    backgroundColor: '#7070FF',
  },
  statLabel: {
    fontWeight: '400',
    letterSpacing: 3,
    color: '#3A3A52',
    textTransform: 'lowercase',
  },
  grid: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  },
  timerButton: {
    backgroundColor: '#16161F',
    borderWidth: 1,
    borderColor: '#28283C',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 24px rgba(112, 112, 255, 0.12)',
  },
  timerButtonPressed: {
    backgroundColor: '#1E1E30',
    borderColor: '#7070FF',
    boxShadow: '0px 4px 24px rgba(112, 112, 255, 0.35)',
  },
  buttonMinutes: {
    fontWeight: '200',
    color: '#E8E8F0',
  },
  buttonUnit: {
    fontWeight: '400',
    letterSpacing: 4,
    color: '#48486A',
    marginTop: -2,
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  activeContainerLandscape: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 32,
  },
  timerCircle: {
    backgroundColor: '#16161F',
    borderWidth: 1,
    borderColor: '#28283C',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 48px rgba(112, 112, 255, 0.18)',
  },
  timerDisplay: {
    fontWeight: '100',
    color: '#E8E8F0',
    letterSpacing: 6,
  },
  timerLabel: {
    fontWeight: '400',
    letterSpacing: 5,
    color: '#48486A',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#28283C',
    backgroundColor: '#16161F',
    alignSelf: 'center',
  },
  cancelText: {
    fontWeight: '400',
    letterSpacing: 4,
    color: '#48486A',
  },
});
