import Link from "next/link";
import { Dodo } from "@/components/Dodo";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Dodo size={72} className="mx-auto text-navy/70 dark:text-slate-300" />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold">This page has gone the way of the dodo</h1>
      <p className="mt-2 text-muted dark:text-slate-400">The link may be old or mistyped.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-navy px-5 py-3 font-semibold text-white dark:bg-teal-soft dark:text-navy">
        Back to today&apos;s weather
      </Link>
    </div>
  );
}
