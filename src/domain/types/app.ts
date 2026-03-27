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
  maxParticipants: number;
  currentParticipants: number;
  likes: number;
  image: string;
  eventColor?: string;
  tags: {
    friendsCanMeet: boolean;
    photoContest: boolean;
  };
  status: "upcoming" | "past";
  photos?: number;
  lineGroupLink?: string;
  lineGroupUrl?: string;
  participants?: Array<{ id: string; name: string; email: string; attended?: boolean; paid?: boolean }>;
}

export interface EventParticipant {
  userId: string;
  userName: string;
  userNickname: string;
  registeredAt: string;
  photoRefusal?: boolean;
}

export interface Message {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  isAdmin: boolean;
  read?: boolean;
  pinned?: boolean;
  flagged?: boolean;
  isBroadcast?: boolean;
  broadcastSubject?: string;
  broadcastSubjectEn?: string;
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
