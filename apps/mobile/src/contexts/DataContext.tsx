import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ChatThreadMetadata, Event, EventParticipant, GalleryPhoto, MessageCategory, MessageThread, UploadGalleryPhotoInput } from '@truss/core';
import {
  confirmEventAttendance as confirmEventAttendanceRow,
  likeGalleryPhotoRow,
  markAllMessagesAsReadForUserRow,
  queryEventParticipantsGrouped,
  queryEvents,
  queryGalleryPhotos,
  queryMessageThreadsAndMetadata,
  queryStaffInboxUserId,
  registerEventParticipant,
  sendMessageRow,
  toggleEventLikeForUser,
  unregisterEventParticipant,
  uploadChatAttachment as uploadChatAttachmentToStorage,
  uploadGalleryPhotoRow,
} from '@truss/core';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DataContextType {
  events: Event[];
  eventParticipants: { [eventId: number]: EventParticipant[] };
  loading: boolean;
  refresh: () => Promise<void>;
  registerForEvent: (eventId: number, photoRefusal?: boolean) => Promise<void>;
  unregisterFromEvent: (eventId: number) => Promise<void>;
  toggleEventLike: (eventId: number) => Promise<void>;
  messageThreads: MessageThread;
  chatThreadMetadata: ChatThreadMetadata;
  staffInboxUserId: string | null;
  sendMessageToStaff: (
    text: string,
    options?: { category?: MessageCategory; attachmentPath?: string; attachmentType?: string }
  ) => Promise<void>;
  markStaffThreadAsRead: () => Promise<void>;
  uploadChatAttachment: (blob: Blob, meta: { fileExt: string; contentType: string }) => Promise<{ path: string | null; error: unknown }>;
  galleryPhotos: GalleryPhoto[];
  uploadGalleryPhoto: (input: UploadGalleryPhotoInput) => Promise<void>;
  likeGalleryPhoto: (photoId: number) => Promise<void>;
  confirmEventAttendance: (eventId: number, userId: string) => Promise<{ error: Error | null }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventParticipants, setEventParticipants] = useState<{ [eventId: number]: EventParticipant[] }>({});
  const [messageThreads, setMessageThreads] = useState<MessageThread>({});
  const [chatThreadMetadata, setChatThreadMetadata] = useState<ChatThreadMetadata>({});
  const [staffInboxUserId, setStaffInboxUserId] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const data = await queryEvents();
    setEvents(data);
  };

  const fetchGalleryPhotos = async () => {
    const data = await queryGalleryPhotos();
    setGalleryPhotos(data);
  };

  const fetchEventParticipants = async () => {
    const data = await queryEventParticipantsGrouped();
    setEventParticipants(data);
  };

  const fetchMessages = async () => {
    const { threads, metadata } = await queryMessageThreadsAndMetadata();
    setMessageThreads(threads);
    setChatThreadMetadata(metadata);
  };

  const refresh = async () => {
    try {
      await Promise.all([fetchEvents(), fetchEventParticipants(), fetchGalleryPhotos()]);
    } catch (error) {
      console.error('Failed to load events/participants/gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchMessages();
    void queryStaffInboxUserId()
      .then(setStaffInboxUserId)
      .catch((error) => console.error('Failed to load staff inbox user id:', error));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const messagesChannel = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => void fetchMessages())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'is_broadcast=eq.true' }, () => void fetchMessages())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => void fetchMessages())
      .subscribe();
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  const registerForEvent = async (eventId: number, photoRefusal = false) => {
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

  const sendMessageToStaff = async (
    text: string,
    options?: { category?: MessageCategory; attachmentPath?: string; attachmentType?: string }
  ) => {
    if (!user) return;
    if (!staffInboxUserId) throw new Error('運営受信箱の準備がまだ完了していません。少し待ってから再度お試しください。');
    try {
      const { error } = await sendMessageRow({
        senderId: user.id,
        senderName: user.name,
        receiverId: staffInboxUserId,
        text,
        isAdmin: false,
        category: options?.category,
        attachmentPath: options?.attachmentPath,
        attachmentType: options?.attachmentType,
      });
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markStaffThreadAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await markAllMessagesAsReadForUserRow(user.id);
      if (error) throw error;
      await fetchMessages();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const uploadChatAttachment = async (blob: Blob, meta: { fileExt: string; contentType: string }) => {
    if (!user) return { path: null, error: new Error('Not signed in') };
    return uploadChatAttachmentToStorage(user.id, blob, meta);
  };

  const uploadGalleryPhoto = async (input: UploadGalleryPhotoInput) => {
    try {
      const { error } = await uploadGalleryPhotoRow(input);
      if (error) throw error;
      await fetchGalleryPhotos();
    } catch (error) {
      console.error('Error uploading gallery photo:', error);
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
    }
  };

  const confirmEventAttendance = async (eventId: number, userId: string) => {
    const { error } = await confirmEventAttendanceRow(eventId, userId);
    if (!error) await fetchEventParticipants();
    return { error };
  };

  return (
    <DataContext.Provider
      value={{
        events,
        eventParticipants,
        loading,
        refresh,
        registerForEvent,
        unregisterFromEvent,
        toggleEventLike,
        messageThreads,
        chatThreadMetadata,
        staffInboxUserId,
        sendMessageToStaff,
        markStaffThreadAsRead,
        uploadChatAttachment,
        galleryPhotos,
        uploadGalleryPhoto,
        likeGalleryPhoto,
        confirmEventAttendance,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
