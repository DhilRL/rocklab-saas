"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function AppSidebar({ orgSlug }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: `/org/${orgSlug}/dashboard`, label: "Dashboard" },
    { href: `/org/${orgSlug}/staff`, label: "Staff" },
    { href: `/org/${orgSlug}/schedule`, label: "Schedule" },
    { href: `/org/${orgSlug}/payroll`, label: "Payroll" },
    { href: `/org/${orgSlug}/settings`, label: "Settings" },
    { href: `/org/${orgSlug}/billing`, label: "Billing" },
  ];

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">Rocklab SaaS</div>
        <div className="brand-subtitle">Org: {orgSlug}</div>
      </div>

      <div className="nav-group">
        <div className="nav-label">Workspace</div>

        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <button className="btn btn-secondary" onClick={handleSignOut}>
          Sign out
        </button>

        <div className="mobile-nav-note">
          On mobile, this sidebar will later collapse into a sheet. Because tiny screens
          are not a place for desktop ego.
        </div>
      </div>
    </aside>
  );
}