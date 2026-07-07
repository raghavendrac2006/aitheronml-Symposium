import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import HostDashboard from './components/HostDashboard';
import { SymposiumEvent, Attendee, UserSession, MAP_EMAIL_TO_EVENT_ID, MAP_EMAIL_TO_NAME, normalizeEmail } from './types';
import { 
  INITIAL_EVENTS, 
  INITIAL_ATTENDEES
} from './initialData';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  seedDatabaseIfEmpty,
  fetchEventsFromFirestore,
  fetchAttendeesFromFirestore,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveAttendeeToFirestore,
  deleteAttendeeFromFirestore
} from './firebaseSync';

export default function App() {
  // Session State
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data States
  const [events, setEvents] = useState<SymposiumEvent[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  // Initialize and load persistent state from Firestore & Auth
  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const email = normalizeEmail(firebaseUser.email || '');
          let role: 'superadmin' | 'host' | 'registration' = email.includes('superadmin') ? 'superadmin' : email === 'registration@aitheronml.in' ? 'registration' : 'host';
          let name = MAP_EMAIL_TO_NAME[email] || (email === 'registration@aitheronml.in' ? 'Registration Team' : email.includes('superadmin') ? 'Super Admin' : 'Event Host');
          let assignedEventId = MAP_EMAIL_TO_EVENT_ID[email] || '';

          const userDoc = await getDoc(doc(db, 'users', email));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const dbAssignedEventId = data.assignedEventId;
            setSession({
              email: email,
              role: (data.role || role) as 'superadmin' | 'host' | 'registration',
              name: data.name || name,
              assignedEventId: (dbAssignedEventId && dbAssignedEventId !== 'none') ? dbAssignedEventId : assignedEventId
            });
          } else {
            setSession({ email, role, name, assignedEventId });
          }
        } catch (e) {
          console.error("Error reading user profile, parsing by email name", e);
          const email = normalizeEmail(firebaseUser.email || '');
          const role = email.includes('superadmin') ? 'superadmin' : email === 'registration@aitheronml.in' ? 'registration' : 'host';
          const name = MAP_EMAIL_TO_NAME[email] || (email === 'registration@aitheronml.in' ? 'Registration Team' : email.includes('superadmin') ? 'Super Admin' : 'Event Host');
          const assignedEventId = MAP_EMAIL_TO_EVENT_ID[email] || '';
          setSession({ email, role, name, assignedEventId });
        }
      } else {
        setSession(null);
      }
    });

    // 2. Load Firestore Data
    async function initFirestoreData() {
      try {
        await seedDatabaseIfEmpty();

        const [fbEvents, fbAttendees] = await Promise.all([
          fetchEventsFromFirestore(),
          fetchAttendeesFromFirestore()
        ]);

        let finalEvents = fbEvents.length > 0 ? fbEvents : INITIAL_EVENTS;
        const fbEventIds = new Set(finalEvents.map(e => e.id));
        const missingInitialEvents = INITIAL_EVENTS.filter(e => !fbEventIds.has(e.id));
        if (missingInitialEvents.length > 0) {
          finalEvents = [...finalEvents, ...missingInitialEvents];
        }

        setEvents(finalEvents);
        setAttendees(fbAttendees.length > 0 ? fbAttendees : INITIAL_ATTENDEES);

        // Update localStorage as a fallback cache
        localStorage.setItem('ai_symposium_events', JSON.stringify(finalEvents));
        localStorage.setItem('ai_symposium_attendees', JSON.stringify(fbAttendees.length > 0 ? fbAttendees : INITIAL_ATTENDEES));
      } catch (error) {
        console.error("Failed to load data from Firestore, falling back to cache", error);
        
        // Cache Fallbacks
        const storedEvents = localStorage.getItem('ai_symposium_events');
        setEvents(storedEvents ? JSON.parse(storedEvents) : INITIAL_EVENTS);

        const storedAttendees = localStorage.getItem('ai_symposium_attendees');
        setAttendees(storedAttendees ? JSON.parse(storedAttendees) : INITIAL_ATTENDEES);
      } finally {
        setIsLoading(false);
      }
    }

    initFirestoreData();

    return () => unsubscribeAuth();
  }, []);

  // Sync state modifications dynamically to Firestore
  const updateEventsState = async (updated: SymposiumEvent[]) => {
    // Optimistic UI state
    setEvents(updated);
    localStorage.setItem('ai_symposium_events', JSON.stringify(updated));

    try {
      const currentIds = new Set(updated.map(e => e.id));
      const deleted = events.filter(e => !currentIds.has(e.id));
      
      // Delete removed
      for (const d of deleted) {
        await deleteEventFromFirestore(d.id);
      }

      // Save new/edited
      for (const item of updated) {
        const existing = events.find(e => e.id === item.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
          await saveEventToFirestore(item);
        }
      }
    } catch (e) {
      console.error("Error syncing events to Firestore:", e);
    }
  };

  const updateAttendeesState = async (updated: Attendee[]) => {
    setAttendees(updated);
    localStorage.setItem('ai_symposium_attendees', JSON.stringify(updated));

    try {
      const currentIds = new Set(updated.map(a => a.id));
      const deleted = attendees.filter(a => !currentIds.has(a.id));
      
      for (const d of deleted) {
        await deleteAttendeeFromFirestore(d.id);
      }

      for (const item of updated) {
        const existing = attendees.find(a => a.id === item.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
          await saveAttendeeToFirestore(item);
        }
      }
    } catch (e) {
      console.error("Error syncing attendees to Firestore:", e);
    }
  };

  // Auth Handles
  const handleLogin = (email: string, role: 'superadmin' | 'host' | 'registration', name: string, assignedEventId?: string) => {
    const normalized = normalizeEmail(email);
    const resolvedEventId = assignedEventId || MAP_EMAIL_TO_EVENT_ID[normalized] || '';
    setSession({ email: normalized, role, name, assignedEventId: resolvedEventId });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signOut error", e);
    }
    setSession(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="font-bold text-lg tracking-tight text-on-background">AItheronML Symposium OS</h3>
            <p className="text-xs text-on-surface-variant mt-1">Connecting to Firestore cloud database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="symposium-app-root" className="min-h-screen bg-background text-on-background selection:bg-primary/20">
      {!session ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (session.role === 'superadmin' || session.role === 'registration') ? (
        <AdminDashboard 
          user={session}
          events={events}
          attendees={attendees}
          onUpdateEvents={updateEventsState}
          onUpdateAttendees={updateAttendeesState}
          onLogout={handleLogout}
        />
      ) : (
        <HostDashboard 
          user={session}
          events={events}
          attendees={attendees}
          onUpdateEvents={updateEventsState}
          onUpdateAttendees={updateAttendeesState}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
