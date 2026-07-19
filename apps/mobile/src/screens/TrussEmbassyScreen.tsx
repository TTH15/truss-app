import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatDateLabel, formatEventDateNoHyphen, formatMessageTime, getChatAttachmentSignedUrl, parseMessageDate, toDateKey, type Event, type GalleryPhoto, type Message, type MessageMention } from '@truss/core';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Linking,
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

import { EventPickerPanel } from '@/components/EventPickerPanel';
import { MemoryPickerPanel } from '@/components/MemoryPickerPanel';
import { MentionChip } from '@/components/MentionChip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceMessagePlayer } from '@/components/VoiceMessagePlayer';
import { VoiceRecorderPanel } from '@/components/VoiceRecorderPanel';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useEmbassyMention } from '@/contexts/EmbassyMentionContext';
import { useTheme } from '@/hooks/use-theme';
import { captureChatAttachment, finalizeVoiceAttachment, pickChatAttachment, pickChatFile, type PickedChatAttachment } from '@/lib/chat-attachment';
import { downsampleLevels, WAVEFORM_BAR_COUNT } from '@/lib/voice-waveform';
import { getCurrentLocationMention } from '@/lib/chat-location';
import { linkifyText } from '@/lib/linkify';

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
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

// 添付メニューの各アイコンに、明度・彩度を揃えつつ色相だけ変えたパレットを割り当てる
// （緊急のみ警告色として意味を持つためアンバー固定）
const ATTACH_MENU_COLORS = {
  photo: '#3B82F6',
  camera: '#8B5CF6',
  location: '#EF4444',
  file: '#14B8A6',
  event: '#6366F1',
  urgent: '#D97706',
  memory: '#EC4899',
  voice: '#10B981',
} as const;

function attachIconBackground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}

