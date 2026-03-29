// =============================================
// Truss App - Supabase Database Types
// =============================================

// Enum types matching database
export type UserCategory = 'japanese' | 'regular-international' | 'exchange';

export type RegistrationStep =
  | 'email_input'
  | 'email_sent'
  | 'email_verified'
  | 'initial_registration'
  | 'waiting_approval'
  | 'approved_limited'
  | 'profile_completion'
  | 'fee_payment'
  | 'fully_active';

export type EventStatus = 'upcoming' | 'past';

export type BoardPostTag = 'languageExchange' | 'studyGroup' | 'event';

export type BoardPostDisplayType = 'story' | 'board';

export type NotificationType = 'message' | 'event' | 'photo' | 'board';

export type NotificationIcon = 'mail' | 'calendar' | 'image' | 'user';

export type NotificationLinkPage = 'admin-chat' | 'events' | 'gallery' | 'bulletin' | 'messages';

// =============================================
// Database Row Types
// =============================================

export interface DbUser {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  nickname: string;
  furigana: string;
  birthday: string | null;
  languages: string[];
  country: string;
  category: UserCategory;
  approved: boolean;
  is_admin: boolean;
  student_id_image: string | null;
  student_number: string | null;
  grade: string | null;
  major: string | null;
  phone: string | null;
  organizations: string | null;
  blocked: boolean;
  registration_step: RegistrationStep;
  email_verified: boolean;
  initial_registered: boolean;
  profile_completed: boolean;
  fee_paid: boolean;
  membership_year: number | null;
  is_renewal: boolean;
  student_id_reupload_requested: boolean;
  reupload_reason: string | null;
  requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEvent {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  title: string;
  title_en: string | null;
  description: string;
  description_en: string | null;
  date: string;
  time: string;
  location: string;
  location_en: string | null;
  google_map_url: string | null;
  max_participants: number;
  current_participants: number;
  likes: number;
  image: string | null;
  event_color: string | null;
  tags_friends_can_meet: boolean;
  tags_photo_contest: boolean;
  status: EventStatus;
  photos_count: number;
  line_group_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEventParticipant {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  event_id: number;
  user_id: string;
  user_name: string;
  user_nickname: string;
  registered_at: string;
  photo_refusal: boolean;
}

export interface DbEventLike {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  event_id: number;
  user_id: string;
  created_at: string;
}

export interface DbFeeSettings {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  annual_fee: number;
  admission_fee: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  sender_id: string;
  receiver_id: string | null;
  sender_name: string;
  text: string;
  time: string;
  is_admin: boolean;
  read: boolean;
  pinned: boolean;
  flagged: boolean;
  is_broadcast: boolean;
  broadcast_subject: string | null;
  broadcast_subject_en: string | null;
  created_at: string;
}

export interface DbChatThreadMetadata {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  user_id: string;
  admin_user_id: string | null;
  pinned: boolean;
  flagged: boolean;
  unread_count: number;
  last_message_at: string | null;
  updated_at: string;
}

export interface DbNotification {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  title_en: string | null;
  description: string;
  description_en: string | null;
  time: string;
  icon: NotificationIcon;
  link: string | null;
  link_page: NotificationLinkPage | null;
  read: boolean;
  created_at: string;
}

export interface DbBoardPost {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  author_id: string;
  author: string;
  author_avatar: string | null;
  title: string;
  content: string;
  language: string;
  people_needed: number;
  interested: number;
  tag: BoardPostTag;
  time: string;
  image: string | null;
  display_type: BoardPostDisplayType;
  expiry_date: string | null;
  is_hidden: boolean;
  is_deleted: boolean;
  category: string | null;
  date: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBoardPostReply {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  post_id: number;
  author_id: string;
  author: string;
  author_avatar: string | null;
  content: string;
  time: string;
  created_at: string;
}

export interface DbBoardPostInterest {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  post_id: number;
  user_id: string;
  created_at: string;
}

export interface DbGalleryPhoto {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  event_id: number;
  user_id: string;
  event_name: string;
  event_date: string;
  image: string;
  likes: number;
  height: number | null;
  user_name: string;
  uploaded_at: string;
  approved: boolean;
  created_at: string;
}

export interface DbGalleryPhotoLike {
  // Supabase JS v2 GenericTable の互換性確保のため（Record<string, unknown> 前提）
  [key: string]: unknown;
  id: number;
  photo_id: number;
  user_id: string;
  created_at: string;
}

// =============================================
// Insert Types (for creating new records)
// =============================================

export type DbUserInsert = Omit<DbUser, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type DbEventInsert = Omit<DbEvent, 'id' | 'created_at' | 'updated_at'> & {
  id?: number;
};

export type DbEventParticipantInsert = Omit<DbEventParticipant, 'id'>;

export type DbMessageInsert = Omit<DbMessage, 'id' | 'created_at'>;

export type DbNotificationInsert = Omit<DbNotification, 'id' | 'created_at'> & {
  id?: string;
};

export type DbBoardPostInsert = Omit<DbBoardPost, 'id' | 'created_at' | 'updated_at'>;

export type DbBoardPostReplyInsert = Omit<DbBoardPostReply, 'id' | 'created_at'>;

export type DbGalleryPhotoInsert = Omit<DbGalleryPhoto, 'id' | 'created_at'>;

export type DbFeeSettingsInsert = Omit<DbFeeSettings, 'created_at' | 'updated_at'> & {
  id?: number;
};

// =============================================
// Update Types (for updating records)
// =============================================

export type DbUserUpdate = Partial<Omit<DbUser, 'id' | 'created_at' | 'updated_at'>>;

export type DbEventUpdate = Partial<Omit<DbEvent, 'id' | 'created_at' | 'updated_at'>>;

export type DbMessageUpdate = Partial<Pick<DbMessage, 'read' | 'pinned' | 'flagged'>>;

export type DbNotificationUpdate = Partial<Pick<DbNotification, 'read'>>;

export type DbBoardPostUpdate = Partial<Omit<DbBoardPost, 'id' | 'author_id' | 'created_at' | 'updated_at'>>;

export type DbGalleryPhotoUpdate = Partial<Pick<DbGalleryPhoto, 'approved' | 'likes'>>;

export type DbChatThreadMetadataUpdate = Partial<Pick<DbChatThreadMetadata, 'pinned' | 'flagged' | 'unread_count'>>;

export type DbFeeSettingsUpdate = Partial<Omit<DbFeeSettings, 'id' | 'created_at' | 'updated_at'>>;

// =============================================
// Supabase Database Type Definition
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: DbUserInsert;
        Update: DbUserUpdate;
        Relationships: [];
      };
      events: {
        Row: DbEvent;
        Insert: DbEventInsert;
        Update: DbEventUpdate;
        Relationships: [];
      };
      event_participants: {
        Row: DbEventParticipant;
        Insert: DbEventParticipantInsert;
        Update: never;
        Relationships: [];
      };
      event_likes: {
        Row: DbEventLike;
        Insert: Omit<DbEventLike, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
      fee_settings: {
        Row: DbFeeSettings;
        Insert: DbFeeSettingsInsert;
        Update: DbFeeSettingsUpdate;
        Relationships: [];
      };
      messages: {
        Row: DbMessage;
        Insert: DbMessageInsert;
        Update: DbMessageUpdate;
        Relationships: [];
      };
      chat_thread_metadata: {
        Row: DbChatThreadMetadata;
        Insert: Omit<DbChatThreadMetadata, 'id' | 'updated_at'>;
        Update: DbChatThreadMetadataUpdate;
        Relationships: [];
      };
      notifications: {
        Row: DbNotification;
        Insert: DbNotificationInsert;
        Update: DbNotificationUpdate;
        Relationships: [];
      };
      board_posts: {
        Row: DbBoardPost;
        Insert: DbBoardPostInsert;
        Update: DbBoardPostUpdate;
        Relationships: [];
      };
      board_post_replies: {
        Row: DbBoardPostReply;
        Insert: DbBoardPostReplyInsert;
        Update: never;
        Relationships: [];
      };
      board_post_interests: {
        Row: DbBoardPostInterest;
        Insert: Omit<DbBoardPostInterest, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
      gallery_photos: {
        Row: DbGalleryPhoto;
        Insert: DbGalleryPhotoInsert;
        Update: DbGalleryPhotoUpdate;
        Relationships: [];
      };
      gallery_photo_likes: {
        Row: DbGalleryPhotoLike;
        Insert: Omit<DbGalleryPhotoLike, 'id' | 'created_at'>;
        Update: never;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_user_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      increment_participants: {
        Args: { event_id: number };
        Returns: void;
      };
      decrement_participants: {
        Args: { event_id: number };
        Returns: void;
      };
      increment_event_likes: {
        Args: { p_event_id: number };
        Returns: void;
      };
      decrement_event_likes: {
        Args: { p_event_id: number };
        Returns: void;
      };
      increment_interested: {
        Args: { post_id: number };
        Returns: void;
      };
      decrement_interested: {
        Args: { post_id: number };
        Returns: void;
      };
      increment_photo_likes: {
        Args: { photo_id: number };
        Returns: void;
      };
      decrement_photo_likes: {
        Args: { photo_id: number };
        Returns: void;
      };
    };
    Enums: {
      user_category: UserCategory;
      registration_step: RegistrationStep;
      event_status: EventStatus;
      board_post_tag: BoardPostTag;
      board_post_display_type: BoardPostDisplayType;
      notification_type: NotificationType;
      notification_icon: NotificationIcon;
      notification_link_page: NotificationLinkPage;
    };
  };
}
