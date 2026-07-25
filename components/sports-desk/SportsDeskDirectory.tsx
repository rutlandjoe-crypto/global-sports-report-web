import Link from "next/link";
import { LIVE_SPORTS_DESKS } from "@/components/sports-desk/desks";

type SportsDeskDirectoryProps = {
  heading?: string;
  description?: string;
};

export default function SportsDeskDirectory({
  heading = "Explore the GSR Sports Desks",
  description = "Choose a dedicated desk for sourced reporting, scores, standings, analysis, and the context shaping each sport.",
}: SportsDeskDirectoryProps) {
  return (
    <section
      aria-labelledby="sports-desk-directory-heading"
      className="gsr-card p-5 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="gsr-section-label">Inside the GSR Sports Network</p>
          <h2
            id="sports-desk-directory-heading"
            className="mt-2 text-2xl font-black sm:text-3xl"
          >
            {heading}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
            {description}
          </p>
        </div>
        <Link
          href="/apps/sports-desk"
          className="shrink-0 text-sm font-black text-red-700 hover:underline"
        >
          Visit the Sports Desk hub →
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE_SPORTS_DESKS.map((desk) => (
          <Link
            key={desk.href}
            href={desk.href}
            className="group flex min-h-36 flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-5 transition-colors hover:border-red-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Live desk
              </p>
              <h3 className="mt-2 text-xl font-black text-neutral-950 group-hover:text-red-700">
                {desk.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {desk.description}
              </p>
            </div>
            <span className="mt-4 text-sm font-black text-neutral-900 group-hover:text-red-700">
              Open desk →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
