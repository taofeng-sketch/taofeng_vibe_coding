export function calculateProbabilities(home, away, neutral = true) {
  if (!home || !away) throw new Error("Two teams are required");
  if (home.id === away.id) return { home: 0, draw: 100, away: 0, factors: [] };

  const homeAdvantage = neutral ? 0 : 3;
  const strengthGap = home.power + homeAdvantage - away.power;
  const formGap = home.form - away.form;
  const rankGap = Math.max(-35, Math.min(35, away.rank - home.rank));
  const signal = strengthGap * 0.72 + formGap * 0.18 + rankGap * 0.1;
  const draw = Math.max(18, Math.min(31, 27 - Math.abs(signal) * 0.22));
  const remaining = 100 - draw;
  const homeShare = 1 / (1 + Math.exp(-signal / 12));
  let homeWin = Math.round(remaining * homeShare);
  let awayWin = Math.round(remaining - homeWin);
  const roundedDraw = 100 - homeWin - awayWin;

  return {
    home: homeWin,
    draw: roundedDraw,
    away: awayWin,
    factors: [
      { key: "strength", home: home.power, away: away.power, weight: 72 },
      { key: "form", home: home.form, away: away.form, weight: 18 },
      { key: "ranking", home: 101 - Math.min(home.rank, 100), away: 101 - Math.min(away.rank, 100), weight: 10 }
    ]
  };
}

export function pointsForPrediction(prediction, outcome) {
  if (!prediction || !outcome) return 0;
  if (prediction === outcome) return outcome === "draw" ? 140 : 100;
  return 0;
}
