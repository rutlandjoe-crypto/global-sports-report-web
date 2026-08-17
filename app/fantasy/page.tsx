import SportsDeskPage from "@/components/SportsDeskPage";
import { sportsDeskMetadata } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const metadata = sportsDeskMetadata("fantasy", "Fantasy Sports");

export default function FantasyPage() {
  return <SportsDeskPage deskId="fantasy" />;
}
