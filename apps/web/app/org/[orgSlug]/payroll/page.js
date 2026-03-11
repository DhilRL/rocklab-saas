import AppHeader from "../../../../components/app-header";

export default function PayrollPage({ params }) {
  return (
    <>
      <AppHeader title="Payroll" subtitle={`Payroll module placeholder for org: ${params.orgSlug}`} />
      <main className="main-content">
        <div className="empty-state">
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>This page is the next build step.</h3>
          <p style={{ margin: 0 }}>This will later show monthly runs, acknowledgement status, lock state, and paid-out marking.</p>
        </div>
      </main>
    </>
  );
}
