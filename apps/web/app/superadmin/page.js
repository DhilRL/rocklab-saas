"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { getPlatformAdmin } from "../../lib/platform-admin";
import { useRouter } from "next/navigation";

function maskUid(uid) {
  if (!uid) return "—";
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 6)}••••${uid.slice(-4)}`;
}

function normalizePlan(org) {
  if (org.subscriptionPlan) return org.subscriptionPlan;
  if (org.billingMode === "complimentary") return "internal";
  return "starter";
}

export default function SuperadminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [revealedUids, setRevealedUids] = useState({});
  const [summary, setSummary] = useState({
    total: 0,
    complimentary: 0,
    paid: 0,
    activePaid: 0,
    pastDue: 0,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);

      const adminDoc = await getPlatformAdmin(currentUser.uid);

      if (!adminDoc) {
        router.replace("/");
        return;
      }

      setAuthorized(true);
      await loadOrgs();
      setChecking(false);
    });

    return () => unsub();
  }, [router]);

  async function loadOrgs() {
    const orgsQuery = query(collection(db, "orgs"), orderBy("createdAt", "desc"));
    const orgsSnap = await getDocs(orgsQuery);

    const rows = await Promise.all(
      orgsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();

        let staffCount = 0;
        let ownerEmail = data.ownerEmail || "";
        try {
          const countSnap = await getCountFromServer(
            query(collection(db, "orgMembers"), where("orgId", "==", docSnap.id))
          );
          staffCount = countSnap.data().count;
        } catch (err) {
          console.error("Failed to count staff for org:", docSnap.id, err);
        }

        try {
          if (!ownerEmail && data.ownerId) {
            const ownerMemberSnap = await getDocs(
              query(
                collection(db, "orgMembers"),
                where("orgId", "==", docSnap.id),
                where("uid", "==", data.ownerId)
              )
            );

            if (!ownerMemberSnap.empty) {
              ownerEmail = ownerMemberSnap.docs[0].data()?.email || "";
            }
          }
        } catch (err) {
          console.error("Failed fetching owner email for org:", docSnap.id, err);
        }

        return {
          id: docSnap.id,
          ...data,
          ownerEmail,
          staffCount,
          subscriptionPlan: normalizePlan(data),
        };
      })
    );

    setOrgs(rows);

    const activeRows = rows.filter((o) => (o.status || "active") !== "archived");

    setSummary({
      total: activeRows.length,
      complimentary: activeRows.filter((o) => o.billingMode === "complimentary").length,
      paid: activeRows.filter((o) => o.billingMode === "paid").length,
      activePaid: activeRows.filter(
        (o) => o.billingMode === "paid" && o.subscriptionStatus === "active"
      ).length,
      pastDue: activeRows.filter((o) => o.subscriptionStatus === "past_due").length,
    });
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  async function handleFieldUpdate(orgId, field, value) {
    try {
      await updateDoc(doc(db, "orgs", orgId), {
        [field]: value,
      });
      await loadOrgs();
    } catch (err) {
      console.error("Failed updating org:", err);
      alert("Failed to update org.");
    }
  }

  async function handleDeleteOrg(orgId, orgName) {
    const confirmed = window.confirm(
      `Delete "${orgName}"?\n\nThis currently deletes only the org document, not all related data. Use only for test orgs.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "orgs", orgId));
      await loadOrgs();
    } catch (err) {
      console.error("Failed deleting org:", err);
      alert("Failed to delete org.");
    }
  }

  function toggleUidReveal(orgId) {
    setRevealedUids((prev) => ({
      ...prev,
      [orgId]: !prev[orgId],
    }));
  }

  if (checking) {
    return (
      <main className="auth-wrap">
        <section className="auth-side">
          <div>
            <span className="eyebrow">Superadmin</span>
            <h1>Checking platform access...</h1>
          </div>
        </section>
        <section className="auth-panel">
          <div className="card">
            <p>Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <div className="content-wrap" style={{ minHeight: "100vh" }}>
      <div className="topbar">
        <div>
          <h1>Superadmin Dashboard</h1>
          <p>Signed in as {user?.email}</p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" onClick={loadOrgs}>
            Refresh
          </button>
          <button className="btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Total active orgs</div>
            <div className="value">{summary.total}</div>
          </div>

          <div className="stat-card">
            <div className="label">Complimentary orgs</div>
            <div className="value">{summary.complimentary}</div>
          </div>

          <div className="stat-card">
            <div className="label">Paid orgs</div>
            <div className="value">{summary.paid}</div>
          </div>

          <div className="stat-card">
            <div className="label">Active paid orgs</div>
            <div className="value">{summary.activePaid}</div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <h3>Organizations</h3>
          <p>View owner contact, edit billing state, plan tier, and remove test orgs.</p>

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Tier</th>
                <th>Billing</th>
                <th>Subscription</th>
                <th>Owner email</th>
                <th>Owner UID</th>
                <th>Staff</th>
                <th>Open</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td>
                    <input
                      value={org.name || ""}
                      onChange={(e) => {
                        const next = orgs.map((item) =>
                          item.id === org.id ? { ...item, name: e.target.value } : item
                        );
                        setOrgs(next);
                      }}
                      onBlur={(e) =>
                        handleFieldUpdate(org.id, "name", e.target.value.trim())
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={org.slug || ""}
                      onChange={(e) => {
                        const next = orgs.map((item) =>
                          item.id === org.id ? { ...item, slug: e.target.value } : item
                        );
                        setOrgs(next);
                      }}
                      onBlur={(e) =>
                        handleFieldUpdate(org.id, "slug", e.target.value.trim().toLowerCase())
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={org.subscriptionPlan || normalizePlan(org)}
                      onChange={(e) =>
                        handleFieldUpdate(org.id, "subscriptionPlan", e.target.value)
                      }
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="operations">Operations</option>
                      <option value="internal">Internal</option>
                    </select>
                  </td>

                  <td>
                    <select
                      value={org.billingMode || "paid"}
                      onChange={(e) =>
                        handleFieldUpdate(org.id, "billingMode", e.target.value)
                      }
                    >
                      <option value="paid">paid</option>
                      <option value="complimentary">complimentary</option>
                    </select>
                  </td>

                  <td>
                    <select
                      value={org.subscriptionStatus || "none"}
                      onChange={(e) =>
                        handleFieldUpdate(org.id, "subscriptionStatus", e.target.value)
                      }
                    >
                      <option value="none">none</option>
                      <option value="trial">trial</option>
                      <option value="active">active</option>
                      <option value="past_due">past_due</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>

                  <td>{org.ownerEmail || "—"}</td>

                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span>{revealedUids[org.id] ? (org.ownerId || "—") : maskUid(org.ownerId)}</span>
                      {org.ownerId ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "6px 10px" }}
                          onClick={() => toggleUidReveal(org.id)}
                        >
                          {revealedUids[org.id] ? "Hide UID" : "Reveal UID"}
                        </button>
                      ) : null}
                    </div>
                  </td>

                  <td>{org.staffCount}</td>

                  <td>
                    {org.slug ? (
                      <Link className="muted-link" href={`/org/${org.slug}/dashboard`}>
                        Open
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDeleteOrg(org.id, org.name || org.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
