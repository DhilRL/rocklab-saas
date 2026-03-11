"use client";

import { motion } from "framer-motion";
import { Sparkles, MonitorSmartphone } from "lucide-react";

export default function ScrollReveal() {
  return (
    <section className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center overflow-hidden py-24 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
        viewport={{ once: false, amount: 0.3 }}
        className="text-center mb-16"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300">
          <Sparkles className="h-4 w-4" />
          Rocklab manpower tracking system
        </span>
        <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight">
          Designed for <br />
          <span className="text-zinc-400">Peak performance teams.</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 140, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.12 }}
        viewport={{ once: false, amount: 0.3 }}
        className="relative w-full max-w-5xl"
      >
        <div className="rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900 p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-700 pb-5">
            <div>
              <p className="text-sm text-zinc-400">Live operations mockup</p>
              <h3 className="text-xl md:text-2xl font-semibold">Shift + payroll command center</h3>
            </div>
            <MonitorSmartphone className="h-7 w-7 text-cyan-400" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Team online", "38 staff"],
              ["Attendance compliance", "98.4%"],
              ["Payroll acknowledgments", "100%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
                <p className="text-sm text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-cyan-500/15 blur-[120px]" />
      </motion.div>
    </section>
  );
}
