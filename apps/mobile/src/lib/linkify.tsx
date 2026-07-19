import { splitTextWithUrls } from '@truss/core';
import { Linking, Text, type TextStyle } from 'react-native';

/**
 * 本文中のURLを自動でリンク化する。呼び出し側の<ThemedText>等の中で
 * `{linkifyText(text, colors.tint)}` のように使う（ネストしたTextとして描画される）。
 */
export function linkifyText(text: string, linkColor: string): React.ReactNode[] {
  const linkStyle: TextStyle = { color: linkColor, textDecorationLine: 'underline' };
  return splitTextWithUrls(text).map((segment, index) => {
    if (segment.type === 'text') return segment.value;
    return (
      <Text key={`linkify-${index}`} style={linkStyle} onPress={() => void Linking.openURL(segment.value)}>
        {segment.value}
      </Text>
    );
  });
}
