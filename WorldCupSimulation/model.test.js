import test from "node:test";
import assert from "node:assert/strict";
import { teams } from "./data.js";
import { calculateProbabilities, pointsForPrediction } from "./model.js";

test("probabilities always sum to 100", () => {
  for (const home of teams) {
    for (const away of teams) {
      if (home.id === away.id) continue;
      const result = calculateProbabilities(home, away);
      assert.equal(result.home + result.draw + result.away, 100);
      assert.ok(result.home >= 0 && result.away >= 0 && result.draw >= 0);
    }
  }
});

test("stronger team receives the larger win probability", () => {
  const spain = teams.find((team) => team.name === "Spain");
  const newZealand = teams.find((team) => team.name === "New Zealand");
  const result = calculateProbabilities(spain, newZealand);
  assert.ok(result.home > result.away);
  assert.ok(result.home > 60);
});

test("prediction points only reward correct outcomes", () => {
  assert.equal(pointsForPrediction("home", "home"), 100);
  assert.equal(pointsForPrediction("draw", "draw"), 140);
  assert.equal(pointsForPrediction("away", "home"), 0);
});
