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
  createUserWithEmailAndPassword
} from 'firebase/auth';

const firebaseConfig = {
  projectId: "regal-symbol-zln7n",
  appId: "1:146657456007:web:8a5154ad6f4b202fba6d22",
  apiKey: "AIzaSyBr0ekxxfn9246t11w_ZNMx75adXgceEvo",
  authDomain: "regal-symbol-zln7n.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aitheronmlsympos-02d73f86-c145-4802-9be1-143df0e7fcbd",
  storageBucket: "regal-symbol-zln7n.firebasestorage.app",
  messagingSenderId: "146657456007"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
