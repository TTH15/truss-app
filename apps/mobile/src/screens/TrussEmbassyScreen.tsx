import { Ionicons } from '@expo/vector-icons';
import { formatDateLabel, formatMessageTime, getChatAttachmentSignedUrl, getMessageCategoryLabel, MESSAGE_CATEGORY_OPTIONS, parseMessageDate, toDateKey, type Message, type MessageCategory } from '@truss/core';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [text, setText] = useState('');
  const [category, setCategory] = useState<MessageCategory>('inquiry');
  const [pickedAttachment, setPickedAttachment] = useState<PickedChatAttachment | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const hasMarkedRead = useRef(false);

  const messages = (user && messageThreads[user.id]) || [];

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
      setText('');
      setPickedAttachment(null);
      await sendMessageToStaff(trimmed || '（添付ファイル）', { category, attachmentPath, attachmentType });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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

          <View style={styles.categoryPickerRow}>
            {MESSAGE_CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.categoryChip,
                  { borderColor: colors.border },
                  category === option.key && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => setCategory(option.key)}
              >
                <ThemedText type="small" style={category === option.key ? styles.categoryChipTextActive : undefined}>
                  {option.labelJa}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {pickedAttachment && (
            <View style={styles.attachmentPreviewRow}>
              <Image source={{ uri: pickedAttachment.uri }} style={styles.attachmentPreview} />
              <Pressable onPress={() => setPickedAttachment(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          <View style={[styles.inputRow, { borderColor: colors.border }]}>
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
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
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  attachmentPreview: {
    width: 56,
    height: 56,
    borderRadius: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
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
});
