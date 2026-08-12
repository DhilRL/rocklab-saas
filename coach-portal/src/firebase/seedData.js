import { db } from './config';
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_COACHES, INITIAL_SCHOOLS, INITIAL_SHIFTS } from '../data/mockData';

// Run this script once to populate Firestore with initial data
export const seedFirebase = async () => {
  console.log('Starting seed...');
  
  const coachesCollection = collection(db, 'coaches');
  const schoolsCollection = collection(db, 'schools');
  const shiftsCollection = collection(db, 'shifts');
  
  // Seed coaches
  for (const coach of INITIAL_COACHES) {
    const coachData = { ...coach };
    delete coachData.id;
    const docRef = doc(coachesCollection);
    await setDoc(docRef, { ...coachData, createdAt: new Date().toISOString() });
    console.log(`Seeded coach: ${coach.name} with ID: ${docRef.id}`);
  }
  
  // Seed schools
  for (const school of INITIAL_SCHOOLS) {
    const schoolData = { ...school };
    delete schoolData.id;
    const docRef = doc(schoolsCollection);
    await setDoc(docRef, { ...schoolData, createdAt: new Date().toISOString() });
    console.log(`Seeded school: ${school.name} with ID: ${docRef.id}`);
  }
  
  // Seed shifts
  for (const shift of INITIAL_SHIFTS) {
    const shiftData = { ...shift };
    delete shiftData.id;
    const docRef = doc(shiftsCollection);
    await setDoc(docRef, { 
      ...shiftData, 
      createdAt: new Date().toISOString(),
      year: 2026, 
      month: 3 // April (0-indexed, so 3 = April)
    });
    console.log(`Seeded shift for day: ${shift.day} with ID: ${docRef.id}`);
  }
  
  console.log('Seeding complete!');
};

// To run this, call seedFirebase() from browser console or temporarily in useEffect