// =============================================
// Truss App - Data Context (Supabase)
// =============================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  queryEvents,
  queryPendingAndApprovedUsers,
  queryMessageThreadsAndMetadata,
  queryNotificationsForUser,
  queryBoardPostsWithReplies,
  queryGalleryPhotos,
  queryEventParticipantsGrouped,
} from '../lib/db/queries/public-reads';
import {
  insertEventRow,
  updateEventRow,
  deleteEventRow,
} from '../lib/db/mutations/events';
import {
  registerEventParticipant,
  unregisterEventParticipant,
  toggleEventLikeForUser,
} from '../lib/db/mutations/events-participation';
import {
  approvePendingUserRow,
  rejectUserRow,
  requestReuploadRow,
  confirmFeePaymentRow,
  setRenewalStatusRow,
  resetMembershipForNewYearRow,
  deleteUserRow,
} from '../lib/db/mutations/users';
import {
  createBoardPostRow,
  addReplyRow,
  togglePostInterestForUser,
  deleteBoardPostRow,
} from '../lib/db/mutations/board';
import {
  uploadGalleryPhotoRow,
  deleteGalleryPhotoRow,
  approveGalleryPhotoRow,
  likeGalleryPhotoRow,
} from '../lib/db/mutations/gallery';
import {
  sendMessageRow,
  sendBroadcastRow,
  markMessageAsReadRow,
  markAllMessagesAsReadForUserRow,
  updateChatMetadataRow,
} from '../lib/db/mutations/messages';
import {
  markNotificationAsReadRow,
  dismissNotificationRow,
} from '../lib/db/mutations/notifications';
import { useAuth } from './AuthContext';
import type {
  User, Event, EventParticipant, Message, MessageThread,
  ChatThreadMetadata, Notification, BoardPost, BoardPostReply, GalleryPhoto
} from '../domain/types/app';

