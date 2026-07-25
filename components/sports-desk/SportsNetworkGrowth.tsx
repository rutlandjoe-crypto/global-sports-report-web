import Link from "next/link";
import {
  COMING_SOON_SPORTS_DESKS,
  LIVE_SPORTS_DESKS,
} from "@/components/sports-desk/desks";

export default function SportsNetworkGrowth() {
  return (
    <section
      aria-labelledby="sports-network-heading"
      className="gsr-card p-5 sm:p-7"
    >
      <p className="gsr-section-label">Across the newsroom</p>
      <h2 id="sports-network-heading" className="mt-2 text-2xl font-black">
        Growing the GSR Sports Network
      </h2>

      <div className="mt-6 grid gap-7 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Available Now
          </h3>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
            {LIVE_SPORTS_DESKS.map((desk) => (
              <li
                key={desk.name}
                className="flex items-center justify-between gap-4 py-3"
              >
                <Link
                  href={desk.href}
                  className="font-black text-red-700 hover:underline"
                >
                  {desk.name}
                </Link>
                <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Live
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-neutral-500">
            Coming Soon
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 text-sm text-neutral-700 sm:grid-cols-2">
            {COMING_SOON_SPORTS_DESKS.map((desk) => (
              <li key={desk} className="border-b border-neutral-200 py-2">
                {desk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
