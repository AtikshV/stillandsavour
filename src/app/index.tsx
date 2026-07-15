import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TIMERS = [
  { label: '10', minutes: 10 },
  { label: '20', minutes: 20 },
  { label: '40', minutes: 40 },
  { label: '60', minutes: 60 },
];

// Reference width for proportional font scaling (iPhone 14)
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

  const singleBell = useAudioPlayer(require('../../assets/sounds/bell_single.mp3'));
  const tripleBell = useAudioPlayer(require('../../assets/sounds/bell_triple.mp3'));

  // --- Layout decisions ---
  const isLandscape = width > height;
  const shortEdge = Math.min(width, height);
  // Scale factor relative to iPhone 14, capped at 1.4 for tablets
  const scale = Math.min(shortEdge / BASE_WIDTH, 1.4);

  const gutter = Math.round(24 * scale);
  const gap = Math.round(16 * scale);

  // Portrait: 2×2 grid; Landscape: 1×4 row
  const cols = isLandscape ? 4 : 2;
  // In landscape, size buttons off height so they fit vertically
  const availableForButtons = isLandscape
    ? height - gutter * 2 - gap * 1 // 2 rows → actually 1 row in landscape, 1 gap across 4 cols
    : width - gutter * 2 - gap;
  const rawButton = isLandscape
    ? Math.min(height - gutter * 2, (width - gutter * 2 - gap * 3) / 4)
    : (availableForButtons - gap) / 2;
  const buttonSize = Math.min(Math.round(rawButton), MAX_BUTTON);

  const rawCircle = isLandscape ? height * 0.6 : width * 0.74;
  const circleSize = Math.min(Math.round(rawCircle), MAX_CIRCLE);

  // Proportional font sizes
  const numFont = Math.round(Math.min(buttonSize * 0.44, 58 * scale));
  const unitFont = Math.round(Math.min(buttonSize * 0.1, 14 * scale));
  const clockFont = Math.round(Math.min(circleSize * 0.22, 72 * scale));
  const timerLabelFont = Math.round(Math.min(circleSize * 0.048, 14 * scale));
  const titleFont = Math.round(Math.min(16 * scale, 22));
  const cancelFont = Math.round(Math.min(13 * scale, 16));

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
    if (finished) {
      tripleBell.seekTo(0);
      tripleBell.play();
      deactivateKeepAwake();
    }
  }, [finished]);

  // Midpoint bell: fires once when exactly half the time remains
  useEffect(() => {
    if (activeTimer === null || secondsLeft === 0) return;
    if (secondsLeft === activeTimer * 30) {
      singleBell.seekTo(0);
      singleBell.play();
    }
  }, [secondsLeft]);

  function startTimer(minutes: number) {
    setFinished(false);
    setActiveTimer(minutes);
    setSecondsLeft(minutes * 60);
    singleBell.seekTo(0);
    singleBell.play();
    activateKeepAwakeAsync();
  }

  function cancel() {
    setActiveTimer(null);
    setSecondsLeft(0);
    setFinished(false);
    deactivateKeepAwake();
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
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
              },
            ]}
          >
            <Text style={[styles.timerDisplay, { fontSize: clockFont }]}>
              {formatTime(secondsLeft)}
            </Text>
            <Text style={[styles.timerLabel, { fontSize: timerLabelFont, marginTop: timerLabelFont }]}>
              {finished ? 'done' : `${activeTimer} min`}
            </Text>

          </View>

          <Pressable style={styles.cancelButton} onPress={cancel}>
            <Text style={[styles.cancelText, { fontSize: cancelFont }]}>{finished ? 'done' : 'cancel'}</Text>
          </Pressable>
        </View>
      ) : (
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
                {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                },
                pressed && styles.timerButtonPressed,
              ]}
              onPress={() => startTimer(minutes)}
            >
              <Text style={[styles.buttonMinutes, { fontSize: numFont, lineHeight: numFont * 1.1 }]}>
                {label}
              </Text>
              <Text style={[styles.buttonUnit, { fontSize: unitFont }]}>{cols === 4 ? 'min' : 'min'}</Text>
            </Pressable>
          ))}
        </View>
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
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontWeight: '300',
    letterSpacing: 5,
    color: '#6B6B80',
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
