import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { SymposiumEvent, Attendee, Team, Host, Judge, Result, Batch } from './types';
import { 
  INITIAL_EVENTS, 
  INITIAL_ATTENDEES
} from './initialData';

// Firestore collection names mapped exactly to the prompt instructions
const EVENTS_COL = 'events';
const PARTICIPANTS_COL = 'participants';
const TEAMS_COL = 'teams';
const HOSTS_COL = 'hosts';
const JUDGES_COL = 'judges';
const RESULTS_COL = 'results';

// Helper to recursively strip undefined properties before writing to Firestore
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    ) as any;
  }
  return obj;
}

// Global state tracking for Firestore Offline Support
export interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  connectionStatus: 'Online' | 'Offline';
}

let syncStatus: SyncStatus = {
  lastSyncTime: new Date().toLocaleTimeString(),
  pendingCount: 0,
  connectionStatus: 'Online'
};

// Check internet connection
if (typeof window !== 'undefined') {
  syncStatus.connectionStatus = navigator.onLine ? 'Online' : 'Offline';
  window.addEventListener('online', () => {
    syncStatus.connectionStatus = 'Online';
    triggerPendingSync();
  });
  window.addEventListener('offline', () => {
    syncStatus.connectionStatus = 'Offline';
  });
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

// Queue for pending sync operations
function getPendingOps(): any[] {
  try {
    const data = localStorage.getItem('pending_sync_ops');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePendingOps(ops: any[]) {
  try {
    localStorage.setItem('pending_sync_ops', JSON.stringify(ops));
    syncStatus.pendingCount = ops.length;
  } catch (e) {
    console.error('Failed to save pending ops to localStorage', e);
  }
}

export async function triggerPendingSync() {
  const ops = getPendingOps();
  if (ops.length === 0) return;
  
  console.log(`Attempting to sync ${ops.length} pending operations...`);
  const remainingOps: any[] = [];
  
  for (const op of ops) {
    try {
      if (op.type === 'save') {
        await setDoc(doc(db, op.collection, op.id), sanitizeForFirestore(op.data));
      } else if (op.type === 'delete') {
        await deleteDoc(doc(db, op.collection, op.id));
      }
    } catch (e) {
      console.warn(`Sync failed for doc ${op.id} in ${op.collection}, will retry later`, e);
      remainingOps.push(op);
    }
  }
  
  savePendingOps(remainingOps);
  syncStatus.lastSyncTime = new Date().toLocaleTimeString();
}

function queueSyncOperation(type: 'save' | 'delete', collectionName: string, id: string, data?: any) {
  const ops = getPendingOps();
  // Avoid duplicate operations for the same ID
  const filtered = ops.filter(op => !(op.id === id && op.collection === collectionName));
  filtered.push({ type, collection: collectionName, id, data, timestamp: Date.now() });
  savePendingOps(filtered);
}

// Seed helper
export async function seedDatabaseIfEmpty() {
  try {
    // 1. Seed Events if empty
    const eventsSnap = await getDocs(collection(db, EVENTS_COL));
    if (eventsSnap.empty) {
      console.log('Events collection is empty. Seeding events...');
      for (const ev of INITIAL_EVENTS) {
        await setDoc(doc(db, EVENTS_COL, ev.id), sanitizeForFirestore(ev));
      }
      console.log('Events successfully seeded.');
    }

    // 2. Seed Participants (Attendees) if empty
    const participantsSnap = await getDocs(collection(db, PARTICIPANTS_COL));
    if (participantsSnap.empty) {
      console.log('Participants collection is empty. Seeding participants...');
      for (const att of INITIAL_ATTENDEES) {
        await setDoc(doc(db, PARTICIPANTS_COL, att.id), sanitizeForFirestore(att));
      }
      console.log('Participants successfully seeded.');
    }
  } catch (error) {
    console.warn('Error seeding database independently:', error);
  }
}

// FETCH HELPER FUNCTIONS with robust localStorage caching fallback
export async function fetchEventsFromFirestore(): Promise<SymposiumEvent[]> {
  try {
    const snap = await getDocs(collection(db, EVENTS_COL));
    const list: SymposiumEvent[] = [];
    snap.forEach(docSnap => {
      if (docSnap.id !== 'registration_settings') {
        list.push(docSnap.data() as SymposiumEvent);
      }
    });
    
    if (list.length > 0) {
      localStorage.setItem('ai_symposium_events', JSON.stringify(list));
      syncStatus.lastSyncTime = new Date().toLocaleTimeString();
    }
    return list.length > 0 ? list : getCachedEvents();
  } catch (e) {
    console.warn('Failed to load events from Firestore, using offline cache', e);
    return getCachedEvents();
  }
}

function getCachedEvents(): SymposiumEvent[] {
  try {
    const data = localStorage.getItem('ai_symposium_events');
    return data ? JSON.parse(data) : INITIAL_EVENTS;
  } catch {
    return INITIAL_EVENTS;
  }
}

export async function fetchAttendeesFromFirestore(): Promise<Attendee[]> {
  try {
    const snap = await getDocs(collection(db, PARTICIPANTS_COL));
    const list: Attendee[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as Attendee);
    });
    
    if (list.length > 0) {
      localStorage.setItem('ai_symposium_attendees', JSON.stringify(list));
      syncStatus.lastSyncTime = new Date().toLocaleTimeString();
    }
    return list.length > 0 ? list : getCachedAttendees();
  } catch (e) {
    console.warn('Failed to load participants from Firestore, using offline cache', e);
    return getCachedAttendees();
  }
}

function getCachedAttendees(): Attendee[] {
  try {
    const data = localStorage.getItem('ai_symposium_attendees');
    return data ? JSON.parse(data) : INITIAL_ATTENDEES;
  } catch {
    return INITIAL_ATTENDEES;
  }
}

// SAVE/DELETE HELPERS with simultaneous Firestore write and Local fallback queue
export async function saveEventToFirestore(event: SymposiumEvent) {
  // Always update cache immediately
  const events = getCachedEvents();
  const index = events.findIndex(e => e.id === event.id);
  if (index >= 0) {
    events[index] = event;
  } else {
    events.push(event);
  }
  localStorage.setItem('ai_symposium_events', JSON.stringify(events));

  // Write to Firestore and handle connection failure
  try {
    await setDoc(doc(db, EVENTS_COL, event.id), sanitizeForFirestore(event));
    syncStatus.lastSyncTime = new Date().toLocaleTimeString();
  } catch (e) {
    console.warn(`Firestore save failed for event ${event.id}, queuing offline operation`, e);
    queueSyncOperation('save', EVENTS_COL, event.id, event);
  }
}

export async function deleteEventFromFirestore(id: string) {
  const events = getCachedEvents().filter(e => e.id !== id);
  localStorage.setItem('ai_symposium_events', JSON.stringify(events));

  try {
    await deleteDoc(doc(db, EVENTS_COL, id));
    syncStatus.lastSyncTime = new Date().toLocaleTimeString();
  } catch (e) {
    console.warn(`Firestore delete failed for event ${id}, queuing offline operation`, e);
    queueSyncOperation('delete', EVENTS_COL, id);
  }
}

export async function saveAttendeeToFirestore(attendee: Attendee) {
  const attendees = getCachedAttendees();
  const index = attendees.findIndex(a => a.id === attendee.id);
  if (index >= 0) {
    attendees[index] = attendee;
  } else {
    attendees.push(attendee);
  }
  localStorage.setItem('ai_symposium_attendees', JSON.stringify(attendees));

  try {
    await setDoc(doc(db, PARTICIPANTS_COL, attendee.id), sanitizeForFirestore(attendee));
    syncStatus.lastSyncTime = new Date().toLocaleTimeString();
  } catch (error: any) {
    console.warn(`Firestore save failed for participant ${attendee.id}, queuing offline operation`, error);
    queueSyncOperation('save', PARTICIPANTS_COL, attendee.id, attendee);
  }
}

export async function saveParticipantsWithAtomicIds(
  attendeeTemplates: Omit<Attendee, 'id' | 'participantId' | 'secureToken'>[],
  isSpot: boolean,
  createdBy: string = 'system'
): Promise<Attendee[]> {
  const counterRef = doc(db, 'counters', 'symposium');
  const count = attendeeTemplates.length;
  const createdAttendees: Attendee[] = [];

  // Helper for transaction retry with randomized exponential backoff
  const executeTransaction = async () => {
    let attempt = 0;
    const maxAttempts = 6;
    while (true) {
      try {
        await runTransaction(db, async (transaction) => {
          // Clear array on retry to prevent duplicates from failed attempts
          createdAttendees.length = 0;
          
          const counterSnap = await transaction.get(counterRef);
          let currentVal = 0;
          if (counterSnap.exists()) {
            const data = counterSnap.data();
            currentVal = data.currentValue || 0;
          }

          const nextVal = currentVal + count;

          // Prepare documents inside transaction
          for (let i = 0; i < count; i++) {
            const num = currentVal + 1 + i;
            const baseId = `CSM-${String(num).padStart(6, '0')}`;
            const finalId = isSpot ? `${baseId}-SPOT` : baseId;
            const template = attendeeTemplates[i] as any;

            const sharedTeamId = template.regType === 'team' ? finalId : '';
            const teamMembersDataForLeader: any[] = [];

            if (template.regType === 'team' && template._tempMembersInput) {
              template._tempMembersInput.forEach((m: any) => {
                teamMembersDataForLeader.push({
                  name: m.name.trim(),
                  phone: m.phone.trim(),
                  email: m.email.trim().toLowerCase(),
                  college: template.college,
                  branch: template.branch,
                  year: template.year,
                  participantId: finalId
                });
              });
            }

            const { _tempMembersInput, ...cleanTemplate } = template;

            const attendeeObj: Attendee = {
              ...cleanTemplate,
              id: finalId,
              participantId: finalId,
              teamId: sharedTeamId,
              teamMembers: template.regType === 'team' ? teamMembersDataForLeader : undefined,
              createdAt: template.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: createdBy,
              secureToken: `${baseId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
            } as Attendee;

            createdAttendees.push(attendeeObj);
          }

          // 1. Update the counter document
          transaction.set(counterRef, { currentValue: nextVal }, { merge: true });

          // 2. Set each participant document
          for (const att of createdAttendees) {
            const participantRef = doc(db, PARTICIPANTS_COL, att.id);
            transaction.set(participantRef, sanitizeForFirestore(att));
          }
        });
        
        return; // Success, exit retry loop
      } catch (err: any) {
        attempt++;
        const isContention = err.code === 'aborted' || 
                             err.code === 'resource-exhausted' || 
                             err.message?.includes('contention') || 
                             err.message?.includes('Resource exhausted');
        
        if (isContention && attempt < maxAttempts) {
          const delay = Math.random() * 400 + 100 * attempt;
          console.warn(`Transaction contention. Retrying attempt ${attempt}/${maxAttempts} in ${delay.toFixed(0)}ms...`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err; // Real error or max attempts exceeded
        }
      }
    }
  };

  try {
    // Try online transaction
    await executeTransaction();

    // Successfully committed to Firestore, now update local cache
    const cached = getCachedAttendees();
    for (const att of createdAttendees) {
      const idx = cached.findIndex(c => c.id === att.id);
      if (idx >= 0) {
        cached[idx] = att;
      } else {
        cached.push(att);
      }
    }
    localStorage.setItem('ai_symposium_attendees', JSON.stringify(cached));
    localStorage.setItem('ai_symposium_attendees_last_saved', JSON.stringify(cached));

    syncStatus.lastSyncTime = new Date().toLocaleTimeString();
    return createdAttendees;

  } catch (error: any) {
    const isNetworkError = (typeof navigator !== 'undefined' && !navigator.onLine) || 
                           error.code === 'unavailable' || 
                           error.code === 'failed-precondition' ||
                           error.message?.includes('offline');

    if (isNetworkError) {
      console.warn("Firestore transaction failed because the client is offline. Falling back to local ID generation.", error);

      // Fallback: Client-side generation using local state
      const cachedAttendees = getCachedAttendees();
      let nextNum = 1;
      if (cachedAttendees.length > 0) {
        const symIds = cachedAttendees.map(a => {
          const cleanId = (a.participantId || a.id || '').replace('-SPOT', '');
          const m = cleanId.match(/^(?:SYM|CSM)-(\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        });
        const maxId = Math.max(...symIds, 0);
        nextNum = maxId + 1;
      }

      const localAttendees: Attendee[] = [];
      for (let i = 0; i < count; i++) {
        const num = nextNum + i;
        const baseId = `CSM-${String(num).padStart(6, '0')}`;
        const finalId = isSpot ? `${baseId}-SPOT` : baseId;
        const template = attendeeTemplates[i] as any;

        const sharedTeamId = template.regType === 'team' ? finalId : '';
        const teamMembersDataForLeader: any[] = [];

        if (template.regType === 'team' && template._tempMembersInput) {
          template._tempMembersInput.forEach((m: any) => {
            teamMembersDataForLeader.push({
              name: m.name.trim(),
              phone: m.phone.trim(),
              email: m.email.trim().toLowerCase(),
              college: template.college,
              branch: template.branch,
              year: template.year,
              participantId: finalId
            });
          });
        }

        const { _tempMembersInput, ...cleanTemplate } = template;

        const attendeeObj: Attendee = {
          ...cleanTemplate,
          id: finalId,
          participantId: finalId,
          teamId: sharedTeamId,
          teamMembers: template.regType === 'team' ? teamMembersDataForLeader : undefined,
          createdAt: template.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: createdBy,
          secureToken: `${baseId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        } as Attendee;

        localAttendees.push(attendeeObj);
      }

      // Update local cache
      for (const att of localAttendees) {
        cachedAttendees.push(att);
      }
      localStorage.setItem('ai_symposium_attendees', JSON.stringify(cachedAttendees));

      // Queue offline sync operations for each fallback attendee
      for (const att of localAttendees) {
        queueSyncOperation('save', PARTICIPANTS_COL, att.id, att);
      }

      return localAttendees;
    } else {
      console.error("Firestore transaction failed due to write collision or database error. Aborting.", error);
      throw error; // Propagate to let the UI display failure & allow retry
    }
  }
}

export async function deleteAttendeeFromFirestore(id: string) {
  const attendees = getCachedAttendees().filter(a => a.id !== id);
  localStorage.setItem('ai_symposium_attendees', JSON.stringify(attendees));

  try {
    await deleteDoc(doc(db, PARTICIPANTS_COL, id));
    syncStatus.lastSyncTime = new Date().toLocaleTimeString();
  } catch (e) {
    console.warn(`Firestore delete failed for participant ${id}, queuing offline operation`, e);
    queueSyncOperation('delete', PARTICIPANTS_COL, id);
  }
}

// ----------------------------------------------------------------------
// NEW COLLECTIONS HELPERS: Teams, Hosts, Judges, Results, Batches
// ----------------------------------------------------------------------

const BATCHES_COL = 'batches';

export async function fetchBatches(): Promise<Batch[]> {
  try {
    const snap = await getDocs(collection(db, BATCHES_COL));
    const list: Batch[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Batch));
    localStorage.setItem('ai_symposium_batches', JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn('Failed to load batches from Firestore, using offline cache', e);
    const data = localStorage.getItem('ai_symposium_batches');
    return data ? JSON.parse(data) : [];
  }
}

export async function saveBatchToFirestore(batch: Batch) {
  try {
    const cached = localStorage.getItem('ai_symposium_batches');
    const list: Batch[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(b => b.id === batch.id);
    if (idx >= 0) {
      list[idx] = batch;
    } else {
      list.push(batch);
    }
    localStorage.setItem('ai_symposium_batches', JSON.stringify(list));
  } catch (err) {
    console.error('Error saving batch to cache', err);
  }

  try {
    await setDoc(doc(db, BATCHES_COL, batch.id), sanitizeForFirestore(batch));
  } catch (e) {
    console.warn(`Firestore save failed for batch ${batch.id}, queuing offline operation`, e);
    queueSyncOperation('save', BATCHES_COL, batch.id, batch);
  }
}

export async function deleteBatchFromFirestore(id: string) {
  try {
    const cached = localStorage.getItem('ai_symposium_batches');
    const list: Batch[] = cached ? JSON.parse(cached) : [];
    const updated = list.filter(b => b.id !== id);
    localStorage.setItem('ai_symposium_batches', JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting batch from cache', err);
  }

  try {
    await deleteDoc(doc(db, BATCHES_COL, id));
  } catch (e) {
    console.warn(`Firestore delete failed for batch ${id}, queuing offline operation`, e);
    queueSyncOperation('delete', BATCHES_COL, id);
  }
}

export async function fetchTeams(): Promise<Team[]> {
  try {
    const snap = await getDocs(collection(db, TEAMS_COL));
    const list: Team[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Team));
    localStorage.setItem('ai_symposium_teams', JSON.stringify(list));
    return list;
  } catch {
    const data = localStorage.getItem('ai_symposium_teams');
    return data ? JSON.parse(data) : [];
  }
}

export async function saveTeam(team: Team) {
  try {
    await setDoc(doc(db, TEAMS_COL, team.teamId), sanitizeForFirestore(team));
  } catch {
    queueSyncOperation('save', TEAMS_COL, team.teamId, team);
  }
}

export async function fetchHosts(): Promise<Host[]> {
  try {
    const snap = await getDocs(collection(db, HOSTS_COL));
    const list: Host[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Host));
    localStorage.setItem('ai_symposium_hosts', JSON.stringify(list));
    return list;
  } catch {
    const data = localStorage.getItem('ai_symposium_hosts');
    return data ? JSON.parse(data) : [];
  }
}

export async function saveHost(host: Host) {
  try {
    await setDoc(doc(db, HOSTS_COL, host.hostId), sanitizeForFirestore(host));
  } catch {
    queueSyncOperation('save', HOSTS_COL, host.hostId, host);
  }
}

export async function fetchJudges(): Promise<Judge[]> {
  try {
    const snap = await getDocs(collection(db, JUDGES_COL));
    const list: Judge[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Judge));
    localStorage.setItem('ai_symposium_judges', JSON.stringify(list));
    return list;
  } catch {
    const data = localStorage.getItem('ai_symposium_judges');
    return data ? JSON.parse(data) : [];
  }
}

export async function saveJudge(judge: Judge) {
  try {
    await setDoc(doc(db, JUDGES_COL, judge.judgeId), sanitizeForFirestore(judge));
  } catch {
    queueSyncOperation('save', JUDGES_COL, judge.judgeId, judge);
  }
}

export async function fetchResults(): Promise<Result[]> {
  try {
    const snap = await getDocs(collection(db, RESULTS_COL));
    const list: Result[] = [];
    snap.forEach(docSnap => list.push(docSnap.data() as Result));
    localStorage.setItem('ai_symposium_results', JSON.stringify(list));
    return list;
  } catch {
    const data = localStorage.getItem('ai_symposium_results');
    return data ? JSON.parse(data) : [];
  }
}

export async function saveResult(result: Result) {
  try {
    await setDoc(doc(db, RESULTS_COL, result.resultId), sanitizeForFirestore(result));
  } catch {
    queueSyncOperation('save', RESULTS_COL, result.resultId, result);
  }
}

// Mock functions to prevent any compiler errors in references to old functions
export async function fetchSpeakersFromFirestore(): Promise<any[]> { return []; }
export async function fetchSubmissionsFromFirestore(): Promise<any[]> { return []; }
export async function saveSpeakerToFirestore(sp: any) {}
export async function deleteSpeakerFromFirestore(id: string) {}
export async function saveSubmissionToFirestore(sub: any) {}
export async function deleteSubmissionFromFirestore(id: string) {}

export async function clearAllRegistrationsAndReset() {
  console.log('Starting full database reset to start from first registration...');

  // 1. Delete all participants in Firestore
  try {
    const participantsSnap = await getDocs(collection(db, PARTICIPANTS_COL));
    for (const docSnap of participantsSnap.docs) {
      await deleteDoc(doc(db, PARTICIPANTS_COL, docSnap.id));
    }
    console.log('Firestore participants collection successfully cleared.');
  } catch (err) {
    console.error('Error clearing participants collection:', err);
  }

  // 2. Delete all batches in Firestore
  try {
    const batchesSnap = await getDocs(collection(db, BATCHES_COL));
    for (const docSnap of batchesSnap.docs) {
      await deleteDoc(doc(db, BATCHES_COL, docSnap.id));
    }
    console.log('Firestore batches collection successfully cleared.');
  } catch (err) {
    console.error('Error clearing batches collection:', err);
  }

  // 3. Delete all results/scores in Firestore
  try {
    const resultsSnap = await getDocs(collection(db, RESULTS_COL));
    for (const docSnap of resultsSnap.docs) {
      await deleteDoc(doc(db, RESULTS_COL, docSnap.id));
    }
    console.log('Firestore results collection successfully cleared.');
  } catch (err) {
    console.error('Error clearing results collection:', err);
  }

  // 4. Overwrite events in Firestore with pristine versions
  try {
    for (const ev of INITIAL_EVENTS) {
      await setDoc(doc(db, EVENTS_COL, ev.id), sanitizeForFirestore(ev));
    }
    console.log('Firestore events collection successfully reset to initial states.');
  } catch (err) {
    console.error('Error resetting events in Firestore:', err);
  }

  // 5. Clear localStorage
  try {
    localStorage.setItem('ai_symposium_attendees', JSON.stringify([]));
    localStorage.setItem('ai_symposium_attendees_last_saved', JSON.stringify([]));
    localStorage.setItem('ai_symposium_batches', JSON.stringify([]));
    localStorage.setItem('ai_symposium_events', JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem('ai_symposium_events_last_saved', JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem('ai_symposium_results', JSON.stringify([]));
    localStorage.removeItem('pending_sync_ops');
    console.log('Local storage caches successfully cleared.');
  } catch (err) {
    console.error('Error clearing localStorage caches:', err);
  }

  // 6. Reset Firestore sequential ID counter to 0
  try {
    const counterRef = doc(db, 'counters', 'symposium');
    await setDoc(counterRef, { currentValue: 0 });
    console.log('Firestore sequential ID counter successfully reset to 0.');
  } catch (err) {
    console.error('Error resetting sequential ID counter:', err);
  }
}

/**
 * Executes an atomic transaction to check in a participant (Activate Pass).
 * If already checked in, aborts the transaction and returns details.
 */
export async function checkInParticipantTransaction(participantId: string): Promise<{
  success: boolean;
  message: string;
  name?: string;
  id?: string;
  timestamp?: string;
}> {
  const docRef = doc(db, 'participants', participantId);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Participant with ID ${participantId} not found.`);
      }
      
      const data = docSnap.data() as Attendee;
      if (data.checked_in) {
        // Abort check-in since they are already checked in
        const existingTime = data.checked_in_at || data.checkedInAt || new Date().toISOString();
        return {
          success: false,
          message: "Participant already checked in.",
          name: data.name,
          id: participantId,
          timestamp: existingTime
        };
      }

      const timestampValue = new Date().toISOString();
      transaction.update(docRef, {
        checked_in: true,
        checked_in_at: serverTimestamp(),
        checkedInAt: timestampValue, // local sync fallback
        attendanceStatus: 'Present',
        lunch_status: 'AVAILABLE'
      });

      return {
        success: true,
        message: "Pass Activated successfully!",
        name: data.name,
        id: participantId,
        timestamp: timestampValue
      };
    });
    return result;
  } catch (err: any) {
    console.error("Check-in transaction error:", err);
    return {
      success: false,
      message: err.message || "Transaction failed. Please try again."
    };
  }
}

/**
 * Executes an atomic transaction to redeem food for a participant.
 * Aborts if not checked in or already redeemed.
 */
export async function redeemFoodTransaction(participantId: string): Promise<{
  success: boolean;
  message: string;
  name?: string;
  id?: string;
  timestamp?: string;
}> {
  const docRef = doc(db, 'participants', participantId);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Participant with ID ${participantId} not found.`);
      }

      const data = docSnap.data() as Attendee;
      
      // 1. Must be checked in first
      if (!data.checked_in && data.attendanceStatus !== 'Present') {
        return {
          success: false,
          message: "Participant has not checked in.",
          name: data.name,
          id: participantId
        };
      }

      // 2. Can only redeem food once
      if (data.lunch_status === 'REDEEMED') {
        const existingTime = data.lunch_redeemed_at || new Date().toISOString();
        return {
          success: false,
          message: "Food Already Redeemed.",
          name: data.name,
          id: participantId,
          timestamp: existingTime
        };
      }

      const timestampValue = new Date().toISOString();
      transaction.update(docRef, {
        lunch_status: 'REDEEMED',
        lunch_redeemed_at: serverTimestamp(),
        // Local timestamp update for reactive client-side rendering
        remarks: data.remarks ? `${data.remarks} (Food served)` : 'Food served'
      });

      return {
        success: true,
        message: "Food served successfully!",
        name: data.name,
        id: participantId,
        timestamp: timestampValue
      };
    });
    return result;
  } catch (err: any) {
    console.error("Food redemption transaction error:", err);
    return {
      success: false,
      message: err.message || "Transaction failed. Please try again."
    };
  }
}

/**
 * Saves the global registration status (open/closed) in Firestore
 */
export async function saveRegistrationStatus(open: boolean): Promise<void> {
  const docRef = doc(db, 'events', 'registration_settings');
  await setDoc(docRef, { registrationOpen: open }, { merge: true });
}

/**
 * Subscribes to the global registration status from Firestore
 */
import { onSnapshot } from 'firebase/firestore';
export function subscribeToRegistrationStatus(callback: (open: boolean) => void): () => void {
  const docRef = doc(db, 'events', 'registration_settings');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().registrationOpen !== false);
    } else {
      callback(true); // default to open
    }
  }, (err) => {
    console.warn("Failed to subscribe to registration status, defaulting to open", err);
  });
}

