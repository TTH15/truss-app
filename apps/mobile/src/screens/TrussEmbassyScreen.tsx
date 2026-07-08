import { Ionicons } from '@expo/vector-icons';
import { formatDateLabel, formatMessageTime, getChatAttachmentSignedUrl, getMessageCategoryLabel, MESSAGE_CATEGORY_OPTIONS, parseMessageDate, toDateKey, type Message, type MessageCategory } from '@truss/core';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { pickChatAttachment, type PickedChatAttachment } from '@/lib/chat-attachment';

interface TrussEmbassyScreenProps {
  onClose: () => void;
}

export function TrussEmbassyScreen({ onClose }: TrussEmbassyScreenProps) {
  const { user } = useAuth();
  const { messageThreads, sendMessageToStaff, markStaffThreadAsRead, uploadChatAttachment } = useData();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MessageCategory>('inquiry');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [pickedAttachment, setPickedAttachment] = useState<PickedChatAttachment | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const hasMarkedRead = useRef(false);

  const messages = (user && messageThreads[user.id]) || [];
  const selectedCategoryLabel = getMessageCategoryLabel(category, 'ja');

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

  const handlePickAttachment = async () => {
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
      await sendMessageToStaff(trimmed || '（添付ファイル）', { category, attachmentPath, attachmentType });
      setText('');
      setPickedAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error instanceof Error ? error.message : '送信に失敗しました。もう一度お試しください。');
    } finally {
      setSending(false);
    }
  };

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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
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
              const categoryLabel = getMessageCategoryLabel(message.category, 'ja');
              const attachmentUrl = message.attachmentPath ? signedUrls[message.attachmentPath] : undefined;
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
                  {isMine && categoryLabel && (
                    <View style={[styles.categoryRow, styles.categoryRowMine]}>
                      <View style={[styles.categoryTag, { backgroundColor: colors.backgroundSelected }]}>
                        <ThemedText type="small" style={{ color: colors.tint }}>{categoryLabel}</ThemedText>
                      </View>
                    </View>
                  )}
                  <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                    <View
                      style={[
                        styles.bubble,
                        isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                      ]}
                    >
                      {attachmentUrl && (
                        <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} />
                      )}
                      {message.text && message.text !== '（添付ファイル）' && (
                        <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>{message.text}</ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={[styles.metaRow, isMine ? styles.timeTextMine : styles.timeTextTheirs]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatMessageTime(message.time)}
                      {isMine && message.read ? '　既読' : ''}
                    </ThemedText>
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

          <Pressable
            style={[styles.categoryPill, { borderColor: colors.border }]}
            onPress={() => setCategoryPickerOpen(true)}
          >
            <ThemedText type="small" themeColor="textSecondary">{selectedCategoryLabel}</ThemedText>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.inputRow}>
            <Pressable style={styles.attachButton} onPress={() => void handlePickAttachment()} disabled={picking}>
              {picking ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
              )}
            </Pressable>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="メッセージを入力..."
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
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
      </KeyboardAvoidingView>

      <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.categoryBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <View style={[styles.categorySheet, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.categorySheetTitle}>相談カテゴリ</ThemedText>
            {MESSAGE_CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.categoryOption, { borderColor: colors.border }]}
                onPress={() => {
                  setCategory(option.key);
                  setCategoryPickerOpen(false);
                }}
              >
                <ThemedText style={category === option.key ? { color: colors.tint } : undefined}>{option.labelJa}</ThemedText>
                {category === option.key && <Ionicons name="checkmark" size={18} color={colors.tint} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
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
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  categoryRowMine: {
    justifyContent: 'flex-end',
  },
  categoryTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  attachmentImage: {
    width: 180,
    height: 180,
    borderRadius: Spacing.two,
  },
  metaRow: {
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  timeTextMine: {
    alignItems: 'flex-end',
  },
  timeTextTheirs: {
    alignItems: 'flex-start',
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
  categoryPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
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
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxHeight: 120,
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
  categoryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  categorySheet: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  categorySheetTitle: {
    marginBottom: Spacing.two,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
