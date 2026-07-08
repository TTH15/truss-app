import { Ionicons } from '@expo/vector-icons';
import { formatDateLabel, formatMessageTime, parseMessageDate, toDateKey } from '@truss/core';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface TrussEmbassyScreenProps {
  onClose: () => void;
}

export function TrussEmbassyScreen({ onClose }: TrussEmbassyScreenProps) {
  const { user } = useAuth();
  const { messageThreads, sendMessageToStaff, markStaffThreadAsRead } = useData();
  const colors = Colors.light;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasMarkedRead = useRef(false);

  const messages = (user && messageThreads[user.id]) || [];

  useEffect(() => {
    if (hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    void markStaffThreadAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessageToStaff(trimmed);
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
                      <View
                        style={[
                          styles.bubble,
                          isMine ? { backgroundColor: colors.tint } : { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>{message.text}</ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={[styles.timeText, isMine ? styles.timeTextMine : styles.timeTextTheirs]}
                    >
                      {formatMessageTime(message.time)}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.inputRow, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="メッセージを入力..."
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable
              style={[styles.sendButton, { backgroundColor: colors.tint }, (!text.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => void handleSend()}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
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
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  timeText: {
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  timeTextMine: {
    textAlign: 'right',
  },
  timeTextTheirs: {
    textAlign: 'left',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
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
