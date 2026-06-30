import Link from 'next/link';

type Project = {
  href: string;
  external?: boolean;
  emoji: string;
  title: string;
  blurb: string;
  tag?: string;
};

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
    emoji: '🍹',
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
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Stuff Richard has built because&hellip;</p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          We can just
          <br />
          make shit now<span className="text-amber-600">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-stone-500">
          Tools and toys I&apos;ve built. Some for fun. Some for work.{' '}
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
                <span className="text-4xl" aria-hidden>
                  {p.emoji}
                </span>
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
