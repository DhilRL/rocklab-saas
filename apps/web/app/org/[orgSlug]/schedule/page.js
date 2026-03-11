"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, functions } from "../../../../lib/firebase";

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function toLocalDateInputValue(date) {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalTimeInputValue(date) {
  if (!date) return "";
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`);
}

function getMonthGrid(anchorDate, weekStartsOn) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

function emptyForm(memberOptions = [], shiftTypes = []) {
  const firstShiftType = shiftTypes[0] || null;

  return {
    title: "",
    shiftTypeId: firstShiftType?.id || "",
    date: toLocalDateInputValue(new Date()),
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    assignedMemberId: "",
    notes: "",
    memberOptions,
    shiftTypes,
  };
}

function ShiftModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
  saving,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            {mode === "create" ? "Add Shift" : "Edit Shift"}
          </h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            {mode === "create"
              ? "Create a new shift for your team."
              : "Update, duplicate, or remove this shift."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Front Desk Morning"
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Shift Type</label>
            <select
              value={form.shiftTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, shiftTypeId: e.target.value }))}
            >
              <option value="">Select shift type</option>
              {form.shiftTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon || "🧩"} {type.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Assigned Staff</label>
            <select
              value={form.assignedMemberId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  assignedMemberId: e.target.value,
                  isAvailable: e.target.value ? false : prev.isAvailable,
                }))
              }
            >
              <option value="">Unassigned</option>
              {form.memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nickname || member.fullName || member.email}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Start Time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "end",
              gap: 10,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isAvailable: e.target.checked,
                    assignedMemberId: e.target.checked ? "" : prev.assignedMemberId,
                  }))
                }
              />
              Available shift
            </label>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onDuplicate}
                  disabled={saving}
                >
                  Duplicate Shift
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onDelete}
                  disabled={saving}
                >
                  Delete Shift
                </button>
              </>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : mode === "create" ? "Create Shift" : "Save Shift"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getShiftTypeById(shiftTypes, id) {
  return shiftTypes.find((type) => type.id === id) || null;
}

function monthKeyFromDate(date) {
  return format(date, "yyyy-MM");
}

function getDaysInAnchorMonth(anchorDate) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const days = [];
  let cursor = monthStart;

  while (cursor <= monthEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function BulkQuickAddModal({ open, form, setForm, onClose, onSave, saving }) {
  if (!open) return null;

  const weekDays = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Bulk Quick Add Shifts</h2>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          Create a batch of shifts for the month you are currently viewing.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Batch Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. April Front Desk"
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Shift Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Front Desk"
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Shift Type</label>
            <select
              value={form.shiftTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, shiftTypeId: e.target.value }))}
            >
              <option value="">Select shift type</option>
              {form.shiftTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon || "🧩"} {type.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Weekdays</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {weekDays.map((day) => {
                const active = form.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={active ? "btn btn-primary" : "btn btn-secondary"}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        weekdays: active
                          ? prev.weekdays.filter((d) => d !== day.value)
                          : [...prev.weekdays, day.value].sort(),
                      }))
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Start Time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Adding..." : "Add Bulk Shifts"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage({ params }) {
  const { orgSlug } = params;

  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingShift, setSavingShift] = useState(false);
  const [monthBiddingOpen, setMonthBiddingOpen] = useState(true);
  const [updatingBidding, setUpdatingBidding] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: "",
    title: "",
    shiftTypeId: "",
    shiftTypes: [],
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedShift, setSelectedShift] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const weekStartsOn = org?.weekStart === "sunday" ? 0 : 1;
  const shiftTypes = org?.shiftTypes || [];

  const createShiftFn = httpsCallable(functions, "createShift");
  const updateShiftFn = httpsCallable(functions, "updateShift");
  const deleteShiftFn = httpsCallable(functions, "deleteShift");
  const duplicateShiftFn = httpsCallable(functions, "duplicateShift");

  async function loadOrgData(currentUser) {
    const orgSnap = await getDocs(
      query(collection(db, "orgs"), where("slug", "==", orgSlug))
    );

    if (orgSnap.empty) {
      throw new Error("Organization not found.");
    }

    const orgDoc = orgSnap.docs[0];
    const orgData = { id: orgDoc.id, ...orgDoc.data() };
    setOrg(orgData);

    const membersSnap = await getDocs(
      query(collection(db, "orgMembers"), where("orgId", "==", orgDoc.id))
    );

    const memberRows = membersSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((m) => m.status === "active")
      .sort((a, b) =>
        (a.nickname || a.fullName || a.email || "").localeCompare(
          b.nickname || b.fullName || b.email || ""
        )
      );

    setMembers(memberRows);

    const shiftsSnap = await getDocs(
      query(collection(db, "orgShifts"), where("orgId", "==", orgDoc.id))
    );

    const shiftRows = shiftsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start: toDateSafe(data.start),
        end: toDateSafe(data.end),
      };
    });

    setShifts(shiftRows);
    setForm(emptyForm(memberRows, orgData.shiftTypes || []));
    setQuickForm((prev) => ({
      ...prev,
      title: prev.title || (orgData.shiftTypes?.[0]?.name ? `${orgData.shiftTypes[0].name} Shift` : "Quick Shift"),
      shiftTypeId: prev.shiftTypeId || orgData.shiftTypes?.[0]?.id || "",
      shiftTypes: orgData.shiftTypes || [],
    }));
    setUser(currentUser);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await loadOrgData(currentUser);
      } catch (err) {
        console.error(err);
        alert(err?.message || "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [orgSlug]);

  const monthGrid = useMemo(
    () => getMonthGrid(anchorDate, weekStartsOn),
    [anchorDate, weekStartsOn]
  );

  const weekDayNames = useMemo(() => {
    return weekStartsOn === 1
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }, [weekStartsOn]);

  const visibleRangeStart = useMemo(
    () => startOfWeek(startOfMonth(anchorDate), { weekStartsOn }),
    [anchorDate, weekStartsOn]
  );

  const visibleRangeEnd = useMemo(
    () => endOfWeek(endOfMonth(anchorDate), { weekStartsOn }),
    [anchorDate, weekStartsOn]
  );

  const displayShifts = useMemo(() => {
    let rows = shifts.filter((shift) => {
      if (!shift.start) return false;
      return shift.start >= visibleRangeStart && shift.start <= visibleRangeEnd;
    });

    if (showAvailableOnly) {
      rows = rows.filter((shift) => shift.isAvailable || !shift.assignedStaffIds?.length);
    }

    if (showMineOnly && user?.uid) {
      rows = rows.filter(
        (shift) =>
          Array.isArray(shift.assignedStaffIds) &&
          shift.assignedStaffIds.includes(user.uid)
      );
    }

    return rows.sort((a, b) => a.start - b.start);
  }, [shifts, showAvailableOnly, showMineOnly, user, visibleRangeStart, visibleRangeEnd]);

  useEffect(() => {
    const monthKey = monthKeyFromDate(anchorDate);
    const isOpen = org?.scheduleBidding?.[monthKey];
    setMonthBiddingOpen(typeof isOpen === "boolean" ? isOpen : true);
  }, [anchorDate, org]);

  async function setBiddingForMonth(isOpen) {
    if (!org?.id) return;

    const monthKey = monthKeyFromDate(anchorDate);
    try {
      setUpdatingBidding(true);
      await updateDoc(doc(db, "orgs", org.id), {
        [`scheduleBidding.${monthKey}`]: isOpen,
      });

      setOrg((prev) => ({
        ...prev,
        scheduleBidding: {
          ...(prev?.scheduleBidding || {}),
          [monthKey]: isOpen,
        },
      }));
      setMonthBiddingOpen(isOpen);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to update bidding status.");
    } finally {
      setUpdatingBidding(false);
    }
  }

  async function handleAddQuickShifts(config = quickForm) {
    if (!org?.id) return;

    const title = String(config.title || "").trim();
    const batchName = String(config.name || "").trim();

    if (!title) {
      alert("Please enter a shift title.");
      return;
    }
    if (!config.shiftTypeId) {
      alert("Please select a shift type.");
      return;
    }
    if (!config.weekdays?.length) {
      alert("Please select at least one weekday.");
      return;
    }

    const days = getDaysInAnchorMonth(anchorDate).filter((day) =>
      config.weekdays.includes(day.getDay())
    );

    if (!days.length) {
      alert("No matching days found in this month.");
      return;
    }

    try {
      setQuickSaving(true);
      const createdShifts = [];

      for (const day of days) {
        const date = toLocalDateInputValue(day);
        const start = combineDateAndTime(date, config.startTime);
        const end = combineDateAndTime(date, config.endTime);
        if (!start || !end || end <= start) continue;

        const payload = {
          orgId: org.id,
          title,
          shiftType: config.shiftTypeId,
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          isAvailable: true,
          assignedStaffIds: [],
          assignedStaffNames: [],
          notes: batchName ? `Bulk batch: ${batchName}` : "Quick added",
        };

        const result = await createShiftFn(payload);
        const newShiftId = result.data?.shiftId;

        if (newShiftId) {
          createdShifts.push({
            id: newShiftId,
            ...payload,
            start,
            end,
            shiftTypeId: payload.shiftType,
          });
        }
      }

      setShifts((prev) => [...prev, ...createdShifts]);
      setQuickModalOpen(false);
      alert(`Added ${createdShifts.length} quick shifts for ${format(anchorDate, "MMMM yyyy")}.`);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to add quick shifts.");
    } finally {
      setQuickSaving(false);
    }
  }

  function openCreateModal(day) {
    setModalMode("create");
    setSelectedShift(null);
    setForm({
      ...emptyForm(members, shiftTypes),
      date: toLocalDateInputValue(day || new Date()),
    });
    setModalOpen(true);
  }

  function openEditModal(shift) {
    setModalMode("edit");
    setSelectedShift(shift);
    setForm({
      title: shift.title || "",
      shiftTypeId: shift.shiftTypeId || "",
      date: toLocalDateInputValue(shift.start),
      startTime: toLocalTimeInputValue(shift.start),
      endTime: toLocalTimeInputValue(shift.end),
      isAvailable: !!shift.isAvailable,
      assignedMemberId: shift.assignedStaffIds?.[0] || "",
      notes: shift.notes || "",
      memberOptions: members,
      shiftTypes,
    });
    setModalOpen(true);
  }

  function buildShiftPayload() {
    const title = String(form.title || "").trim();
    const start = combineDateAndTime(form.date, form.startTime);
    const end = combineDateAndTime(form.date, form.endTime);

    if (!org?.id) throw new Error("Organization not loaded.");
    if (!title) throw new Error("Please enter a shift title.");
    if (!form.shiftTypeId) throw new Error("Please select a shift type.");
    if (!start || !end) throw new Error("Please choose a valid date and time range.");
    if (end <= start) throw new Error("Shift end time must be after start time.");

    const assignedMember = form.assignedMemberId
      ? form.memberOptions.find((m) => m.id === form.assignedMemberId)
      : null;

    return {
      orgId: org.id,
      title,
      shiftType: form.shiftTypeId,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      isAvailable: form.isAvailable,
      assignedStaffIds: assignedMember ? [assignedMember.id] : [],
      assignedStaffNames: assignedMember
        ? [assignedMember.nickname || assignedMember.fullName || assignedMember.email || "Staff"]
        : [],
      notes: String(form.notes || "").trim(),
    };
  }

  async function handleSaveShift() {
    try {
      setSavingShift(true);
      const payload = buildShiftPayload();

      if (modalMode === "create") {
        const result = await createShiftFn(payload);
        const newShiftId = result.data?.shiftId;

        if (newShiftId) {
          const optimisticShift = {
            id: newShiftId,
            ...payload,
            start: new Date(payload.startIso),
            end: new Date(payload.endIso),
            shiftTypeId: payload.shiftType,
          };

          setShifts((prev) => [...prev, optimisticShift]);
        }
      } else if (selectedShift?.id) {
        await updateShiftFn({
          shiftId: selectedShift.id,
          ...payload,
        });

        setShifts((prev) =>
          prev.map((shift) =>
            shift.id === selectedShift.id
              ? {
                  ...shift,
                  ...payload,
                  start: new Date(payload.startIso),
                  end: new Date(payload.endIso),
                  shiftTypeId: payload.shiftType,
                }
              : shift
          )
        );
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleDeleteShift() {
    if (!selectedShift?.id) return;

    const confirmed = window.confirm("Delete this shift?");
    if (!confirmed) return;

    try {
      setSavingShift(true);
      await deleteShiftFn({ shiftId: selectedShift.id });
      setShifts((prev) => prev.filter((shift) => shift.id !== selectedShift.id));
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to delete shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleDuplicateShift() {
    if (!selectedShift?.id) return;

    try {
      setSavingShift(true);
      await duplicateShiftFn({ shiftId: selectedShift.id });
      await loadOrgData(user);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to duplicate shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleDropShift(shift, targetDay) {
    if (!shift?.id || !targetDay) return;

    const oldStart = shift.start;
    const oldEnd = shift.end;

    try {
      const durationMs = shift.end.getTime() - shift.start.getTime();

      const newStart = new Date(targetDay);
      newStart.setHours(shift.start.getHours(), shift.start.getMinutes(), 0, 0);

      const newEnd = new Date(newStart.getTime() + durationMs);

      setShifts((prev) =>
        prev.map((s) =>
          s.id === shift.id
            ? {
                ...s,
                start: newStart,
                end: newEnd,
              }
            : s
        )
      );

      await updateShiftFn({
        shiftId: shift.id,
        orgId: org.id,
        title: shift.title,
        shiftType: shift.shiftType || shift.shiftTypeId || "",
        startIso: newStart.toISOString(),
        endIso: newEnd.toISOString(),
        isAvailable: !!shift.isAvailable,
        assignedStaffIds: shift.assignedStaffIds || [],
        assignedStaffNames: shift.assignedStaffNames || [],
        notes: shift.notes || "",
      });
    } catch (err) {
      console.error(err);

      setShifts((prev) =>
        prev.map((s) =>
          s.id === shift.id
            ? {
                ...s,
                start: oldStart,
                end: oldEnd,
              }
            : s
        )
      );

      alert(err?.message || "Failed to move shift.");
    }
  }

  if (loading) {
    return <div>Loading schedule...</div>;
  }

  if (!org) {
    return <div>Organization not found.</div>;
  }

  return (
    <>
      <div className="topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1>Schedule</h1>
          <p>Organization: {org.name || orgSlug}</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setAnchorDate(subMonths(anchorDate, 1))}>
            Previous
          </button>
          <button className="btn btn-secondary" onClick={() => setAnchorDate(new Date())}>
            Today
          </button>
          <button className="btn btn-secondary" onClick={() => setAnchorDate(addMonths(anchorDate, 1))}>
            Next
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={() => setAnchorDate(subMonths(anchorDate, 1))}>
            ←
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, minWidth: 170, textAlign: "center" }}>
            {format(anchorDate, "MMMM yyyy")}
          </div>
          <button className="btn btn-secondary" onClick={() => setAnchorDate(addMonths(anchorDate, 1))}>
            →
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={monthBiddingOpen}
            disabled={updatingBidding}
            onChange={(e) => setBiddingForMonth(e.target.checked)}
          />
          {monthBiddingOpen ? "Bidding Open" : "Bidding Closed"}
        </label>

        <button
          className="btn btn-secondary"
          disabled={quickSaving}
          onClick={() =>
            handleAddQuickShifts({
              ...quickForm,
              name: quickForm.name || `Quick ${format(anchorDate, "MMMM yyyy")}`,
            })
          }
        >
          {quickSaving ? "Adding..." : "Add Quick"}
        </button>

        <button className="btn btn-primary" onClick={() => setQuickModalOpen(true)}>
          Bulk Add…
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={viewMode === "month" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setViewMode("month")}
          >
            Month
          </button>
          <button
            className={viewMode === "list" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => setShowAvailableOnly(e.target.checked)}
          />
          Available shifts only
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={showMineOnly}
            onChange={(e) => setShowMineOnly(e.target.checked)}
          />
          My shifts only
        </label>
      </div>

      {viewMode === "month" ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              borderBottom: "1px solid #e5e7eb",
              background: "#f8fafc",
            }}
          >
            {weekDayNames.map((day) => (
              <div
                key={day}
                style={{
                  padding: "12px 10px",
                  fontWeight: 700,
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {monthGrid.map((week, weekIndex) => (
            <div
              key={weekIndex}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                minHeight: 150,
                borderBottom: weekIndex === monthGrid.length - 1 ? "none" : "1px solid #e5e7eb",
              }}
            >
              {week.map((day) => {
                const dayShifts = displayShifts.filter((shift) =>
                  shift.start && isSameDay(shift.start, day)
                );

                return (
                  <div
                    key={day.toISOString()}
                    style={{
                      borderRight: day.getDay() === (weekStartsOn === 1 ? 0 : 6) ? "none" : "1px solid #e5e7eb",
                      padding: 10,
                      background: isSameMonth(day, anchorDate) ? "#fff" : "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData("text/plain");
                      if (!raw) return;
                      const parsed = JSON.parse(raw);
                      const shift = shifts.find((s) => s.id === parsed.id);
                      if (shift) await handleDropShift(shift, day);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: isSameMonth(day, anchorDate) ? "#111827" : "#94a3b8",
                        }}
                      >
                        {format(day, "d")}
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreateModal(day)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#2563eb",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      {dayShifts.map((shift) => {
                        const shiftType = getShiftTypeById(shiftTypes, shift.shiftType || shift.shiftTypeId);

                        return (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                JSON.stringify({ id: shift.id })
                              );
                            }}
                            onClick={() => openEditModal(shift)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: `1px solid ${shift.isAvailable ? "#cbd5e1" : "#bfdbfe"}`,
                              background: shift.isAvailable ? "#f8fafc" : "#eff6ff",
                              color: shift.isAvailable ? "#475569" : "#1d4ed8",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{shift.title}</div>
                            <div>
                              {format(shift.start, "h:mm a")} - {format(shift.end, "h:mm a")}
                            </div>
                            <div style={{ opacity: 0.9 }}>
                              {shiftType ? `${shiftType.icon || "🧩"} ${shiftType.name}` : "Shift"}
                            </div>
                            <div style={{ opacity: 0.9 }}>
                              {shift.isAvailable
                                ? "Available"
                                : shift.assignedStaffNames?.[0] || "Assigned"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Title</th>
                <th>Shift Type</th>
                <th>Staff</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayShifts.length === 0 ? (
                <tr>
                  <td colSpan={6}>No shifts found.</td>
                </tr>
              ) : (
                displayShifts.map((shift) => {
                  const shiftType = getShiftTypeById(shiftTypes, shift.shiftType || shift.shiftTypeId);

                  return (
                    <tr
                      key={shift.id}
                      onClick={() => openEditModal(shift)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{format(shift.start, "EEE, d MMM yyyy")}</td>
                      <td>
                        {format(shift.start, "h:mm a")} - {format(shift.end, "h:mm a")}
                      </td>
                      <td>{shift.title}</td>
                      <td>{shiftType ? `${shiftType.icon || "🧩"} ${shiftType.name}` : "—"}</td>
                      <td>{shift.assignedStaffNames?.[0] || "—"}</td>
                      <td>{shift.isAvailable ? "Available" : "Assigned"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <ShiftModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveShift}
        onDuplicate={handleDuplicateShift}
        onDelete={handleDeleteShift}
        saving={savingShift}
      />

      <BulkQuickAddModal
        open={quickModalOpen}
        form={quickForm}
        setForm={setQuickForm}
        onClose={() => setQuickModalOpen(false)}
        onSave={() => handleAddQuickShifts(quickForm)}
        saving={quickSaving}
      />
    </>
  );
}