export function TrussEmbassyScreen({ onClose }: TrussEmbassyScreenProps) {
  const { user } = useAuth();
  const { messageThreads, sendMessageToStaff, markStaffThreadAsRead, uploadChatAttachment, events, eventParticipants, galleryPhotos } =
    useData();
  const { pendingMention, clearPendingMention } = useEmbassyMention();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [pickedAttachment, setPickedAttachment] = useState<PickedChatAttachment | null>(null);
  const [mentionAttachment, setMentionAttachment] = useState<MessageMention | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; cacheKey: string; rect: ImageRect } | null>(null);
  const [urgentMode, setUrgentMode] = useState(false);
  // 添付パネルの中身。grid以外はパネルを閉じずに中身だけ差し替える（LINE風のインライン遷移）
  const [attachPanelMode, setAttachPanelMode] = useState<'grid' | 'voice' | 'event' | 'memory'>('grid');
  const scrollRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const voiceRecorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
  const voiceRecorderState = useAudioRecorderState(voiceRecorder, 100);
  // 録音中に収集した音量サンプルの全履歴。stateにせずrefで持つことで、100ms間隔の更新のたびに
  // 画面全体（メッセージ一覧を含む）が再レンダーされるのを避ける（ライブ表示はVoiceRecorderPanel内で完結）。
  const recordingLevelsRef = useRef<number[]>([]);
  const handleRecordingLevel = useCallback((level: number) => {
    recordingLevelsRef.current.push(level);
  }, []);
  const attachMenuOpenRef = useRef(false);
  const imageRefs = useRef<Map<number, View>>(new Map());
  // 画面全体の横スライド用。マウント時はSCREEN.width(画面右端の外)からスタートし0へアニメーション、
  // 閉じる時は右へアニメーションしてからonCloseを呼ぶ（戻るボタンの矢印/エッジスワイプと同じ方向）。
  // eslint-disable-next-line react-hooks/refs -- Animated.Valueをrender中に使うのはReact Native Animated APIの定型パターン
  const screenTranslateX = useRef(new Animated.Value(SCREEN.width)).current;
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
  // 1行あたり: アイコン(64) + アイコン/ラベル間の余白 + ラベル行高。2行(写真/カメラ, 位置情報/ファイル)分。
  const ATTACH_MENU_ROW_HEIGHT = 64 + Spacing.two + 20;
  const ATTACH_MENU_HEIGHT =
    Spacing.five + ATTACH_MENU_ROW_HEIGHT * 2 + Spacing.four + Spacing.four + insets.bottom;
  // ボイス録音ページ（大きな円ボタン）用。イベント/思い出のリスト用は画面の半分強を確保する。
  const VOICE_PANEL_HEIGHT = 300 + insets.bottom;
  const LIST_PANEL_HEIGHT = Math.round(SCREEN.height * 0.55);
  const PANEL_HEIGHT_BY_MODE: Record<typeof attachPanelMode, number> = {
    grid: ATTACH_MENU_HEIGHT,
    voice: VOICE_PANEL_HEIGHT,
    event: LIST_PANEL_HEIGHT,
    memory: LIST_PANEL_HEIGHT,
  };
  // OSが報告するshow/hideのdurationは非対称になりがちなので、固定値で揃えて速度差を無くす。
  const KEYBOARD_ANIMATION_DURATION = 250;

  const messages = (user && messageThreads[user.id]) || [];

  const myEvents = useMemo(() => {
    if (!user) return [];
    return events.filter((event) => (eventParticipants[event.id] || []).some((p) => p.userId === user.id));
  }, [events, eventParticipants, user]);

  const myPhotos = useMemo(() => {
    if (!user) return [];
    return galleryPhotos.filter((photo) => photo.userId === user.id);
  }, [galleryPhotos, user]);

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
      // 「+」が「×」に変わっている間の押下は、メニューを閉じるだけでなくキーボード表示に戻す
      // （WhatsApp同様、+ボタンは添付メニューとキーボードのトグルとして振る舞う）
      if (voiceRecorderState.isRecording) void handleCancelVoiceRecording();
      setAttachMenuOpen(false);
      setAttachPanelMode('grid');
      setBottomPanelHeight(0);
      textInputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setAttachPanelMode('grid');
    setAttachMenuOpen(true);
    setBottomPanelHeight(ATTACH_MENU_HEIGHT);
  };

  // マウント時だけでなく、画面を開いたまま新着（未読の運営メッセージ）が届いた場合にも既読にする
  const hasUnreadFromAdmin = messages.some((m) => m.isAdmin && !m.read);
  useEffect(() => {
    if (!hasUnreadFromAdmin) return;
    void markStaffThreadAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreadFromAdmin]);

  // 画面右端から左へスライドインして開く（戻るボタンの矢印と同じ左右軸）
  useEffect(() => {
    Animated.timing(screenTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissScreen = () => {
    Animated.timing(screenTranslateX, { toValue: SCREEN.width, duration: 250, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  const screenPanResponder = useRef(
    // eslint-disable-next-line react-hooks/refs -- コールバック内でscreenTranslateXのsetValue/interpolateを呼ぶ定型パターン
    PanResponder.create({
      // 画面左端付近から始まったドラッグのみを、右方向スワイプで閉じるジェスチャーとして扱う
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.pageX < 24,
      onMoveShouldSetPanResponder: (evt, gesture) => evt.nativeEvent.pageX < 40 && gesture.dx > 6,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dx > 0) screenTranslateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx > SCREEN.width * 0.3 || gesture.vx > 0.8) {
          Animated.timing(screenTranslateX, { toValue: SCREEN.width, duration: 200, useNativeDriver: true }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(screenTranslateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  // Journey/MemoriesからEmbassy Chatが開かれた場合、渡されたメンションを引用チップとしてセットする
  useEffect(() => {
    if (!pendingMention) return;
    setMentionAttachment(pendingMention);
    clearPendingMention();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMention]);

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

  // 入力欄付近を下方向にスワイプするとキーボードを閉じる（LINE/WhatsApp同様の挙動）。
  // 通常のタップ・カーソル移動を邪魔しないよう、一定量の下方向ドラッグを検知した時だけ
  // ジェスチャーを奪う(capture)。
  const inputSwipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        gesture.dy > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
      onPanResponderRelease: () => Keyboard.dismiss(),
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const closeAttachMenu = () => {
    animatePanel();
    if (voiceRecorderState.isRecording) void handleCancelVoiceRecording();
    setAttachMenuOpen(false);
    setAttachPanelMode('grid');
    setBottomPanelHeight(0);
  };

  /** イベント/思い出/ボイスのアイコンをタップした時、パネルを閉じずに中身だけ差し替える */
  const switchAttachPanelMode = (mode: 'voice' | 'event' | 'memory') => {
    animatePanel();
    Keyboard.dismiss();
    setAttachPanelMode(mode);
    setBottomPanelHeight(PANEL_HEIGHT_BY_MODE[mode]);
  };

  const backToAttachGrid = () => {
    if (voiceRecorderState.isRecording) void handleCancelVoiceRecording();
    animatePanel();
    setAttachPanelMode('grid');
    setBottomPanelHeight(ATTACH_MENU_HEIGHT);
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

  const handlePickFile = async () => {
    closeAttachMenu();
    setPicking(true);
    try {
      const picked = await pickChatFile();
      if (picked) setPickedAttachment(picked);
    } catch (error) {
      console.error('Error picking file:', error);
    } finally {
      setPicking(false);
    }
  };

  const handleStartVoiceRecording = async () => {
    setSendError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setSendError('マイクへのアクセスが許可されていません');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      recordingLevelsRef.current = [];
      await voiceRecorder.prepareToRecordAsync();
      voiceRecorder.record();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setSendError('録音の開始に失敗しました。');
    }
  };

  // 録音を終え、送信前プレビュー（他のメンション/添付と同じ流れ）に載せる
  const handleFinishVoiceRecording = async () => {
    const durationMillis = voiceRecorderState.durationMillis;
    const waveform = downsampleLevels(recordingLevelsRef.current, WAVEFORM_BAR_COUNT);
    try {
      await voiceRecorder.stop();
      const uri = voiceRecorder.uri;
      if (uri) setPickedAttachment(finalizeVoiceAttachment(uri, durationMillis, waveform));
    } catch (error) {
      console.error('Error finishing voice recording:', error);
      setSendError('録音の保存に失敗しました。');
    }
  };

  const handleCancelVoiceRecording = async () => {
    try {
      await voiceRecorder.stop();
    } catch (error) {
      console.error('Error cancelling voice recording:', error);
    }
  };

  // 位置情報ボタンは即送信ではなく、他のメンション（イベント/思い出）と同様に
  // 一度プレビューとして入力欄上部に表示し、送信ボタン押下で初めて送信される。
  const handlePickLocation = async () => {
    closeAttachMenu();
    setPicking(true);
    setSendError(null);
    try {
      const mention = await getCurrentLocationMention();
      setMentionAttachment(mention);
      textInputRef.current?.focus();
    } catch (error) {
      console.error('Error picking location:', error);
      setSendError(error instanceof Error ? error.message : '位置情報の取得に失敗しました。');
    } finally {
      setPicking(false);
    }
  };

  const toggleUrgentMode = () => {
    closeAttachMenu();
    setUrgentMode((prev) => !prev);
    textInputRef.current?.focus();
  };

  const handleShareEvent = (event: Event) => {
    closeAttachMenu();
    setMentionAttachment({
      type: 'event',
      id: event.id,
      title: event.title,
      dateLabel: formatEventDateNoHyphen(event.date),
      timeLabel: event.time,
    });
    textInputRef.current?.focus();
  };

  const handleShareMemory = (photo: GalleryPhoto) => {
    closeAttachMenu();
    const imageUrl = typeof photo.image === 'string' ? photo.image : photo.image.src;
    setMentionAttachment({
      type: 'memory',
      id: photo.id,
      title: photo.eventName,
      dateLabel: formatEventDateNoHyphen(photo.eventDate),
      imageUrl,
    });
    textInputRef.current?.focus();
  };

  const handleSend = async (): Promise<boolean> => {
    const trimmed = text.trim();
    if ((!trimmed && !pickedAttachment && !mentionAttachment) || sending) return false;
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
      const fallbackText =
        pickedAttachment?.fileName ??
        (pickedAttachment?.contentType.startsWith('audio/') ? 'ボイスメッセージ' : undefined) ??
        (mentionAttachment ? `${mentionAttachment.title}について` : '（添付ファイル）');
      await sendMessageToStaff(trimmed || fallbackText, {
        attachmentPath,
        attachmentType,
        attachmentWaveform: pickedAttachment?.waveform,
        flagged: urgentMode,
        mention: mentionAttachment ?? undefined,
      });
      setText('');
      setPickedAttachment(null);
      setMentionAttachment(null);
      setUrgentMode(false);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error instanceof Error ? error.message : '送信に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setSending(false);
    }
  };

  // ボイス録音ページの送信ボタン用。既存のアップロード＋送信ロジック(handleSend)をそのまま使い、
  // 成功時のみパネルを閉じる（失敗時は録音のレビュー画面に留まり再送信できるようにする）
  const handleSendVoiceRecording = async () => {
    const ok = await handleSend();
    if (ok) closeAttachMenu();
  };

  const openImagePreview = (messageId: number, url: string, cacheKey: string) => {
    const node = imageRefs.current.get(messageId);
    node?.measureInWindow((x, y, width, height) => {
      previewProgress.setValue(0);
      previewDragY.setValue(0);
      setPreviewImage({ url, cacheKey, rect: { x, y, width, height } });
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
    // eslint-disable-next-line react-hooks/refs -- Animated.Value/PanResponderをrender中に使うのは定型パターン
    <Animated.View style={[styles.container, { transform: [{ translateX: screenTranslateX }] }]} {...screenPanResponder.panHandlers}>
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderColor: colors.border, paddingTop: insets.top + Spacing.two }]}>
        <Pressable onPress={dismissScreen} hitSlop={12} style={styles.backButton}>
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
              const isImageAttachment = !message.attachmentType || message.attachmentType.startsWith('image/');
              const isVoiceAttachment = !!attachmentUrl && !!message.attachmentType?.startsWith('audio/');
              const isFileAttachment = !!attachmentUrl && !isImageAttachment && !isVoiceAttachment;
              const autoFallbackText = message.mention
                ? `${message.mention.title}について`
                : isVoiceAttachment
                  ? 'ボイスメッセージ'
                  : '（添付ファイル）';
              const hasCaption = !isFileAttachment && !isVoiceAttachment && !!message.text && message.text !== autoFallbackText;
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
                      {message.mention && <MentionChip mention={message.mention} />}
                      {attachmentUrl && isImageAttachment && (
                        <Pressable
                          ref={(node) => {
                            if (node) imageRefs.current.set(message.id, node as unknown as View);
                            else imageRefs.current.delete(message.id);
                          }}
                          onPress={() => openImagePreview(message.id, attachmentUrl, message.attachmentPath!)}
                        >
                          <ExpoImage
                            source={{ uri: attachmentUrl, cacheKey: message.attachmentPath }}
                            style={[styles.attachmentImage, { backgroundColor: colors.backgroundSelected }]}
                            cachePolicy="memory-disk"
                            transition={150}
                          />
                        </Pressable>
                      )}
                      {isFileAttachment && (
                        <Pressable
                          onPress={() => void Linking.openURL(attachmentUrl)}
                          style={[
                            styles.fileCard,
                            isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <Ionicons name="document" size={22} color={isMine ? '#FFFFFF' : colors.tint} />
                          <ThemedText numberOfLines={1} style={[styles.fileCardText, isMine && styles.bubbleTextMine]}>
                            {message.text || 'ファイル'}
                          </ThemedText>
                        </Pressable>
                      )}
                      {isVoiceAttachment && (
                        <View
                          style={[
                            styles.voiceBubble,
                            isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <VoiceMessagePlayer
                            uri={attachmentUrl}
                            playButtonBg={isMine ? 'rgba(255, 255, 255, 0.25)' : colors.tint}
                            playIconColor="#FFFFFF"
                            textColor={isMine ? '#FFFFFF' : colors.tint}
                            waveform={message.attachmentWaveform}
                          />
                        </View>
                      )}
                      {hasCaption && (
                        <View
                          style={[
                            styles.bubble,
                            isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>
                            {linkifyText(message.text, isMine ? '#FFFFFF' : colors.tint)}
                          </ThemedText>
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

        {mentionAttachment && (
          <View style={[styles.mentionPreviewRow, { borderColor: colors.border }]}>
            <MentionChip mention={mentionAttachment} onRemove={() => setMentionAttachment(null)} />
          </View>
        )}

        {pickedAttachment && !pickedAttachment.contentType.startsWith('audio/') && (
          <View style={[styles.attachmentPreviewRow, { borderColor: colors.border }]}>
            {pickedAttachment.fileName ? (
              <View style={[styles.filePreviewIcon, { backgroundColor: colors.backgroundSelected }]}>
                <Ionicons name="document" size={22} color={colors.tint} />
              </View>
            ) : (
              <ExpoImage source={{ uri: pickedAttachment.uri }} style={styles.attachmentPreview} />
            )}
            {pickedAttachment.fileName && (
              <ThemedText numberOfLines={1} style={styles.filePreviewName}>{pickedAttachment.fileName}</ThemedText>
            )}
            <Pressable onPress={() => setPickedAttachment(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {urgentMode && (
          <View style={[styles.urgentRow, { borderColor: colors.border }]}>
            <Ionicons name="warning" size={16} color="#D97706" />
            <ThemedText type="small" style={styles.urgentRowText}>緊急としてマークして送信します</ThemedText>
            <Pressable onPress={() => setUrgentMode(false)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={[styles.inputArea, { borderColor: colors.border }]}>
          {sendError && (
            <ThemedText type="small" style={styles.sendErrorText}>{sendError}</ThemedText>
          )}

          {/* eslint-disable-next-line react-hooks/refs -- PanResponderをrender中に使うのは定型パターン */}
          <View style={styles.inputRow} {...inputSwipePanResponder.panHandlers}>
            <Pressable style={styles.attachButton} onPress={toggleAttachMenu} disabled={picking}>
              {picking ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : attachMenuOpen ? (
                <MaterialIcons name="keyboard" size={26} color={colors.textSecondary} />
              ) : (
                <Ionicons name="add" size={26} color={colors.textSecondary} />
              )}
            </Pressable>
            <TextInput
              ref={textInputRef}
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
                (!(text.trim() || pickedAttachment || mentionAttachment) || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!(text.trim() || pickedAttachment || mentionAttachment) || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={{ height: bottomPanelHeight, overflow: 'hidden' }}>
          {attachMenuOpen && attachPanelMode === 'grid' && (
            <View
              style={[
                styles.attachMenuSheet,
                { backgroundColor: colors.backgroundElement, paddingBottom: Spacing.four + insets.bottom },
              ]}
            >
              <View style={styles.attachMenuRows}>
                <View style={styles.attachMenuGrid}>
                  <Pressable style={styles.attachMenuItem} onPress={() => void handlePickAttachment()}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.photo) }]}>
                      <Ionicons name="image" size={28} color={ATTACH_MENU_COLORS.photo} />
                    </View>
                    <ThemedText type="small">写真</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={() => void handleCaptureAttachment()}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.camera) }]}>
                      <Ionicons name="camera" size={28} color={ATTACH_MENU_COLORS.camera} />
                    </View>
                    <ThemedText type="small">カメラ</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={() => void handlePickLocation()}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.location) }]}>
                      <Ionicons name="location" size={28} color={ATTACH_MENU_COLORS.location} />
                    </View>
                    <ThemedText type="small">位置情報</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={() => void handlePickFile()}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.file) }]}>
                      <Ionicons name="document" size={28} color={ATTACH_MENU_COLORS.file} />
                    </View>
                    <ThemedText type="small">ファイル</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.attachMenuGrid}>
                  <Pressable style={styles.attachMenuItem} onPress={() => switchAttachPanelMode('event')}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.event) }]}>
                      <Ionicons name="calendar" size={28} color={ATTACH_MENU_COLORS.event} />
                    </View>
                    <ThemedText type="small">イベント</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={toggleUrgentMode}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.urgent) }]}>
                      <Ionicons name="warning" size={28} color={ATTACH_MENU_COLORS.urgent} />
                    </View>
                    <ThemedText type="small">緊急</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={() => switchAttachPanelMode('voice')}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.voice) }]}>
                      <Ionicons name="mic" size={28} color={ATTACH_MENU_COLORS.voice} />
                    </View>
                    <ThemedText type="small">ボイス</ThemedText>
                  </Pressable>
                  <Pressable style={styles.attachMenuItem} onPress={() => switchAttachPanelMode('memory')}>
                    <View style={[styles.attachMenuIconCircle, { backgroundColor: attachIconBackground(ATTACH_MENU_COLORS.memory) }]}>
                      <Ionicons name="images" size={28} color={ATTACH_MENU_COLORS.memory} />
                    </View>
                    <ThemedText type="small">思い出</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {attachMenuOpen && attachPanelMode === 'voice' && (
            <View style={[styles.attachSubPage, { backgroundColor: colors.backgroundElement, paddingBottom: insets.bottom }]}>
              <View style={styles.subPageHeader}>
                <Pressable onPress={backToAttachGrid} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <ThemedText type="smallBold">ボイスメッセージ</ThemedText>
                <View style={styles.subPageHeaderSpacer} />
              </View>
              <VoiceRecorderPanel
                recorderState={voiceRecorderState}
                pickedAttachment={pickedAttachment}
                onLevel={handleRecordingLevel}
                onStartRecording={() => void handleStartVoiceRecording()}
                onFinishRecording={() => void handleFinishVoiceRecording()}
                onCancelRecording={() => void handleCancelVoiceRecording()}
                onDiscard={() => setPickedAttachment(null)}
                onSend={() => void handleSendVoiceRecording()}
                tintColor={colors.tint}
                textSecondaryColor={colors.textSecondary}
              />
            </View>
          )}

          {attachMenuOpen && attachPanelMode === 'event' && (
            <View style={[styles.attachSubPage, { backgroundColor: colors.backgroundElement, paddingBottom: insets.bottom }]}>
              <View style={styles.subPageHeader}>
                <Pressable onPress={backToAttachGrid} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <ThemedText type="smallBold">共有するイベントを選択</ThemedText>
                <View style={styles.subPageHeaderSpacer} />
              </View>
              <EventPickerPanel events={myEvents} onSelect={handleShareEvent} />
            </View>
          )}

          {attachMenuOpen && attachPanelMode === 'memory' && (
            <View style={[styles.attachSubPage, { backgroundColor: colors.backgroundElement, paddingBottom: insets.bottom }]}>
              <View style={styles.subPageHeader}>
                <Pressable onPress={backToAttachGrid} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <ThemedText type="smallBold">共有する思い出の写真を選択</ThemedText>
                <View style={styles.subPageHeaderSpacer} />
              </View>
              <MemoryPickerPanel photos={myPhotos} onSelect={handleShareMemory} />
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
            <AnimatedExpoImage
              source={{ uri: previewImage.url, cacheKey: previewImage.cacheKey }}
              contentFit="contain"
              cachePolicy="memory-disk"
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
    </Animated.View>
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
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 220,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  fileCardText: {
    flexShrink: 1,
  },
  voiceBubble: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  mentionPreviewRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  urgentRowText: {
    flex: 1,
    color: '#D97706',
  },
  attachmentPreview: {
    width: 56,
    height: 56,
    borderRadius: Spacing.one,
  },
  filePreviewIcon: {
    width: 56,
    height: 56,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewName: {
    flex: 1,
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
  attachMenuRows: {
    gap: Spacing.four,
  },
  attachSubPage: {
    flex: 1,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  subPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
  },
  subPageHeaderSpacer: {
    width: 22,
  },
  attachMenuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
