import { Ionicons } from '@expo/vector-icons';
import type { Event, EventParticipant } from '@truss/core';
import { parseEventCheckinPayload } from '@truss/core';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/contexts/DataContext';

interface CheckinScannerScreenProps {
  onClose: () => void;
}

interface PendingCheckin {
  event: Event;
  participant: EventParticipant;
  dateMismatch: boolean;
  alreadyAttended: boolean;
}

type ScanError = { message: string };
type ScanResult = { status: 'success'; message: string } | { status: 'error'; message: string };

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CheckinScannerScreen({ onClose }: CheckinScannerScreenProps) {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const { events, eventParticipants, confirmEventAttendance } = useData();
  const [permission, requestPermission] = useCameraPermissions();
  const [pending, setPending] = useState<PendingCheckin | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const lockedRef = useRef(false);

  const isPaused = !!pending || !!scanError || !!result;

  const handleBarcodeScanned = (scan: BarcodeScanningResult) => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    const parsed = parseEventCheckinPayload(scan.data);
    if (!parsed) {
      setScanError({ message: '認識できないQRコードです' });
      return;
    }

    const event = events.find((e) => e.id === parsed.eventId);
    const participant = (eventParticipants[parsed.eventId] || []).find((p) => p.userId === parsed.userId);

    if (!event || !participant) {
      setScanError({ message: 'このイベントの参加者として見つかりませんでした' });
      return;
    }

    setPending({
      event,
      participant,
      dateMismatch: event.date !== todayDateString(),
      alreadyAttended: participant.attended === true,
    });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setConfirming(true);
    const { error } = await confirmEventAttendance(pending.event.id, pending.participant.userId);
    setConfirming(false);
    setPending(null);
    if (error) {
      setResult({ status: 'error', message: `確認に失敗しました: ${error.message}` });
      return;
    }
    setResult({
      status: 'success',
      message: `${pending.participant.userNickname || pending.participant.userName}さんの出席を確認しました（${pending.event.title}）`,
    });
  };

  const handleReset = () => {
    setPending(null);
    setScanError(null);
    setResult(null);
    lockedRef.current = false;
  };

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.permissionSafeArea}>
          <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.permissionText}>
            QRコードの読み取りにはカメラへのアクセスが必要です
          </ThemedText>
          <Pressable style={[styles.permissionButton, { backgroundColor: colors.tint }]} onPress={() => void requestPermission()}>
            <ThemedText style={styles.permissionButtonText}>カメラを許可する</ThemedText>
          </Pressable>
          <Pressable onPress={onClose}>
            <ThemedText themeColor="textSecondary">閉じる</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isPaused ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.headerRow, { paddingTop: insets.top + Spacing.two }]}>
          <Pressable style={styles.headerButton} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>チェックインスキャナー</ThemedText>
          <View style={styles.headerButton} />
        </View>

        {!isPaused && (
          <View style={styles.scanFrame} pointerEvents="none">
            <ThemedText style={styles.scanHint}>参加者のQRコードを枠内に写してください</ThemedText>
          </View>
        )}

        {pending && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="person-circle-outline" size={40} color={colors.tint} />
            <ThemedText type="subtitle">{pending.participant.userNickname || pending.participant.userName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{pending.event.title}（{pending.event.date}）</ThemedText>

            {pending.dateMismatch && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={18} color="#B4770A" />
                <ThemedText type="small" style={styles.warningText}>
                  本日（{todayDateString()}）はこのイベントの開催日と一致しません
                </ThemedText>
              </View>
            )}
            {pending.alreadyAttended && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle-outline" size={18} color="#3D6FB4" />
                <ThemedText type="small" style={styles.warningText}>すでに出席確認済みです</ThemedText>
              </View>
            )}

            <View style={styles.confirmRow}>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleReset}>
                <ThemedText themeColor="textSecondary">キャンセル</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.scanNextButton,
                  { backgroundColor: pending.dateMismatch ? '#D14343' : colors.tint },
                  confirming && styles.buttonDisabled,
                ]}
                onPress={() => void handleConfirm()}
                disabled={confirming}
              >
                <ThemedText style={styles.permissionButtonText}>
                  {confirming ? '確認中...' : '出席を確認する'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {scanError && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="close-circle" size={40} color="#D14343" />
            <ThemedText style={styles.resultText}>{scanError.message}</ThemedText>
            <Pressable style={[styles.scanNextButton, { backgroundColor: colors.tint }]} onPress={handleReset}>
              <ThemedText style={styles.permissionButtonText}>次をスキャン</ThemedText>
            </Pressable>
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons
              name={result.status === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={40}
              color={result.status === 'success' ? '#3FAE6A' : '#D14343'}
            />
            <ThemedText style={styles.resultText}>{result.message}</ThemedText>
            <Pressable style={[styles.scanNextButton, { backgroundColor: colors.tint }]} onPress={handleReset}>
              <ThemedText style={styles.permissionButtonText}>次をスキャン</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanFrame: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  scanHint: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  resultCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.six,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  resultText: {
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(180,119,10,0.1)',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  warningText: {
    flex: 1,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    alignSelf: 'stretch',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  scanNextButton: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  permissionSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  permissionText: {
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
