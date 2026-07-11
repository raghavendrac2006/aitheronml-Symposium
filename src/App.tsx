import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import HostDashboard from './components/HostDashboard';
import PublicRegistration from './components/PublicRegistration';
import RegistrationSuccess from './components/RegistrationSuccess';
import { SymposiumEvent, Attendee, UserSession, MAP_EMAIL_TO_EVENT_ID, MAP_EMAIL_TO_NAME, normalizeEmail, Batch } from './types';
import { 
  INITIAL_EVENTS, 
  INITIAL_ATTENDEES
} from './initialData';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { 
  seedDatabaseIfEmpty,
  fetchEventsFromFirestore,
  fetchAttendeesFromFirestore,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveAttendeeToFirestore,
  deleteAttendeeFromFirestore,
  fetchBatches,
  saveBatchToFirestore,
  deleteBatchFromFirestore,
  triggerPendingSync,
  clearAllRegistrationsAndReset
} from './firebaseSync';

const MAPPED_EVENT_IDS: Record<string, string> = {
  'ev-1': 'paper_presentation',
  'ev-2': 'poster_presentation',
  'ev-4': 'photography',
  'ev-5': 'treasure_hunt',
};

function migrateAttendee(a: Attendee): Attendee {
  if (MAPPED_EVENT_IDS[a.eventId]) {
    a = { ...a, eventId: MAPPED_EVENT_IDS[a.eventId] };
  }
  if (MAPPED_EVENT_IDS[a.registeredEventId]) {
    a = { ...a, registeredEventId: MAPPED_EVENT_IDS[a.registeredEventId] };
  }
  return a;
}

