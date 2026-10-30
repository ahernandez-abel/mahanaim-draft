import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6fN5u9rWEzqsKcQU1zAogT5X_eqs0bPI",
  authDomain: "mahanaim-draft.firebaseapp.com",
  projectId: "mahanaim-draft",
  storageBucket: "mahanaim-draft.firebasestorage.app",
  messagingSenderId: "198177055771",
  appId: "1:198177055771:web:d1e711c720642b1d8404be"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);