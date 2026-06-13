import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSnapshot, canonicalTeamName, serializeSnapshot } from "./update-world-cup-data.mjs";

const fixture = JSON.parse(
  await readFile(new URL("../test-fixtures/espn-scoreboard.json", import.meta.url), "utf8")
);

test("normalizes provider team names to the app vocabulary", () => {
  assert.equal(canonicalTeamName("Bosnia-Herzegovina"), "Bosnia & Herzegovina");
  assert.equal(canonicalTeamName("Korea Republic"), "South Korea");
});

test("builds a validated 104-match snapshot", () => {
  const snapshot = buildSnapshot(fixture, new Date("2026-06-13T12:30:00Z"));
  assert.equal(snapshot.counts.total, 104);
  assert.equal(Object.keys(snapshot.matches).length, 104);
  assert.equal(snapshot.matches[1].status, "finished");
  assert.deepEqual(snapshot.matches[1].score, [2, 0]);
  assert.equal(snapshot.matches[1].goals[0].player, "Julián Quiñones");
  assert.match(serializeSnapshot(snapshot), /export const liveSnapshot/);
});

test("rejects partial provider responses", () => {
  assert.throws(() => buildSnapshot({ events: fixture.events.slice(0, 50) }), /Expected 104/);
});
