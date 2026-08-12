import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

type OrgMemberRecord = {
  id: string;
  orgId?: string;
  uid?: string;
  email?: string;
  role?: string;
  status?: string;
  fullName?: string;
  phone?: string;
  nickname?: string;
  telegramId?: string;
  photoUrl?: string;
  [key: string]: any;
};

function requireAuth(request: any) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required");
  }
  return request.auth;
}

async function getOrgMember(
  orgId: string,
  uid: string,
  email?: string
): Promise<OrgMemberRecord | null> {
  const deterministicRef = db.collection("orgMembers").doc(`${orgId}_${uid}`);
  const deterministicSnap = await deterministicRef.get();

  if (deterministicSnap.exists) {
    return {
      id: deterministicSnap.id,
      ...(deterministicSnap.data() || {}),
    } as OrgMemberRecord;
  }

  const byUidSnap = await db
    .collection("orgMembers")
    .where("orgId", "==", orgId)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (!byUidSnap.empty) {
    const memberDoc = byUidSnap.docs[0];
    return {
      id: memberDoc.id,
      ...(memberDoc.data() || {}),
    } as OrgMemberRecord;
  }

  if (email) {
    const cleanEmail = String(email).toLowerCase().trim();

    const byEmailSnap = await db
      .collection("orgMembers")
      .where("orgId", "==", orgId)
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    if (!byEmailSnap.empty) {
      const memberDoc = byEmailSnap.docs[0];
      return {
        id: memberDoc.id,
        ...(memberDoc.data() || {}),
      } as OrgMemberRecord;
    }
  }

  return null;
}

async function assertCanManageOrg(orgId: string, uid: string, email?: string) {
  const orgSnap = await db.collection("orgs").doc(orgId).get();

  if (!orgSnap.exists) {
    throw new HttpsError("not-found", "Organization not found");
  }

  const org = orgSnap.data();

  if (org?.ownerUid === uid) return org;

  const member = await getOrgMember(orgId, uid, email);
  const role = String(member?.role || "staff").toLowerCase();

  if (!["owner", "admin", "manager"].includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "You do not have permission to manage shifts"
    );
  }

  return org;
}

export const createInvite = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  const { orgId, email, role } = request.data;
  const uid = auth.uid;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!orgId || !cleanEmail || !role) {
    throw new HttpsError(
      "invalid-argument",
      "orgId, email and role are required"
    );
  }

  const existingInviteSnap = await db
    .collection("invites")
    .where("orgId", "==", orgId)
    .where("email", "==", cleanEmail)
    .where("status", "==", "pending")
    .get();

  if (!existingInviteSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "A pending invite already exists for this email"
    );
  }

  const inviteRef = db.collection("invites").doc();

  await inviteRef.set({
    orgId,
    email: cleanEmail,
    role,
    invitedBy: uid,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { inviteId: inviteRef.id };
});

export const acceptInvite = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  const { inviteId } = request.data;
  const uid = auth.uid;
  const email = String(auth.token.email || "").toLowerCase().trim();

  if (!inviteId) {
    throw new HttpsError("invalid-argument", "inviteId is required");
  }

  const inviteSnap = await db.collection("invites").doc(inviteId).get();
  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "Invite not found");
  }

  const invite = inviteSnap.data();

  if (!invite) {
    throw new HttpsError("not-found", "Invite not found");
  }

  if ((invite.email || "").toLowerCase().trim() !== email) {
    throw new HttpsError(
      "permission-denied",
      "This invite does not belong to this account"
    );
  }

  await db.collection("orgMembers").doc(`${invite.orgId}_${uid}`).set({
    orgId: invite.orgId,
    uid,
    email,
    role: invite.role,
    status: "pending_onboarding",
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("invites").doc(inviteId).update({
    status: "accepted",
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { orgId: invite.orgId };
});

export const submitOnboarding = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  const { orgId, fullName, phone } = request.data;
  const uid = auth.uid;
  const email = String(auth.token.email || "").toLowerCase().trim();

  if (!orgId) {
    throw new HttpsError("invalid-argument", "orgId is required");
  }

  const deterministicRef = db.collection("orgMembers").doc(`${orgId}_${uid}`);
  const deterministicSnap = await deterministicRef.get();

  if (deterministicSnap.exists) {
    await deterministicRef.update({
      fullName: String(fullName || "").trim(),
      phone: String(phone || "").trim(),
      status: "active",
    });

    return { success: true };
  }

  const member = await getOrgMember(orgId, uid, email);

  if (!member?.id) {
    throw new HttpsError("not-found", "Member record not found");
  }

  await db.collection("orgMembers").doc(member.id).update({
    fullName: String(fullName || "").trim(),
    phone: String(phone || "").trim(),
    status: "active",
  });

  return { success: true };
});

