"use client";

import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getPlatformAdmin } from "../lib/platform-admin";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsPlatformAdmin(false);
        setChecking(false);
        return;
      }

      const adminDoc = await getPlatformAdmin(user.uid);
      setIsPlatformAdmin(!!adminDoc);
      setChecking(false);
    });

    return () => unsub();
  }, []);

  async function handleSignOut() {
    await signOut(auth);
    window.location.href = "/login";
  }

  return (
    <main className="auth-wrap">
      <section className="auth-side">
        <div>
          <span className="eyebrow">Rocklab SaaS</span>
          <h1>Run your ops without the chaos.</h1>
          <p>
            Multi-tenant scheduling, payroll acknowledgment, staff onboarding,
            and role-based permissions for operations-heavy teams.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="card">
          <h2>Get started</h2>

          <div className="form-grid">
            <Link className="btn btn-primary" href="/login">
              Continue to login
            </Link>

            <Link className="muted-link" href="/create-org">
              Create a new organization
            </Link>

            {!checking && isPlatformAdmin && (
              <Link className="muted-link" href="/superadmin">
                Superadmin dashboard
              </Link>
            )}

            <button className="btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}