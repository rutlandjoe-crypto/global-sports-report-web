import SportsDeskPage from "@/components/SportsDeskPage";
import { sportsDeskMetadata } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const metadata = sportsDeskMetadata("mlb", "MLB");

export default function MLBPage() {
  return <SportsDeskPage deskId="mlb" />;
}
