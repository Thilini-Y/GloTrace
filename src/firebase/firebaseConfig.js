import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAKSNtbOT4m5Hb4Rs5QUOGYrFXaV8-KtAs",
  authDomain: "glotrace2.firebaseapp.com",
  projectId: "glotrace2",
  storageBucket: "glotrace2.firebasestorage.app",
  messagingSenderId: "340655069642",
  appId: "1:340655069642:web:47b585323f66dd65aa1733",
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
