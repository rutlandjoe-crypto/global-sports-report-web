import SportsDeskPage from "@/components/SportsDeskPage";
import { sportsDeskMetadata } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const metadata = sportsDeskMetadata("nfl", "NFL");

export default function NFLPage() {
  return <SportsDeskPage deskId="nfl" />;
}
