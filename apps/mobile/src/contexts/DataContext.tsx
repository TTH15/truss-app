import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Event, EventParticipant } from '@truss/core';
import { queryEventParticipantsGrouped, queryEvents } from '@truss/core';

interface DataContextType {
  events: Event[];
  eventParticipants: { [eventId: number]: EventParticipant[] };
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventParticipants, setEventParticipants] = useState<{ [eventId: number]: EventParticipant[] }>({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [eventsData, participantsData] = await Promise.all([
        queryEvents(),
        queryEventParticipantsGrouped(),
      ]);
      setEvents(eventsData);
      setEventParticipants(participantsData);
    } catch (error) {
      console.error('Failed to load events/participants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <DataContext.Provider value={{ events, eventParticipants, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
