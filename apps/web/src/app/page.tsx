import Link from "next/link";

const features = [
  {
    title: "Task Management",
    description: "Organize, prioritize, and track tasks with ease.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    title: "Calendar",
    description: "Unified calendar for events, deadlines, and reminders.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    title: "Finance",
    description: "Budget tracking, expenses, and financial insights.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    title: "Habits",
    description: "Build positive routines with streak tracking.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Goals",
    description: "Set, track, and achieve short and long-term goals.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    title: "Time Tracking",
    description: "Monitor how you spend your time and optimize it.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const steps = [
  { number: "1", title: "Sign Up", description: "Create your free account in seconds." },
  { number: "2", title: "Choose Your Mode", description: "Individual or Enterprise — tailor your workspace." },
  { number: "3", title: "Start Achieving", description: "Track habits, manage tasks, and hit your goals." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafdf7]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#4a7c59]/10 bg-[#fafdf7]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8c.7-1 1-2.2 1-3.5C18 2.5 16.5 1 14.5 1c-1 0-1.9.4-2.5 1-.6-.6-1.5-1-2.5-1C7.5 1 6 2.5 6 4.5c0 1.3.3 2.5 1 3.5" />
              <path d="M12 1v16" />
              <path d="M6 12c-1.5 1.5-3 3.5-3 6 0 2.5 2.5 4 5 4 1.5 0 3-.5 4-1.5 1 1 2.5 1.5 4 1.5 2.5 0 5-1.5 5-4 0-2.5-1.5-4.5-3-6" />
            </svg>
            <span className="text-xl font-bold text-[#4a7c59]">PrMS</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#4a7c59]">Features</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#4a7c59]">Pricing</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#4a7c59]">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-[#4a7c59] transition-colors hover:text-[#3d6649]"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#4a7c59] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3d6649]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a7c59]/10 via-[#fafdf7] to-[#4a7c59]/5" />
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-[#4a7c59]/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-[#4a7c59]/8 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center md:pb-28 md:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#4a7c59]/20 bg-white px-4 py-1.5 text-sm font-medium text-[#4a7c59] shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Your all-in-one productivity platform
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 md:text-6xl">
            Centralize. Simplify.
            <br />
            <span className="text-[#4a7c59]">Amplify.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-500 md:text-xl">
            Your entire productivity life, unified. Tasks, habits, finances, goals — one beautiful space to achieve more.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#4a7c59] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#4a7c59]/25 transition-all hover:bg-[#3d6649] hover:shadow-xl hover:shadow-[#4a7c59]/30"
            >
              Get Started Free
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-[#4a7c59]/30 px-8 py-3.5 text-base font-semibold text-[#4a7c59] transition-colors hover:border-[#4a7c59] hover:bg-[#4a7c59]/5"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
            Everything you need, <span className="text-[#4a7c59]">nothing you don&apos;t</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-500">
            Six powerful modules working together seamlessly to keep you productive and balanced.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-all hover:shadow-md hover:ring-[#4a7c59]/20"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#4a7c59]/10 text-[#4a7c59] transition-colors group-hover:bg-[#4a7c59] group-hover:text-white">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#4a7c59]/5 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-500">
              Get up and running in three simple steps.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4a7c59] text-xl font-bold text-white shadow-lg shadow-[#4a7c59]/25">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-neutral-100 md:p-14">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-md text-neutral-500">
            Free forever for core features. Premium from <span className="font-semibold text-[#4a7c59]">$3/mo</span> for advanced analytics, integrations, and more.
          </p>
          <div className="mt-8">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#4a7c59] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#4a7c59]/25 transition-all hover:bg-[#3d6649]"
            >
              Start for Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#4a7c59]/10 bg-[#fafdf7]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8c.7-1 1-2.2 1-3.5C18 2.5 16.5 1 14.5 1c-1 0-1.9.4-2.5 1-.6-.6-1.5-1-2.5-1C7.5 1 6 2.5 6 4.5c0 1.3.3 2.5 1 3.5" />
              <path d="M12 1v16" />
              <path d="M6 12c-1.5 1.5-3 3.5-3 6 0 2.5 2.5 4 5 4 1.5 0 3-.5 4-1.5 1 1 2.5 1.5 4 1.5 2.5 0 5-1.5 5-4 0-2.5-1.5-4.5-3-6" />
            </svg>
            <span className="text-sm font-semibold text-[#4a7c59]">PrMS</span>
          </div>
          <p className="text-sm text-neutral-400">
            &copy; 2026 PrMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
