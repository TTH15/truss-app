/**
 * デザインコンセプト（docs/design-concept.md）で確定したパレット・フォントを定義する。
 * ベージュ/クリーム背景 + Truss Blue、手書き風フォントをアクセントに使うパスポート/ジャーナルの世界観。
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#3D4756',
    textSecondary: '#6B7280',
    background: '#F7F5F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E9F4FB',
    tint: '#6DB9E7',
    accentGreen: '#B7D8C1',
    accentPeach: '#F3C7B6',
    border: '#E4DFD5',
  },
  dark: {
    text: '#F7F5F1',
    textSecondary: '#A9AFBB',
    background: '#20242B',
    backgroundElement: '#2A2F38',
    backgroundSelected: '#333A46',
    tint: '#6DB9E7',
    accentGreen: '#B7D8C1',
    accentPeach: '#F3C7B6',
    border: '#3A4048',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * heading: 英字見出し用（Playfair Display、和文グリフなし）
 * handwritten: アクセントコピー用の手書き風フォント（Caveat、和文グリフなし）
 * body: 本文用、和文はNoto Sans JPに委ねる（フォールバックはOSデフォルト）
 */
export const Fonts = Platform.select({
  web: {
    heading: "'PlayfairDisplay_600SemiBold', serif",
    handwritten: "'Caveat_600SemiBold', cursive",
    body: "'NotoSansJP_400Regular', sans-serif",
    bodyBold: "'NotoSansJP_700Bold', sans-serif",
    mono: 'ui-monospace',
  },
  default: {
    heading: 'PlayfairDisplay_600SemiBold',
    handwritten: 'Caveat_600SemiBold',
    body: 'NotoSansJP_400Regular',
    bodyBold: 'NotoSansJP_700Bold',
    mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
