import SportsDeskPage from "@/components/SportsDeskPage";
import { sportsDeskMetadata } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const metadata = sportsDeskMetadata("college-football", "College Football");

export default function CollegeFootballPage() {
  return <SportsDeskPage deskId="college-football" />;
}