interface DataContextType {
  events: Event[];
  pendingUsers: User[];
  approvedMembers: User[];
  messageThreads: MessageThread;
  chatThreadMetadata: ChatThreadMetadata;
  notifications: Notification[];
  boardPosts: BoardPost[];
  eventParticipants: { [eventId: number]: EventParticipant[] };
  galleryPhotos: GalleryPhoto[];
  loading: boolean;
  usersLoading: boolean;
  createEvent: (event: Omit<Event, 'id' | 'currentParticipants' | 'likes'>) => Promise<void>;
  updateEvent: (eventId: number, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: number) => Promise<void>;
  registerForEvent: (eventId: number, photoRefusal?: boolean) => Promise<void>;
  unregisterFromEvent: (eventId: number) => Promise<void>;
  toggleEventLike: (eventId: number) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  requestReupload: (userId: string, reason: string) => Promise<void>;
  confirmFeePayment: (userId: string, isRenewal?: boolean) => Promise<void>;
  confirmRenewal: (userId: string) => Promise<void>;
  setRenewalStatus: (userId: string, isRenewal: boolean) => Promise<void>;
  resetMembershipForNewYear: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, text: string, isAdmin?: boolean) => Promise<void>;
  sendBroadcast: (text: string, subjectJa: string, subjectEn: string) => Promise<void>;
  markMessageAsRead: (messageId: number) => Promise<void>;
  markAllMessagesAsReadForUser: (userId: string) => Promise<void>;
  updateChatMetadata: (userId: string, updates: Partial<{ pinned: boolean; flagged: boolean }>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  createBoardPost: (post: Omit<BoardPost, 'id' | 'replies'>) => Promise<void>;
  addReply: (postId: number, reply: Omit<BoardPostReply, 'id'>) => Promise<void>;
  toggleInterest: (postId: number) => Promise<void>;
  deleteBoardPost: (postId: number) => Promise<void>;
  uploadGalleryPhoto: (photo: Omit<GalleryPhoto, 'id' | 'likes' | 'uploadedAt' | 'approved'>) => Promise<void>;
  deleteGalleryPhoto: (photoId: number) => Promise<void>;
  approveGalleryPhoto: (photoId: number) => Promise<void>;
  likeGalleryPhoto: (photoId: number) => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshBoardPosts: () => Promise<void>;
  refreshGalleryPhotos: () => Promise<void>;
  setMessageThreads: React.Dispatch<React.SetStateAction<MessageThread>>;
  setChatThreadMetadata: React.Dispatch<React.SetStateAction<ChatThreadMetadata>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setBoardPosts: React.Dispatch<React.SetStateAction<BoardPost[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<User[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessageThread>({});
  const [chatThreadMetadata, setChatThreadMetadata] = useState<ChatThreadMetadata>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  const [eventParticipants, setEventParticipants] = useState<{ [eventId: number]: EventParticipant[] }>({});
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setEvents(await queryEvents());
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    setUsersLoading(true);
    try {
      const { pending, approved } = await queryPendingAndApprovedUsers();
      setPendingUsers(pending);
      setApprovedMembers(approved);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.info(`[perf] fetchUsers: ${Math.round(endedAt - startedAt)}ms`);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const { threads, metadata } = await queryMessageThreadsAndMetadata();
      setMessageThreads(threads);
      setChatThreadMetadata(metadata);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotifications(await queryNotificationsForUser(user.id));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  const fetchBoardPosts = useCallback(async () => {
    try {
      setBoardPosts(await queryBoardPostsWithReplies());
    } catch (error) {
      console.error('Error fetching board posts:', error);
    }
  }, []);

  const fetchGalleryPhotos = useCallback(async () => {
    try {
      setGalleryPhotos(await queryGalleryPhotos());
    } catch (error) {
      console.error('Error fetching gallery photos:', error);
    }
  }, []);

  const fetchEventParticipants = useCallback(async () => {
    try {
      setEventParticipants(await queryEventParticipantsGrouped());
    } catch (error) {
      console.error('Error fetching event participants:', error);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setLoading(true);
      await Promise.all([fetchEvents(), fetchUsers()]);
      setLoading(false);
      void Promise.all([fetchBoardPosts(), fetchEventParticipants(), fetchGalleryPhotos()]);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.info(`[perf] initData(core): ${Math.round(endedAt - startedAt)}ms`);
    };
    initData();
  }, [fetchEvents, fetchUsers, fetchBoardPosts, fetchEventParticipants, fetchGalleryPhotos]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchNotifications();
    }
  }, [user, fetchMessages, fetchNotifications]);

  useEffect(() => {
    const eventsChannel = supabase.channel('events-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents()).subscribe();
    const boardPostsChannel = supabase.channel('board-posts-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'board_posts' }, () => fetchBoardPosts()).subscribe();
    const galleryChannel = supabase.channel('gallery-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos' }, () => fetchGalleryPhotos()).subscribe();
    const usersChannel = supabase.channel('users-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers()).subscribe();
    const participantsChannel = supabase.channel('participants-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => { fetchEventParticipants(); fetchEvents(); }).subscribe();
    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(boardPostsChannel);
      supabase.removeChannel(galleryChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [fetchEvents, fetchBoardPosts, fetchGalleryPhotos, fetchUsers, fetchEventParticipants]);

  useEffect(() => {
    if (!user) return;
    const messagesChannel = supabase.channel(`messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchMessages())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `is_broadcast=eq.true` }, () => fetchMessages())
      .subscribe();
    const notificationsChannel = supabase.channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, fetchMessages, fetchNotifications]);

  const createEvent = async (eventData: Omit<Event, 'id' | 'currentParticipants' | 'likes'>) => {
    try {
      const { error } = await insertEventRow(eventData);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const updateEvent = async (eventId: number, updates: Partial<Event>) => {
    try {
      const { error } = await updateEventRow(eventId, updates);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = async (eventId: number) => {
    try {
      const { error } = await deleteEventRow(eventId);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const registerForEvent = async (eventId: number, photoRefusal: boolean = false) => {
    if (!user) return;
    try {
      const { error } = await registerEventParticipant({
        eventId,
        userId: user.id,
        userName: user.name,
        userNickname: user.nickname,
        photoRefusal,
      });
      if (error) throw error;
      await Promise.all([fetchEvents(), fetchEventParticipants()]);
    } catch (error) {
      console.error('Error registering for event:', error);
    }
  };

  const unregisterFromEvent = async (eventId: number) => {
    if (!user) return;
    try {
      const { error } = await unregisterEventParticipant(eventId, user.id);
      if (error) throw error;
      await Promise.all([fetchEvents(), fetchEventParticipants()]);
    } catch (error) {
      console.error('Error unregistering from event:', error);
    }
  };

  const toggleEventLike = async (eventId: number) => {
    if (!user) return;
    try {
      const { error } = await toggleEventLikeForUser(eventId, user.id);
      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error toggling event like:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const userToApprove = pendingUsers.find(u => u.id === userId);
      if (!userToApprove) return;
      let registrationStep = 'approved_limited';
      let profileCompleted = false;
      let feePaid = false;
      if (userToApprove.category === 'exchange') {
        registrationStep = 'fully_active';
        profileCompleted = true;
        feePaid = true;
      } else if (userToApprove.category === 'regular-international') {
        feePaid = true;
      }
      const { error } = await approvePendingUserRow(userId, {
        registrationStep,
        profileCompleted,
        feePaid,
      });
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await rejectUserRow(userId);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const requestReupload = async (userId: string, reason: string) => {
    try {
      const { error } = await requestReuploadRow(userId, reason);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error requesting reupload:', error);
    }
  };

  const confirmFeePayment = async (userId: string, isRenewal: boolean = false) => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const membershipYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const { error } = await confirmFeePaymentRow(userId, {
        membershipYear,
        isRenewal,
      });
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error confirming fee payment:', error);
    }
  };

  const confirmRenewal = async (userId: string) => { await confirmFeePayment(userId, true); };

  const setRenewalStatus = async (userId: string, isRenewal: boolean) => {
    try {
      const { error } = await setRenewalStatusRow(userId, isRenewal);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error setting renewal status:', error);
    }
  };

  const resetMembershipForNewYear = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const newMembershipYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const { error } = await resetMembershipForNewYearRow(newMembershipYear);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error resetting membership:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await deleteUserRow(userId);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const sendMessage = async (receiverId: string, text: string, isAdmin: boolean = false) => {
    if (!user) return;
    try {
      const { error } = await sendMessageRow({
        senderId: user.id,
        senderName: user.name,
        receiverId,
        text,
        isAdmin,
      });
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendBroadcast = async (text: string, subjectJa: string, subjectEn: string) => {
    if (!user) return;
    try {
      const { error } = await sendBroadcastRow({
        senderId: user.id,
        senderName: user.name,
        text,
        subjectJa,
        subjectEn,
      });
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      const { error } = await markMessageAsReadRow(messageId);
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllMessagesAsReadForUser = async (userId: string) => {
    try {
      setMessageThreads(prev => {
        const updated = { ...prev };
        if (updated[userId]) {
          updated[userId] = updated[userId].map(msg => msg.isAdmin ? { ...msg, read: true } : msg);
        }
        return updated;
      });
      const { error } = await markAllMessagesAsReadForUserRow(userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  const updateChatMetadata = async (userId: string, updates: Partial<{ pinned: boolean; flagged: boolean }>) => {
    try {
      const { error } = await updateChatMetadataRow(userId, updates);
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error updating chat metadata:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await markNotificationAsReadRow(notificationId);
      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await dismissNotificationRow(notificationId);
      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const createBoardPost = async (post: Omit<BoardPost, 'id' | 'replies'>) => {
    if (!user) return;
    try {
      const { error } = await createBoardPostRow(user.id, post);
      if (error) throw error;
      await fetchBoardPosts();
    } catch (error) {
      console.error('Error creating board post:', error);
    }
  };

  const addReply = async (postId: number, reply: Omit<BoardPostReply, 'id'>) => {
    if (!user) return;
    try {
      const { error } = await addReplyRow(user.id, postId, reply);
      if (error) throw error;
      await fetchBoardPosts();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const toggleInterest = async (postId: number) => {
    if (!user) return;
    try {
      const { error } = await togglePostInterestForUser(postId, user.id);
      if (error) throw error;
      await fetchBoardPosts();
    } catch (error) {
      console.error('Error toggling interest:', error);
    }
  };

  const deleteBoardPost = async (postId: number) => {
    try {
      const { error } = await deleteBoardPostRow(postId);
      if (error) throw error;
      await fetchBoardPosts();
    } catch (error) {
      console.error('Error deleting board post:', error);
    }
  };

  const uploadGalleryPhoto = async (photoData: Omit<GalleryPhoto, 'id' | 'likes' | 'uploadedAt' | 'approved'>) => {
    try {
      const { error } = await uploadGalleryPhotoRow(photoData);
      if (error) throw error;
      await fetchGalleryPhotos();
    } catch (error) {
      console.error('Error uploading gallery photo:', error);
      throw error;
    }
  };

  const deleteGalleryPhoto = async (photoId: number) => {
    try {
      const { error } = await deleteGalleryPhotoRow(photoId);
      if (error) throw error;
      await fetchGalleryPhotos();
    } catch (error) {
      console.error('Error deleting gallery photo:', error);
      throw error;
    }
  };

  const approveGalleryPhoto = async (photoId: number) => {
    try {
      const { error } = await approveGalleryPhotoRow(photoId);
      if (error) throw error;
      await fetchGalleryPhotos();
    } catch (error) {
      console.error('Error approving gallery photo:', error);
      throw error;
    }
  };

  const likeGalleryPhoto = async (photoId: number) => {
    try {
      const { error } = await likeGalleryPhotoRow(photoId);
      if (error) throw error;
      await fetchGalleryPhotos();
    } catch (error) {
      console.error('Error liking gallery photo:', error);
      throw error;
    }
  };

  const value: DataContextType = {
    events, pendingUsers, approvedMembers, messageThreads, chatThreadMetadata, notifications, boardPosts, eventParticipants, galleryPhotos, loading, usersLoading,
    createEvent, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent, toggleEventLike,
    approveUser, rejectUser, requestReupload, confirmFeePayment, confirmRenewal, setRenewalStatus, resetMembershipForNewYear, deleteUser,
    sendMessage, sendBroadcast, markMessageAsRead, markAllMessagesAsReadForUser, updateChatMetadata,
    markNotificationAsRead, dismissNotification, createBoardPost, addReply, toggleInterest, deleteBoardPost,
    uploadGalleryPhoto, deleteGalleryPhoto, approveGalleryPhoto, likeGalleryPhoto,
    refreshEvents: fetchEvents, refreshUsers: fetchUsers, refreshMessages: fetchMessages, refreshNotifications: fetchNotifications,
    refreshBoardPosts: fetchBoardPosts, refreshGalleryPhotos: fetchGalleryPhotos,
    setMessageThreads, setChatThreadMetadata, setNotifications, setBoardPosts,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
