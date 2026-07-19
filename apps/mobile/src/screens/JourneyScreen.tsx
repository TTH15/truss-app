import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@truss/core';
import {
  describeMissingProfileFields,
  formatEventDateNoHyphen,
  getMissingProfileFields,
  googleMapsHrefForEvent,
  normalizeEventIconKey,
} from '@truss/core';
import { Image as ExpoImage } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventTicket } from '@/components/EventTicket';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useEmbassyMention } from '@/contexts/EmbassyMentionContext';
import { useTheme } from '@/hooks/use-theme';
import { getIoniconForEventIcon } from '@/lib/event-icon-map';

type RegistrationFlow = 'none' | 'confirm' | 'complete';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SCREEN = Dimensions.get('window');

export function JourneyScreen() {
  const { user } = useAuth();
  const { events, eventParticipants, loading, registerForEvent, unregisterFromEvent, toggleEventLike } = useData();
  const { openEmbassyWithMention } = useEmbassyMention();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  const [likedEvents, setLikedEvents] = useState<Set<number>>(new Set());
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailSourceRect, setDetailSourceRect] = useState<Rect | null>(null);
  const [registrationFlow, setRegistrationFlow] = useState<RegistrationFlow>('none');
  const [photoRefusal, setPhotoRefusal] = useState(false);
  const [ticketEvent, setTicketEvent] = useState<Event | null>(null);
  const cardRefs = useRef<Map<number, View>>(new Map());
  // タップしたカードの位置からその場で拡大してフルスクリーン詳細になる演出用（0=カードの矩形, 1=フルスクリーン）
  const detailProgress = useRef(new Animated.Value(0)).current;

  const attendingEventIds = useMemo(() => {
    if (!user) return new Set<number>();
    const ids = new Set<number>();
    for (const event of events) {
      if ((eventParticipants[event.id] || []).some((p) => p.userId === user.id)) ids.add(event.id);
    }
    return ids;
  }, [events, eventParticipants, user]);

  const upcomingEvents = events.filter((e) => e.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const pastEvents = events.filter((e) => e.status === 'past').sort((a, b) => b.date.localeCompare(a.date));

  const openEventDetail = (event: Event) => {
    // measureInWindowのコールバックが（端末やタイミングによって）呼ばれないことが稀にあり、
    // それに全面的に依存するとタップしても何も起きないバグになるため、フォールバック矩形と
    // タイムアウトを用意し、必ず開くことを優先する（正確な位置が取れなければ画面中央から広がる）
    const fallbackRect: Rect = { x: SCREEN.width / 2 - 60, y: SCREEN.height / 2 - 60, width: 120, height: 120 };
    detailProgress.setValue(0);
    setDetailSourceRect(fallbackRect);
    setDetailEvent(event);

    let started = false;
    const start = (rect: Rect) => {
      if (started) return;
      started = true;
      setDetailSourceRect(rect);
      Animated.timing(detailProgress, { toValue: 1, duration: 320, useNativeDriver: false }).start();
    };

    const node = cardRefs.current.get(event.id);
    node?.measureInWindow((x, y, width, height) => {
      start(width > 0 && height > 0 ? { x, y, width, height } : fallbackRect);
    });
    setTimeout(() => start(fallbackRect), 150);
  };

  const closeEventDetail = () => {
    Animated.timing(detailProgress, { toValue: 0, duration: 260, useNativeDriver: false }).start(() => {
      setDetailEvent(null);
      setDetailSourceRect(null);
      setTicketEvent(null);
    });
  };

  const handleToggleLike = async (eventId: number) => {
    setLikedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    await toggleEventLike(eventId);
  };

  const handleAttendPress = (event: Event) => {
    if (!user) return;
    const isAttending = attendingEventIds.has(event.id);
    if (isAttending) {
      void unregisterFromEvent(event.id);
      return;
    }
    if (!user.approved) {
      Alert.alert('', '運営による承認をお待ちください');
      return;
    }
    const missingFields = getMissingProfileFields(user);
    const profileOk = missingFields.length === 0;
    const isLimited = !profileOk || (user.category === 'japanese' && !user.feePaid);
    if (isLimited && attendingEventIds.size >= 1) {
      const missingDesc = describeMissingProfileFields(missingFields, 'ja');
      const message = !profileOk
        ? `プロフィール登録が完了するまで、1つのイベントにのみ参加できます。\n未入力の項目: ${missingDesc}`
        : '年会費のお支払いが完了するまで、1つのイベントにのみ参加できます';
      Alert.alert('', message);
      return;
    }
    setDetailEvent(event);
    setRegistrationFlow('confirm');
  };

  const handleConfirmRegister = async () => {
    if (!detailEvent) return;
    await registerForEvent(detailEvent.id, photoRefusal);
    setRegistrationFlow('complete');
  };

  const closeRegistrationFlow = () => {
    setRegistrationFlow('none');
    setDetailEvent(null);
    setDetailSourceRect(null);
    detailProgress.setValue(0);
    setPhotoRefusal(false);
  };

  const handleOpenLineGroup = () => {
    if (detailEvent?.lineGroupLink) void Linking.openURL(detailEvent.lineGroupLink);
    closeRegistrationFlow();
  };

  const handleOpenMaps = () => {
    if (!detailEvent) return;
    const href = googleMapsHrefForEvent(detailEvent, 'ja');
    if (href) void Linking.openURL(href);
  };

  const handleConsultAboutEvent = () => {
    if (!detailEvent) return;
    const event = detailEvent;
    // React NativeのModalは、同時に複数visible=trueにするとiOS側で2つ目の表示に失敗することがある。
    // Embassy ChatもModalで開くため、Journey側の詳細モーダルを閉じ切ってから開く
    // （閉じるアニメーション完了後に少し待ってから開くことで、ネイティブ側のdismiss/present競合を避ける）
    Animated.timing(detailProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setDetailEvent(null);
      setDetailSourceRect(null);
      setTicketEvent(null);
      setTimeout(() => {
        openEmbassyWithMention({
          type: 'event',
          id: event.id,
          title: event.title,
          dateLabel: formatEventDateNoHyphen(event.date),
          timeLabel: event.time,
        });
      }, 250);
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Journey</ThemedText>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">読み込み中...</ThemedText>
          ) : (
            <>
              <Section title="開催予定">
                {upcomingEvents.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">開催予定のイベントはありません</ThemedText>
                ) : (
                  upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      colors={colors}
                      isAttending={attendingEventIds.has(event.id)}
                      isLiked={likedEvents.has(event.id)}
                      onPress={() => openEventDetail(event)}
                      onToggleLike={() => void handleToggleLike(event.id)}
                      cardRef={(node) => {
                        if (node) cardRefs.current.set(event.id, node);
                        else cardRefs.current.delete(event.id);
                      }}
                    />
                  ))
                )}
              </Section>

              <Section title="開催済み">
                {pastEvents.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">開催済みのイベントはありません</ThemedText>
                ) : (
                  pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      colors={colors}
                      isAttending={attendingEventIds.has(event.id)}
                      isLiked={likedEvents.has(event.id)}
                      onPress={() => openEventDetail(event)}
                      onToggleLike={() => void handleToggleLike(event.id)}
                      cardRef={(node) => {
                        if (node) cardRefs.current.set(event.id, node);
                        else cardRefs.current.delete(event.id);
                      }}
                    />
                  ))
                )}
              </Section>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!detailEvent && registrationFlow === 'none'}
        animationType="none"
        onRequestClose={closeEventDetail}
      >
        {detailEvent && detailSourceRect && (
          <View style={[styles.detailRoot, { backgroundColor: colors.background }]}>
            {/* タップしたカードの実測矩形からフルスクリーンへ「窓」のサイズだけを広げる。中身は常に
                フルスクリーンサイズで固定配置し、overflow:hiddenでクリップすることで、文字が
                縮小拡大でぼやけるのを避けている（App Store/Apple Music方式）。
                Animated.Valueをrender中にinterpolate()するのはReact Native Animated APIの定型パターンで、
                通常のrefのように再レンダー間で不整合を起こすものではないため、react-hooks/refsの誤検知として無効化する */}
            {/* eslint-disable react-hooks/refs */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.detailBackdrop,
                { opacity: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
              ]}
            />
            <Animated.View
              style={[
                styles.detailWindow,
                { backgroundColor: colors.background },
                {
                  left: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [detailSourceRect.x, 0] }),
                  top: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [detailSourceRect.y, 0] }),
                  width: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [detailSourceRect.width, SCREEN.width] }),
                  height: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [detailSourceRect.height, SCREEN.height] }),
                  borderRadius: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [Spacing.three, 0] }),
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.detailContentSize,
                  { opacity: detailProgress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }) },
                ]}
              >
                {/* eslint-enable react-hooks/refs */}
                <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
                  <ScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + Spacing.four }]}>
                    <View style={styles.modalHeaderRow}>
                      <ThemedText type="subtitle">イベント詳細</ThemedText>
                      <Pressable onPress={closeEventDetail}>
                        <Ionicons name="close" size={26} color={colors.text} />
                      </Pressable>
                    </View>

                    {detailEvent.image?.trim() ? (
                      <ExpoImage
                        source={{ uri: detailEvent.image }}
                        style={styles.bannerImage}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.iconBanner, { backgroundColor: colors.backgroundSelected }]}>
                        <Ionicons
                          name={getIoniconForEventIcon(normalizeEventIconKey(detailEvent.eventIconKey))}
                          size={48}
                          color={colors.tint}
                        />
                      </View>
                    )}

                    <ThemedText type="title">{detailEvent.title}</ThemedText>

                    <View style={[styles.infoBox, { backgroundColor: colors.backgroundElement }]}>
                      <InfoRow icon="calendar-outline" text={formatEventDateNoHyphen(detailEvent.date)} colors={colors} />
                      <InfoRow icon="time-outline" text={detailEvent.time} colors={colors} />
                      <Pressable onPress={handleOpenMaps}>
                        <InfoRow icon="location-outline" text={detailEvent.location} colors={colors} linkStyle />
                      </Pressable>
                    </View>

                    <View style={styles.statsRow}>
                      <Pressable style={styles.statPress} onPress={() => void handleToggleLike(detailEvent.id)}>
                        <Ionicons
                          name={likedEvents.has(detailEvent.id) ? 'heart' : 'heart-outline'}
                          size={22}
                          color="#E0607E"
                        />
                        <ThemedText>{detailEvent.likes}</ThemedText>
                      </Pressable>
                      <View style={styles.statPress}>
                        <Ionicons name="people-outline" size={22} color={colors.tint} />
                        <ThemedText>{detailEvent.currentParticipants}/{detailEvent.maxParticipants}</ThemedText>
                      </View>
                      <ThemedText type="smallBold">¥{Number(detailEvent.participationFee ?? 0).toLocaleString()}</ThemedText>
                    </View>

                    <View style={styles.descriptionBox}>
                      <ThemedText type="smallBold" style={styles.descriptionTitle}>説明</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {detailEvent.descriptionJa || detailEvent.description || '説明はありません'}
                      </ThemedText>
                    </View>

                    {detailEvent.status === 'upcoming' && (
                      <Pressable
                        style={[
                          styles.attendButton,
                          { backgroundColor: attendingEventIds.has(detailEvent.id) ? '#9AA0A6' : colors.tint },
                        ]}
                        onPress={() => handleAttendPress(detailEvent)}
                      >
                        <ThemedText style={styles.attendButtonText}>
                          {attendingEventIds.has(detailEvent.id) ? '申し込み済み（タップで取消）' : '参加する'}
                        </ThemedText>
                      </Pressable>
                    )}

                    {detailEvent.status === 'upcoming' && attendingEventIds.has(detailEvent.id) && (
                      <Pressable
                        style={[styles.ticketButton, { borderColor: colors.tint }]}
                        onPress={() => setTicketEvent(detailEvent)}
                      >
                        <Ionicons name="qr-code-outline" size={18} color={colors.tint} />
                        <ThemedText style={{ color: colors.tint }}>チケットを表示</ThemedText>
                      </Pressable>
                    )}

                    <Pressable
                      style={[styles.ticketButton, { borderColor: colors.border }]}
                      onPress={handleConsultAboutEvent}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={colors.textSecondary} />
                      <ThemedText themeColor="textSecondary">このイベントについて運営に相談する</ThemedText>
                    </Pressable>
                  </ScrollView>
                </SafeAreaView>

                {/* チケットは別のネイティブModalとして重ねず、この詳細Modalの中でオーバーレイ表示する。
                    iOSではModalの中で別のModalをpresentすると、閉じた後に外側のModalが再表示
                    できなくなることがあるため（ネイティブのpresentation stackが壊れる）、
                    単一のModalに留めている */}
                {ticketEvent && (
                  <Pressable style={styles.ticketBackdrop} onPress={() => setTicketEvent(null)}>
                    <Pressable style={styles.ticketWrapper} onPress={(e) => e.stopPropagation()}>
                      {user && <EventTicket event={ticketEvent} userId={user.id} />}
                      <Pressable style={styles.ticketCloseButton} onPress={() => setTicketEvent(null)}>
                        <ThemedText themeColor="textSecondary">閉じる</ThemedText>
                      </Pressable>
                    </Pressable>
                  </Pressable>
                )}
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </Modal>

      <Modal visible={registrationFlow !== 'none'} animationType="slide" transparent onRequestClose={closeRegistrationFlow}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.backgroundElement }]}>
            {registrationFlow === 'confirm' && detailEvent && (
              <>
                <ThemedText type="subtitle">参加登録</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">以下の内容を確認して、参加登録してください。</ThemedText>
                <View style={[styles.infoBox, styles.summaryBox, { backgroundColor: colors.background }]}>
                  {detailEvent.image?.trim() && (
                    <ExpoImage source={{ uri: detailEvent.image }} style={styles.summaryThumb} cachePolicy="memory-disk" />
                  )}
                  <View style={styles.summaryText}>
                    <ThemedText type="smallBold">{detailEvent.title}</ThemedText>
                    <View style={styles.cardMetaRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">{formatEventDateNoHyphen(detailEvent.date)}</ThemedText>
                    </View>
                    <View style={styles.cardMetaRow}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">{detailEvent.time}</ThemedText>
                    </View>
                    <ThemedText type="small">¥{Number(detailEvent.participationFee ?? 0).toLocaleString()}（参加費）</ThemedText>
                  </View>
                </View>
                <Pressable style={styles.checkboxRow} onPress={() => setPhotoRefusal((v) => !v)}>
                  <View style={[styles.checkbox, { borderColor: colors.tint }, photoRefusal && { backgroundColor: colors.tint }]}>
                    {photoRefusal && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <ThemedText type="small" style={styles.checkboxLabel}>
                    顔が写っている写真のアップロードを拒否する。
                  </ThemedText>
                </Pressable>
                <Pressable style={[styles.attendButton, { backgroundColor: colors.tint }]} onPress={() => void handleConfirmRegister()}>
                  <ThemedText style={styles.attendButtonText}>参加する</ThemedText>
                </Pressable>
                <Pressable onPress={closeRegistrationFlow}>
                  <ThemedText themeColor="textSecondary" style={styles.closeLink}>閉じる</ThemedText>
                </Pressable>
              </>
            )}
            {registrationFlow === 'complete' && (
              <>
                <View style={styles.completeIconWrap}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.accentGreen} />
                </View>
                <ThemedText type="subtitle" style={styles.completeText}>参加登録完了</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.completeText}>イベントへの参加登録が完了しました！</ThemedText>
                {detailEvent?.lineGroupLink ? (
                  <Pressable style={[styles.attendButton, styles.lineButton]} onPress={handleOpenLineGroup}>
                    <ThemedText style={styles.attendButtonText}>LINEで開く</ThemedText>
                  </Pressable>
                ) : (
                  <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
                    <ThemedText type="small" themeColor="textSecondary">このイベントにはLINEグループはありません。</ThemedText>
                  </View>
                )}
                <Pressable onPress={closeRegistrationFlow}>
                  <ThemedText themeColor="textSecondary" style={styles.closeLink}>閉じる</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, text, colors, linkStyle }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: Record<ThemeColor, string>; linkStyle?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.tint} />
      <ThemedText style={linkStyle ? { color: colors.tint } : undefined}>{text}</ThemedText>
    </View>
  );
}

