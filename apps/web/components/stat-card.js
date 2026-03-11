export default function StatCard({ label, value, note }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note ? <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>{note}</div> : null}
    </div>
  );
}
