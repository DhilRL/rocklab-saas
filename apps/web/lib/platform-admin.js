import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getPlatformAdmin(uid) {
  if (!uid) return null;

  const ref = doc(db, "platformAdmins", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  if (!data?.active) return null;

  return {
    id: snap.id,
    ...data,
  };
}