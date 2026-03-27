// =============================================
// Truss App - Supabase Data Access Hooks
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  DbUser, DbEvent, DbEventParticipant, DbMessage, 
  DbNotification, DbBoardPost, DbBoardPostReply, 
  DbGalleryPhoto, DbChatThreadMetadata,
  DbUserInsert, DbUserUpdate, DbEventInsert, DbEventUpdate,
  DbMessageInsert, DbNotificationInsert, DbBoardPostInsert,
  DbBoardPostReplyInsert, DbGalleryPhotoInsert
} from '../types/database.types';
import type { 
  User, Event, EventParticipant, Message, 
  Notification, BoardPost, BoardPostReply 
} from '../domain/types/app';
import {
  mapDbUserRowToUser,
  mapDbEventRowToEvent,
  mapDbEventParticipantRow,
  mapDbMessageRowToMessage,
  mapDbNotificationRowToNotification,
  mapDbBoardPostRowToBoardPost,
  mapDbBoardPostReplyRow,
} from '../lib/db/mappers';

// =============================================
// Type Converters (DB -> App) — 実体は lib/db/mappers
// =============================================

export const dbUserToAppUser = mapDbUserRowToUser;

export function appUserToDbUser(appUser: User, authId?: string): DbUserInsert {
  return {
    auth_id: authId || null,
    email: appUser.email,
    name: appUser.name,
    nickname: appUser.nickname,
    furigana: appUser.furigana,
    birthday: appUser.birthday || null,
    languages: appUser.languages,
    country: appUser.country || appUser.birthCountry || null,
    category: appUser.category,
    approved: appUser.approved,
    is_admin: appUser.isAdmin || false,
    student_id_image: appUser.studentIdImage || null,
    student_number: appUser.studentNumber || null,
    grade: appUser.grade || null,
    major: appUser.major || null,
    phone: appUser.phone || null,
    organizations: appUser.organizations || null,
    blocked: appUser.blocked || false,
    registration_step: appUser.registrationStep,
    email_verified: appUser.emailVerified,
    initial_registered: appUser.initialRegistered,
    profile_completed: appUser.profileCompleted,
    fee_paid: appUser.feePaid,
    membership_year: appUser.membershipYear ?? null,
    is_renewal: appUser.isRenewal ?? false,
    student_id_reupload_requested: appUser.studentIdReuploadRequested || false,
    reupload_reason: appUser.reuploadReason || null,
    requested_at: appUser.requestedAt || null,
  };
}

export const dbEventToAppEvent = mapDbEventRowToEvent;

export function appEventToDbEvent(appEvent: Partial<Event>): Partial<DbEventInsert> {
  const result: Partial<DbEventInsert> = {};
  
  if (appEvent.title !== undefined) result.title = appEvent.title;
  if (appEvent.titleEn !== undefined) result.title_en = appEvent.titleEn || null;
  if (appEvent.description !== undefined) result.description = appEvent.description;
  if (appEvent.descriptionEn !== undefined) result.description_en = appEvent.descriptionEn || null;
  if (appEvent.date !== undefined) result.date = appEvent.date;
  if (appEvent.time !== undefined) result.time = appEvent.time;
  if (appEvent.location !== undefined) result.location = appEvent.location;
  if (appEvent.locationEn !== undefined) result.location_en = appEvent.locationEn || null;
  if (appEvent.googleMapUrl !== undefined) result.google_map_url = appEvent.googleMapUrl || null;
  if (appEvent.maxParticipants !== undefined) result.max_participants = appEvent.maxParticipants;
  if (appEvent.currentParticipants !== undefined) result.current_participants = appEvent.currentParticipants;
  if (appEvent.likes !== undefined) result.likes = appEvent.likes;
  if (appEvent.image !== undefined) result.image = appEvent.image || null;
  if (appEvent.eventColor !== undefined) result.event_color = appEvent.eventColor || null;
  if (appEvent.tags !== undefined) {
    result.tags_friends_can_meet = appEvent.tags.friendsCanMeet;
    result.tags_photo_contest = appEvent.tags.photoContest;
  }
  if (appEvent.status !== undefined) result.status = appEvent.status;
  if (appEvent.photos !== undefined) result.photos_count = appEvent.photos;
  if (appEvent.lineGroupLink !== undefined) result.line_group_link = appEvent.lineGroupLink || null;
  
  return result;
}

