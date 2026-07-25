export type LiveSportsDesk = {
  name: string;
  shortName: string;
  href: string;
  description: string;
};

export const LIVE_SPORTS_DESKS: LiveSportsDesk[] = [
  {
    name: "NFL Desk",
    shortName: "NFL",
    href: "/apps/nfl",
    description: "News, scores, standings, and analysis from around the NFL.",
  },
  {
    name: "College Football Desk",
    shortName: "College Football",
    href: "/apps/college-football",
    description:
      "Rankings, scores, programs, and the national college football picture.",
  },
  {
    name: "MLB Desk",
    shortName: "MLB",
    href: "/apps/mlb",
    description:
      "Scores, standings, pennant-race coverage, and Major League Baseball analysis.",
  },
  {
    name: "Soccer Desk",
    shortName: "Soccer",
    href: "/apps/soccer",
    description:
      "Global soccer news, competitions, match coverage, and analysis.",
  },
  {
    name: "WNBA Desk",
    shortName: "WNBA",
    href: "/apps/wnba",
    description:
      "WNBA news, standings, championship coverage, and league analysis.",
  },
  {
    name: "Fantasy Sports Desk",
    shortName: "Fantasy Sports",
    href: "/apps/fantasy",
    description:
      "Year-round fantasy news, strategy, rankings coverage, and industry insight.",
  },
];

export const COMING_SOON_SPORTS_DESKS = [
  "NBA Desk",
  "NHL Desk",
  "NASCAR Desk",
  "Golf Desk",
  "Tennis Desk",
  "Formula 1 Desk",
  "Pro Wrestling Desk",
  "Combat Sports Desk",
  "Olympic Sports Desk",
] as const;
