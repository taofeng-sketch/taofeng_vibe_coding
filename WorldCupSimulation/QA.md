# QA Process

## Release gates

1. **Static integrity:** `npm run check` passes.
2. **Model correctness:** `npm test` passes across all 2,256 ordered team pairings.
3. **Responsive review:** verify at 390x844, 768x1024, and 1440x900.
4. **Core journeys:** complete the scenarios below without console errors.
5. **Safety:** confirm no copy implies cash value, guaranteed outcomes, or official affiliation.
6. **Accessibility:** keyboard navigation, visible focus, labels, contrast, and reduced-motion behavior.
7. **Refresh integrity:** provider response must contain and map exactly 104 matches before replacing the published snapshot.

## Core journeys

| Journey | Expected result |
| --- | --- |
| Switch match day | Cards update and active day is visible |
| Switch language | Static and dynamic content change between Chinese and English |
| Filter full calendar | Date, stage, status and search filters update the visible count |
| Open team detail | Key player bio and all three group fixtures are visible |
| Review a result | Score, confirmed scorers and official report link are visible |
| Make a prediction | Selection persists after reload and awards participation points once |
| Compare two teams | Percentages total 100 and factors update |
| Swap teams | Team order and analysis reverse |
| Search/filter teams | Results match both query and group |
| Support a team | Card state persists after reload |
| Post a cheer | Message appears locally and input clears |
| Play five penalties | Round stops at five and points update |
| Reset game | Score and goalkeeper reset |

## Regression checklist

- Empty search has a useful state.
- Same-team comparison does not crash.
- Long player/team names do not overflow.
- `localStorage` absence or empty values use defaults.
- No interaction requires hover.
- All primary controls have accessible names.
- Mobile layout has no horizontal scrolling.
- Calendar contains exactly 104 matches: 72 group and 32 knockout.
- Every team has exactly three group fixtures and a bilingual player profile.
- Upcoming provider scores must not appear as completed `0–0` results.
- A partial or malformed provider response must fail without changing `live-snapshot.js`.

## Data QA

- Keep `data.js` source date explicit in the UI.
- Reconcile teams, groups, fixtures, rankings, and results before every release.
- Never present stale demo results as live.
- Production requires an authorized data feed, update timestamp, retry state, and source attribution.
- The current scheduled prototype uses a public ESPN scoreboard JSON endpoint without an SLA; failure keeps the last validated snapshot.
