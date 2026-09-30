import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Users,
} from 'lucide-react';

const experiences = [
  {
    number: '01',
    icon: CalendarDays,
    title: 'Pick your moment',
    description: 'Choose a date and a time that works for your evening.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Find your table',
    description: 'See live availability and choose a table that fits your party.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'We’ll be ready',
    description: 'Your reservation is confirmed as soon as you book.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf3] text-stone-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Table & Taste home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-900 text-white shadow-lg shadow-amber-950/15">
            <UtensilsCrossed size={21} />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.19em] text-amber-800">Table & Taste</span>
            <span className="mt-0.5 block text-xs text-stone-500">A little more memorable</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-7">
          <a href="#experience" className="hidden text-sm font-semibold text-stone-600 transition hover:text-amber-900 sm:inline">
            The experience
          </a>
          <Link href="/admin" className="text-sm font-semibold text-stone-600 transition hover:text-amber-900">
            Admin
          </Link>
          <Link
            href="/booking"
            className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-950/10 transition hover:bg-amber-950 sm:px-5"
          >
            Book a table
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:pb-28">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-900">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Your seat, saved for you
          </span>
          <h1 className="mt-7 max-w-3xl text-[3.4rem] font-bold leading-[0.99] tracking-[-0.055em] text-stone-950 sm:text-7xl lg:text-[5.5rem]">
            Make room
            <span className="mt-2 block font-serif font-medium italic tracking-[-0.045em] text-amber-800">
              for something
            </span>
            <span className="mt-2 block">delicious.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
            Good food tastes even better when there&apos;s time to enjoy it. Choose your date, find the right table, and leave the rest to us.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/booking"
              className="group inline-flex items-center gap-3 rounded-xl bg-amber-900 px-6 py-4 font-bold text-white shadow-xl shadow-amber-950/15 transition hover:-translate-y-0.5 hover:bg-amber-950"
            >
              Reserve your table
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a href="#experience" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-semibold text-stone-600 transition hover:text-amber-900">
              How it works <ArrowDownRight size={16} />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-amber-200/70 pt-6 text-sm text-stone-600">
            <span className="inline-flex items-center gap-2"><Clock3 size={16} className="text-amber-800" /> Daily, 11 am – 10 pm</span>
            <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-amber-800" /> Your neighborhood table</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="absolute -inset-7 rounded-[2.5rem] bg-gradient-to-br from-amber-200/60 via-orange-100/40 to-emerald-100/50 blur-2xl" />
          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#713a1d] via-[#9b5528] to-[#c17b42] p-6 shadow-[0_35px_90px_-35px_rgba(101,54,25,0.5)] sm:min-h-[540px] sm:p-9">
            <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#fff 0.7px, transparent 0.7px)', backgroundSize: '18px 18px' }} />
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/15" />
            <div className="absolute -right-2 -top-7 h-64 w-64 rounded-full border border-white/10" />
            <div className="relative flex h-full min-h-[370px] flex-col justify-between sm:min-h-[462px]">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                  Gather around
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-amber-900">
                  <UtensilsCrossed size={19} />
                </span>
              </div>
              <div className="mx-auto my-9 w-full max-w-[380px]">
                <div className="relative aspect-square rounded-full border-[14px] border-[#e6bf80] bg-[#f1dbb1] shadow-[0_25px_45px_-18px_rgba(35,19,10,0.65)] sm:border-[18px]">
                  <div className="absolute inset-[11%] rounded-full border border-amber-900/10 bg-[radial-gradient(ellipse_at_50%_48%,#e9b969_0%,#d7944d_35%,#bb6d38_68%,#9b512e_100%)] shadow-inner" />
                  <div className="absolute left-1/2 top-[19%] h-[61%] w-[4px] -translate-x-1/2 rounded-full bg-[#f6e7ca]/80 rotate-45" />
                  <div className="absolute left-1/2 top-[19%] h-[61%] w-[4px] -translate-x-1/2 rounded-full bg-[#f6e7ca]/80 -rotate-45" />
                  <div className="absolute left-[30%] top-[29%] h-5 w-5 rounded-full bg-emerald-800 shadow-md sm:h-7 sm:w-7" />
                  <div className="absolute right-[28%] top-[35%] h-4 w-4 rounded-full bg-red-800 shadow-md sm:h-6 sm:w-6" />
                  <div className="absolute bottom-[27%] left-[39%] h-5 w-5 rounded-full bg-amber-100 shadow-md sm:h-7 sm:w-7" />
                  <div className="absolute bottom-[30%] right-[25%] h-3 w-3 rounded-full bg-emerald-950 shadow-md sm:h-5 sm:w-5" />
                  <div className="absolute left-[43%] top-[48%] h-8 w-8 rounded-full bg-[#f9eddb] shadow-lg sm:h-11 sm:w-11" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/75">A good evening starts here</p>
                  <p className="mt-2 font-serif text-2xl italic sm:text-3xl">Pull up a chair.</p>
                </div>
                <div className="hidden text-right text-sm text-white/75 sm:block">
                  <p>Thoughtfully set</p>
                  <p>Just for you</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-xl shadow-amber-950/10 sm:-left-7 sm:px-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><CalendarDays size={19} /></span>
            <span>
              <span className="block text-sm font-bold text-stone-900">A table for your next outing</span>
              <span className="mt-0.5 block text-xs text-stone-500">Choose a date to check availability</span>
            </span>
          </div>
        </div>
      </section>

      <section id="experience" className="border-y border-amber-100 bg-white/75">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Easy as it should be</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                From “what if?” to “see you soon.”
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-stone-500">
              A few thoughtful steps, a table that fits, and more time for the good part.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {experiences.map((experience) => (
              <article key={experience.number} className="group rounded-2xl border border-amber-100 bg-[#fffdf9] p-6 transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-950/[0.06] sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/75 text-amber-900 transition group-hover:bg-amber-900 group-hover:text-white">
                    <experience.icon size={21} />
                  </span>
                  <span className="text-sm font-bold tracking-widest text-amber-800/50">{experience.number}</span>
                </div>
                <h3 className="mt-7 text-xl font-bold text-stone-900">{experience.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{experience.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-stone-500 sm:px-8">
        <p>Good company. Good food. A table waiting for you.</p>
        <Link href="/admin" className="font-semibold transition hover:text-amber-900">Restaurant admin</Link>
      </footer>
    </main>
  );
}
