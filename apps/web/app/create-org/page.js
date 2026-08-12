"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  async function redirectIfExistingOrg(user) {
    // First check users/{uid}
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists() && userDoc.data().defaultOrgId) {
      const orgId = userDoc.data().defaultOrgId;
      const orgDoc = await getDoc(doc(db, "orgs", orgId));
      const foundSlug = orgDoc.data()?.slug;

      if (foundSlug) {
        router.replace(`/org/${foundSlug}/dashboard`);
        return true;
      }
    }

    // Fallback: find owned org directly
    const ownedOrgQuery = query(
      collection(db, "orgs"),
      where("ownerId", "==", user.uid),
      limit(1)
    );
    const ownedOrgSnap = await getDocs(ownedOrgQuery);

    if (!ownedOrgSnap.empty) {
      const ownedOrg = ownedOrgSnap.docs[0];
      const foundSlug = ownedOrg.data()?.slug;

      if (foundSlug) {
        router.replace(`/org/${foundSlug}/dashboard`);
        return true;
      }
    }

    return false;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      await redirectIfExistingOrg(user);
    });

    return () => unsub();
  }, [router]);

  async function handleCreateOrg(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const createOrg = httpsCallable(functions, "createOrg");
      const result = await createOrg({ name, slug });
      const orgSlug = result.data.slug;
      router.replace(`/org/${orgSlug}/dashboard`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create org");
    }

    setLoading(false);
  }

  return (
    <main className="auth-wrap">
      <section className="auth-side">
        <div>
          <span className="eyebrow">New organization</span>
          <h1>Create your org</h1>
        </div>
      </section>

      <section className="auth-panel">
        <div className="card">
          <form onSubmit={handleCreateOrg} className="form-grid">
            <input
              placeholder="Organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              placeholder="Organization slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
            />

            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create organization"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}