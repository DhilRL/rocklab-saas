// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCFUFoeFUxVIN_RFTB39WjMhcpfXqBORPc",
  authDomain: "rocklab-internal.firebaseapp.com",
  projectId: "rocklab-internal",
  storageBucket: "rocklab-internal.firebasestorage.app",
  messagingSenderId: "155672052050",
  appId: "1:155672052050:web:b211130fd045142474fa8b",
  measurementId: "G-0WKEHKW451"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };