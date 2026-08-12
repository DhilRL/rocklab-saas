"use client";

import { useEffect, useState } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, googleProvider, functions } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function InviteAcceptPage({ params }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsub();
  }, []);

  async function handleGoogleLogin() {
    try {
      setStatus("loading");
      await signInWithPopup(auth, googleProvider);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      alert("Google sign in failed");
      setStatus("idle");
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
  }

  async function handleAcceptInvite() {
    try {
      setStatus("loading");

      const fn = httpsCallable(functions, "acceptInvite");

      const res = await fn({
        inviteId: params.inviteId,
      });

      const orgId = res.data.orgId;

      router.replace(`/onboarding/${orgId}`);
    } catch (err) {
      console.error(err);
      alert(err.message);
      setStatus("idle");
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-side">
        <div>
          <span className="eyebrow">Staff invite</span>
          <h1>Join organization</h1>
          <p>
            Sign in with the same email that received the invite, then accept it.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="card">

          {!user && (
            <>
              <h2>Sign in</h2>

              <button
                className="btn btn-primary"
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </button>
            </>
          )}

          {user && (
            <>
              <h2>Ready to accept</h2>

              <p>
                Signed in as <strong>{user.email}</strong>
              </p>

              <div style={{display:"flex", gap:"10px"}}>

                <button
                  className="btn btn-primary"
                  onClick={handleAcceptInvite}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Accepting..." : "Accept Invite"}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleLogout}
                >
                  Switch Account
                </button>

              </div>
            </>
          )}

        </div>
      </section>
    </main>
  );
}