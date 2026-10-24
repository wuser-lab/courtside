# Data and methodology

## Point history is the source of truth

`engine.js` exports `advance`, `replay`, `analytics`, `validateMatch`, `pointLabel`, `createMatch`, `demoMatch`, and `pct`. `replay(match)` returns the current score and a log enriched with server, set, game, and break-point context. Scoring state is reconstructed after every change. Player indices remain 0 and 1 throughout the match.

## Supported scoring

Advantage games: 0, 15, 30, 40, deuce, advantage. A set ends at six games with a two-game margin, or after a 7-point tiebreak at 6–6 (win by two). Tiebreak servers follow one point, then alternating pairs of points. The opening tiebreak server receives in the next set. Best of 3 and best of 5 are supported; the same 7-point tiebreak convention applies to the deciding set. This is a declared match format, not every tournament's format.

Reference: [ITF Rules of Tennis, rules 5–7](https://itf.uberflip.com/i/623773-rules-of-tennis/8). Tests cover extended deuce and tiebreaks, server transitions, complete matches, and replay after removing a point.

## Statistical definitions

| Metric | Definition |
| --- | --- |
| First serve in | Points with `serve: 1` / all service points. A second-serve point implies a missed first serve. |
| First/second serve points won | Points won by the server within the specified serve group / points in that group. |
| Return points won | Points won as receiver / all return points. |
| Break opportunities | Non-tiebreak points where the receiver can win the game on the next point. Each opportunity is counted, including repeated advantage points. |
| Break conversion | Receiver points won at break point / break opportunities. |
| Winner | Explicitly tagged `winner` outcome. Aces are reported separately. |
| Unforced error | Explicitly tagged `unforced` outcome, attributed to the point loser. |
| Momentum | `(P1 wins − P2 wins) / window size` over the most recent 12 points. Early windows use all available points. Zero is an equal share; +1 is all P1, −1 all P2. This is not a win-probability model. |
| Rally groups | 0–4, 5–8, 9+ shots, split by point winner. Serve is included; an ace is 1 shot, double fault 0. |
| Location map | Optional manually selected final-ball locations, colored by point winner. This is a scatter plot, not an estimate of shot accuracy or court coverage. |

Zero denominators render as an em dash. Percentages are rounded to the nearest integer. Overview summary cards and coaching prompts focus on player 1; comparison statistics show both players. Bars compare relative displayed values; they are not independent confidence intervals or probabilities.

## Practice rules

Prompts require at least 8 observations in the relevant category. Second-serve points won below 50% triggers a more specific second-serve heading. Return points won below 40% changes the return heading. Long-rally practice uses 9+ shot points. The coach’s corner prioritizes a weak second-serve signal, then the first category with enough data. These simple thresholds are product heuristics, not validated performance benchmarks. Suggested drills are general practice ideas. The app reports observed counts and does not infer causes.

## Version 1 archive

```json
{
  "version": 1,
  "players": ["Player One", "Player Two"],
  "surface": "Hard",
  "bestOf": 3,
  "firstServer": 0,
  "demo": false,
  "notes": "Work on return depth.",
  "points": [
    {
      "winner": 0,
      "serve": 1,
      "result": "winner",
      "rally": 5,
      "target": {"x": 0.3, "y": 0.7},
      "time": 1792832400000
    }
  ]
}
```

`result` is `winner`, `unforced`, `forced`, `ace`, or `double-fault`. `target` can be `null`; normalized x goes left to right and y top to bottom on the full court from the observer’s fixed view. Coordinates describe the drawn doubles-width court including alleys; they do not determine legality, and the UI does not capture balls outside that area. Choose the outcome manually. `time` is a UTC epoch timestamp in milliseconds, retained for export; no elapsed-match-time claims are derived from it.

Import validates players, settings, coordinates, shot counts, timestamps, ace/double-fault consistency, point count (10,000 maximum), and completion boundaries. The UI limits uploaded JSON to 5 MB and notes to 20,000 characters. Imported display strings are escaped. CSV fields are quoted and formula-leading fields are prefixed to reduce spreadsheet formula injection risk.

The sample match is generated deterministically with fictional players. It makes no claim to represent real tennis performance.
