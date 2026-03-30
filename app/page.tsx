import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-court" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-soft">
            <Image
              alt="The League logo"
              className="h-16 w-16 object-contain"
              height={64}
              priority
              src="/logo.png"
              width={64}
            />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
            The League
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl">
            Team Portal
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Log in to view your dashboard, weekly schedule, and match reporting.
          </p>
          <Link
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
            href="/login"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
