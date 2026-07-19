import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatSecondsAsClock } from '@/lib/voice-waveform';

interface VoiceMessagePlayerProps {
  uri: string;
  playButtonBg: string;
  playIconColor: string;
  textColor?: string;
  /** 0〜1の音量サンプル配列。指定すると再生ボタン横に波形バーを表示し、再生位置に応じてハイライトする */
  waveform?: number[];
  waveformColor?: string;
  waveformActiveColor?: string;
}

/** 送信前プレビュー・受信メッセージ両方で使う、再生ボタン+波形/長さ表示のボイスメッセージUI */
export function VoiceMessagePlayer({
  uri,
  playButtonBg,
  playIconColor,
  textColor,
  waveform,
  waveformColor,
  waveformActiveColor,
}: VoiceMessagePlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const finished = status.duration > 0 && status.currentTime >= status.duration && !status.playing;
  const displaySeconds = status.playing || (status.currentTime > 0 && !finished) ? Math.max(status.duration - status.currentTime, 0) : status.duration;
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const activeBarCount = waveform ? Math.round(progress * waveform.length) : 0;

  const handlePress = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) player.seekTo(0);
    player.play();
  };

  return (
    <Pressable style={styles.container} onPress={handlePress} hitSlop={4}>
      <View style={[styles.playButton, { backgroundColor: playButtonBg }]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={playIconColor} style={status.playing ? undefined : styles.playIconOffset} />
      </View>
      {waveform && waveform.length > 0 && (
        <View style={styles.waveformRow}>
          {waveform.map((level, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: Math.max(3, level * 20),
                  backgroundColor: index < activeBarCount ? (waveformActiveColor ?? playButtonBg) : (waveformColor ?? playButtonBg),
                  opacity: index < activeBarCount ? 1 : 0.35,
                },
              ]}
            />
          ))}
        </View>
      )}
      <ThemedText type="small" style={[styles.durationText, textColor ? { color: textColor } : undefined]}>
        {formatSecondsAsClock(displaySeconds)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  durationText: {
    minWidth: 32,
  },
});
