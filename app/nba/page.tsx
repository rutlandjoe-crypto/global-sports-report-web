import SportsDeskPage from "@/components/SportsDeskPage";
import { sportsDeskMetadata } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const metadata = sportsDeskMetadata("nba", "NBA");

export default function NBAPage() {
  return <SportsDeskPage deskId="nba" />;
}
