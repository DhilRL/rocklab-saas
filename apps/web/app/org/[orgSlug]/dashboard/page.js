"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../../../lib/firebase";

const ADMIN_ROLES = ["owner", "admin", "manager"];

export default function OrgDashboardPage({ params }) {
  const { orgSlug } = params;

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [member, setMember] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const orgSnap = await getDocs(
          query(collection(db, "orgs"), where("slug", "==", orgSlug))
        );

        if (orgSnap.empty) {
          setLoading(false);
          return;
        }

        const orgDoc = orgSnap.docs[0];
        const orgData = { id: orgDoc.id, ...orgDoc.data() };
        setOrg(orgData);

        const isOwner = orgData.ownerUid === user.uid;

        if (isOwner) {
          setMember({
            role: "owner",
            status: "active",
            email: user.email || "",
            fullName: user.displayName || "",
          });
          setLoading(false);
          return;
        }

        const email = user.email?.toLowerCase()?.trim() || "";

        let memberSnap = await getDocs(
          query(
            collection(db, "orgMembers"),
            where("orgId", "==", orgDoc.id),
            where("uid", "==", user.uid)
          )
        );

        if (memberSnap.empty && email) {
          memberSnap = await getDocs(
            query(
              collection(db, "orgMembers"),
              where("orgId", "==", orgDoc.id),
              where("email", "==", email)
            )
          );
        }

        if (!memberSnap.empty) {
          setMember({ id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() });
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [orgSlug]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!org || !member) {
    return (
      <div style={{ padding: 24 }}>
        <p>Unable to load dashboard.</p>
      </div>
    );
  }

  const role = member?.role || "staff";
  const isAdmin = ADMIN_ROLES.includes(role);
  const title = isAdmin ? "Organization Dashboard" : "Staff Dashboard";

  const adminCards = [
    {
      title: "Staff",
      description: "Invite, approve, and manage your team.",
    },
    {
      title: "Schedule",
      description: "Calendar and mobile shift views will live here.",
    },
    {
      title: "Payroll",
      description: "Acknowledgment, lock, and paid-out workflow.",
    },
    {
      title: "Billing",
      description: "Manage subscription and invoices.",
    },
  ];

  const staffCards = [
    {
      title: "Schedule",
      description: "View your assigned shifts and upcoming work schedule.",
    },
    {
      title: "Payroll",
      description: "See your payroll status, acknowledgments, and payouts.",
    },
    {
      title: "Profile",
      description: "View your personal details and staff account information.",
    },
  ];

  const cards = isAdmin ? adminCards : staffCards;

  return (
    <div style={{ padding: 24 }}>
      <div className="topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1>{title}</h1>
          <p>Org: {org.slug}</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {cards.map((card) => (
          <div key={card.title} className="panel">
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{card.title}</h3>
            <p style={{ margin: 0, color: "#6b7280" }}>{card.description}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Recent activity</h3>
          <p style={{ color: "#6b7280", marginBottom: 0 }}>
            No activity yet.
          </p>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Quick actions</h3>
          <p style={{ color: "#6b7280", marginBottom: 0 }}>
            {isAdmin
              ? "Invite staff, create shifts, or run payroll."
              : "Check your shifts, review payroll, or update your profile."}
          </p>
        </div>
      </div>
    </div>
  );
}