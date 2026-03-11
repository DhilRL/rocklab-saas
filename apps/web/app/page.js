import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    audience: "For cafés and micro teams",
    features: ["Up to 12 staff", "Shift scheduling", "Manpower tracking system dashboard"],
  },
  {
    name: "Growth",
    price: "$129",
    audience: "For gyms and fast-growing operations",
    features: [
      "Up to 45 staff",
      "Payroll acknowledgments",
      "Advanced manpower tracking system reports",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "$249",
    audience: "For multi-location businesses",
    features: ["Unlimited staff", "Role-based controls", "Dedicated success support"],
  },
];

const testimonials = [
  {
    quote:
      "We replaced spreadsheets with one manpower tracking system and finally got clean payroll approvals.",
    name: "Nadia Tan",
    role: "Operations Lead, PulseFit Gym",
  },
  {
    quote: "Rocklab helped our café managers track staffing by shift in real time.",
    name: "Imran Yusuf",
    role: "Owner, Daily Grind Café",
  },
  {
    quote: "The two-week trial proved value quickly. We now run onboarding and attendance in one place.",
    name: "Lina Chen",
    role: "Director, Northpoint Services",
  },
];

export default function HomePage() {
  return (
    <main className="bg-zinc-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          Rocklab SaaS
        </p>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
          Professional manpower tracking system for gyms, cafés, and small businesses.
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-zinc-300">
          Manage shifts, attendance, payroll acknowledgment, and team accountability in one modern
          platform.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300"
          >
            Start 2-week free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/create-org"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 font-semibold text-zinc-100 transition hover:bg-zinc-800"
          >
            Book setup call
          </Link>
        </div>
      </section>

      <ScrollReveal />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-semibold md:text-4xl">Testimonials</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-zinc-300">“{item.quote}”</p>
              <h3 className="mt-6 font-semibold">{item.name}</h3>
              <p className="text-sm text-zinc-400">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="text-3xl font-semibold md:text-4xl">3 simple pricing tiers</h2>
        <p className="mt-3 text-zinc-300">All plans include a 2-week free trial.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border p-6 ${
                tier.featured
                  ? "border-cyan-400 bg-zinc-900 shadow-[0_0_80px_-35px_rgba(34,211,238,0.6)]"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <p className="mt-2 text-4xl font-bold">{tier.price}</p>
              <p className="mt-1 text-sm text-zinc-400">{tier.audience}</p>
              <ul className="mt-5 space-y-3 text-sm text-zinc-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-cyan-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
