"use client";

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../../../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function InvitePage({ params }) {
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(null);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    const q = query(
      collection(db, "orgs"),
      where("slug", "==", params.orgSlug)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      setOrgId(snap.docs[0].id);
    }
  }

  async function createInvite(e) {
    e.preventDefault();

    if (!orgId) {
      alert("Org not loaded yet");
      return;
    }

    try {
      const fn = httpsCallable(functions, "createInvite");

      const res = await fn({
        orgId: orgId,
        email: email,
        role: "staff",
      });

      const link = `${window.location.origin}/invite/${res.data.inviteId}`;
      setInviteLink(link);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Invite Staff</h1>
          <p>Organization: {params.orgSlug}</p>
        </div>
      </div>

      <div className="main-content">
        <div className="page-stack">

          <div className="panel">
            <h3>Create invite</h3>

            <form className="form-grid" onSubmit={createInvite}>
              <input
                type="email"
                placeholder="staff@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button className="btn btn-primary">
                Create Invite
              </button>
            </form>
          </div>

          {inviteLink && (
            <div className="panel">
              <h3>Invite Link</h3>

              <input value={inviteLink} readOnly />

              <button
  className="btn btn-secondary"
  onClick={() => {
    navigator.clipboard.writeText(inviteLink);
    alert("Invite link copied");
  }}
>
  Copy Link
</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}