export const createShift = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  const {
    orgId,
    title,
    shiftType,
    startIso,
    endIso,
    isAvailable,
    assignedStaffIds = [],
    assignedStaffNames = [],
    notes = "",
    color = "blue",
    claimMode = "approval",
    staffNeeded = 1,
  } = request.data;

  if (!orgId || !title || !startIso || !endIso) {
    throw new HttpsError(
      "invalid-argument",
      "orgId, title, startIso and endIso are required"
    );
  }

  await assertCanManageOrg(orgId, auth.uid, auth.token.email);

  const start = admin.firestore.Timestamp.fromDate(new Date(startIso));
  const end = admin.firestore.Timestamp.fromDate(new Date(endIso));

  if (Number.isNaN(start.toMillis()) || Number.isNaN(end.toMillis())) {
    throw new HttpsError("invalid-argument", "Invalid shift date/time");
  }

  if (end.toMillis() <= start.toMillis()) {
    throw new HttpsError(
      "invalid-argument",
      "Shift end must be after shift start"
    );
  }

  const shiftRef = db.collection("orgShifts").doc();

  await shiftRef.set({
    orgId,
    title: String(title).trim(),
    shiftType: String(shiftType || "").trim(),
    start,
    end,
    isAvailable: Boolean(isAvailable),
    assignedStaffIds: Array.isArray(assignedStaffIds) ? assignedStaffIds : [],
    assignedStaffNames: Array.isArray(assignedStaffNames)
      ? assignedStaffNames
      : [],
    notes: String(notes || "").trim(),
    color: String(color || "blue"),
    claimMode: claimMode === "instant" ? "instant" : "approval",
    staffNeeded: Math.max(1, Number(staffNeeded || 1)),
    createdBy: auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { shiftId: shiftRef.id };
});

export const updateShift = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  const {
    shiftId,
    orgId,
    title,
    shiftType,
    startIso,
    endIso,
    isAvailable,
    assignedStaffIds = [],
    assignedStaffNames = [],
    notes = "",
    color = "blue",
    claimMode = "approval",
    staffNeeded = 1,
  } = request.data;

  if (!shiftId || !orgId || !title || !startIso || !endIso) {
    throw new HttpsError(
      "invalid-argument",
      "shiftId, orgId, title, startIso and endIso are required"
    );
  }

  await assertCanManageOrg(orgId, auth.uid, auth.token.email);

  const start = admin.firestore.Timestamp.fromDate(new Date(startIso));
  const end = admin.firestore.Timestamp.fromDate(new Date(endIso));

  if (Number.isNaN(start.toMillis()) || Number.isNaN(end.toMillis())) {
    throw new HttpsError("invalid-argument", "Invalid shift date/time");
  }

  if (end.toMillis() <= start.toMillis()) {
    throw new HttpsError(
      "invalid-argument",
      "Shift end must be after shift start"
    );
  }

  await db.collection("orgShifts").doc(shiftId).update({
    title: String(title).trim(),
    shiftType: String(shiftType || "").trim(),
    start,
    end,
    isAvailable: Boolean(isAvailable),
    assignedStaffIds: Array.isArray(assignedStaffIds) ? assignedStaffIds : [],
    assignedStaffNames: Array.isArray(assignedStaffNames)
      ? assignedStaffNames
      : [],
    notes: String(notes || "").trim(),
    color: String(color || "blue"),
    claimMode: claimMode === "instant" ? "instant" : "approval",
    staffNeeded: Math.max(1, Number(staffNeeded || 1)),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

export const deleteShift = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { shiftId } = request.data;

  if (!shiftId) {
    throw new HttpsError("invalid-argument", "shiftId is required");
  }

  const shiftSnap = await db.collection("orgShifts").doc(shiftId).get();
  if (!shiftSnap.exists) {
    throw new HttpsError("not-found", "Shift not found");
  }

  const shift = shiftSnap.data();
  await assertCanManageOrg(shift?.orgId, auth.uid, auth.token.email);

  await db.collection("orgShifts").doc(shiftId).delete();

  return { success: true };
});

export const duplicateShift = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { shiftId } = request.data;

  if (!shiftId) {
    throw new HttpsError("invalid-argument", "shiftId is required");
  }

  const shiftSnap = await db.collection("orgShifts").doc(shiftId).get();
  if (!shiftSnap.exists) {
    throw new HttpsError("not-found", "Shift not found");
  }

  const shift = shiftSnap.data();
  if (!shift) {
    throw new HttpsError("not-found", "Shift not found");
  }

  await assertCanManageOrg(shift.orgId, auth.uid, auth.token.email);

  const duplicatedStart = admin.firestore.Timestamp.fromDate(
    new Date(shift.start.toDate())
  );

  const duplicatedEnd = admin.firestore.Timestamp.fromDate(
    new Date(shift.end.toDate())
  );

  const newShiftRef = db.collection("orgShifts").doc();

  await newShiftRef.set({
    ...shift,
    start: duplicatedStart,
    end: duplicatedEnd,
    createdBy: auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { shiftId: newShiftRef.id };
});
