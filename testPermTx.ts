import { initializeApp } from 'firebase/app';
import { getFirestore, runTransaction, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const participantId = "CSM-000010"; // The one from screenshot
  const docRef = doc(db, 'participants', participantId);
  const eventRef = doc(db, 'events', 'paper_presentation');
  
  try {
    await runTransaction(db, async (transaction) => {
      console.log("Tx attempt start");
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        console.log(`Participant ${participantId} not found.`);
        return;
      }
      
      const eventSnap = await transaction.get(eventRef);
      
      transaction.update(docRef, { checked_in: true });
      
      if (eventSnap.exists()) {
        transaction.update(eventRef, { checkedInCount: 1 });
      } else {
        transaction.set(eventRef, { checkedInCount: 1 }, { merge: true });
      }
      console.log("Tx attempt end");
    });
    console.log("SUCCESS!");
  } catch(e) {
    console.error("FAIL:", e);
  }
}
test();