export const dbParticipantToAppParticipant = mapDbEventParticipantRow;
export const dbMessageToAppMessage = mapDbMessageRowToMessage;
export const dbNotificationToAppNotification = mapDbNotificationRowToNotification;

export function dbBoardPostToAppBoardPost(dbPost: DbBoardPost, replies?: DbBoardPostReply[]): BoardPost {
  return mapDbBoardPostRowToBoardPost(
    dbPost,
    replies?.map(mapDbBoardPostReplyRow) ?? []
  );
}

export const dbReplyToAppReply = mapDbBoardPostReplyRow;

// =============================================
// Users Hooks
// =============================================

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();

        if (error) throw error;
        setUser(data ? dbUserToAppUser(data) : null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();
          setUser(data ? dbUserToAppUser(data) : null);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return { error: new Error('No user logged in') };

    const dbUpdates: DbUserUpdate = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
    if (updates.furigana !== undefined) dbUpdates.furigana = updates.furigana;
    if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday || null;
    if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.approved !== undefined) dbUpdates.approved = updates.approved;
    if (updates.studentIdImage !== undefined) dbUpdates.student_id_image = updates.studentIdImage || null;
    if (updates.studentNumber !== undefined) dbUpdates.student_number = updates.studentNumber || null;
    if (updates.grade !== undefined) dbUpdates.grade = updates.grade || null;
    if (updates.major !== undefined) dbUpdates.major = updates.major || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.organizations !== undefined) dbUpdates.organizations = updates.organizations || null;
    if (updates.registrationStep !== undefined) dbUpdates.registration_step = updates.registrationStep;
    if (updates.emailVerified !== undefined) dbUpdates.email_verified = updates.emailVerified;
    if (updates.initialRegistered !== undefined) dbUpdates.initial_registered = updates.initialRegistered;
    if (updates.profileCompleted !== undefined) dbUpdates.profile_completed = updates.profileCompleted;
    if (updates.feePaid !== undefined) dbUpdates.fee_paid = updates.feePaid;

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setUser(dbUserToAppUser(data));
    }

    return { data: data ? dbUserToAppUser(data) : null, error };
  }, [user]);

  return { user, loading, error, updateUser };
}

export function usePendingUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('registration_step', 'waiting_approval')
        .eq('approved', false)
        .order('requested_at', { ascending: true });

      if (error) throw error;
      setUsers(data?.map(dbUserToAppUser) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const approveUser = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        approved: true, 
        registration_step: 'approved_limited',
        student_id_image: null // Remove student ID image after approval
      })
      .eq('id', userId);

    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }

    return { error };
  }, []);

  const rejectUser = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }

    return { error };
  }, []);

  const requestReupload = useCallback(async (userId: string, reason: string) => {
    const { error } = await supabase
      .from('users')
      .update({ 
        student_id_reupload_requested: true,
        reupload_reason: reason
      })
      .eq('id', userId);

    if (!error) {
      await fetchPendingUsers();
    }

    return { error };
  }, [fetchPendingUsers]);

  return { users, loading, error, approveUser, rejectUser, requestReupload, refresh: fetchPendingUsers };
}

export function useApprovedMembers() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('approved', true)
        .order('name');

      if (error) throw error;
      setMembers(data?.map(dbUserToAppUser) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refresh: fetchMembers };
}

// =============================================
// Events Hooks
// =============================================

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data?.map(dbEventToAppEvent) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (event: Omit<Event, 'id'>) => {
    const dbEvent = appEventToDbEvent(event) as DbEventInsert;
    
    const { data, error } = await supabase
      .from('events')
      .insert(dbEvent)
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => [dbEventToAppEvent(data), ...prev]);
    }

    return { data: data ? dbEventToAppEvent(data) : null, error };
  }, []);

  const updateEvent = useCallback(async (eventId: number, updates: Partial<Event>) => {
    const dbUpdates = appEventToDbEvent(updates);
    
    const { data, error } = await supabase
      .from('events')
      .update(dbUpdates)
      .eq('id', eventId)
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => prev.map(e => e.id === eventId ? dbEventToAppEvent(data) : e));
    }

    return { data: data ? dbEventToAppEvent(data) : null, error };
  }, []);

  const deleteEvent = useCallback(async (eventId: number) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }

    return { error };
  }, []);

  return { events, loading, error, createEvent, updateEvent, deleteEvent, refresh: fetchEvents };
}

