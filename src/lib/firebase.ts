import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDkZ4R9b1aiSE3a8Hv_aenQdtulMbIbIQw",
  authDomain: "mr-earning-a806d.firebaseapp.com",
  databaseURL: "https://mr-earning-a806d-default-rtdb.firebaseio.com",
  projectId: "mr-earning-a806d",
  storageBucket: "mr-earning-a806d.firebasestorage.app",
  messagingSenderId: "139526163112",
  appId: "1:139526163112:web:eada4fcdf54a815bb6d09d"
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
