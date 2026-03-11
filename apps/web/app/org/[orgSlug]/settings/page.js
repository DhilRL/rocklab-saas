"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "../../../../lib/firebase";

const ADMIN_ROLES = ["owner", "admin", "manager"];

const ICON_OPTIONS = [
  "🧗", "🛎️", "☕", "🧹", "💻", "📋", "📦", "🎟️", "🔧", "🧼",
  "🏃", "🧑‍🏫", "🛠️", "📞", "🧃", "🍽️", "🚪", "🎯", "🧠", "⭐",
  "🪜", "🧲", "🧰", "🪣", "🎪", "📍", "🚨", "🕹️", "🏷️", "🧭"
];

const DEFAULT_RANK_OPTIONS = [
  "crew",
  "senior",
  "coach",
  "supervisor",
  "manager",
  "admin",
];

const PAYROLL_MODE_OPTIONS = [
  { value: "rank_only", label: "Rank Only" },
  { value: "rank_only_with_milestones", label: "Rank Only + Milestones" },
  { value: "shift_override", label: "Shift Override" },
  { value: "shift_override_with_milestones", label: "Shift Override + Milestones" },
];

const MILESTONE_APPLICATION_OPTIONS = [
  { value: "replace_final", label: "Replace Final Rate" },
];

function emptyShiftType() {
  return {
    id: "",
    name: "",
    icon: "🧗",
    allowedRanks: [],
    overrideRates: {},
  };
}

function emptyRankForm() {
  return {
    id: "",
    name: "",
    baseRate: "",
    milestones: [],
  };
}

function emptyMilestone() {
  return {
    minHours: "",
    rate: "",
  };
}

function normalizeIdFromName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function sortMilestones(milestones = []) {
  return [...milestones].sort(
    (a, b) => Number(a.minHours || 0) - Number(b.minHours || 0)
  );
}

function buildDefaultPayrollSettings(existing) {
  return {
    payModel: existing?.payModel || "rank_only",
    milestoneApplication: "replace_final",
    ranks: existing?.ranks || DEFAULT_RANK_OPTIONS.reduce((acc, rank) => {
      acc[rank] = {
        baseRate: "",
        milestones: [],
      };
      return acc;
    }, {}),
  };
}

