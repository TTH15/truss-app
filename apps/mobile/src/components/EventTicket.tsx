import type { Event } from '@truss/core';
import { buildEventCheckinPayload } from '@truss/core';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface EventTicketProps {
  event: Event;
  userId: string;
}

/** タップで裏返り、裏面にQRコードチェックイン用のペイロードを表示するチケットカード */
export function EventTicket({ event, userId }: EventTicketProps) {
  const colors = Colors.light;
  const [flipped, setFlipped] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    Animated.timing(rotateAnim, {
      toValue: flipped ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  // Animated.Valueをrender中にinterpolate()するのはReact Native Animated APIの定型パターンで、
  // 通常のrefのように再レンダー間で不整合を起こすものではないため、react-hooks/refsの誤検知として無効化する
  // eslint-disable-next-line react-hooks/refs
  const frontRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  // eslint-disable-next-line react-hooks/refs
  const backRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const qrValue = buildEventCheckinPayload(event.id, userId);

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
        ]}
      >
        <ThemedText type="smallBold" numberOfLines={1}>{event.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{event.date} {event.time}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{event.location}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          タップしてQRコードを表示
        </ThemedText>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
      >
        <QRCode value={qrValue} size={180} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          運営にこの画面を見せてください
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    gap: Spacing.two,
  },
  hint: {
    marginTop: Spacing.two,
  },
});
