import { Ionicons } from '@expo/vector-icons';
import { formatDateLabel, formatMessageTime, getChatAttachmentSignedUrl, parseMessageDate, toDateKey, type Message } from '@truss/core';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/hooks/use-theme';
import { captureChatAttachment, pickChatAttachment, type PickedChatAttachment } from '@/lib/chat-attachment';

interface TrussEmbassyScreenProps {
  onClose: () => void;
}

interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SCREEN = Dimensions.get('window');

export function TrussEmbassyScreen({ onClose }: TrussEmbassyScreenProps) {
  const { user } = useAuth();
  const { messageThreads, sendMessageToStaff, markStaffThreadAsRead, uploadChatAttachment } = useData();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [pickedAttachment, setPickedAttachment] = useState<PickedChatAttachment | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; rect: ImageRect } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hasMarkedRead = useRef(false);
  const attachMenuOpenRef = useRef(false);
  const imageRefs = useRef<Map<number, View>>(new Map());
  // 0=サムネイルの位置・サイズ, 1=全画面。開閉どちらもこの値をアニメーションさせるだけで
  // 「サムネイルから滑らかに広がる/戻る」トランジションになる。
  const previewProgress = useRef(new Animated.Value(0)).current;
  // スワイプで閉じる際、指の移動量をそのまま反映する（別軸で管理し、openとcloseの
  // アニメーションと独立させる）。
  const previewDragY = useRef(new Animated.Value(0)).current;
  // Animated.Valueをrender中にinterpolate()するのはReact Native Animated APIの定型パターンで、
  // 通常のrefのように再レンダー間で不整合を起こすものではないため、react-hooks/refsの誤検知として無効化する
  // eslint-disable-next-line react-hooks/refs
  const previewDragOpacity = previewDragY.interpolate({
    inputRange: [-240, 0, 240],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  // 入力欄の下に確保する余白。OSキーボード表示中はその高さ、添付メニュー表示中は
  // ATTACH_MENU_HEIGHTを使う。どちらも同じ値を共有することで、キーボード⇔添付メニューの
  // 切り替え時に入力欄の位置が動かないようにしている（WhatsApp/LINEと同じ挙動）。
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const ATTACH_MENU_HEIGHT = Spacing.five + 64 + Spacing.two + 20 + Spacing.four + insets.bottom;
  // OSが報告するshow/hideのdurationは非対称になりがちなので、固定値で揃えて速度差を無くす。
  const KEYBOARD_ANIMATION_DURATION = 250;

  const messages = (user && messageThreads[user.id]) || [];

  useEffect(() => {
    attachMenuOpenRef.current = attachMenuOpen;
  }, [attachMenuOpen]);

  const animatePanel = () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(KEYBOARD_ANIMATION_DURATION, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity)
      );
    } else {
      LayoutAnimation.easeInEaseOut();
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      animatePanel();
      setAttachMenuOpen(false);
      setBottomPanelHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      // 添付メニューを開くために自前でKeyboard.dismiss()した場合はこのイベントも飛んでくるが、
      // その場合はメニューの高さを維持したいので0にリセットしない。
      if (attachMenuOpenRef.current) return;
      animatePanel();
      setBottomPanelHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const toggleAttachMenu = () => {
    animatePanel();
    if (attachMenuOpen) {
      setAttachMenuOpen(false);
      setBottomPanelHeight(0);
      return;
    }
    Keyboard.dismiss();
    setAttachMenuOpen(true);
    setBottomPanelHeight(ATTACH_MENU_HEIGHT);
  };

  useEffect(() => {
    if (hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    void markStaffThreadAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const missing = messages
      .filter((m): m is Message & { attachmentPath: string } => !!m.attachmentPath && !signedUrls[m.attachmentPath])
      .map((m) => m.attachmentPath);
    if (missing.length === 0) return;
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (path) => {
          const { url } = await getChatAttachmentSignedUrl(path);
          return [path, url] as const;
        })
      );
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) {
          if (url) next[path] = url;
        }
        return next;
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const closeAttachMenu = () => {
    animatePanel();
    setAttachMenuOpen(false);
    setBottomPanelHeight(0);
  };

  const handlePickAttachment = async () => {
    closeAttachMenu();
    setPicking(true);
    try {
      const picked = await pickChatAttachment();
      if (picked) setPickedAttachment(picked);
    } catch (error) {
      console.error('Error picking attachment:', error);
    } finally {
      setPicking(false);
    }
  };

  const handleCaptureAttachment = async () => {
    closeAttachMenu();
    setPicking(true);
    try {
      const captured = await captureChatAttachment();
      if (captured) setPickedAttachment(captured);
    } catch (error) {
      console.error('Error capturing attachment:', error);
    } finally {
      setPicking(false);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pickedAttachment) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      let attachmentPath: string | undefined;
      let attachmentType: string | undefined;
      if (pickedAttachment) {
        const { path, error } = await uploadChatAttachment(pickedAttachment.blob, {
          fileExt: pickedAttachment.fileExt,
          contentType: pickedAttachment.contentType,
        });
        if (error || !path) throw error ?? new Error('添付ファイルのアップロードに失敗しました');
        attachmentPath = path;
        attachmentType = pickedAttachment.contentType;
      }
      await sendMessageToStaff(trimmed || '（添付ファイル）', { attachmentPath, attachmentType });
      setText('');
      setPickedAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error instanceof Error ? error.message : '送信に失敗しました。もう一度お試しください。');
    } finally {
      setSending(false);
    }
  };

  const openImagePreview = (messageId: number, url: string) => {
    const node = imageRefs.current.get(messageId);
    node?.measureInWindow((x, y, width, height) => {
      previewProgress.setValue(0);
      previewDragY.setValue(0);
      setPreviewImage({ url, rect: { x, y, width, height } });
      Animated.timing(previewProgress, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  const closeImagePreview = () => {
    Animated.timing(previewDragY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    Animated.timing(previewProgress, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setPreviewImage(null);
    });
  };

  const previewPanResponder = useRef(
    // eslint-disable-next-line react-hooks/refs -- コールバック内でAnimated.Value(previewDragY等)のsetValue/interpolateを呼ぶ定型パターン
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        previewDragY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const isTap = Math.abs(gesture.dy) < 8 && Math.abs(gesture.dx) < 8;
        if (isTap) {
          closeImagePreview();
          return;
        }
        if (Math.abs(gesture.dy) > 120 || Math.abs(gesture.vy) > 1.2) {
          Animated.timing(previewDragY, {
            toValue: gesture.dy > 0 ? SCREEN.height : -SCREEN.height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setPreviewImage(null);
            previewDragY.setValue(0);
            previewProgress.setValue(0);
          });
        } else {
          Animated.spring(previewDragY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  // Animated.Imageのstyle型はtransform配列の要素型が厳密すぎて動的構築と相性が悪いためanyで逃がす。
  let previewMorphStyle: any = null;
  if (previewImage) {
    const { rect } = previewImage;
    const startScaleX = rect.width / SCREEN.width;
    const startScaleY = rect.height / SCREEN.height;
    const startTranslateX = rect.x + rect.width / 2 - SCREEN.width / 2;
    const startTranslateY = rect.y + rect.height / 2 - SCREEN.height / 2;
    // Animated.Valueをrender中にinterpolate()するのはReact Native Animated APIの定型パターンで、
    // 通常のrefのように再レンダー間で不整合を起こすものではないため、react-hooks/refsの誤検知として無効化する
    /* eslint-disable react-hooks/refs */
    previewMorphStyle = {
      opacity: previewProgress,
      transform: [
        { translateX: previewProgress.interpolate({ inputRange: [0, 1], outputRange: [startTranslateX, 0] }) },
        {
          translateY: Animated.add(
            previewProgress.interpolate({ inputRange: [0, 1], outputRange: [startTranslateY, 0] }),
            previewDragY
          ),
        },
        { scaleX: previewProgress.interpolate({ inputRange: [0, 1], outputRange: [startScaleX, 1] }) },
        { scaleY: previewProgress.interpolate({ inputRange: [0, 1], outputRange: [startScaleY, 1] }) },
      ],
      /* eslint-enable react-hooks/refs */
    };
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderColor: colors.border, paddingTop: insets.top + Spacing.two }]}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextGroup}>
          <ThemedText type="subtitle">Truss Embassy</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">運営とのチャット</ThemedText>
        </View>
      </View>

      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              まだメッセージはありません。運営への質問・相談があればお気軽にどうぞ。
            </ThemedText>
          ) : (
            messages.map((message, index) => {
              const currentDate = parseMessageDate(message.time);
              const prevDate = index > 0 ? parseMessageDate(messages[index - 1].time) : null;
              const showDateLabel = !prevDate || toDateKey(currentDate) !== toDateKey(prevDate);
              const isMine = !message.isAdmin;
              const attachmentUrl = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
              const hasCaption = !!message.text && message.text !== '（添付ファイル）';
              return (
                <View key={message.id}>
                  {showDateLabel && (
                    <View style={styles.dateLabelRow}>
                      <View style={[styles.dateLabelPill, { backgroundColor: colors.backgroundSelected }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatDateLabel(currentDate, 'ja')}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                  <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                    {isMine && (
                      <View style={styles.metaSideMine}>
                        {message.read && (
                          <ThemedText themeColor="textSecondary" style={styles.metaLine}>既読</ThemedText>
                        )}
                        <ThemedText themeColor="textSecondary" style={styles.metaLine}>{formatMessageTime(message.time)}</ThemedText>
                      </View>
                    )}
                    <View style={isMine ? styles.bubbleColMine : styles.bubbleColTheirs}>
                      {attachmentUrl && (
                        <Pressable
                          ref={(node) => {
                            if (node) imageRefs.current.set(message.id, node as unknown as View);
                            else imageRefs.current.delete(message.id);
                          }}
                          onPress={() => openImagePreview(message.id, attachmentUrl)}
                        >
                          <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} />
                        </Pressable>
                      )}
                      {hasCaption && (
                        <View
                          style={[
                            styles.bubble,
                            isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>{message.text}</ThemedText>
                        </View>
                      )}
                    </View>
                    {!isMine && (
                      <View style={styles.metaSideTheirs}>
                        <ThemedText themeColor="textSecondary" style={styles.metaLine}>{formatMessageTime(message.time)}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {pickedAttachment && (
          <View style={[styles.attachmentPreviewRow, { borderColor: colors.border }]}>
            <Image source={{ uri: pickedAttachment.uri }} style={styles.attachmentPreview} />
            <Pressable onPress={() => setPickedAttachment(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={[styles.inputArea, { borderColor: colors.border }]}>
          {sendError && (
            <ThemedText type="small" style={styles.sendErrorText}>{sendError}</ThemedText>
          )}

          <View style={styles.inputRow}>
            <Pressable style={styles.attachButton} onPress={toggleAttachMenu} disabled={picking}>
              {picking ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name={attachMenuOpen ? 'close' : 'add'} size={26} color={colors.textSecondary} />
              )}
            </Pressable>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="メッセージを入力..."
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              onFocus={() => attachMenuOpen && setAttachMenuOpen(false)}
              multiline
            />
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: colors.tint },
                (!(text.trim() || pickedAttachment) || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!(text.trim() || pickedAttachment) || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={{ height: bottomPanelHeight, overflow: 'hidden' }}>
          {attachMenuOpen && (
            <View
              style={[
                styles.attachMenuSheet,
                { backgroundColor: colors.backgroundElement, paddingBottom: Spacing.four + insets.bottom },
              ]}
            >
              <View style={styles.attachMenuGrid}>
                <Pressable style={styles.attachMenuItem} onPress={() => void handlePickAttachment()}>
                  <View style={[styles.attachMenuIconCircle, { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="image" size={28} color={colors.tint} />
                  </View>
                  <ThemedText type="small">写真</ThemedText>
                </Pressable>
                <Pressable style={styles.attachMenuItem} onPress={() => void handleCaptureAttachment()}>
                  <View style={[styles.attachMenuIconCircle, { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="camera" size={28} color={colors.tint} />
                  </View>
                  <ThemedText type="small">カメラ</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={!!previewImage} transparent animationType="none" onRequestClose={closeImagePreview}>
        {/* Animated.Valueをrender中にinterpolate()するのはReact Native Animated APIの定型パターンで、
            通常のrefのように再レンダー間で不整合を起こすものではないため、react-hooks/refsの誤検知として無効化する */}
        {/* eslint-disable react-hooks/refs */}
        <View style={styles.imagePreviewRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.imagePreviewBackdrop, { opacity: Animated.multiply(previewProgress, previewDragOpacity) }]}
          />
          {previewImage && previewMorphStyle && (
            <Animated.Image
              source={{ uri: previewImage.url }}
              resizeMode="contain"
              style={[styles.imagePreviewFull, previewMorphStyle]}
              {...previewPanResponder.panHandlers}
            />
          )}
          <Pressable
            style={[styles.imagePreviewClose, { top: insets.top + Spacing.three }]}
            onPress={closeImagePreview}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
        {/* eslint-enable react-hooks/refs */}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: Spacing.one,
  },
  headerTextGroup: {
    gap: 2,
  },
  messagesContent: {
    padding: Spacing.four,
    gap: Spacing.one,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  dateLabelRow: {
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  dateLabelPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Spacing.four,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubbleColMine: {
    maxWidth: '78%',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  bubbleColTheirs: {
    maxWidth: '78%',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  bubble: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  attachmentImage: {
    width: 180,
    height: 180,
    borderRadius: Spacing.two,
  },
  metaSideMine: {
    alignItems: 'flex-end',
    paddingBottom: 2,
  },
  metaSideTheirs: {
    alignItems: 'flex-start',
    paddingBottom: 2,
  },
  metaLine: {
    fontSize: 11,
    lineHeight: 14,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachmentPreview: {
    width: 56,
    height: 56,
    borderRadius: Spacing.one,
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  sendErrorText: {
    color: '#D14343',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  attachMenuSheet: {
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  attachMenuGrid: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  attachMenuItem: {
    alignItems: 'center',
    gap: Spacing.two,
    width: 72,
  },
  attachMenuIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewRoot: {
    flex: 1,
  },
  imagePreviewBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  imagePreviewFull: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN.width,
    height: SCREEN.height,
  },
  imagePreviewClose: {
    position: 'absolute',
    right: Spacing.four,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
