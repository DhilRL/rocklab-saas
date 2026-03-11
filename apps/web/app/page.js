import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    audience: "Best for small cafés and boutique studios",
    features: [
      "Up to 12 team members",
      "Shift planning and attendance logs",
      "Manpower tracking system dashboard",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$129",
    audience: "Great for busy gyms and multi-shift businesses",
    features: [
      "Up to 45 team members",
      "Payroll acknowledgments + overtime alerts",
      "Advanced manpower tracking system reports",
      "Priority chat support",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "$249",
    audience: "For multi-location operators",
    features: [
      "Unlimited staff and locations",
      "Role-based permissions for managers",
      "Custom workflow automation",
      "Dedicated success manager",
    ],
  },
];

const testimonials = [
  {
    quote:
      "Our gym used to manage staffing with spreadsheets. Now we schedule, track attendance, and approve payroll in one place.",
    name: "Nadia Tan",
    role: "Operations Lead, PulseFit Gym",
  },
  {
    quote:
      "The manpower tracking system gives me instant visibility across all café shifts. I save hours every week.",
    name: "Imran Yusuf",
    role: "Owner, Daily Grind Café",
  },
  {
    quote:
      "Rocklab helped us bring onboarding and shift accountability into one professional workflow our whole team actually uses.",
    name: "Lina Chen",
    role: "Director, Northpoint Services",
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div>
          <span className="eyebrow">Rocklab SaaS</span>
          <h1>Professional workforce software for gyms, cafés, and small businesses.</h1>
          <p>
            Replace manual scheduling and payroll confusion with one manpower tracking system.
            Manage shifts, onboarding, and team accountability with confidence.
          </p>

          <div className="hero-cta">
            <Link className="btn btn-primary" href="/login">
              Start your 2-week free trial
            </Link>
            <Link className="btn btn-ghost" href="/create-org">
              Book setup for your business
            </Link>
          </div>
        </div>

        <div className="hero-highlight">
          <h3>Why teams switch to Rocklab</h3>
          <ul>
            <li>Live staff attendance with role-based controls</li>
            <li>Payroll acknowledgments to reduce disputes</li>
            <li>Centralized manpower tracking system analytics</li>
            <li>Simple onboarding for managers and staff</li>
          </ul>
        </div>
      </section>

      <section className="landing-section">
        <h2>Trusted by service-first operators</h2>
        <p className="section-subtitle">
          Designed for operations where every shift matters: fitness centers, cafés, and local
          businesses with growing teams.
        </p>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <h2>What customers say</h2>
          <p>Built to solve day-to-day manpower and staff management problems.</p>
        </div>

        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.name} className="testimonial-card">
              <p>“{item.quote}”</p>
              <h4>{item.name}</h4>
              <span>{item.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <h2>Simple pricing for every stage</h2>
          <p>All plans include a 2-week free trial. No credit card required.</p>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier) => (
            <article key={tier.name} className={`price-card${tier.featured ? " featured" : ""}`}>
              <h3>{tier.name}</h3>
              <div className="price">{tier.price}<span>/month</span></div>
              <p>{tier.audience}</p>
              <ul>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>Ready to modernize your operations?</h2>
        <p>
          Start your 2-week free trial today and see how a clear manpower tracking system can help
          your team perform better.
        </p>
        <Link className="btn btn-primary" href="/login">
          Claim 2-week free trial
        </Link>
      </section>
    </main>
  );
}
