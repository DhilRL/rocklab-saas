"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { resolveShiftHourlyRate } from "../../../../lib/payroll";
import AppHeader from "../../../../components/app-header";

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function getMonthKeyFromDate(date) {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return "Unknown";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function getShiftHours(shift) {
  const start = toDateSafe(shift.startAt);
  const end = toDateSafe(shift.endAt);
  if (!start || !end) return 0;
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function PayrollPage({ params }) {
  const { orgSlug } = params;

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [payrollRunsByMonth, setPayrollRunsByMonth] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState("");

  const loadPayrollData = useCallback(async () => {
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

      const [membersSnap, shiftsSnap, payrollRunsSnap] = await Promise.all([
        getDocs(query(collection(db, "orgMembers"), where("orgId", "==", orgDoc.id))),
        getDocs(query(collection(db, "shifts"), where("orgId", "==", orgDoc.id))),
        getDocs(query(collection(db, "payrollRuns"), where("orgId", "==", orgDoc.id))),
      ]);

      const memberRows = membersSnap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => (item.role || "").toLowerCase() !== "owner");

      const shiftRows = shiftsSnap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => !!item.assignedMemberId);

      const runs = payrollRunsSnap.docs.reduce((acc, item) => {
        const payload = item.data() || {};
        if (!payload.monthKey) return acc;
        acc[payload.monthKey] = {
          id: item.id,
          acknowledged: !!payload.acknowledged,
          locked: !!payload.locked,
          paidOut: !!payload.paidOut,
          updatedAt: payload.updatedAt || null,
        };
        return acc;
      }, {});

      setMembers(memberRows);
      setShifts(shiftRows);
      setPayrollRunsByMonth(runs);
    } catch (error) {
      console.error("Error loading payroll:", error);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    loadPayrollData();
  }, [orgSlug, loadPayrollData]);

  const monthOptions = useMemo(() => {
    const currentMonth = getMonthKeyFromDate(new Date());
    const fromShifts = shifts
      .map((shift) => getMonthKeyFromDate(toDateSafe(shift.startAt)))
      .filter(Boolean);
    const fromRuns = Object.keys(payrollRunsByMonth || {});

    const unique = new Set([currentMonth, ...fromShifts, ...fromRuns]);
    return [...unique].sort((a, b) => (a > b ? -1 : 1));
  }, [shifts, payrollRunsByMonth]);

  useEffect(() => {
    if (!selectedMonth && monthOptions.length) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [selectedMonth, monthOptions]);

  const selectedMonthSummary = useMemo(() => {
    if (!selectedMonth) {
      return {
        rows: [],
        totals: { totalHours: 0, totalGross: 0 },
      };
    }

    const monthShifts = shifts
      .filter((shift) => getMonthKeyFromDate(toDateSafe(shift.startAt)) === selectedMonth)
      .sort((a, b) => {
        const aTime = toDateSafe(a.startAt)?.getTime() || 0;
        const bTime = toDateSafe(b.startAt)?.getTime() || 0;
        return aTime - bTime;
      });

    const byMember = members.reduce((acc, member) => {
      acc[member.id] = {
        memberId: member.id,
        name: member.fullName || member.nickname || member.email || "Unknown staff",
        email: member.email || "",
        staffRank: member.staffRank || "cadet",
        totalHours: 0,
        totalGross: 0,
        shiftCount: 0,
      };
      return acc;
    }, {});

    const byMemberShifts = {};
    monthShifts.forEach((shift) => {
      const memberId = shift.assignedMemberId;
      if (!memberId || !byMember[memberId]) return;
      byMemberShifts[memberId] = byMemberShifts[memberId] || [];
      byMemberShifts[memberId].push(shift);
    });

    Object.entries(byMemberShifts).forEach(([memberId, memberShifts]) => {
      let cumulativeHours = 0;
      const memberRow = byMember[memberId];
      memberShifts.forEach((shift) => {
        const hours = getShiftHours(shift);
        if (hours <= 0) return;

        cumulativeHours += hours;

        const rateResult = resolveShiftHourlyRate({
          payrollSettings: org?.payrollSettings || {},
          shiftTypes: org?.shiftTypes || [],
          shiftTypeId: shift.shiftTypeId || "",
          staffRank: memberRow.staffRank,
          monthlyHours: cumulativeHours,
        });

        const rate = Number(rateResult?.resolvedHourlyRate || 0);

        memberRow.totalHours += hours;
        memberRow.totalGross += hours * rate;
        memberRow.shiftCount += 1;
      });
    });

    const rows = Object.values(byMember)
      .filter((row) => row.totalHours > 0)
      .sort((a, b) => b.totalGross - a.totalGross);

    const totals = rows.reduce(
      (acc, row) => {
        acc.totalHours += row.totalHours;
        acc.totalGross += row.totalGross;
        return acc;
      },
      { totalHours: 0, totalGross: 0 }
    );

    return { rows, totals };
  }, [selectedMonth, shifts, members, org]);

  const selectedRunStatus = payrollRunsByMonth[selectedMonth] || {
    acknowledged: false,
    locked: false,
    paidOut: false,
  };

  async function updateRunStatus(key, value) {
    if (!org?.id || !selectedMonth) return;
    const runDocId = `${org.id}_${selectedMonth}`;
    try {
      setSavingStatus(key);
      await setDoc(
        doc(db, "payrollRuns", runDocId),
        {
          orgId: org.id,
          monthKey: selectedMonth,
          [key]: value,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setPayrollRunsByMonth((prev) => ({
        ...prev,
        [selectedMonth]: {
          ...(prev[selectedMonth] || {}),
          [key]: value,
          id: runDocId,
        },
      }));
    } catch (error) {
      console.error("Failed to update payroll run status", error);
      alert("Failed to update payroll status.");
    } finally {
      setSavingStatus("");
    }
  }

  return (
    <>
      <AppHeader
        title="Payroll"
        subtitle={`Monthly payroll summary and status tracking for org: ${orgSlug}`}
      />

      <main className="main-content">
        <div className="panel" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 700 }}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={loading || monthOptions.length === 0}
              style={{ minWidth: 220 }}
            >
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Assigned Staff</div>
              <div className="value">{selectedMonthSummary.rows.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Hours</div>
              <div className="value">{selectedMonthSummary.totals.totalHours.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Gross Payroll</div>
              <div className="value">{money(selectedMonthSummary.totals.totalGross)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${selectedRunStatus.acknowledged ? "btn-primary" : "btn-secondary"}`}
              onClick={() => updateRunStatus("acknowledged", !selectedRunStatus.acknowledged)}
              disabled={!selectedMonth || savingStatus === "acknowledged"}
            >
              {savingStatus === "acknowledged"
                ? "Saving..."
                : selectedRunStatus.acknowledged
                  ? "Acknowledged"
                  : "Mark Acknowledged"}
            </button>
            <button
              type="button"
              className={`btn ${selectedRunStatus.locked ? "btn-primary" : "btn-secondary"}`}
              onClick={() => updateRunStatus("locked", !selectedRunStatus.locked)}
              disabled={!selectedMonth || savingStatus === "locked"}
            >
              {savingStatus === "locked"
                ? "Saving..."
                : selectedRunStatus.locked
                  ? "Locked"
                  : "Lock Month"}
            </button>
            <button
              type="button"
              className={`btn ${selectedRunStatus.paidOut ? "btn-primary" : "btn-secondary"}`}
              onClick={() => updateRunStatus("paidOut", !selectedRunStatus.paidOut)}
              disabled={!selectedMonth || savingStatus === "paidOut"}
            >
              {savingStatus === "paidOut"
                ? "Saving..."
                : selectedRunStatus.paidOut
                  ? "Paid Out"
                  : "Mark Paid"}
            </button>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          {loading ? (
            <p>Loading payroll...</p>
          ) : selectedMonthSummary.rows.length === 0 ? (
            <div className="empty-state">No assigned shifts found for this month.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Rank</th>
                  <th>Shifts</th>
                  <th>Hours</th>
                  <th>Gross Pay</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthSummary.rows.map((row) => (
                  <tr key={row.memberId}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{row.email || "—"}</div>
                    </td>
                    <td>{row.staffRank}</td>
                    <td>{row.shiftCount}</td>
                    <td>{row.totalHours.toFixed(2)}</td>
                    <td>{money(row.totalGross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
