# Research Notes

Research snapshot: 2026-06-13.

## Tournament facts used

- The 2026 tournament runs from June 11 to July 19.
- The expanded format includes 48 teams, 12 groups, and 104 matches.
- Each group has four teams. The top two teams plus the eight best third-place teams advance to the round of 32.
- The group-stage team set in `data.js` reflects the public tournament snapshot available on the research date.

## Product patterns reviewed

- Official and media match centers prioritize fixture status, scores, groups, and schedules.
- Predictor products create repeat visits through short prediction rounds, deadlines, streaks, and leaderboards.
- Betting products make odds prominent but often obscure why a number exists.
- Fantasy products deepen player knowledge but create setup friction for casual viewers.

Pulse26 combines the low-friction match-center model with explainable probabilities and lightweight participation. It deliberately removes deposits, cash-out, prizes, purchases, and transferable value.

## Design decisions

| Observation | Pulse26 response |
| --- | --- |
| A 104-match schedule can overwhelm users | Default to a focused three-day match center |
| Odds without context can imply false certainty | Show team strength, form, rank, and uncertainty copy |
| Full fantasy squads take time to configure | Let users support any team in one click |
| Static scores offer little agency | Add predictions, cheers, and a 60-second mini-game |
| Community features introduce moderation risk | Keep the prototype fan wall local-only |
| Live data can become stale or misleading | Display an explicit snapshot date and production data requirement |

## Sources

- [FIFA World Cup 26 tournament hub](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026)
- [FIFA World Cup 26 match schedule announcement](https://inside.fifa.com/organisation/news/fifa-world-cup-26-match-schedule-announced-hosts-canada-mexico-usa)
- [FIFA World Cup 26 format overview](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/format-teams-groups-matches)
- [2026 World Cup groups and schedule overview](https://talksport.com/football/world-cup/1204605/world-cup-2026-schedule-groups-location-final-dates-standings/)
- [Free-to-play predictor interaction pattern](https://talksport.com/football/4327069/predict-6-free-to-play-predictor-game-talksport/)

External sources are research references only. Production use must verify licensing and current accuracy.
