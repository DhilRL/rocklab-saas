"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

const ADMIN_ROLES = ["owner", "admin", "manager"];
const STAFF_ALLOWED_SEGMENTS = ["/dashboard", "/schedule", "/payroll", "/profile"];

function NavLink({ href, label, pathname }) {
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "12px 14px",
        borderRadius: "14px",
        textDecoration: "none",
        background: active ? "#dbeafe" : "transparent",
        color: active ? "#1d4ed8" : "#111827",
        fontWeight: active ? 700 : 500,
        border: active ? "1px solid #bfdbfe" : "1px solid transparent",
        transition: "all 0.18s ease",
      }}
    >
      {label}
    </Link>
  );
}

export default function OrgLayout({ children, params }) {
  const { orgSlug } = params;
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [member, setMember] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }

      try {
        setDebugError("");
        setUserEmail(firebaseUser.email || "");

        const orgSnap = await getDocs(
          query(collection(db, "orgs"), where("slug", "==", orgSlug))
        );

        if (orgSnap.empty) {
          setDebugError("Organization not found.");
          setLoading(false);
          return;
        }

        const orgDoc = orgSnap.docs[0];
        const orgData = { id: orgDoc.id, ...orgDoc.data() };
        setOrg(orgData);

        const isOwner = orgData.ownerUid === firebaseUser.uid;

        if (isOwner) {
          setMember({
            role: "owner",
            status: "active",
            email: firebaseUser.email || "",
            fullName: firebaseUser.displayName || "",
            nickname: "",
            telegramId: "",
            photoUrl: firebaseUser.photoURL || "",
          });
          setLoading(false);
          return;
        }

        const email = firebaseUser.email?.toLowerCase()?.trim() || "";

        let memberSnap = await getDocs(
          query(
            collection(db, "orgMembers"),
            where("orgId", "==", orgDoc.id),
            where("uid", "==", firebaseUser.uid)
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

        if (memberSnap.empty) {
          setDebugError("No membership record found for this account.");
          setLoading(false);
          return;
        }

        const memberData = {
          id: memberSnap.docs[0].id,
          ...memberSnap.docs[0].data(),
        };

        setMember(memberData);
      } catch (error) {
        console.error("Failed to load org layout:", error);
        console.error("Org layout error code:", error?.code);
        console.error("Org layout error message:", error?.message);
        setDebugError(error?.message || "Failed to load organization access.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [orgSlug, router]);

  const role = member?.role || "staff";
  const isAdmin = ADMIN_ROLES.includes(role);

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { label: "Dashboard", href: `/org/${orgSlug}/dashboard` },
        { label: "Staff", href: `/org/${orgSlug}/staff` },
        { label: "Schedule", href: `/org/${orgSlug}/schedule` },
        { label: "Payroll", href: `/org/${orgSlug}/payroll` },
        { label: "Profile", href: `/org/${orgSlug}/profile` },
        { label: "Settings", href: `/org/${orgSlug}/settings` },
        { label: "Billing", href: `/org/${orgSlug}/billing` },
      ];
    }

    return [
      { label: "Dashboard", href: `/org/${orgSlug}/dashboard` },
      { label: "Schedule", href: `/org/${orgSlug}/schedule` },
      { label: "Payroll", href: `/org/${orgSlug}/payroll` },
      { label: "Profile", href: `/org/${orgSlug}/profile` },
    ];
  }, [isAdmin, orgSlug]);

  useEffect(() => {
    if (loading || !member) return;

    if (!isAdmin) {
      const allowed = STAFF_ALLOWED_SEGMENTS.some((segment) =>
        pathname?.endsWith(segment)
      );

      if (!allowed) {
        router.replace(`/org/${orgSlug}/dashboard`);
      }
    }
  }, [loading, member, isAdmin, pathname, router, orgSlug]);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (debugError) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            maxWidth: 720,
            background: "#fff4f4",
            border: "1px solid #f3c4c4",
            borderRadius: 12,
            padding: 16,
            color: "#9b1c1c",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Access Error</h2>
          <p style={{ marginBottom: 0 }}>{debugError}</p>
        </div>
      </div>
    );
  }

  if (!org || !member) {
    return (
      <div style={{ padding: 24 }}>
        <p>Unable to load organization access.</p>
      </div>
    );
  }

  const displayName = member.nickname?.trim() || member.fullName?.trim() || "User";
  const workspaceTitle = org.name || orgSlug;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const userAvatar = member.photoUrl || "";
  const orgLogo = org.logoUrl || "";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        background: "#f3f4f6",
      }}
    >
      <aside
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            border: "1px solid #e5e7eb",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#eef2f7",
                border: "2px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="User profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontWeight: 800,
                    color: "#6b7280",
                    fontSize: 24,
                  }}
                >
                  {(displayName || member.email || "U").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#111827",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {displayName}
              </div>

              <div
                style={{
                  fontSize: 14,
                  color: "#4b5563",
                  marginTop: 6,
                  wordBreak: "break-word",
                }}
              >
                {member.email || userEmail || ""}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: 10,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              pathname={pathname}
            />
          ))}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div
        style={{
          minWidth: 0,
          display: "grid",
          gridTemplateRows: "132px 1fr",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#eef2f7",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Organization logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span style={{ fontWeight: 800, color: "#6b7280" }}>
                  {(workspaceTitle || "O").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                Workspace
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#111827",
                  lineHeight: 1.1,
                  wordBreak: "break-word",
                }}
              >
                {workspaceTitle}
              </div>
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              fontSize: 13,
              color: "#6b7280",
              textAlign: "right",
            }}
          >
            <div>{roleLabel}</div>
          </div>
        </header>

        <main
          style={{
            minWidth: 0,
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}