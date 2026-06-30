import Link from 'next/link';
import type { ReactNode } from 'react';

type Project = {
  href: string;
  external?: boolean;
  emoji?: string;
  icon?: ReactNode;
  title: string;
  blurb: string;
  tag?: string;
};

// Salt-rimmed margarita coupe with a lime wedge — so the card doesn't read as a daiquiri.
function MargaritaGlass({ className }: { className?: string }) {
  const salt = [9, 14, 19, 24, 29, 34, 39];
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* drink */}
      <path d="M11 15 L24 29 L37 15 Z" fill="#c7e58a" />
      {/* glass bowl + stem + foot */}
      <path d="M8 14.5 L24 31 L40 14.5" fill="none" stroke="#0c0a09" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="24" y1="31" x2="24" y2="40" stroke="#0c0a09" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="41" x2="32" y2="41" stroke="#0c0a09" strokeWidth="2.2" strokeLinecap="round" />
      {/* rim + salt */}
      <line x1="7" y1="14.5" x2="41" y2="14.5" stroke="#0c0a09" strokeWidth="2.2" strokeLinecap="round" />
      {salt.map((x) => (
        <circle key={x} cx={x} cy={12.5} r={1.5} fill="#fafaf9" stroke="#d6d3d1" strokeWidth="0.5" />
      ))}
      {/* lime wedge on the rim */}
      <path d="M34 14.5 A5 5 0 0 1 44 14.5 Z" fill="#5fa83a" stroke="#0c0a09" strokeWidth="1" strokeLinejoin="round" />
      <line x1="39" y1="14.5" x2="39" y2="18.2" stroke="#e6f5c9" strokeWidth="0.8" />
    </svg>
  );
}

const projects: Project[] = [
  {
    href: '/worldcup',
    emoji: '🏆',
    title: 'World Cup 2026 Bracket',
    blurb:
      'A live circular knockout bracket. Real results lock and advance teams on their own — and you can click through the rest to play out your own outcomes.',
    tag: 'Live',
  },
  {
    href: 'https://margcount.vercel.app',
    external: true, // opens in a new tab
    icon: <MargaritaGlass className="h-11 w-11" />,
    title: 'D GRANDE Margarita Sales Counter',
    blurb: 'A live, POS-connected margarita sales counter for D GRANDE — Real Tex-Mex by Real Texans.',
    tag: 'Live',
  },
];

export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col bg-white text-stone-900">
      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-6 pt-20 pb-10 sm:pt-28">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Stuff Richard built because&hellip;</p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          We can just
          <br />
          make shit now<span className="text-amber-600">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-stone-500">
          Tools and toys I&apos;ve built. Some for fun. Some for work.{' '}
          <em className="text-stone-400">Claude may have helped.</em>{' '}
          <a href="mailto:richburg@gmail.com" className="font-medium text-amber-600 hover:underline">
            richburg@gmail.com
          </a>
        </p>
      </section>

      {/* Projects */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">Projects</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              {...(p.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                {p.icon ? (
                  <span aria-hidden>{p.icon}</span>
                ) : (
                  <span className="text-4xl" aria-hidden>
                    {p.emoji}
                  </span>
                )}
                {p.tag && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {p.tag}
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-500">{p.blurb}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-amber-600">
                Open
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}

          {/* Placeholder for the next thing */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 p-6 text-center">
            <span className="text-3xl" aria-hidden>
              🛠️
            </span>
            <p className="mt-2 text-sm font-medium text-stone-400">More coming soon</p>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-stone-100 py-6">
        <p className="text-center text-xs text-stone-400">wecanjustmakeshitnow.com</p>
      </footer>
    </main>
  );
}
