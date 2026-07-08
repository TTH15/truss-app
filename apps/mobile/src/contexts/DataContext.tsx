import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Event, EventParticipant } from '@truss/core';
import {
  queryEventParticipantsGrouped,
  queryEvents,
  registerEventParticipant,
  toggleEventLikeForUser,
  unregisterEventParticipant,
} from '@truss/core';

import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  events: Event[];
  eventParticipants: { [eventId: number]: EventParticipant[] };
  loading: boolean;
  refresh: () => Promise<void>;
  registerForEvent: (eventId: number, photoRefusal?: boolean) => Promise<void>;
  unregisterFromEvent: (eventId: number) => Promise<void>;
  toggleEventLike: (eventId: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventParticipants, setEventParticipants] = useState<{ [eventId: number]: EventParticipant[] }>({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const data = await queryEvents();
    setEvents(data);
  };

  const fetchEventParticipants = async () => {
    const data = await queryEventParticipantsGrouped();
    setEventParticipants(data);
  };

  const refresh = async () => {
    try {
      await Promise.all([fetchEvents(), fetchEventParticipants()]);
    } catch (error) {
      console.error('Failed to load events/participants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

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

  return (
    <DataContext.Provider
      value={{ events, eventParticipants, loading, refresh, registerForEvent, unregisterFromEvent, toggleEventLike }}
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
