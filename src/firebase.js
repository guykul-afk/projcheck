import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA6_9va4rHR6HX0ZkxXbuzwnfzYzq2Oxx4",
  authDomain: "projectcheck-app.firebaseapp.com",
  projectId: "projectcheck-app",
  storageBucket: "projectcheck-app.firebasestorage.app",
  messagingSenderId: "888978453209",
  appId: "1:888978453209:web:47fef3c1f10585afe7c4c8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
