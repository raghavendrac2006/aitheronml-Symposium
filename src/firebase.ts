import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCgNmG5ow8j1QCXrPbrVH9bWpQ2Y29NBCU",
  authDomain: "aitheronml-symposium.firebaseapp.com",
  projectId: "aitheronml-symposium",
  storageBucket: "aitheronml-symposium.firebasestorage.app",
  messagingSenderId: "1062987952781",
  appId: "1:1062987952781:web:a0d4adc7fe11d6c90ee8c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});
export const auth = getAuth(app);
setPersistence(auth, inMemoryPersistence).catch(console.error);

// Helper functions for common collection operations
export { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
};
