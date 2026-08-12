"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../../../../lib/firebase";

const MIN_WIDTH = 500;
const MIN_HEIGHT = 500;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ProfilePage({ params }) {
  const { orgSlug } = params;

  const fileInputRef = useRef(null);

  const [member, setMember] = useState(null);
  const [org, setOrg] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [previewDimensions, setPreviewDimensions] = useState("");
  const [validationError, setValidationError] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    nickname: "",
    phone: "",
    telegramId: "",
  });

  const [saving, setSaving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const orgSnap = await getDocs(
          query(collection(db, "orgs"), where("slug", "==", orgSlug))
        );

        if (orgSnap.empty) return;

        const orgDoc = orgSnap.docs[0];
        const orgData = { id: orgDoc.id, ...orgDoc.data() };
        setOrg(orgData);

        let memberSnap = await getDocs(
          query(
            collection(db, "orgMembers"),
            where("orgId", "==", orgData.id),
            where("uid", "==", user.uid)
          )
        );

        if (memberSnap.empty) {
          const normalizedEmail = (user.email || "").toLowerCase().trim();

          memberSnap = await getDocs(
            query(
              collection(db, "orgMembers"),
              where("orgId", "==", orgData.id),
              where("email", "==", normalizedEmail)
            )
          );

          if (memberSnap.empty && user.email) {
            memberSnap = await getDocs(
              query(
                collection(db, "orgMembers"),
                where("orgId", "==", orgData.id),
                where("email", "==", user.email)
              )
            );
          }
        }

        if (memberSnap.empty) return;

        const memberDoc = memberSnap.docs[0];
        const memberData = { id: memberDoc.id, ...memberDoc.data(), uid: user.uid };

        setMember(memberData);
        setProfileForm({
          fullName: memberData.fullName || "",
          nickname: memberData.nickname || "",
          phone: memberData.phone || "",
          telegramId: memberData.telegramId || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        setValidationError("Failed to load profile.");
      }
    });

    return () => unsub();
  }, [orgSlug]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  function getImageDimensions(objectUrl) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error("Unable to load selected image."));
      };

      img.src = objectUrl;
    });
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setValidationError("");
    setPreviewDimensions("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
      setSelectedPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setSelectedFileName("");
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
      setSelectedPreviewUrl("");
      setValidationError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setSelectedFileName("");
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
      setSelectedPreviewUrl("");
      setValidationError(`Image must be ${MAX_FILE_SIZE_MB}MB or smaller.`);
      return;
    }

    try {
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }

      const objectUrl = URL.createObjectURL(file);

      setSelectedFile(file);
      setSelectedFileName(file.name);
      setSelectedPreviewUrl(objectUrl);

      const { width, height } = await getImageDimensions(objectUrl);
      setPreviewDimensions(`${width} × ${height}px`);

      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        setValidationError(
          `Image must be at least ${MIN_WIDTH} × ${MIN_HEIGHT}px.`
        );
        return;
      }

      setValidationError("");
    } catch (err) {
      console.error(err);
      setSelectedFile(null);
      setSelectedFileName("");
      setPreviewDimensions("");
      setSelectedPreviewUrl("");
      setValidationError(err?.message || "Failed to preview selected image.");
    }
  }

  async function handleSaveAvatar() {
    if (!selectedFile || !member || !org || validationError) return;

    try {
      setSaving(true);

      const storageRef = ref(
        storage,
        `staff-avatars/${org.id}/${member.uid}.jpg`
      );

      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "orgMembers", member.id), {
        photoUrl: downloadURL,
      });

      setMember((prev) => ({
        ...prev,
        photoUrl: downloadURL,
      }));

      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }

      setSelectedFile(null);
      setSelectedFileName("");
      setSelectedPreviewUrl("");
      setPreviewDimensions("");
      setValidationError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setValidationError(err?.message || "Failed to save profile photo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault();

    if (!member) return;

    try {
      setSavingDetails(true);

      const payload = {
        fullName: profileForm.fullName.trim(),
        nickname: profileForm.nickname.trim(),
        phone: profileForm.phone.trim(),
        telegramId: profileForm.telegramId.trim(),
      };

      await updateDoc(doc(db, "orgMembers", member.id), payload);

      setMember((prev) => ({
        ...prev,
        ...payload,
      }));
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save profile details.");
    } finally {
      setSavingDetails(false);
    }
  }

  if (!member || !org) {
    return <div style={{ padding: 24 }}>Loading profile...</div>;
  }

  const avatarSrc = selectedPreviewUrl || member.photoUrl || "";
  const initial = (member.fullName || member.email || "U").charAt(0).toUpperCase();
  const canSavePhoto = !!selectedFile && !saving && !validationError;

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ marginTop: 0 }}>Profile</h1>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Profile Photo</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Upload any image shape. It will be cropped into a circle. Minimum{" "}
          {MIN_WIDTH} × {MIN_HEIGHT}px, maximum {MAX_FILE_SIZE_MB}MB.
        </p>

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "140px 1fr",
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#eef2f7",
                border: "1px solid #d1d5db",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar preview"
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
                    fontSize: 40,
                    fontWeight: 700,
                    color: "#6b7280",
                  }}
                >
                  {initial}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, minWidth: 300 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                display: "block",
                maxWidth: 320,
              }}
            />

            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {selectedFileName || "No file selected"}
            </div>

            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {previewDimensions || "Selected image dimensions will appear here"}
            </div>

            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={!canSavePhoto}
              className="btn btn-primary"
              style={{ width: "fit-content" }}
            >
              {saving ? "Saving..." : "Save Profile Photo"}
            </button>

            {selectedPreviewUrl && !validationError ? (
              <div style={{ fontSize: 13, color: "#2563eb" }}>
                New image preview loaded
              </div>
            ) : null}

            {validationError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>
                {validationError}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Staff Details</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Nickname will be useful for schedule views and shift labels.
        </p>

        <form
          onSubmit={handleSaveDetails}
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Full Name</label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Enter your full name"
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Nickname</label>
            <input
              type="text"
              value={profileForm.nickname}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, nickname: e.target.value }))
              }
              placeholder="How your name should appear in schedule"
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Phone</label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Enter your phone number"
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Telegram ID</label>
            <input
              type="text"
              value={profileForm.telegramId}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, telegramId: e.target.value }))
              }
              placeholder="e.g. @fadhil or 123456789"
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Email</label>
            <input type="text" value={member.email || ""} disabled />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Role</label>
            <input type="text" value={member.role || "staff"} disabled />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingDetails}
            >
              {savingDetails ? "Saving..." : "Save Staff Details"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Account Security</h3>
        <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 8 }}>
          This account signs in with Google.
        </p>
        <p style={{ color: "#374151", margin: 0 }}>
          Password changes are managed through your Google account, not inside this app.
        </p>
      </div>
    </div>
  );
}