function HelpTip({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span>{title}</span>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "#475569",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        ?
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 340,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            {children}
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsPage({ params }) {
  const { orgSlug } = params;

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingShiftTypes, setSavingShiftTypes] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);

  const [org, setOrg] = useState(null);
  const [member, setMember] = useState(null);

  const [orgName, setOrgName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [weekStart, setWeekStart] = useState("monday");

  const [shiftTypes, setShiftTypes] = useState([]);
  const [shiftTypeForm, setShiftTypeForm] = useState(emptyShiftType());
  const [editingShiftTypeId, setEditingShiftTypeId] = useState("");

  const [payrollSettings, setPayrollSettings] = useState(buildDefaultPayrollSettings());
  const [rankForm, setRankForm] = useState(emptyRankForm());
  const [editingRankId, setEditingRankId] = useState("");

  const role = member?.role || "staff";
  const isAdmin = useMemo(() => ADMIN_ROLES.includes(role), [role]);
  const isOwner = role === "owner";

  const rankOptions = useMemo(() => {
    const rankKeys = Object.keys(payrollSettings?.ranks || {});
    return rankKeys.length ? rankKeys : DEFAULT_RANK_OPTIONS;
  }, [payrollSettings]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
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
        setOrgName(orgData.name || "");
        setWeekStart(orgData.weekStart || "monday");
        setShiftTypes(orgData.shiftTypes || []);
        setPayrollSettings(buildDefaultPayrollSettings(orgData.payrollSettings));

        const ownsOrg = orgData.ownerUid === firebaseUser.uid;

        if (ownsOrg) {
          setMember({
            role: "owner",
            status: "active",
            email: firebaseUser.email || "",
            fullName: firebaseUser.displayName || "",
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

        if (!memberSnap.empty) {
          setMember({ id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [orgSlug]);

  async function handleSaveOrgName(e) {
    e.preventDefault();
    if (!org?.id || !isAdmin) return;

    const trimmed = orgName.trim();
    if (!trimmed) {
      alert("Organization name cannot be empty.");
      return;
    }

    try {
      setSavingName(true);
      await updateDoc(doc(db, "orgs", org.id), { name: trimmed });
      setOrg((prev) => ({ ...prev, name: trimmed }));
      alert("Organization name saved.");
    } catch (error) {
      console.error(error);
      alert("Failed to save organization name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveLogo() {
    if (!org?.id || !isOwner) return;

    if (!selectedFile) {
      alert("Please choose an image first.");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    try {
      setSavingLogo(true);

      const extension = selectedFile.name.split(".").pop() || "png";
      const fileRef = ref(storage, `org-logos/${org.id}/logo.${extension}`);

      await uploadBytes(fileRef, selectedFile);
      const downloadURL = await getDownloadURL(fileRef);

      await updateDoc(doc(db, "orgs", org.id), {
        logoUrl: downloadURL,
      });

      setOrg((prev) => ({
        ...prev,
        logoUrl: downloadURL,
      }));

      setSelectedFile(null);
      setSelectedFileName("");
      alert("Organization logo saved.");
    } catch (error) {
      console.error(error);
      alert("Failed to save organization logo.");
    } finally {
      setSavingLogo(false);
    }
  }

  async function handleSaveScheduleSettings() {
    if (!org?.id || !isAdmin) return;

    try {
      setSavingSchedule(true);
      await updateDoc(doc(db, "orgs", org.id), {
        weekStart,
      });
      setOrg((prev) => ({ ...prev, weekStart }));
      alert("Schedule settings saved.");
    } catch (error) {
      console.error(error);
      alert("Failed to save schedule settings.");
    } finally {
      setSavingSchedule(false);
    }
  }

  function handleToggleRankForShiftType(rank) {
    setShiftTypeForm((prev) => {
      const exists = prev.allowedRanks.includes(rank);
      const nextAllowedRanks = exists
        ? prev.allowedRanks.filter((r) => r !== rank)
        : [...prev.allowedRanks, rank];

      const nextOverrideRates = { ...prev.overrideRates };
      if (exists) {
        delete nextOverrideRates[rank];
      }

      return {
        ...prev,
        allowedRanks: nextAllowedRanks,
        overrideRates: nextOverrideRates,
      };
    });
  }

  function handleShiftTypeRateChange(rank, value) {
    setShiftTypeForm((prev) => ({
      ...prev,
      overrideRates: {
        ...prev.overrideRates,
        [rank]: value,
      },
    }));
  }

  function startEditShiftType(type) {
    setEditingShiftTypeId(type.id);
    setShiftTypeForm({
      id: type.id,
      name: type.name || "",
      icon: type.icon || "🧗",
      allowedRanks: type.allowedRanks || [],
      overrideRates: type.overrideRates || {},
    });
  }

  function resetShiftTypeForm() {
    setEditingShiftTypeId("");
    setShiftTypeForm(emptyShiftType());
  }

  async function handleSaveShiftType() {
    if (!org?.id || !isAdmin) return;

    const name = shiftTypeForm.name.trim();
    if (!name) {
      alert("Shift type name is required.");
      return;
    }

    const id = editingShiftTypeId || normalizeIdFromName(name);

    if (!id) {
      alert("Shift type ID could not be generated.");
      return;
    }

    const nextType = {
      id,
      name,
      icon: shiftTypeForm.icon || "🧗",
      allowedRanks: shiftTypeForm.allowedRanks || [],
      overrideRates: shiftTypeForm.overrideRates || {},
    };

    const nextShiftTypes = editingShiftTypeId
      ? shiftTypes.map((type) => (type.id === editingShiftTypeId ? nextType : type))
      : [...shiftTypes, nextType];

    try {
      setSavingShiftTypes(true);
      await updateDoc(doc(db, "orgs", org.id), {
        shiftTypes: nextShiftTypes,
      });
      setShiftTypes(nextShiftTypes);
      setOrg((prev) => ({ ...prev, shiftTypes: nextShiftTypes }));
      resetShiftTypeForm();
    } catch (error) {
      console.error(error);
      alert("Failed to save shift type.");
    } finally {
      setSavingShiftTypes(false);
    }
  }

  async function handleDeleteShiftType(typeId) {
    if (!org?.id || !isAdmin) return;

    const confirmed = window.confirm("Delete this shift type?");
    if (!confirmed) return;

    const nextShiftTypes = shiftTypes.filter((type) => type.id !== typeId);

    try {
      setSavingShiftTypes(true);
      await updateDoc(doc(db, "orgs", org.id), {
        shiftTypes: nextShiftTypes,
      });
      setShiftTypes(nextShiftTypes);
      setOrg((prev) => ({ ...prev, shiftTypes: nextShiftTypes }));

      if (editingShiftTypeId === typeId) {
        resetShiftTypeForm();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete shift type.");
    } finally {
      setSavingShiftTypes(false);
    }
  }

  function resetRankForm() {
    setEditingRankId("");
    setRankForm(emptyRankForm());
  }

  function startEditRank(rankId) {
    const rankConfig = payrollSettings?.ranks?.[rankId] || {
      baseRate: "",
      milestones: [],
    };

    setEditingRankId(rankId);
    setRankForm({
      id: rankId,
      name: rankId,
      baseRate: rankConfig.baseRate ?? "",
      milestones: sortMilestones(rankConfig.milestones || []),
    });
  }

  function handleRankMilestoneChange(index, field, value) {
    setRankForm((prev) => {
      const nextMilestones = [...prev.milestones];
      nextMilestones[index] = {
        ...nextMilestones[index],
        [field]: value,
      };
      return {
        ...prev,
        milestones: nextMilestones,
      };
    });
  }

  function handleAddMilestoneRow() {
    setRankForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, emptyMilestone()],
    }));
  }

  function handleRemoveMilestoneRow(index) {
    setRankForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveRank() {
    if (!org?.id || !isAdmin) return;

    const rankName = rankForm.name.trim();
    const rankId = normalizeIdFromName(rankName);

    if (!rankName || !rankId) {
      alert("Rank name is required.");
      return;
    }

    const normalizedMilestones = sortMilestones(
      (rankForm.milestones || [])
        .filter((m) => m.minHours !== "" && m.rate !== "")
        .map((m) => ({
          minHours: Number(m.minHours),
          rate: Number(m.rate),
        }))
    );

    const nextRanks = {
      ...(payrollSettings?.ranks || {}),
    };

    if (editingRankId && editingRankId !== rankId) {
      delete nextRanks[editingRankId];
    }

    nextRanks[rankId] = {
      baseRate:
        rankForm.baseRate === "" ? "" : Number(rankForm.baseRate),
      milestones: normalizedMilestones,
    };

    const nextPayrollSettings = {
      ...payrollSettings,
      ranks: nextRanks,
      milestoneApplication: "replace_final",
    };

    try {
      setSavingPayroll(true);
      await updateDoc(doc(db, "orgs", org.id), {
        payrollSettings: nextPayrollSettings,
      });
      setPayrollSettings(nextPayrollSettings);
      setOrg((prev) => ({ ...prev, payrollSettings: nextPayrollSettings }));
      resetRankForm();
    } catch (error) {
      console.error(error);
      alert("Failed to save rank.");
    } finally {
      setSavingPayroll(false);
    }
  }

  async function handleDeleteRank(rankId) {
    if (!org?.id || !isAdmin) return;

    const confirmed = window.confirm("Delete this rank?");
    if (!confirmed) return;

    const nextRanks = {
      ...(payrollSettings?.ranks || {}),
    };

    delete nextRanks[rankId];

    const nextShiftTypes = shiftTypes.map((type) => {
      const nextAllowedRanks = (type.allowedRanks || []).filter((r) => r !== rankId);
      const nextOverrideRates = { ...(type.overrideRates || {}) };
      delete nextOverrideRates[rankId];

      return {
        ...type,
        allowedRanks: nextAllowedRanks,
        overrideRates: nextOverrideRates,
      };
    });

    const nextPayrollSettings = {
      ...payrollSettings,
      ranks: nextRanks,
      milestoneApplication: "replace_final",
    };

    try {
      setSavingPayroll(true);
      await updateDoc(doc(db, "orgs", org.id), {
        payrollSettings: nextPayrollSettings,
        shiftTypes: nextShiftTypes,
      });
      setPayrollSettings(nextPayrollSettings);
      setShiftTypes(nextShiftTypes);
      setOrg((prev) => ({
        ...prev,
        payrollSettings: nextPayrollSettings,
        shiftTypes: nextShiftTypes,
      }));

      if (editingRankId === rankId) {
        resetRankForm();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete rank.");
    } finally {
      setSavingPayroll(false);
    }
  }

  async function handleSavePayrollSettings() {
    if (!org?.id || !isAdmin) return;

    const nextPayrollSettings = {
      ...payrollSettings,
      milestoneApplication: "replace_final",
    };

    try {
      setSavingPayroll(true);
      await updateDoc(doc(db, "orgs", org.id), {
        payrollSettings: nextPayrollSettings,
      });
      setPayrollSettings(nextPayrollSettings);
      setOrg((prev) => ({ ...prev, payrollSettings: nextPayrollSettings }));
      alert("Payroll settings saved.");
    } catch (error) {
      console.error(error);
      alert("Failed to save payroll settings.");
    } finally {
      setSavingPayroll(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!org || !member) {
    return (
      <div style={{ padding: 24 }}>
        <p>Unable to load organization settings.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Settings</h1>
        <p>You do not have permission to manage organization settings.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          Configure payroll logic, shift types, schedule behavior, and organization details.
        </p>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Payroll Settings</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Build one pay system that supports rank-only pay, shift overrides, and hour-based milestones.
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              maxWidth: 720,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>
                <HelpTip title="Payroll Mode">
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <strong>Rank Only</strong>
                      <div>Manager is always $15/hr.</div>
                    </div>

                    <div>
                      <strong>Rank Only + Milestones</strong>
                      <div>
                        Manager starts at $15/hr, becomes $16/hr after 20 hours this month,
                        then $18/hr after 40 hours. This applies regardless of which shift
                        type they worked.
                      </div>
                    </div>

                    <div>
                      <strong>Shift Override</strong>
                      <div>
                        Manager is usually $15/hr, but a counter shift might pay $12/hr.
                      </div>
                    </div>

                    <div>
                      <strong>Shift Override + Milestones</strong>
                      <div>
                        Shift override applies first. If a milestone threshold is reached,
                        the milestone rate becomes the final hourly rate.
                      </div>
                    </div>
                  </div>
                </HelpTip>
              </label>

              <select
                value={payrollSettings.payModel}
                onChange={(e) =>
                  setPayrollSettings((prev) => ({
                    ...prev,
                    payModel: e.target.value,
                  }))
                }
              >
                {PAYROLL_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>
                <HelpTip title="Milestone Application">
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <strong>Replace Final Rate</strong>
                      <div>
                        If milestone applies, it becomes the final rate no matter what the base
                        or shift override was.
                      </div>
                    </div>
                  </div>
                </HelpTip>
              </label>

              <select
                value="replace_final"
                disabled
                onChange={() => {}}
              >
                {MILESTONE_APPLICATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSavePayrollSettings}
              disabled={savingPayroll}
            >
              {savingPayroll ? "Saving..." : "Save Payroll Settings"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "1.15fr 1fr",
            }}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <h4 style={{ margin: 0 }}>Rank Builder</h4>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 600 }}>Rank Name</label>
                <input
                  value={rankForm.name}
                  onChange={(e) =>
                    setRankForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. manager"
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 600 }}>Base Hourly Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rankForm.baseRate}
                  onChange={(e) =>
                    setRankForm((prev) => ({ ...prev, baseRate: e.target.value }))
                  }
                  placeholder="e.g. 15"
                />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Milestones</div>

                {(rankForm.milestones || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No milestones added for this rank yet.
                  </div>
                ) : (
                  rankForm.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto",
                        gap: 10,
                        alignItems: "end",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <label>Min Monthly Hours</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={milestone.minHours}
                          onChange={(e) =>
                            handleRankMilestoneChange(index, "minHours", e.target.value)
                          }
                        />
                      </div>

                      <div style={{ display: "grid", gap: 6 }}>
                        <label>Hourly Rate</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={milestone.rate}
                          onChange={(e) =>
                            handleRankMilestoneChange(index, "rate", e.target.value)
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleRemoveMilestoneRow(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}

                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddMilestoneRow}
                  >
                    Add Milestone
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveRank}
                  disabled={savingPayroll}
                >
                  {savingPayroll
                    ? "Saving..."
                    : editingRankId
                    ? "Save Rank"
                    : "Add Rank"}
                </button>

                {editingRankId ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetRankForm}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <h4 style={{ margin: 0 }}>Existing Ranks</h4>

              {rankOptions.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No ranks yet.</div>
              ) : (
                rankOptions.map((rankId) => {
                  const config = payrollSettings?.ranks?.[rankId] || {
                    baseRate: "",
                    milestones: [],
                  };

                  return (
                    <div
                      key={rankId}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 12,
                        display: "grid",
                        gap: 8,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{rankId}</div>

                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Base rate: {config.baseRate === "" ? "—" : `$${config.baseRate}/hr`}
                      </div>

                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Milestones: {(config.milestones || []).length}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => startEditRank(rankId)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleDeleteRank(rankId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Shift Settings</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Create shift types, assign icons, choose which ranks can apply, and define override rates by rank.
        </p>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1.2fr 1fr",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>Shift Type Name</label>
              <input
                value={shiftTypeForm.name}
                onChange={(e) =>
                  setShiftTypeForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Front Desk"
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>Icon</label>
              <select
                value={shiftTypeForm.icon}
                onChange={(e) =>
                  setShiftTypeForm((prev) => ({ ...prev, icon: e.target.value }))
                }
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>Allowed Ranks</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {rankOptions.map((rank) => {
                  const active = shiftTypeForm.allowedRanks.includes(rank);
                  return (
                    <button
                      key={rank}
                      type="button"
                      className={active ? "btn btn-primary" : "btn btn-secondary"}
                      onClick={() => handleToggleRankForShiftType(rank)}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>Override Rate by Rank</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {shiftTypeForm.allowedRanks.map((rank) => (
                  <div key={rank} style={{ display: "grid", gap: 6 }}>
                    <label>{rank}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shiftTypeForm.overrideRates[rank] || ""}
                      onChange={(e) => handleShiftTypeRateChange(rank, e.target.value)}
                      placeholder="Leave blank to use rank base rate"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveShiftType}
                disabled={savingShiftTypes}
              >
                {savingShiftTypes
                  ? "Saving..."
                  : editingShiftTypeId
                  ? "Save Shift Type"
                  : "Add Shift Type"}
              </button>

              {editingShiftTypeId ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetShiftTypeForm}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <h4 style={{ margin: 0 }}>Existing Shift Types</h4>

            {shiftTypes.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No shift types yet.</div>
            ) : (
              shiftTypes.map((type) => (
                <div
                  key={type.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {type.icon || "🧩"} {type.name}
                  </div>

                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Allowed ranks: {(type.allowedRanks || []).join(", ") || "—"}
                  </div>

                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Override rates:{" "}
                    {Object.keys(type.overrideRates || {}).length === 0
                      ? "None"
                      : Object.entries(type.overrideRates || {})
                          .map(([rank, rate]) => `${rank}: $${rate}/hr`)
                          .join(" • ")}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => startEditShiftType(type)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDeleteShiftType(type.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Schedule Settings</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Choose how the calendar week should begin.
        </p>

        <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
          <label style={{ fontWeight: 600 }}>Week Starts On</label>
          <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveScheduleSettings}
            disabled={savingSchedule}
            style={{ width: "fit-content" }}
          >
            {savingSchedule ? "Saving..." : "Save Schedule Settings"}
          </button>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Organization Settings</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Update your organization branding and workspace details.
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          <form
            onSubmit={handleSaveOrgName}
            style={{ display: "grid", gap: 12, maxWidth: 560 }}
          >
            <label
              htmlFor="orgName"
              style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}
            >
              Organization Name
            </label>

            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              required
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingName}
              style={{ width: "fit-content" }}
            >
              {savingName ? "Saving..." : "Save Organization Name"}
            </button>
          </form>

          <div>
            <h4 style={{ marginTop: 0 }}>Organization Logo</h4>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
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
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt="Organization logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: 28, color: "#6b7280" }}>
                    {(org.name || orgSlug || "O").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gap: 10, minWidth: 280 }}>
                {isOwner ? (
                  <>
                    <label
                      htmlFor="orgLogoFile"
                      className="btn btn-secondary"
                      style={{ width: "fit-content", cursor: "pointer" }}
                    >
                      Choose Logo File
                    </label>

                    <input
                      id="orgLogoFile"
                      type="file"
                      accept="image/*"
                      disabled={savingLogo}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        setSelectedFileName(file?.name || "");
                      }}
                    />

                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {selectedFileName || "No file selected"}
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveLogo}
                      disabled={savingLogo}
                      style={{ width: "fit-content" }}
                    >
                      {savingLogo ? "Saving..." : "Save Logo"}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Only the owner can upload or change the organization logo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}