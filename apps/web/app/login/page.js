"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

const SUPERADMIN_EMAILS = ["fardeals@gmail.com"];

export default function LoginPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  async function findOwnedOrg(firebaseUser) {
    try {
      const orgSnap = await getDocs(
        query(collection(db, "orgs"), where("ownerUid", "==", firebaseUser.uid))
      );

      if (orgSnap.empty) return null;

      const orgDoc = orgSnap.docs[0];
      return { id: orgDoc.id, ...orgDoc.data() };
    } catch (error) {
      console.error("findOwnedOrg failed:", error);
      throw new Error(
        `Failed reading org ownership. ${error?.code || ""} ${error?.message || ""}`.trim()
      );
    }
  }

  async function findMemberOrg(firebaseUser) {
    const email = firebaseUser?.email?.toLowerCase()?.trim();
    if (!email) return null;

    try {
      let memberSnap = await getDocs(
        query(collection(db, "orgMembers"), where("uid", "==", firebaseUser.uid))
      );

      if (memberSnap.empty) {
        memberSnap = await getDocs(
          query(collection(db, "orgMembers"), where("email", "==", email))
        );
      }

      if (memberSnap.empty) return null;

      const memberDoc =
        memberSnap.docs.find((d) => {
          const data = d.data();
          return data.status === "active" || data.status === "pending_onboarding";
        }) || memberSnap.docs[0];

      const member = { id: memberDoc.id, ...memberDoc.data() };

      if (!member.orgId) return null;

      const orgRef = doc(db, "orgs", member.orgId);
      const orgSnap = await getDoc(orgRef);

      if (!orgSnap.exists()) return null;

      return {
        member,
        org: { id: orgSnap.id, ...orgSnap.data() },
      };
    } catch (error) {
      console.error("findMemberOrg failed:", error);
      throw new Error(
        `Failed reading member org. ${error?.code || ""} ${error?.message || ""}`.trim()
      );
    }
  }

  async function routeUserAfterLogin(firebaseUser) {
    const email = firebaseUser?.email?.toLowerCase()?.trim();

    setDebugError("");

    if (!email) {
      router.push("/create-org");
      return;
    }

    if (SUPERADMIN_EMAILS.includes(email)) {
      router.push("/superadmin");
      return;
    }

    const ownedOrg = await findOwnedOrg(firebaseUser);
    if (ownedOrg?.slug) {
      router.push(`/org/${ownedOrg.slug}/dashboard`);
      return;
    }

    const memberResult = await findMemberOrg(firebaseUser);
    if (memberResult?.org?.slug) {
      router.push(`/org/${memberResult.org.slug}/dashboard`);
      return;
    }

    router.push("/create-org");
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setDebugError("");

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await routeUserAfterLogin(result.user);
    } catch (error) {
      console.error("Login failed:", error);
      console.error("Login error code:", error?.code);
      console.error("Login error message:", error?.message);

      const message = error?.message || "Login failed";
      setDebugError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    if (!user) return;

    try {
      setLoading(true);
      setDebugError("");
      await routeUserAfterLogin(user);
    } catch (error) {
      console.error("Continue failed:", error);
      console.error("Continue error code:", error?.code);
      console.error("Continue error message:", error?.message);

      const message = error?.message || "Unable to continue";
      setDebugError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setUser(null);
      setDebugError("");
    } catch (error) {
      console.error("Logout failed:", error);
      alert(error?.message || "Logout failed");
    }
  }

  if (checkingAuth) {
    return (
      <main className="auth-wrap">
        <section className="auth-panel">
          <div className="card" style={{ maxWidth: 480, width: "100%" }}>
            <h1>Loading...</h1>
            <p>Checking session.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-wrap">
      <section className="auth-side">
        <div>
          <span className="eyebrow">Rocklab SaaS</span>
          <h1>Login or create your organization</h1>
          <p>
            Manage staff, schedules, payroll, onboarding, and all the admin mess
            in one place.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="card" style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ marginBottom: 20 }}>
            <h2>Welcome</h2>
            <p style={{ margin: 0, color: "#666" }}>
              Sign in with Google to continue.
            </p>
          </div>

          {user ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="field">
                <label>Signed in as</label>
                <input value={user.email || ""} disabled />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleContinue}
                disabled={loading}
              >
                {loading ? "Redirecting..." : "Continue"}
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                disabled={loading}
              >
                Switch Account / Logout
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          )}

          {debugError ? (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#fff4f4",
                border: "1px solid #f3c4c4",
                color: "#9b1c1c",
                fontSize: 14,
              }}
            >
              {debugError}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}