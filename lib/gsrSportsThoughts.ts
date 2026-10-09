export type GsrSportsThought = {
  slug: string; title: string; author: string; desk: string;
  publishedAt: string; paragraphs: string[];
};

export const gsrSportsThoughts: GsrSportsThought[] = [
  {
    "slug": "ditka-was-much-more-than-coach-with-bears",
    "title": "Ditka was much more than coach with Bears",
    "author": "Joe Rutland",
    "desk": "nfl",
    "publishedAt": "2026-10-09T19:45:09.865Z",
    "paragraphs": [
      "News spread around the NFL and sports world on Friday that Mike Ditka, who won a Super Bowl as head coach with the Chicago Bears and a Pro Football Hall of Famer, died. Ditka was 86.",
      "Ditka oversaw that incredible group of Bears players, led by the amazing Walter Payton along with quarterback Jim McMahon and a fierce Bears defense, that brought the Windy City a Vince Lombardi Trophy.",
      "Besides coaching, Ditka already had made a name for himself as a tough tight end during his NFL playing days. According to [Pro Football Reference](https://www.pro-football-reference.com/coaches/DitkMi0.htm), between his 11 seasons in Chicago and three more with the New Orleans Saints, Ditka finished with a 121-95 coaching record. In seven of his 11 seasons running the Bears, Ditka’s teams ended up with double-digit wins.",
      "That Super Bowl win following the 1985 season remains one of the most incredible performances ever by a team.",
      "For anyone who ever saw Ditka talk in a press conference or gathering of reporters, he did not suffer fools gladly. If he thought a reporter’s question was out of line, then he’d call out that man or woman right there.",
      "After doing so, he might have a twinkle in his eye. That happened rarely, though.",
      "Ditka provided analysis during his time with ESPN, still showing that fiery spirit which marked his career on and off the field. One thing people learned is that any disrespect of “Iron Mike” was not tolerated by Ditka himself.",
      "In pop culture, Ditka’s well-coiffed mustache and Bears sweater were immortalized in a “Saturday Night Live” sketch where the late George Wendt and others gathered around a bar table. With beers flowing, they’d utter “Da Bears” in unison when making a comment or sharing a thought.",
      "“Da Bears” caught on nationwide, yet giving Ditka a friendly, loving poke over his brashness.",
      "Ditka, though, was not always one tough son of a bitch. He had a tender side, always willing to help someone out in need. If he had money on hand (which was often), Ditka was able to pull out a $100 bill and give it to someone.",
      "This generous side didn’t always involve money, though. Fantasy football writer Matthew Berry shared a sweet story about Ditka inviting him over when Ditka was holding court with some ESPN personnel. Berry said, in essence, that Ditka called him over and sat him down because he (Ditka) wanted to meet him.",
      "Global Sports Report’s [NFL Sports Desk](https://www.globalsportsreport.com/nfl#latest-news) keeps up with what the Bears are doing this season as head coach Ben Johnson, along with quarterback Caleb Williams (when he’s healthy), have Chicago going in a winning direction.",
      "From a distance, one can imagine Ditka being kind of like a proud papa watching the Bears put together a solid team this season.",
      "There will never be another Mike Ditka in the NFL world, much less in pop culture. Bears fans both near and far away, along with NFL fans, lost a one-of-a-kind man on Friday."
    ]
  }
];

export function sportsThoughtUrl(slug: string) {
  return '/gsr-sports-thoughts/' + slug;
}

export function sportsThoughtDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  }).format(new Date(value)).replace(/\b(?:EST|EDT)\b/, 'ET');
}
