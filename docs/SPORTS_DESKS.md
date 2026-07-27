# Sports Desk content system

## Architecture and audit

The six desks use one shared path:

`config/sports_desks.json` → `sports_desk_pipeline.py` → `public/sports_desks.json` → `lib/sportsDesks.ts` → `components/SportsDeskPage.tsx` → six thin route files.

Before this system, the homepage read `public/latest_report.json` directly and used desk-specific filters inside `app/page.tsx`. NFL, College Football and Soccer had homepage lists; MLB appeared in general cards; Fantasy and WNBA had labels but no usable cards. The in-progress `/nfl` route was entirely placeholder-driven. No equivalent full routes existed for the other five desks. Soccer cards were all from ESPN, NFL was mostly Yahoo, MLB was mostly MLB.com/ESPN, and the report included multiple versions of the same development. Scores and schedules came from individual Python report generators and ESPN APIs, with MLB also using MLB data/Statcast tooling. The hourly workflow generated a report in an external content-engine repository and copied it into this site.

The shared pipeline keeps `latest_report.json` as a candidate source, then adds independent feed discovery and official data APIs. A failed feed is isolated and recorded under that desk's diagnostics. The last successful `sports_desks.json` can be reused for up to the configured stale window if a refresh cannot meet the primary publication threshold.

## Collection and data providers

- NFL: ESPN, Yahoo Sports, ProFootballTalk/NBC, NFL.com, and selected local/regional discovery; ESPN scoreboards and standings.
- College Football: ESPN, Yahoo Sports, NCAA.com, On3, 247Sports, and selected local/regional discovery; ESPN scoreboards and standings.
- MLB: ESPN, Yahoo Sports, MLB.com, FanGraphs, Baseball America, and selected local/regional discovery; MLB Stats API schedule/scores and standings.
- Soccer / Football: BBC Sport, The Guardian, ESPN, FIFA, UEFA, African/Asian discovery, and Spanish/Italian regional media; ESPN's multi-competition scoreboard and Premier League standings.
- Fantasy Sports: ESPN, Yahoo Sports, official NFL/MLB fantasy discovery, FantasyPros, RotoWire, and selected local/regional discovery; NFL schedule/scoreboard and standings provide current context without fabricating fantasy results.
- WNBA: ESPN, Yahoo Sports, WNBA.com, specialist women's-basketball outlets, and team/local sources; ESPN WNBA scoreboards and standings.

Google News RSS is used only as a discovery transport for configured official, regional and specialist domains. The originating publisher remains the displayed attribution.

## Classification

Every candidate receives a relevance score against every desk. Strong league/competition signals and team matches outweigh broad sport words; explicit exclusions penalize known false-positive contexts. A story must clear the relevance threshold and is assigned to only one desk. The pipeline also attaches sport, competitions, matched teams, likely named players and applicable lanes. Lane signals cover existing interface concepts such as injuries, transactions, analysis, betting, fantasy, recruiting, transfers, international competition, league news and major events.

## Deduplication

Exact and tracking-parameter URL variants collapse first. Remaining candidates are compared using normalized title tokens. High title similarity is sufficient; medium similarity also requires a shared team or player and publication within 48 hours. When two versions represent one event, the system balances publication time and source authority. Final lead ranking makes freshness the strongest signal, relevance the close-call signal, and publisher prestige only a tie-breaker.

## Publisher and geographic diversity

Primary selection seeds each sourcing group before filling by quality. U.S. desks seed national, official, local and specialist groups. Soccer seeds Europe, the Americas, Africa/Asia and official bodies. A publisher is limited to two selections while alternatives exist. If the requested story count cannot be met under the cap, the pipeline fills remaining positions rather than failing the desk. This fallback occurs only after diverse candidates are exhausted.

## Module visibility

Modules exist in output only when their configured minimum is met:

- top stories: 3
- latest news: 2
- topical story lanes: 1
- scores or schedule: 1 valid event
- standings: 2 valid rows

The shared renderer iterates only emitted modules. It never creates empty cards, placeholder headlines, zero-value data blocks or unsupported injury/standings sections. If the primary story threshold is not met and no recent stale copy is usable, the route shows one deliberate desk-unavailable state.

## Adding a future desk

Add one object to `config/sports_desks.json` with a unique ID/slug, sport, competitions, sourcing profile, positive and excluded signals, teams, publisher preferences, feed definitions and optional data endpoints. Reuse an existing source profile where possible. Add a thin route that renders `<SportsDeskPage deskId="new-id" />`. Do not copy the processor or renderer. Add a configuration test for required sourcing groups and run:

```powershell
python -m unittest discover -s tests -v
python sports_desk_pipeline.py
npx tsc --noEmit
npm run lint
npm run build
```

The generated `public/sports_desks.json` includes per-source counts, errors, publisher totals, deduplication counts and stale-fallback status for operational review.
