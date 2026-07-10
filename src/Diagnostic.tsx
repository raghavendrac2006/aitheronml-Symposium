import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot } from './firebase';

export default function Diagnostic() {
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string>('Never');
  const [connectionState, setConnectionState] = useState<'Online' | 'Offline' | 'Connecting'>('Connecting');
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    console.log(`[Diagnostic] [${new Date().toISOString()}] Initializing Firestore participants listener...`);
    setConnectionState('Connecting');

    const unsubscribe = onSnapshot(
      collection(db, 'participants'),
      (snapshot) => {
        const list: { id: string; name: string }[] = [];
        const now = new Date().toISOString();
        console.log(`[Diagnostic] [${now}] Snapshot Received. Metadata fromCache = ${snapshot.metadata.fromCache}, hasPendingWrites = ${snapshot.metadata.hasPendingWrites}`);
        
        setConnectionState(snapshot.metadata.fromCache ? 'Offline' : 'Online');
        setLastSnapshotTime(new Date().toLocaleTimeString());

        snapshot.docChanges().forEach((change) => {
          const docData = change.doc.data();
          const docId = change.doc.id;
          const timestamp = new Date().toISOString();
          
          if (change.type === 'added') {
            console.log(`[Diagnostic] [${timestamp}] Document Added: ID = ${docId}, Name = ${docData.name}`);
          } else if (change.type === 'modified') {
            console.log(`[Diagnostic] [${timestamp}] Document Modified: ID = ${docId}, Name = ${docData.name}`);
          } else if (change.type === 'removed') {
            console.log(`[Diagnostic] [${timestamp}] Document Removed: ID = ${docId}`);
          }
        });

        snapshot.forEach((doc) => {
          list.push({ id: doc.id, name: doc.data().name || 'Unknown' });
        });

        setParticipants(list);
        setTotalCount(list.length);
      },
      (error) => {
        const timestamp = new Date().toISOString();
        console.error(`[Diagnostic] [${timestamp}] Listener Encountered Error:`, error);
        setConnectionState('Offline');
      }
    );

    // Monitor Firebase Auth connection state as a proxy for network
    const handleOnline = () => {
      console.log(`[Diagnostic] [${new Date().toISOString()}] Browser Connection Restored (Online)`);
    };
    const handleOffline = () => {
      console.log(`[Diagnostic] [${new Date().toISOString()}] Browser Connection Lost (Offline)`);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      console.log(`[Diagnostic] [${new Date().toISOString()}] Unsubscribing from Firestore listener...`);
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', maxWidth: '600px', margin: '0 auto', color: '#1e293b' }}>
      <h2>Firestore Synchronization Diagnostic</h2>
      <hr />
      <div style={{ margin: '16px 0', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <p><strong>Total Participants:</strong> {totalCount}</p>
        <p><strong>Connection State:</strong> {connectionState}</p>
        <p><strong>Last Snapshot Received:</strong> {lastSnapshotTime}</p>
      </div>
      
      <h3>Participants List</h3>
      <ul style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
        {participants.length === 0 ? (
          <li>No participants found.</li>
        ) : (
          participants.map(p => (
            <li key={p.id} style={{ margin: '4px 0' }}>
              [{p.id}] - {p.name}
            </li>
          ))
        )}
      </ul>
      <p style={{ fontSize: '11px', color: '#64748b' }}>
        * Check browser console logs (F12) to inspect detailed, timestamped events for synchronization lag analysis.
      </p>
    </div>
  );
}
