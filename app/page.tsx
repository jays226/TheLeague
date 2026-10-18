import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div className="absolute inset-0 -z-10 bg-court" />
      <section className="flex w-full max-w-3xl flex-col items-center text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-5 rounded-[32px] border border-white/70 bg-white/75 px-7 py-5 shadow-soft">
          <Image alt="The League logo" className="h-20 w-20 object-contain" height={80} priority src="/logo.png" width={80} />
          <span aria-hidden="true" className="text-3xl font-light text-primary/60">×</span>
          <Image alt="UVA Pickleball Club logo" className="h-20 w-20 object-contain" height={80} priority src="/uva-pickleball-club-logo.svg" width={80} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">The League × UVA Pickleball Club</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-7xl">Team Portal</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Log in to view your schedule, standings, and match reporting.
        </p>
        <Link className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]" href="/login">
          Log in
        </Link>
      </section>
    </main>
  );
}
