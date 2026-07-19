import { Ionicons } from '@expo/vector-icons';
import type { RecorderState } from 'expo-audio';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { PickedChatAttachment } from '@/lib/chat-attachment';
import { formatMillisAsClock, formatSecondsAsClock, LIVE_WAVEFORM_BAR_COUNT, normalizeMeteringLevel } from '@/lib/voice-waveform';

const BUTTON_SIZE = 120;
const RING_SIZE = BUTTON_SIZE + 16;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type VoicePhase = 'idle' | 'recording' | 'reviewing';

interface VoiceRecorderPanelProps {
  recorderState: RecorderState;
  /** 音声のPickedChatAttachmentが入っていれば「録音済み・再生確認中」を表す */
  pickedAttachment: PickedChatAttachment | null;
  onLevel: (level: number) => void;
  onStartRecording: () => void;
  onFinishRecording: () => void;
  onCancelRecording: () => void;
  onDiscard: () => void;
  onSend: () => void;
  tintColor: string;
  textSecondaryColor: string;
}

/**
 * LINEのボイスメッセージUIを踏襲：idle(長押し待ち) → recording(長押し中) → reviewing(離した後、
 * 再生確認してから送信) の3フェーズを1つの円ボタンで表現する。フェーズは親から渡される
 * recorderState/pickedAttachmentから導出し、このコンポーネント自身は専用stateを持たない。
 */
export function VoiceRecorderPanel({
  recorderState,
  pickedAttachment,
  onLevel,
  onStartRecording,
  onFinishRecording,
  onCancelRecording,
  onDiscard,
  onSend,
  tintColor,
  textSecondaryColor,
}: VoiceRecorderPanelProps) {
  const isVoiceAttachment = pickedAttachment?.contentType.startsWith('audio/') ?? false;
  const phase: VoicePhase = recorderState.isRecording ? 'recording' : isVoiceAttachment ? 'reviewing' : 'idle';

  const [liveLevels, setLiveLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      setLiveLevels([]);
      return;
    }
    const db = recorderState.metering;
    if (typeof db !== 'number') return;
    const level = normalizeMeteringLevel(db);
    onLevel(level);
    setLiveLevels((prev) => {
      const next = [...prev, level];
      return next.length > LIVE_WAVEFORM_BAR_COUNT ? next.slice(next.length - LIVE_WAVEFORM_BAR_COUNT) : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.metering, recorderState.isRecording]);

  const player = useAudioPlayer(phase === 'reviewing' ? (pickedAttachment?.uri ?? null) : null);
  const playerStatus = useAudioPlayerStatus(player);
  const playbackProgress = playerStatus.duration > 0 ? Math.min(1, playerStatus.currentTime / playerStatus.duration) : 0;
  const playbackFinished = playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration && !playerStatus.playing;

  const handleCirclePress = () => {
    if (phase !== 'reviewing') return;
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playbackFinished) player.seekTo(0);
    player.play();
  };

  const waveform = pickedAttachment?.waveform ?? [];
  const activeWaveformBars = Math.round(playbackProgress * waveform.length);

  return (
    <View style={styles.container}>
      {phase === 'idle' && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
          長押しで録音
        </ThemedText>
      )}
      {phase === 'recording' && (
        <>
          <ThemedText type="subtitle" style={{ color: tintColor }}>
            {formatMillisAsClock(recorderState.durationMillis)}
          </ThemedText>
          <View style={styles.liveWaveform}>
            {liveLevels.map((level, index) => (
              <View key={index} style={[styles.liveBar, { height: Math.max(3, level * 28), backgroundColor: tintColor }]} />
            ))}
          </View>
        </>
      )}
      {phase === 'reviewing' && (
        <ThemedText type="subtitle" style={{ color: tintColor }}>
          {formatSecondsAsClock(
            playerStatus.playing || playerStatus.currentTime > 0
              ? Math.max(playerStatus.duration - playerStatus.currentTime, 0)
              : playerStatus.duration
          )}
        </ThemedText>
      )}

      <View style={styles.circleRow}>
        <Pressable
          onPress={phase === 'recording' ? onCancelRecording : phase === 'reviewing' ? onDiscard : undefined}
          disabled={phase === 'idle'}
          hitSlop={12}
          style={[styles.sideButton, phase === 'idle' && styles.sideButtonHidden]}
        >
          <Ionicons name="trash-outline" size={22} color={textSecondaryColor} />
        </Pressable>

        <View style={styles.circleWrap}>
          {phase === 'reviewing' && (
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={textSecondaryColor}
                strokeOpacity={0.25}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <G rotation={-90} originX={RING_SIZE / 2} originY={RING_SIZE / 2}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={tintColor}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={`${RING_CIRCUMFERENCE}, ${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - playbackProgress)}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
          )}
          <Pressable
            onPressIn={phase === 'idle' ? onStartRecording : undefined}
            onPressOut={phase === 'recording' ? onFinishRecording : undefined}
            onPress={phase === 'reviewing' ? handleCirclePress : undefined}
            style={[
              styles.circle,
              phase === 'recording'
                ? { backgroundColor: tintColor }
                : { borderWidth: 3, borderColor: phase === 'idle' ? '#EF4444' : tintColor },
            ]}
          >
            {phase === 'idle' && <View style={styles.idleDot} />}
            {phase === 'recording' && <View style={styles.stopSquare} />}
            {phase === 'reviewing' && (
              <Ionicons
                name={playerStatus.playing ? 'pause' : 'play'}
                size={36}
                color={tintColor}
                style={playerStatus.playing ? undefined : styles.playIconOffset}
              />
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={phase === 'reviewing' ? onSend : undefined}
          disabled={phase !== 'reviewing'}
          hitSlop={12}
          style={[styles.sideButton, { backgroundColor: tintColor }, phase !== 'reviewing' && styles.sideButtonDisabled]}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {phase === 'reviewing' && waveform.length > 0 && (
        <View style={styles.reviewWaveform}>
          {waveform.map((level, index) => (
            <View
              key={index}
              style={[
                styles.reviewBar,
                { height: Math.max(3, level * 20), backgroundColor: tintColor, opacity: index < activeWaveformBars ? 1 : 0.3 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  hintText: {},
  liveWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
  },
  liveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.five,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonHidden: {
    opacity: 0,
  },
  sideButtonDisabled: {
    opacity: 0.35,
  },
  circleWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  playIconOffset: {
    marginLeft: 4,
  },
  reviewWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  reviewBar: {
    width: 3,
    borderRadius: 1.5,
  },
});
