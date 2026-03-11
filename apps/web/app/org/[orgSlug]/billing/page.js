import AppHeader from "../../../../components/app-header";

export default function BillingPage({ params }) {
  return (
    <>
      <AppHeader title="Billing" subtitle={`Billing module placeholder for org: ${params.orgSlug}`} />
      <main className="main-content">
        <div className="empty-state">
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>This page is the next build step.</h3>
          <p style={{ margin: 0 }}>Stripe checkout, plan status, trials, and subscription gating will sit here.</p>
        </div>
      </main>
    </>
  );
}
