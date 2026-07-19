import type { MessageMention } from '@truss/core';
import * as Location from 'expo-location';

/** 逆ジオコーディング結果を日本語の住所らしい1行の文字列に整形する（取得できない項目は無視） */
function formatAddress(address: Location.LocationGeocodedAddress): string | null {
  if (address.formattedAddress) return address.formattedAddress;
  const parts = [address.region, address.city, address.district, address.street, address.streetNumber].filter(
    (part): part is string => !!part
  );
  return parts.length > 0 ? parts.join('') : null;
}

/** 現在地を取得し、位置情報メンション（引用チップ表示用）を返す */
export async function getCurrentLocationMention(): Promise<MessageMention> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('位置情報へのアクセスが許可されていません');
  }

  const position = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = position.coords;
  const coordsLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  let subtitle = coordsLabel;
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const formatted = address && formatAddress(address);
    if (formatted) subtitle = formatted;
  } catch (error) {
    // 逆ジオコーディングに失敗しても座標での送信は継続する
    console.error('Error reverse geocoding location:', error);
  }

  return {
    type: 'location',
    id: 0,
    title: '現在地',
    subtitle,
    url: `https://www.google.com/maps?q=${latitude},${longitude}`,
  };
}
