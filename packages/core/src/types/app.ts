export type Language = "ja" | "en";

export type RegistrationStep =
  | "email_input"
  | "email_sent"
  | "email_verified"
  | "initial_registration"
  | "waiting_approval"
  | "approved_limited"
  | "profile_completion"
  | "fee_payment"
  | "fully_active";

export interface User {
  id: string;
  email: string;
  createdAt?: string;
  name: string;
  nickname: string;
  furigana: string;
  birthday: string;
  languages: string[];
  birthCountry?: string;
  country?: string;
  category: "japanese" | "regular-international" | "exchange";
  approved: boolean;
  isAdmin?: boolean;
  /** Storage path in bucket `user-avatars`（例: `{uuid}/avatar.jpg`）。表示は署名付きURL */
  avatarPath?: string;
  studentIdImage?: string;
  studentNumber?: string;
  grade?: string;
  major?: string;
  phone?: string;
  organizations?: string;
  blocked?: boolean;
  registrationStep: RegistrationStep;
  emailVerified: boolean;
  initialRegistered: boolean;
  profileCompleted: boolean;
  feePaid: boolean;
  membershipYear?: number;
  isRenewal?: boolean;
  studentIdReuploadRequested?: boolean;
  reuploadReason?: string;
  requestedAt?: string;
}

export interface Event {
  id: number;
  title: string;
  titleJa?: string;
  titleEn?: string;
  description: string;
  descriptionJa?: string;
  descriptionEn?: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  locationEn?: string;
  googleMapUrl?: string;
  participationFee?: number;
  maxParticipants: number;
  currentParticipants: number;
  likes: number;
  image: string;
  eventColor?: string;
  /** カレンダー表示用アイコン（DB: event_icon） */
  eventIconKey?: string;
  tags: {
    friendsCanMeet: boolean;
    photoContest: boolean;
  };
  status: "upcoming" | "past";
  photos?: number;
  lineGroupLink?: string;
  lineGroupUrl?: string;
  shareToken?: string;
  participants?: Array<{ id: string; name: string; email: string; attended?: boolean; paid?: boolean }>;
}

export interface EventParticipant {
  userId: string;
  userName: string;
  userNickname: string;
  registeredAt: string;
  photoRefusal?: boolean;
  attended?: boolean;
  paid?: boolean;
}

export type MessageCategory = 'inquiry' | 'event_consult' | 'membership' | 'trouble';

/**
 * イベント/思い出写真などを引用チップ風に表示するための構造化メンション。
 * 元データ（イベント名等）が後で変わっても過去のチャット表示が壊れないよう、
 * 送信時点のタイトル・画像URLをスナップショットとして保持する。
 */
export interface MessageMention {
  type: 'event' | 'memory' | 'location';
  id: number;
  title: string;
  /** dateLabel/timeLabelが無い場合のフォールバック用単一行 */
  subtitle?: string;
  /** ハイフン無しの日付表示（例: 2026年7月9日） */
  dateLabel?: string;
  /** 時刻表示（イベントのみ） */
  timeLabel?: string;
  imageUrl?: string;
  /** locationタイプ用: タップで開く外部リンク（Google Maps等） */
  url?: string;
}

export interface Message {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  isAdmin: boolean;
  read?: boolean;
  readAt?: string;
  pinned?: boolean;
  flagged?: boolean;
  isBroadcast?: boolean;
  broadcastSubject?: string;
  broadcastSubjectEn?: string;
  category?: MessageCategory;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentWaveform?: number[];
  mention?: MessageMention;
}

export interface MessageThread {
  [userId: string]: Message[];
}

export interface ChatThreadMetadata {
  [userId: string]: {
    pinned?: boolean;
    flagged?: boolean;
    unreadCount?: number;
  };
}

export interface Notification {
  id: string;
  type: "message" | "event" | "photo" | "board";
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  time: string;
  icon: "mail" | "calendar" | "image" | "user";
  link?: string;
  linkPage?: "admin-chat" | "events" | "gallery" | "bulletin" | "messages";
  read?: boolean;
}

export interface BoardPost {
  id: number;
  authorId?: string;
  isPinned?: boolean;
  pinOrder?: number | null;
  author: string;
  authorAvatar: string;
  title: string;
  content: string;
  language: string;
  peopleNeeded: number;
  interested: number;
  tag: "languageExchange" | "studyGroup" | "event";
  time: string;
  image?: string;
  displayType: "story" | "board";
  expiryDate?: string;
  isHidden: boolean;
  isDeleted: boolean;
  category?: string;
  date?: string;
  replies?: BoardPostReply[];
}

export interface BoardPostReply {
  id: number;
  author: string;
  authorAvatar: string;
  content: string;
  time: string;
}

export interface GalleryPhoto {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string;
  image: string | { src: string };
  likes: number;
  height?: number;
  userId: string;
  userName: string;
  uploadedAt: string;
  approved: boolean;
}