export const ROUTE_TO_EVENT_ID: Record<string, string> = {
  '/paperpresentation': 'paper_presentation',
  '/posterpresentation': 'poster_presentation',
  '/vibecoding': 'vibe_coding',
  '/projectexpo': 'project_expo',
  '/photography': 'photography',
  '/treasurehunt': 'treasure_hunt',
  '/freefire': 'free_fire',
  '/dumbcharades': 'dumb_charades',
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isPublicReg = searchParams.get('mode') === 'register' || searchParams.get('register') === 'true';

  // Session State
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicRegSuccessAttendee, setPublicRegSuccessAttendee] = useState<Attendee | null>(null);

  // Core Data States
  const [events, setEvents] = useState<SymposiumEvent[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);



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

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Initialize and load persistent state from Firestore & Auth on session change
  useEffect(() => {
    // Real-time Firestore Listeners
    let unsubscribeEvents = () => {};
    let unsubscribeAttendees = () => {};
    let unsubscribeBatches = () => {};

    async function initRealtimeData() {
      function subscribeWithRetry(
        colName: string,
        onData: (snapshot: any) => void,
        onError: (error: any) => void
      ): () => void {
        let active = true;
        let unsubscribe = () => {};
        const retryDelay = 5000;

        const start = () => {
          if (!active) return;
          try {
            unsubscribe = onSnapshot(collection(db, colName), (snapshot) => {
              if (active) onData(snapshot);
            }, (error) => {
              if (active) {
                onError(error);
                console.warn(`Firestore onSnapshot failed for collection '${colName}'. Retrying subscription in ${retryDelay}ms...`, error);
                setTimeout(start, retryDelay);
              }
            });
          } catch (err) {
            if (active) {
              onError(err);
              console.warn(`Firestore collection listener setup failed for '${colName}'. Retrying in ${retryDelay}ms...`, err);
              setTimeout(start, retryDelay);
            }
          }
        };

        start();
        return () => {
          active = false;
          unsubscribe();
        };
      }

      try {
        if (localStorage.getItem('ai_symposium_has_reset_first_time_v2') !== 'true') {
          await clearAllRegistrationsAndReset();
          localStorage.setItem('ai_symposium_has_reset_first_time_v2', 'true');
        }
        await triggerPendingSync();
        await seedDatabaseIfEmpty();

        // A. Listen to Events
        unsubscribeEvents = subscribeWithRetry('events', (snapshot) => {
          const fbEvents: SymposiumEvent[] = [];
          snapshot.forEach((docSnap) => {
            fbEvents.push(docSnap.data() as SymposiumEvent);
          });
          
          // Filter to only include official events
          const initialEventIds = new Set(INITIAL_EVENTS.map(e => e.id));
          const fbEventsFiltered = fbEvents.filter(e => initialEventIds.has(e.id));
          
          let finalEvents = fbEventsFiltered.length > 0 ? fbEventsFiltered : INITIAL_EVENTS;
          const fbEventIds = new Set(finalEvents.map(e => e.id));
          const missingInitialEvents = INITIAL_EVENTS.filter(e => !fbEventIds.has(e.id));
          if (missingInitialEvents.length > 0) {
            finalEvents = [...finalEvents, ...missingInitialEvents];
          }
          setEvents(finalEvents);
          localStorage.setItem('ai_symposium_events', JSON.stringify(finalEvents));
          setIsLoading(false);
        }, (error) => {
          console.error("Firestore onSnapshot error for events, falling back to cache:", error);
          const storedEvents = localStorage.getItem('ai_symposium_events');
          const parsedEvents = storedEvents ? JSON.parse(storedEvents) : INITIAL_EVENTS;
          const initialEventIds = new Set(INITIAL_EVENTS.map(e => e.id));
          const filteredEvents = parsedEvents.filter((e: any) => initialEventIds.has(e.id));
          setEvents(filteredEvents.length > 0 ? filteredEvents : INITIAL_EVENTS);
          setIsLoading(false);
        });

        // B. Listen to Participants (Attendees)
        unsubscribeAttendees = subscribeWithRetry('participants', (snapshot) => {


          const fbAttendees: Attendee[] = [];
          snapshot.forEach((docSnap) => {
            fbAttendees.push(docSnap.data() as Attendee);
          });
          
          let finalAttendees = fbAttendees.length > 0 ? fbAttendees : INITIAL_ATTENDEES;
          const fbAttendeeIds = new Set(finalAttendees.map(a => a.id));
          const missingInitialAttendees = INITIAL_ATTENDEES.filter(a => !fbAttendeeIds.has(a.id));
          if (missingInitialAttendees.length > 0) {
            finalAttendees = [...finalAttendees, ...missingInitialAttendees];
          }

          const migrated = finalAttendees.map(migrateAttendee);


          setAttendees(migrated);
          localStorage.setItem('ai_symposium_attendees', JSON.stringify(migrated));
          localStorage.setItem('ai_symposium_attendees_last_saved', JSON.stringify(migrated));
          setIsLoading(false);
        }, (error) => {
          console.error("Firestore onSnapshot error for participants, falling back to cache:", error);
          const storedAttendees = localStorage.getItem('ai_symposium_attendees');
          let finalStoredAttendees = storedAttendees ? JSON.parse(storedAttendees) : INITIAL_ATTENDEES;
          const storedAttendeeIds = new Set(finalStoredAttendees.map((a: any) => a.id));
          const missingInitialAttendees = INITIAL_ATTENDEES.filter(a => !storedAttendeeIds.has(a.id));
          if (missingInitialAttendees.length > 0) {
            finalStoredAttendees = [...finalStoredAttendees, ...missingInitialAttendees];
          }
          const migrated = finalStoredAttendees.map(migrateAttendee);
          setAttendees(migrated);
          setIsLoading(false);
        });

        // C. Listen to Batches
        unsubscribeBatches = subscribeWithRetry('batches', (snapshot) => {
          const fbBatches: Batch[] = [];
          snapshot.forEach((docSnap) => {
            fbBatches.push(docSnap.data() as Batch);
          });
          setBatches(fbBatches);
          localStorage.setItem('ai_symposium_batches', JSON.stringify(fbBatches));
          setIsLoading(false);
        }, (error) => {
          console.error("Firestore onSnapshot error for batches, falling back to cache:", error);
          const storedBatches = localStorage.getItem('ai_symposium_batches');
          setBatches(storedBatches ? JSON.parse(storedBatches) : []);
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Failed to load data from Firestore, falling back to cache", error);
        
        // Cache Fallbacks
        const storedEvents = localStorage.getItem('ai_symposium_events');
        const parsedEvents = storedEvents ? JSON.parse(storedEvents) : INITIAL_EVENTS;
        const initialEventIds = new Set(INITIAL_EVENTS.map(e => e.id));
        const filteredEvents = parsedEvents.filter((e: any) => initialEventIds.has(e.id));
        setEvents(filteredEvents.length > 0 ? filteredEvents : INITIAL_EVENTS);

        const storedAttendees = localStorage.getItem('ai_symposium_attendees');
        let finalStoredAttendees = storedAttendees ? JSON.parse(storedAttendees) : INITIAL_ATTENDEES;
        const storedAttendeeIds = new Set(finalStoredAttendees.map((a: any) => a.id));
        const missingInitialAttendees = INITIAL_ATTENDEES.filter(a => !storedAttendeeIds.has(a.id));
        if (missingInitialAttendees.length > 0) {
          finalStoredAttendees = [...finalStoredAttendees, ...missingInitialAttendees];
        }
        const migrated = finalStoredAttendees.map(migrateAttendee);
        setAttendees(migrated);

        const storedBatches = localStorage.getItem('ai_symposium_batches');
        setBatches(storedBatches ? JSON.parse(storedBatches) : []);
        setIsLoading(false);
      }
    }

    initRealtimeData();

    return () => {
      unsubscribeEvents();
      unsubscribeAttendees();
      unsubscribeBatches();
    };
  }, [session?.email]);

  // Sync state modifications dynamically to Firestore
  const updateEventsState = async (updated: SymposiumEvent[]) => {
    // Optimistic UI state
    setEvents(updated);
    localStorage.setItem('ai_symposium_events', JSON.stringify(updated));

    try {
      // Robust offline-safe dirty checking using a persistent cached state to avoid stale React closures
      const cached = localStorage.getItem('ai_symposium_events_last_saved');
      const lastSaved: SymposiumEvent[] = cached ? JSON.parse(cached) : [];
      
      for (const item of updated) {
        const existing = lastSaved.find(e => e.id === item.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
          await saveEventToFirestore(item);
        }
      }
      localStorage.setItem('ai_symposium_events_last_saved', JSON.stringify(updated));
    } catch (e) {
      console.error("Error syncing events to Firestore:", e);
    }
  };

  const updateAttendeesState = async (updated: Attendee[]) => {
    setAttendees(updated);
    localStorage.setItem('ai_symposium_attendees', JSON.stringify(updated));

    try {
      // Robust offline-safe dirty checking using a persistent cached state to avoid stale React closures
      const cached = localStorage.getItem('ai_symposium_attendees_last_saved');
      const lastSaved: Attendee[] = cached ? JSON.parse(cached) : [];
      
      for (const item of updated) {
        const existing = lastSaved.find(a => a.id === item.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
          await saveAttendeeToFirestore(item);
        }
      }
      localStorage.setItem('ai_symposium_attendees_last_saved', JSON.stringify(updated));
    } catch (e) {
      console.error("Error syncing attendees to Firestore:", e);
    }
  };

  const handleSaveBatch = async (batch: Batch) => {
    setBatches(prev => {
      const updated = [...prev];
      const index = updated.findIndex(b => b.id === batch.id);
      if (index >= 0) {
        updated[index] = batch;
      } else {
        updated.push(batch);
      }
      localStorage.setItem('ai_symposium_batches', JSON.stringify(updated));
      return updated;
    });
    await saveBatchToFirestore(batch);
  };

  const handleDeleteBatch = async (id: string) => {
    const updated = batches.filter(b => b.id !== id);
    setBatches(updated);
    localStorage.setItem('ai_symposium_batches', JSON.stringify(updated));
    await deleteBatchFromFirestore(id);
  };

  // Auth Handles
  const handleLogin = (email: string, role: 'superadmin' | 'host' | 'registration', name: string, assignedEventId?: string) => {
    const normalized = normalizeEmail(email);
    const resolvedEventId = assignedEventId || MAP_EMAIL_TO_EVENT_ID[normalized] || '';
    const userSession: UserSession = { email: normalized, role, name, assignedEventId: resolvedEventId };
    setSession(userSession);
    
    // Redirect on login
    if (role === 'superadmin') {
      navigate('/admin', { replace: true });
    } else if (role === 'registration') {
      navigate('/registration', { replace: true });
    } else if (role === 'host') {
      const eventRoute = Object.keys(ROUTE_TO_EVENT_ID).find(
        key => ROUTE_TO_EVENT_ID[key] === resolvedEventId
      );
      if (eventRoute) {
        navigate(eventRoute, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signOut error", e);
    }
    setSession(null);
    navigate('/login', { replace: true });
  };

  // Protective Route Checks
  const requireAdmin = (element: React.ReactNode) => {
    if (!session) return <Navigate to="/login" replace />;
    if (session.role !== 'superadmin') return <Navigate to="/login" replace />;
    return element;
  };

  const requireRegistration = (element: React.ReactNode) => {
    if (!session) return <Navigate to="/login" replace />;
    if (session.role !== 'registration') return <Navigate to="/login" replace />;
    return element;
  };

  const requireHost = (eventId: string, element: React.ReactNode) => {
    if (!session) return <Navigate to="/login" replace />;
    if (session.role !== 'host') return <Navigate to="/login" replace />;
    if (session.assignedEventId !== eventId) return <Navigate to="/login" replace />;
    return element;
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

  // Handle Public Registration Flow (e.g. ?mode=register)
  if (isPublicReg) {
    return (
      <div id="symposium-app-root" className="min-h-screen bg-background text-on-background selection:bg-primary/20">
        <div className="min-h-screen bg-background text-on-background w-full">
          {publicRegSuccessAttendee ? (
            <RegistrationSuccess
              attendee={publicRegSuccessAttendee}
              onReturnHome={() => {
                setPublicRegSuccessAttendee(null);
              }}
              isSpotSuccess={false}
            />
          ) : (
            <PublicRegistration 
              events={events}
              attendees={attendees}
              isSpotRegistration={false}
              hideAdminSignIn={true}
              onRegistrationSuccess={(newAtt, extra) => {
                const allNew = [newAtt, ...(extra || [])];
                updateAttendeesState([...attendees, ...allNew]);
                updateEventsState(events.map(ev => ev.id === newAtt.registeredEventId ? { ...ev, registeredCount: ev.registeredCount + allNew.length } : ev));
                setPublicRegSuccessAttendee(newAtt);
              }}
              onBackToLogin={() => {}}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="symposium-app-root" className="min-h-screen bg-background text-on-background selection:bg-primary/20">
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginScreen onLogin={handleLogin} />} />
        
        <Route path="/admin" element={requireAdmin(
          <AdminDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        )} />

        <Route path="/registration" element={requireRegistration(
          <AdminDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        )} />

        <Route path="/paperpresentation" element={requireHost('paper_presentation', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/posterpresentation" element={requireHost('poster_presentation', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/vibecoding" element={requireHost('vibe_coding', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/projectexpo" element={requireHost('project_expo', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/photography" element={requireHost('photography', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/treasurehunt" element={requireHost('treasure_hunt', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/freefire" element={requireHost('free_fire', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        <Route path="/dumbcharades" element={requireHost('dumb_charades', (
          <HostDashboard 
            user={session!}
            events={events}
            attendees={attendees}
            batches={batches}
            onUpdateEvents={updateEventsState}
            onUpdateAttendees={updateAttendeesState}
            onSaveBatch={handleSaveBatch}
            onDeleteBatch={handleDeleteBatch}
            onLogout={handleLogout}
          />
        ))} />

        {/* Fallback route `/` redirects based on session */}
        <Route path="/" element={
          session ? (
            session.role === 'superadmin' ? <Navigate to="/admin" replace /> :
            session.role === 'registration' ? <Navigate to="/registration" replace /> :
            <Navigate to={Object.keys(ROUTE_TO_EVENT_ID).find(k => ROUTE_TO_EVENT_ID[k] === session.assignedEventId) || "/login"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* Catch-all redirects to `/` */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}


