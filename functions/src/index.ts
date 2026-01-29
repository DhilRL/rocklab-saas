/**
 * Rocklab SaaS - Backend Logic
 * Core functions for Org Management, Invites, and Onboarding.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (Required for Database access)
admin.initializeApp();
const db = admin.firestore();

// Global Settings (Gen 2)
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

// --- Interfaces ---

interface CreateOrgData {
  name: string;
  slug: string;
}

interface CreateInviteData {
  orgId: string;
  email: string;
  role: 'admin' | 'staff';
}

interface AcceptInviteData {
  inviteId: string;
}

interface OnboardingData {
  orgId: string;
  fullName: string;
  phone: string;
}

interface ApproveMemberData {
  orgId: string;
  memberId: string;
}

// --- 1. Create Organization ---
// Trigger: User signs up and creates their first workspace.
// Action: Creates Org doc + sets User as "owner" in orgMembers.
export const createOrg = onCall<CreateOrgData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { name, slug } = request.data;
  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  if (!name || !slug) {
    throw new HttpsError('invalid-argument', 'Organization name and slug are required.');
  }

  // 1. Create the Organization Document
  const orgRef = db.collection('orgs').doc();
  const orgId = orgRef.id;

  await orgRef.set({
    id: orgId,
    name: name,
    slug: slug, // In production, check for uniqueness first!
    ownerId: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active'
  });

  // 2. Add Creator as the First Member (Owner)
  await db.collection('orgMembers').doc(`${orgId}_${uid}`).set({
    orgId: orgId,
    uid: uid,
    email: email,
    role: 'owner',
    status: 'active',
    joinedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, orgId: orgId };
});

// --- 2. Create Invite ---
// Trigger: Admin invites a staff member via email.
// Action: Creates an "Invite" document. (Email triggering would happen via a separate background function)
export const createInvite = onCall<CreateInviteData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in to invite.');
  }

  const { orgId, email, role } = request.data;

  // Security: Check if requester is Admin/Owner of this Org
  const requesterMembership = await db.collection('orgMembers').doc(`${orgId}_${request.auth.uid}`).get();
  if (!requesterMembership.exists || !['owner', 'admin'].includes(requesterMembership.data()?.role)) {
    throw new HttpsError('permission-denied', 'Only Admins can invite users.');
  }

  // Create Invite Doc
  const inviteRef = await db.collection('invites').add({
    orgId,
    email,
    role,
    invitedBy: request.auth.uid,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, inviteId: inviteRef.id };
});

// --- 3. Accept Invite ---
// Trigger: User clicks link in email, lands on page, clicks "Accept".
// Action: Verifies invite, creates Member record, deletes Invite.
export const acceptInvite = onCall<AcceptInviteData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please sign in to accept invitation.');
  }

  const { inviteId } = request.data;
  const uid = request.auth.uid;
  const email = request.auth.token.email;

  // 1. Fetch Invite
  const inviteRef = db.collection('invites').doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'Invitation not found or expired.');
  }

  const inviteData = inviteSnap.data();

  // 2. Validate Email matches (Optional security check)
  if (inviteData?.email !== email) {
     throw new HttpsError('permission-denied', 'This invite was sent to a different email address.');
  }

  // 3. Create Member Record (Status: pending onboarding)
  await db.collection('orgMembers').doc(`${inviteData?.orgId}_${uid}`).set({
    orgId: inviteData?.orgId,
    uid: uid,
    email: email,
    role: inviteData?.role,
    status: 'pending_onboarding', // Needs to fill profile
    joinedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 4. Delete/Mark Invite Used
  await inviteRef.delete();

  return { success: true, orgId: inviteData?.orgId };
});

// --- 4. Submit Onboarding ---
// Trigger: Staff fills out their name/phone after accepting invite.
// Action: Updates Member profile, moves status to "active" (or "pending_approval" if strict).
export const submitOnboarding = onCall<OnboardingData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { orgId, fullName, phone } = request.data;
  const uid = request.auth.uid;

  const memberRef = db.collection('orgMembers').doc(`${orgId}_${uid}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'Member record not found.');
  }

  await memberRef.update({
    fullName,
    phone,
    status: 'active', // Or 'pending_approval' if you want a manual check
    onboardedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

// --- 5. Approve Member (Optional) ---
// Trigger: Admin approves a pending staff member.
export const approveMember = onCall<ApproveMemberData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { orgId, memberId } = request.data; // memberId is the UID of the staff

  // Security Check
  const requesterSnap = await db.collection('orgMembers').doc(`${orgId}_${request.auth.uid}`).get();
  if (!requesterSnap.exists || !['owner', 'admin'].includes(requesterSnap.data()?.role)) {
    throw new HttpsError('permission-denied', 'Not authorized.');
  }

  await db.collection('orgMembers').doc(`${orgId}_${memberId}`).update({
    status: 'active',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: request.auth.uid
  });

  return { success: true };
});