function EventCard({
  event,
  colors,
  isAttending,
  isLiked,
  onPress,
  onToggleLike,
  cardRef,
}: {
  event: Event;
  colors: Record<ThemeColor, string>;
  isAttending: boolean;
  isLiked: boolean;
  onPress: () => void;
  onToggleLike: () => void;
  cardRef: (node: View | null) => void;
}) {
  const iconName = getIoniconForEventIcon(normalizeEventIconKey(event.eventIconKey));
  const accentColor = event.eventColor || colors.tint;
  const hasImage = !!event.image?.trim();
  return (
    <Pressable
      ref={cardRef}
      style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      {hasImage ? (
        <ExpoImage source={{ uri: event.image }} style={styles.cardThumb} cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: colors.backgroundSelected }]}>
          <Ionicons name={iconName} size={24} color={colors.tint} />
        </View>
      )}
      <View style={styles.cardBody}>
        <ThemedText type="smallBold" numberOfLines={1}>{event.title}</ThemedText>
        <View style={styles.cardMetaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">{formatEventDateNoHyphen(event.date)}</ThemedText>
        </View>
        <View style={styles.cardMetaRow}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">{event.time}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{event.location}</ThemedText>
        {isAttending && (
          <View style={[styles.attendingBadge, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText type="small" style={{ color: accentColor }}>申し込み済み</ThemedText>
          </View>
        )}
      </View>
      <Pressable style={styles.cardLike} onPress={onToggleLike}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color="#E0607E" />
        <ThemedText type="small">{event.likes}</ThemedText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  sectionBody: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendingBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  cardLike: {
    alignItems: 'center',
    gap: 2,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRoot: {
    flex: 1,
  },
  detailBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  detailWindow: {
    position: 'absolute',
    overflow: 'hidden',
  },
  detailContentSize: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN.width,
    height: SCREEN.height,
  },
  iconBanner: {
    height: 140,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: 192,
    borderRadius: Spacing.three,
  },
  infoBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  statPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  descriptionBox: {
    gap: Spacing.one,
  },
  descriptionTitle: {
    marginBottom: 2,
  },
  attendButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  attendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  lineButton: {
    backgroundColor: '#06C755',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryThumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  completeIconWrap: {
    alignItems: 'center',
  },
  completeText: {
    textAlign: 'center',
  },
  closeLink: {
    textAlign: 'center',
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  ticketBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  ticketWrapper: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  ticketCloseButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
