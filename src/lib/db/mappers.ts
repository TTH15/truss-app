/**
 * Supabase の Row 型 → アプリのドメイン型への変換（単一ソース）
 * DataContext / useSupabase などで共有する。
 */
import type {
  DbUser,
  DbEvent,
  DbEventParticipant,
  DbMessage,
  DbNotification,
  DbBoardPost,
  DbBoardPostReply,
  DbGalleryPhoto,
} from "../../types/database.types";
import { DEFAULT_EVENT_ICON_KEY } from "../event-icons";
import type {
  User,
  Event,
  EventParticipant,
  Message,
  Notification,
  BoardPost,
  BoardPostReply,
  GalleryPhoto,
} from "../../domain/types/app";

export function mapDbUserRowToUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    name: row.name ?? "",
    nickname: row.nickname ?? "",
    furigana: row.furigana ?? "",
    birthday: row.birthday ?? "",
    languages: row.languages ?? [],
    birthCountry: row.country ?? "",
    country: row.country,
    category: row.category,
    approved: row.approved,
    isAdmin: row.is_admin,
    avatarPath: row.avatar_path ?? undefined,
    studentIdImage: row.student_id_image ?? undefined,
    studentNumber: row.student_number ?? undefined,
    grade: row.grade ?? undefined,
    major: row.major ?? undefined,
    phone: row.phone ?? undefined,
    organizations: row.organizations ?? undefined,
    blocked: row.blocked,
    registrationStep: row.registration_step,
    emailVerified: row.email_verified,
    initialRegistered: row.initial_registered,
    profileCompleted: row.profile_completed,
    feePaid: row.fee_paid,
    membershipYear: row.membership_year ?? undefined,
    isRenewal: row.is_renewal ?? false,
    studentIdReuploadRequested: row.student_id_reupload_requested,
    reuploadReason: row.reupload_reason ?? undefined,
    requestedAt: row.requested_at ?? undefined,
  };
}

export function mapDbEventRowToEvent(row: DbEvent): Event {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en ?? undefined,
    description: row.description,
    descriptionEn: row.description_en ?? undefined,
    date: row.date,
    time: row.time,
    location: row.location,
    locationEn: row.location_en ?? undefined,
    googleMapUrl: row.google_map_url ?? undefined,
    participationFee: row.participation_fee ?? 0,
    maxParticipants: row.max_participants,
    currentParticipants: row.current_participants,
    likes: row.likes,
    image: row.image ?? "",
    eventColor: row.event_color ?? undefined,
    eventIconKey: (() => {
      const v = (row as { event_icon?: string | null }).event_icon;
      return typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_EVENT_ICON_KEY;
    })(),
    tags: {
      friendsCanMeet: row.tags_friends_can_meet,
      photoContest: row.tags_photo_contest,
    },
    status: row.status,
    photos: row.photos_count,
    lineGroupLink: row.line_group_link ?? undefined,
  };
}

export function mapDbEventParticipantRow(row: DbEventParticipant): EventParticipant {
  return {
    userId: row.user_id,
    userName: row.user_name,
    userNickname: row.user_nickname,
    registeredAt: row.registered_at,
    photoRefusal: row.photo_refusal,
    attended: row.attended,
    paid: row.paid,
  };
}

export function mapDbMessageRowToMessage(row: DbMessage): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    text: row.text,
    time: row.time,
    isAdmin: row.is_admin,
    read: row.read,
    pinned: row.pinned,
    flagged: row.flagged,
    isBroadcast: row.is_broadcast,
    broadcastSubject: row.broadcast_subject ?? undefined,
    broadcastSubjectEn: row.broadcast_subject_en ?? undefined,
  };
}

export function mapDbNotificationRowToNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    titleEn: row.title_en ?? undefined,
    description: row.description,
    descriptionEn: row.description_en ?? undefined,
    time: row.time,
    icon: row.icon,
    link: row.link ?? undefined,
    linkPage: row.link_page ?? undefined,
    read: row.read,
  };
}

export function mapDbBoardPostReplyRow(row: DbBoardPostReply): BoardPostReply {
  return {
    id: row.id,
    author: row.author,
    authorAvatar: row.author_avatar ?? "",
    content: row.content,
    time: row.time,
  };
}

export function mapDbBoardPostRowToBoardPost(
  row: DbBoardPost,
  replies: BoardPostReply[] = []
): BoardPost {
  return {
    id: row.id,
    authorId: row.author_id,
    isPinned: row.is_pinned,
    author: row.author,
    authorAvatar: row.author_avatar ?? "",
    title: row.title,
    content: row.content,
    language: row.language,
    peopleNeeded: row.people_needed,
    interested: row.interested,
    tag: row.tag,
    time: row.time,
    image: row.image ?? undefined,
    displayType: row.display_type,
    expiryDate: row.expiry_date ?? undefined,
    isHidden: row.is_hidden,
    isDeleted: row.is_deleted,
    category: row.category ?? undefined,
    date: row.date ?? undefined,
    replies,
  };
}

export function mapDbGalleryPhotoRow(row: DbGalleryPhoto): GalleryPhoto {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    eventDate: row.event_date,
    image: row.image,
    likes: row.likes,
    height: row.height ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    uploadedAt: row.uploaded_at,
    approved: row.approved,
  };
}