export function useEventParticipants(eventId: number) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', eventId)
          .order('registered_at');

        if (error) throw error;
        setParticipants(data?.map(dbParticipantToAppParticipant) || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [eventId]);

  const registerParticipant = useCallback(async (
    userId: string, 
    userName: string, 
    userNickname: string,
    photoRefusal: boolean = false
  ) => {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: userId,
        user_name: userName,
        user_nickname: userNickname,
        photo_refusal: photoRefusal,
        registered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setParticipants(prev => [...prev, dbParticipantToAppParticipant(data)]);
      
      // Update current_participants count
      await supabase.rpc('increment_participants', { event_id: eventId });
    }

    return { data: data ? dbParticipantToAppParticipant(data) : null, error };
  }, [eventId]);

  const cancelRegistration = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (!error) {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      
      // Update current_participants count
      await supabase.rpc('decrement_participants', { event_id: eventId });
    }

    return { error };
  }, [eventId]);

  return { participants, loading, error, registerParticipant, cancelRegistration };
}

// =============================================
// Messages Hooks
// =============================================

export function useMessages(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId},and(is_broadcast.eq.true,receiver_id.is.null)`)
          .order('time', { ascending: true });

        if (error) throw error;
        setMessages(data?.map(dbMessageToAppMessage) || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as DbMessage;
          if (newMsg.sender_id === userId || newMsg.receiver_id === userId || 
              (newMsg.is_broadcast && !newMsg.receiver_id)) {
            setMessages(prev => [...prev, dbMessageToAppMessage(newMsg)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const sendMessage = useCallback(async (
    text: string,
    receiverId: string | null,
    isAdmin: boolean = false,
    isBroadcast: boolean = false,
    broadcastSubject?: string,
    broadcastSubjectEn?: string
  ) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: new Error('Not authenticated') };

    const { data: userData } = await supabase
      .from('users')
      .select('id, name')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) return { error: new Error('User not found') };

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userData.id,
        receiver_id: receiverId,
        sender_name: userData.name,
        text,
        time: new Date().toISOString(),
        is_admin: isAdmin,
        read: false,
        pinned: false,
        flagged: false,
        is_broadcast: isBroadcast,
        broadcast_subject: broadcastSubject || null,
        broadcast_subject_en: broadcastSubjectEn || null,
      })
      .select()
      .single();

    return { data: data ? dbMessageToAppMessage(data) : null, error };
  }, []);

  const markAsRead = useCallback(async (messageId: number) => {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    }

    return { error };
  }, []);

  return { messages, loading, error, sendMessage, markAsRead };
}

// =============================================
// Notifications Hooks
// =============================================

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('time', { ascending: false });

        if (error) throw error;
        const notifs = data?.map(dbNotificationToAppNotification) || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = dbNotificationToAppNotification(payload.new as DbNotification);
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    return { error };
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }

    return { error };
  }, [userId]);

  return { notifications, loading, error, unreadCount, markAsRead, markAllAsRead };
}

// =============================================
// Board Posts Hooks
// =============================================

export function useBoardPosts() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts with replies
      const { data: postsData, error: postsError } = await supabase
        .from('board_posts')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_hidden', false)
        .order('time', { ascending: false });

      if (postsError) throw postsError;

      // Fetch all replies for these posts
      const postIds = postsData?.map(p => p.id) || [];
      const { data: repliesData, error: repliesError } = await supabase
        .from('board_post_replies')
        .select('*')
        .in('post_id', postIds)
        .order('time', { ascending: true });

      if (repliesError) throw repliesError;

      // Map replies to posts
      const repliesByPost = (repliesData || []).reduce((acc, reply) => {
        if (!acc[reply.post_id]) acc[reply.post_id] = [];
        acc[reply.post_id].push(reply);
        return acc;
      }, {} as Record<number, DbBoardPostReply[]>);

      const appPosts = postsData?.map(p => 
        dbBoardPostToAppBoardPost(p, repliesByPost[p.id])
      ) || [];

      setPosts(appPosts);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(async (
    post: Omit<BoardPost, 'id' | 'replies'>
  ) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: new Error('Not authenticated') };

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) return { error: new Error('User not found') };

    const { data, error } = await supabase
      .from('board_posts')
      .insert({
        author_id: userData.id,
        author: post.author,
        author_avatar: post.authorAvatar || null,
        title: post.title,
        content: post.content,
        language: post.language,
        people_needed: post.peopleNeeded,
        interested: 0,
        tag: post.tag,
        time: new Date().toISOString(),
        image: post.image || null,
        display_type: post.displayType,
        expiry_date: post.expiryDate || null,
        is_hidden: false,
        is_deleted: false,
        category: post.category || null,
        date: post.date || null,
      })
      .select()
      .single();

    if (!error && data) {
      setPosts(prev => [dbBoardPostToAppBoardPost(data), ...prev]);
    }

    return { data: data ? dbBoardPostToAppBoardPost(data) : null, error };
  }, []);

  const addReply = useCallback(async (postId: number, reply: Omit<BoardPostReply, 'id'>) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: new Error('Not authenticated') };

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) return { error: new Error('User not found') };

    const { data, error } = await supabase
      .from('board_post_replies')
      .insert({
        post_id: postId,
        author_id: userData.id,
        author: reply.author,
        author_avatar: reply.authorAvatar || null,
        content: reply.content,
        time: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            replies: [...(p.replies || []), dbReplyToAppReply(data)],
          };
        }
        return p;
      }));
    }

    return { data: data ? dbReplyToAppReply(data) : null, error };
  }, []);

  const toggleInterest = useCallback(async (postId: number, userId: string) => {
    // Check if already interested
    const { data: existing } = await supabase
      .from('board_post_interests')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove interest
      const { error } = await supabase
        .from('board_post_interests')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (!error) {
        // Decrement interested count
        await supabase.rpc('decrement_interested', { post_id: postId });
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, interested: p.interested - 1 } : p
        ));
      }

      return { interested: false, error };
    } else {
      // Add interest
      const { error } = await supabase
        .from('board_post_interests')
        .insert({ post_id: postId, user_id: userId });

      if (!error) {
        // Increment interested count
        await supabase.rpc('increment_interested', { post_id: postId });
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, interested: p.interested + 1 } : p
        ));
      }

      return { interested: true, error };
    }
  }, []);

  const deletePost = useCallback(async (postId: number) => {
    const { error } = await supabase
      .from('board_posts')
      .update({ is_deleted: true })
      .eq('id', postId);

    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }

    return { error };
  }, []);

  return { posts, loading, error, createPost, addReply, toggleInterest, deletePost, refresh: fetchPosts };
}

// =============================================
// Gallery Hooks
// =============================================

export interface GalleryPhoto {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string;
  image: string;
  likes: number;
  height?: number;
  userId: string;
  userName: string;
  uploadedAt: string;
  approved: boolean;
}

export function useGalleryPhotos(eventId?: number) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('gallery_photos')
        .select('*')
        .eq('approved', true)
        .order('uploaded_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data?.map(p => ({
        id: p.id,
        eventId: p.event_id,
        eventName: p.event_name,
        eventDate: p.event_date,
        image: p.image,
        likes: p.likes,
        height: p.height || undefined,
        userId: p.user_id,
        userName: p.user_name,
        uploadedAt: p.uploaded_at,
        approved: p.approved,
      })) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhoto = useCallback(async (
    eventId: number,
    eventName: string,
    eventDate: string,
    imageUrl: string,
    userName: string
  ) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { error: new Error('Not authenticated') };

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userData) return { error: new Error('User not found') };

    const { data, error } = await supabase
      .from('gallery_photos')
      .insert({
        event_id: eventId,
        user_id: userData.id,
        event_name: eventName,
        event_date: eventDate,
        image: imageUrl,
        likes: 0,
        user_name: userName,
        uploaded_at: new Date().toISOString(),
        approved: false, // Requires admin approval
      })
      .select()
      .single();

    return { data, error };
  }, []);

  const toggleLike = useCallback(async (photoId: number, userId: string) => {
    // Check if already liked
    const { data: existing } = await supabase
      .from('gallery_photo_likes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove like
      const { error } = await supabase
        .from('gallery_photo_likes')
        .delete()
        .eq('photo_id', photoId)
        .eq('user_id', userId);

      if (!error) {
        await supabase.rpc('decrement_photo_likes', { photo_id: photoId });
        setPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, likes: p.likes - 1 } : p
        ));
      }

      return { liked: false, error };
    } else {
      // Add like
      const { error } = await supabase
        .from('gallery_photo_likes')
        .insert({ photo_id: photoId, user_id: userId });

      if (!error) {
        await supabase.rpc('increment_photo_likes', { photo_id: photoId });
        setPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, likes: p.likes + 1 } : p
        ));
      }

      return { liked: true, error };
    }
  }, []);

  return { photos, loading, error, uploadPhoto, toggleLike, refresh: fetchPhotos };
}

// Admin hook for unapproved photos
export function useUnapprovedPhotos() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('approved', false)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      setPhotos(data?.map(p => ({
        id: p.id,
        eventId: p.event_id,
        eventName: p.event_name,
        eventDate: p.event_date,
        image: p.image,
        likes: p.likes,
        height: p.height || undefined,
        userId: p.user_id,
        userName: p.user_name,
        uploadedAt: p.uploaded_at,
        approved: p.approved,
      })) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const approvePhoto = useCallback(async (photoId: number) => {
    const { error } = await supabase
      .from('gallery_photos')
      .update({ approved: true })
      .eq('id', photoId);

    if (!error) {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    }

    return { error };
  }, []);

  const rejectPhoto = useCallback(async (photoId: number) => {
    const { error } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photoId);

    if (!error) {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    }

    return { error };
  }, []);

  return { photos, loading, error, approvePhoto, rejectPhoto, refresh: fetchPhotos };
}

// =============================================
// Chat Thread Metadata Hook (for Admin)
// =============================================

export function useChatThreads() {
  const [threads, setThreads] = useState<Array<{
    userId: string;
    user: User;
    pinned: boolean;
    flagged: boolean;
    unreadCount: number;
    lastMessageAt: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      // Get all users with messages
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('approved', true);

      if (usersError) throw usersError;

      // Get thread metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('chat_thread_metadata')
        .select('*');

      if (metadataError) throw metadataError;

      const metadataByUser = (metadataData || []).reduce((acc, m) => {
        acc[m.user_id] = m;
        return acc;
      }, {} as Record<string, DbChatThreadMetadata>);

      const threads = (usersData || []).map(u => ({
        userId: u.id,
        user: dbUserToAppUser(u),
        pinned: metadataByUser[u.id]?.pinned || false,
        flagged: metadataByUser[u.id]?.flagged || false,
        unreadCount: metadataByUser[u.id]?.unread_count || 0,
        lastMessageAt: metadataByUser[u.id]?.last_message_at || null,
      }));

      setThreads(threads);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const updateThreadMetadata = useCallback(async (
    userId: string, 
    updates: { pinned?: boolean; flagged?: boolean }
  ) => {
    // Check if metadata exists
    const { data: existing } = await supabase
      .from('chat_thread_metadata')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('chat_thread_metadata')
        .update(updates)
        .eq('user_id', userId);

      if (!error) {
        setThreads(prev => prev.map(t => 
          t.userId === userId ? { ...t, ...updates } : t
        ));
      }

      return { error };
    } else {
      const { error } = await supabase
        .from('chat_thread_metadata')
        .insert({
          user_id: userId,
          pinned: updates.pinned || false,
          flagged: updates.flagged || false,
          unread_count: 0,
        });

      if (!error) {
        setThreads(prev => prev.map(t => 
          t.userId === userId ? { ...t, ...updates } : t
        ));
      }

      return { error };
    }
  }, []);

  return { threads, loading, error, updateThreadMetadata, refresh: fetchThreads };
}
