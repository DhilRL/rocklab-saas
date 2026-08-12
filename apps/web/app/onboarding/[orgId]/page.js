"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function OnboardingPage({ params }) {
  const { orgId } = React.use(params);

  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      const submitOnboarding = httpsCallable(functions, "submitOnboarding");
      await submitOnboarding({
        orgId,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });

      const orgSnap = await getDoc(doc(db, "orgs", orgId));

      if (orgSnap.exists()) {
        const slug = orgSnap.data()?.slug;
        if (slug) {
          router.replace(`/org/${slug}/dashboard`);
          return;
        }
      }

      router.replace("/");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to complete registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-side">
        <div>
          <span className="eyebrow">Staff registration</span>
          <h1>Complete your registration</h1>
          <p>
            You’ve accepted your invite. Fill in your details below to finish
            setting up your staff profile and enter your organization workspace.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              Your admin will use this to identify you correctly in staff records.
            </div>
            <div className="feature-item">
              This should only take a minute. Humans do love forms for some reason.
            </div>
            <div className="feature-item">
              After this, your registration status will be marked as completed.
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="card" style={{ maxWidth: 560, width: "100%" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 8 }}>Finish your staff profile</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground, #666)" }}>
              Enter the essential details below to complete registration.
            </p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="e.g. 91234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <button
                className="btn btn-primary"
                disabled={loading}
                type="submit"
                style={{ width: "100%" }}
              >
                {loading ? "Completing Registration..." : "Complete Registration"}
              </button>

              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "var(--muted-foreground, #666)",
                  textAlign: "center",
                }}
              >
                Once submitted, you will be redirected into your organization dashboard.
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}