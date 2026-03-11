"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";

function getStatusConfig(status) {
  const map = {
    pending: {
      label: "Invite Link Created",
      className: "badge-warning",
      sortOrder: 1,
    },
    pending_onboarding: {
      label: "Accepted",
      className: "badge-info",
      sortOrder: 2,
    },
    active: {
      label: "Successfully Registered",
      className: "badge-success",
      sortOrder: 3,
    },
  };

  return (
    map[status] || {
      label: status || "Unknown",
      className: "badge-neutral",
      sortOrder: 99,
    }
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export default function StaffPage({ params }) {
  const { orgSlug } = params;

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingInviteId, setRemovingInviteId] = useState("");

  const loadStaffData = useCallback(async () => {
    setLoading(true);
    try {
      const orgSnap = await getDocs(
        query(collection(db, "orgs"), where("slug", "==", orgSlug))
      );

      if (orgSnap.empty) {
        setOrg(null);
        return;
      }

      const orgDoc = orgSnap.docs[0];
      const orgData = { id: orgDoc.id, ...orgDoc.data() };
      setOrg(orgData);

      const [membersSnap, invitesSnap] = await Promise.all([
        getDocs(query(collection(db, "orgMembers"), where("orgId", "==", orgDoc.id))),
        getDocs(
          query(
            collection(db, "invites"),
            where("orgId", "==", orgDoc.id),
            where("status", "==", "pending")
          )
        ),
      ]);

      const memberRows = membersSnap.docs
        .map((m) => ({ id: m.id, ...m.data() }))
        .filter((m) => (m.role || "").toLowerCase() !== "owner")
        .sort((a, b) => (a.email || "").localeCompare(b.email || ""));

      const inviteRows = invitesSnap.docs
        .map((inv) => ({ id: inv.id, ...inv.data() }))
        .sort((a, b) => (a.email || "").localeCompare(b.email || ""));

      setMembers(memberRows);
      setPendingInvites(inviteRows);
    } catch (error) {
      console.error("Error loading staff data:", error);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    loadStaffData();
  }, [orgSlug, loadStaffData]);

  async function handleRemoveInvite(inviteId) {
    const confirmed = window.confirm("Remove this invite link?");
    if (!confirmed) return;

    try {
      setRemovingInviteId(inviteId);
      await deleteDoc(doc(db, "invites", inviteId));
      await loadStaffData();
    } catch (error) {
      console.error("Error removing invite:", error);
      alert("Failed to remove invite link.");
    } finally {
      setRemovingInviteId("");
    }
  }

  const unifiedRows = useMemo(() => {
    const inviteMapped = pendingInvites.map((invite) => ({
      rowType: "invite",
      id: invite.id,
      email: invite.email || "",
      role: invite.role || "staff",
      status: "pending",
      fullName: "",
      phone: "",
      createdAt: invite.createdAt || null,
    }));

    const memberMapped = members.map((member) => ({
      rowType: "member",
      id: member.id,
      email: member.email || "",
      role: member.role || "staff",
      status: member.status || "unknown",
      fullName: member.fullName || "",
      phone: member.phone || "",
      createdAt: member.joinedAt || null,
    }));

    return [...inviteMapped, ...memberMapped].sort((a, b) => {
      const statusA = getStatusConfig(a.status).sortOrder;
      const statusB = getStatusConfig(b.status).sortOrder;

      if (statusA !== statusB) return statusA - statusB;
      return (a.email || "").localeCompare(b.email || "");
    });
  }, [pendingInvites, members]);

  if (!loading && !org) {
    return <div className="p-8">Organization not found.</div>;
  }

  const totalInvited = pendingInvites.length;
  const totalAccepted = members.filter((m) => m.status === "pending_onboarding").length;
  const totalRegistered = members.filter((m) => m.status === "active").length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Staff</h1>
          <p>Organization: {orgSlug}</p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link className="btn btn-primary" href={`/org/${orgSlug}/staff/invite`}>
            Invite Staff
          </Link>
        </div>
      </div>

      <div className="main-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Invite Links Created</div>
            <div className="value">{totalInvited}</div>
          </div>
          <div className="stat-card">
            <div className="label">Accepted</div>
            <div className="value">{totalAccepted}</div>
          </div>
          <div className="stat-card">
            <div className="label">Successfully Registered</div>
            <div className="value">{totalRegistered}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Records</div>
            <div className="value">{unifiedRows.length}</div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 6 }}>Staff Status Overview</h3>
            <p style={{ margin: 0 }}>
              One table for invite links, accepted staff, and fully registered staff.
            </p>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : unifiedRows.length === 0 ? (
            <div className="empty-state">No staff or invites yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Full Name</th>
                  <th>Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unifiedRows.map((row) => (
                  <tr key={`${row.rowType}-${row.id}`}>
                    <td>{row.email || "—"}</td>
                    <td>{row.role || "staff"}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.fullName || "—"}</td>
                    <td>{row.phone || "—"}</td>
                    <td>
                      {row.rowType === "invite" ? (
                        <button
                          className="btn btn-secondary"
                          type="button"
                          disabled={removingInviteId === row.id}
                          onClick={() => handleRemoveInvite(row.id)}
                        >
                          {removingInviteId === row.id ? "Removing..." : "Remove Invite"}
                        </button>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}