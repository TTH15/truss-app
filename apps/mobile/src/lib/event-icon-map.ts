import type { Ionicons } from '@expo/vector-icons';
import type { EventIconKey } from '@truss/core';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** packages/core の EventIconKey（FontAwesome前提）をIonicons名にマッピング（モバイル表示用） */
const EVENT_ICON_TO_IONICON: Record<EventIconKey, IoniconName> = {
  calendar: 'calendar-outline',
  personWalking: 'walk-outline',
  comments: 'chatbubbles-outline',
  volleyball: 'basketball-outline',
  utensils: 'restaurant-outline',
  sakura: 'flower-outline',
  mochi: 'hammer-outline',
  party: 'wine-outline',
  film: 'film-outline',
  travel: 'airplane-outline',
  takoyaki: 'flame-outline',
  music: 'musical-notes-outline',
  gamepad: 'game-controller-outline',
  graduation: 'school-outline',
  users: 'people-outline',
  outdoor: 'sunny-outline',
  star: 'star-outline',
};

export function getIoniconForEventIcon(key: EventIconKey): IoniconName {
  return EVENT_ICON_TO_IONICON[key] ?? 'calendar-outline';
}
