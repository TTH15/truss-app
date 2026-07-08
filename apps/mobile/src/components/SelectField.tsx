import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface SelectFieldOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function SelectField({ label, placeholder, value, options, onChange, disabled, error }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = Colors.light;
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <Pressable
        style={[
          styles.trigger,
          { borderColor: error ? '#D14343' : colors.border },
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
      >
        <ThemedText style={{ color: selectedLabel ? colors.text : colors.textSecondary }}>
          {selectedLabel ?? placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <Pressable onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <ThemedText style={item.value === value ? { color: colors.tint } : undefined}>
                    {item.label}
                  </ThemedText>
                  {item.value === value && <Ionicons name="checkmark" size={18} color={colors.tint} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.four,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
