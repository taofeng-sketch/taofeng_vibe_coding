import test from "node:test";
import assert from "node:assert/strict";
import { teams } from "./data.js";
import { calculateProbabilities, pointsForPrediction } from "./model.js";
import { schedule } from "./schedule.js";
import { playerProfiles } from "./profiles.js";
import {
  broadcasterFor,
  dateKeyForMatch,
  defaultScheduleDate,
  detectViewingRegion,
  formattedMatchTime,
  nextMatch
} from "./viewing.js";

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

test("schedule contains 104 matches split into 72 group and 32 knockout fixtures", () => {
  assert.equal(schedule.length, 104);
  assert.equal(schedule.filter((match) => match.stage === "Group stage").length, 72);
  assert.equal(schedule.filter((match) => match.stage !== "Group stage").length, 32);
});

test("every team has three group-stage fixtures and a player profile", () => {
  for (const team of teams) {
    const fixtures = schedule.filter((match) =>
      match.stage === "Group stage" && (match.home === team.name || match.away === team.name)
    );
    assert.equal(fixtures.length, 3, `${team.name} should have three group matches`);
    assert.ok(playerProfiles[team.name]?.bioEn);
    assert.ok(playerProfiles[team.name]?.bioZh);
  }
});

test("match status accounting remains internally consistent", () => {
  const validStatuses = new Set(["finished", "live", "upcoming"]);
  assert.ok(schedule.every((match) => validStatuses.has(match.status)));
  assert.equal(
    schedule.filter((match) => match.status === "finished").length
      + schedule.filter((match) => match.status === "live").length
      + schedule.filter((match) => match.status === "upcoming").length,
    104
  );
});

test("detects supported viewing regions without requesting precise location", () => {
  assert.equal(detectViewingRegion("Europe/London", "en-GB"), "gb");
  assert.equal(detectViewingRegion("America/Los_Angeles", "en-US"), "us");
  assert.equal(detectViewingRegion("Asia/Shanghai", "zh-CN"), "cn");
});

test("converts fixture times and dates into the viewer time zone", () => {
  const match = { startTime: "2026-06-13T22:00:00Z" };
  assert.match(formattedMatchTime(match, "Europe/London"), /23:00/);
  assert.match(formattedMatchTime(match, "America/New_York"), /18:00/);
  assert.equal(dateKeyForMatch(match, "Asia/Shanghai"), "2026-06-14");
});

test("returns broadcaster links only for verified regions", () => {
  assert.match(broadcasterFor({ id: 6 }, "gb").label, /BBC One/);
  assert.equal(broadcasterFor({ id: 6 }, "cn").status, "unverified");
  assert.equal(broadcasterFor({ id: 6 }, "cn").providers.length, 0);
});

test("defaults the schedule to the viewer's local today or next match day", () => {
  const fixtures = [
    { startTime: "2026-06-14T01:00:00Z", status: "upcoming" },
    { startTime: "2026-06-15T17:00:00Z", status: "upcoming" }
  ];
  assert.equal(defaultScheduleDate(fixtures, "Europe/London", "2026-06-14T12:00:00Z"), "2026-06-14");
  assert.equal(defaultScheduleDate(fixtures, "Europe/London", "2026-06-13T12:00:00Z"), "2026-06-14");
});

test("selects the next fixture from start time instead of a stale status order", () => {
  const fixtures = [
    { id: 1, startTime: "2026-06-12T12:00:00Z", status: "upcoming" },
    { id: 2, startTime: "2026-06-14T18:00:00Z", status: "upcoming" },
    { id: 3, startTime: "2026-06-14T20:00:00Z", status: "upcoming" }
  ];
  assert.equal(nextMatch(fixtures, "2026-06-14T17:00:00Z").id, 2);
});