/**
 * Executes an atomic transaction to check in a participant by an Event Host.
 * Validates that the participant belongs to the host's event.
 */
export async function hostCheckInParticipantTransaction(participantId: string, hostEventId: string): Promise<{
  success: boolean;
  message: string;
  name?: string;
  id?: string;
  timestamp?: string;
}> {
  const docRef = doc(db, 'participants', participantId);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Participant with ID ${participantId} not found.`);
      }
      
      const data = docSnap.data() as Attendee;
      
      // Verify Event Match
      const participantEventId = data.registeredEventId || data.eventId;
      if (participantEventId !== hostEventId) {
        throw new Error("EVENT_MISMATCH");
      }

      if (data.checked_in) {
        const existingTime = data.checked_in_at || data.checkedInAt || new Date().toISOString();
        return {
          success: false,
          message: "Participant Already Checked In.",
          name: data.name,
          id: participantId,
          timestamp: existingTime
        };
      }

      const timestampValue = new Date().toISOString();
      transaction.update(docRef, {
        checked_in: true,
        checked_in_at: serverTimestamp(),
        checkedInAt: timestampValue,
        attendanceStatus: 'Present'
      });

      return {
        success: true,
        message: "Participant checked in successfully!",
        name: data.name,
        id: participantId,
        timestamp: timestampValue
      };
    });
    return result;
  } catch (err: any) {
    if (err.message === "EVENT_MISMATCH") {
      return {
        success: false,
        message: "This participant is not registered for this event."
      };
    }
    console.error("Host Check-in transaction error:", err);
    return {
      success: false,
      message: err.message || "Transaction failed. Please try again."
    };
  }
}

/**
 * Executes an atomic transaction to manually update payment status.
 */
export async function updatePaymentStatusTransaction(participantId: string, status: 'Paid' | 'Pending' | 'Waived'): Promise<{
  success: boolean;
  message: string;
}> {
  const docRef = doc(db, 'participants', participantId);
  try {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Participant with ID ${participantId} not found.`);
      }
      
      transaction.update(docRef, {
        paymentStatus: status
      });
    });
    return {
      success: true,
      message: `Payment status updated to ${status}`
    };
  } catch (err: any) {
    console.error("Payment status transaction error:", err);
    return {
      success: false,
      message: err.message || "Failed to update payment status."
    };
  }
}
