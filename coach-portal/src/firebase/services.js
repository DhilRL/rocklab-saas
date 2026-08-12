import { initializeApp } from 'firebase/app';
import { 
  collection, doc, setDoc, getDocs, onSnapshot, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword
} from 'firebase/auth';
import { 
  ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';
import { db, auth, storage, firebaseConfig } from './config';

// --- SECONDARY AUTH FOR ADMIN TASKS ---
// This allows an admin to create new users without being signed out
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// --- AUTHENTICATION ---
export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const onAuthStateChange = (callback) => onAuthStateChanged(auth, callback);
export const updateUserPassword = async (newPassword) => {
  if (auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  }
};

export const createAuthUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    // Immediately sign out from secondary auth to avoid confusion
    await secondaryAuth.signOut();
    return userCredential.user;
  } catch (error) {
    // If user already exists, we consider it a success for the "profile creation" flow
    if (error.code === 'auth/email-already-in-use') return { email };
    throw error;
  }
};

// --- FIRESTORE LISTENERS (REAL-TIME) ---
export const onCoachesSnapshot = (callback) => {
  return onSnapshot(collection(db, 'coaches'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const onSchoolsSnapshot = (callback) => {
  return onSnapshot(collection(db, 'schools'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const onShiftsSnapshot = (callback) => {
  return onSnapshot(collection(db, 'shifts'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

// --- FIRESTORE GETTERS ---
export const getCoaches = async () => {
  const snapshot = await getDocs(collection(db, 'coaches'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- FIRESTORE MUTATIONS (SAVE) ---
export const saveCoach = async (coachData) => {
  const { id, ...data } = coachData;
  await setDoc(doc(db, 'coaches', id), data);
};

export const saveSchool = async (schoolData) => {
  const { id, ...data } = schoolData;
  await setDoc(doc(db, 'schools', id), data);
};

export const saveShift = async (shiftData) => {
  const { id, ...data } = shiftData;
  await setDoc(doc(db, 'shifts', id), data);
};

export const saveShiftsBatch = async (shiftsData) => {
  const batch = writeBatch(db);
  shiftsData.forEach(shift => {
    const { id, ...data } = shift;
    batch.set(doc(db, 'shifts', id), data);
  });
  await batch.commit();
};

// --- FIRESTORE MUTATIONS (DELETE) ---
export const deleteCoach = async (coachId) => {
  try {
    await deleteDoc(doc(db, 'coaches', coachId));
  } catch (error) {
    console.error("Error deleting coach: ", error);
  }
};

export const deleteShift = async (shiftId) => {
  try {
    await deleteDoc(doc(db, 'shifts', shiftId));
  } catch (error) {
    console.error("Error deleting shift: ", error);
  }
};

export const deleteSchool = async (schoolId) => {
  try {
    await deleteDoc(doc(db, 'schools', schoolId));
  } catch (error) {
    console.error("Error deleting school: ", error);
  }
};

// --- STORAGE ---
export const uploadFile = async (filePath, file) => {
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const getFileURL = async (filePath) => {
  const storageRef = ref(storage, filePath);
  return await getDownloadURL(storageRef);
};

// --- INITIAL DATA SEEDING ---
export const seedInitialData = async (coaches, schools, shifts) => {
  const batch = writeBatch(db);
  
  coaches.forEach(coach => {
    const { id, ...data } = coach;
    batch.set(doc(db, 'coaches', id), data);
  });
  
  schools.forEach(school => {
    const { id, ...data } = school;
    batch.set(doc(db, 'schools', id), data);
  });
  
  shifts.forEach(shift => {
    const { id, ...data } = shift;
    batch.set(doc(db, 'shifts', id), data);
  });
  
  await batch.commit();
};