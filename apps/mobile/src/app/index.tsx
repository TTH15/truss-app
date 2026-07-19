import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useEmbassyMention } from '@/contexts/EmbassyMentionContext';
import { CheckinScannerScreen } from '@/screens/CheckinScannerScreen';

export default function HomeScreen() {
  const { user } = useAuth();
  const { chatThreadMetadata } = useData();
  const { openEmbassy } = useEmbassyMention();
  const colors = Colors.light;
  const [scannerOpen, setScannerOpen] = useState(false);

  const unreadCount = Object.values(chatThreadMetadata).reduce((sum, meta) => sum + (meta.unreadCount || 0), 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="accent">The journey continues.</ThemedText>
        <ThemedText type="title">Truss</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Home
        </ThemedText>

        <Pressable
          style={[styles.embassyCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={openEmbassy}
        >
          <View style={[styles.embassyIcon, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.tint} />
          </View>
          <View style={styles.embassyTextGroup}>
            <ThemedText type="smallBold">Truss Embassy</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">運営とのチャット</ThemedText>
          </View>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.tint }]}>
              <ThemedText type="small" style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        {user?.isAdmin && (
          <Pressable
            style={[styles.embassyCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            onPress={() => setScannerOpen(true)}
          >
            <View style={[styles.embassyIcon, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name="qr-code-outline" size={22} color={colors.tint} />
            </View>
            <View style={styles.embassyTextGroup}>
              <ThemedText type="smallBold">チェックインスキャナー</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">運営用: QRコードで出席確認</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </SafeAreaView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <CheckinScannerScreen onClose={() => setScannerOpen(false)} />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  embassyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'stretch',
    marginTop: Spacing.six,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  embassyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embassyTextGroup: {
    flex: 1,
    gap: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
  },
});
