import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { schedule } from "../schedule.js";

export const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720&limit=200";

const aliases = new Map([
  ["bosnia-herzegovina", "Bosnia & Herzegovina"],
  ["korea-republic", "South Korea"],
  ["united-states", "United States"],
  ["ivory-coast", "Ivory Coast"],
  ["congo-dr", "DR Congo"],
  ["congo-democratic-republic", "DR Congo"],
  ["turkey", "Türkiye"],
  ["curacao", "Curaçao"]
]);

const stageOrder = {
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  "quarterfinals": "Quarter-final",
  "quarter-finals": "Quarter-final",
  "semifinals": "Semi-final",
  "semi-finals": "Semi-final",
  "3rd-place-match": "Third-place",
  "third-place": "Third-place",
  "final": "Final"
};

function slug(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canonicalTeamName(value) {
  const key = slug(value);
  if (aliases.has(key)) return aliases.get(key);
  const team = schedule
    .flatMap((match) => [match.home, match.away])
    .find((name) => slug(name) === key);
  return team || value;
}

function londonTimestamp(match) {
  return Date.parse(`${match.date}T${match.time}:00+01:00`);
}

function eventStage(event) {
  if (event.season?.slug === "group-stage") return "Group stage";
  return stageOrder[event.season?.slug] || null;
}

function eventTeams(event) {
  const competitors = event.competitions?.[0]?.competitors || [];
  const home = competitors.find((team) => team.homeAway === "home");
  const away = competitors.find((team) => team.homeAway === "away");
  return {
    home: canonicalTeamName(home?.team?.displayName || home?.team?.name || ""),
    away: canonicalTeamName(away?.team?.displayName || away?.team?.name || ""),
    homeRaw: home,
    awayRaw: away
  };
}

function pairKey(home, away) {
  return [slug(home), slug(away)].sort().join("|");
}

function mapEventsToSchedule(events) {
  const mapping = new Map();
  const unused = new Set(events.map((event) => event.id));
  const byId = new Map(events.map((event) => [event.id, event]));

  for (const match of schedule.filter((item) => item.stage === "Group stage")) {
    const event = events.find((candidate) => {
      if (!unused.has(candidate.id)) return false;
      const teams = eventTeams(candidate);
      return pairKey(teams.home, teams.away) === pairKey(match.home, match.away);
    });
    if (event) {
      mapping.set(match.id, event);
      unused.delete(event.id);
    }
  }

  const knockoutStages = [...new Set(schedule.filter((match) => match.stage !== "Group stage").map((match) => match.stage))];
  for (const stage of knockoutStages) {
    const stageMatches = schedule.filter((match) => match.stage === stage).sort((a, b) => londonTimestamp(a) - londonTimestamp(b));
    const stageEvents = [...unused]
      .map((id) => byId.get(id))
      .filter((event) => eventStage(event) === stage)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    stageMatches.forEach((match, index) => {
      if (!stageEvents[index]) return;
      mapping.set(match.id, stageEvents[index]);
      unused.delete(stageEvents[index].id);
    });
  }

  return mapping;
}

function statusFor(event) {
  const type = event.status?.type || event.competitions?.[0]?.status?.type || {};
  if (type.completed || type.state === "post") return "finished";
  if (type.state === "in") return "live";
  return "upcoming";
}

function linkFor(event, relation) {
  return event.links?.find((link) => link.rel?.includes(relation))?.href || null;
}

function londonDateTime(isoDate) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(isoDate)).map((part) => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function eventSnapshot(event) {
  const competition = event.competitions?.[0] || {};
  const teams = eventTeams(event);
  const status = statusFor(event);
  const teamNamesById = new Map(
    (competition.competitors || []).map((competitor) => [
      String(competitor.id),
      canonicalTeamName(competitor.team?.displayName || competitor.team?.name)
    ])
  );
  const goals = (competition.details || [])
    .filter((detail) => detail.scoringPlay && !detail.shootout)
    .map((detail) => ({
      team: teamNamesById.get(String(detail.team?.id)) || "",
      player: detail.athletesInvolved?.[0]?.displayName || "Unknown scorer",
      minute: detail.clock?.displayValue || "",
      ownGoal: Boolean(detail.ownGoal),
      penalty: Boolean(detail.penaltyKick)
    }));
  const localKickoff = londonDateTime(event.date);

  return {
    externalId: String(event.id),
    status,
    startTime: event.date,
    date: localKickoff.date,
    time: localKickoff.time,
    home: teams.home,
    away: teams.away,
    ...(status === "upcoming" ? {} : {
      score: [Number(teams.homeRaw?.score || 0), Number(teams.awayRaw?.score || 0)]
    }),
    clock: event.status?.type?.shortDetail || competition.status?.type?.shortDetail || "",
    goals,
    report: status === "finished" ? linkFor(event, "recap") || linkFor(event, "summary") : null,
    highlights: status === "finished" ? linkFor(event, "highlights") : null,
    summary: linkFor(event, "summary"),
    headline: competition.headlines?.[0]?.description || "",
    venue: competition.venue?.fullName || event.venue?.displayName || "",
    sourceUpdatedAt: event.date
  };
}

export function buildSnapshot(payload, generatedAt = new Date()) {
  const events = payload?.events;
  if (!Array.isArray(events) || events.length !== 104) {
    throw new Error(`Expected 104 World Cup events, received ${events?.length ?? "none"}`);
  }

  const mapping = mapEventsToSchedule(events);
  if (mapping.size !== 104) {
    const missing = schedule.filter((match) => !mapping.has(match.id)).map((match) => match.id);
    throw new Error(`Mapped ${mapping.size}/104 events. Missing match IDs: ${missing.join(", ")}`);
  }

  const matches = Object.fromEntries(
    [...mapping.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, event]) => [id, eventSnapshot(event)])
  );

  const finished = Object.values(matches).filter((match) => match.status === "finished").length;
  const live = Object.values(matches).filter((match) => match.status === "live").length;
  const upcoming = Object.values(matches).filter((match) => match.status === "upcoming").length;
  if (finished + live + upcoming !== 104) throw new Error("Status totals do not equal 104");

  return {
    generatedAt: generatedAt.toISOString(),
    timezone: "Europe/London",
    source: { name: "ESPN public scoreboard JSON", url: SCOREBOARD_URL },
    counts: { total: 104, finished, live, upcoming },
    matches
  };
}

export function serializeSnapshot(snapshot) {
  return `// Generated by scripts/update-world-cup-data.mjs. Do not edit manually.\nexport const liveSnapshot = ${JSON.stringify(snapshot, null, 2)};\n`;
}

function isTournamentWindow(now) {
  const date = now.toISOString().slice(0, 10);
  return date >= "2026-06-11" && date <= "2026-07-20";
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const now = new Date();
  if (!isTournamentWindow(now) && !args.has("--force")) {
    console.log("Outside the 2026 World Cup update window; no changes made.");
    return;
  }

  const inputArg = process.argv.find((value) => value.startsWith("--input="));
  const payload = inputArg
    ? JSON.parse(await readFile(resolve(inputArg.slice("--input=".length)), "utf8"))
    : await fetch(SCOREBOARD_URL, {
      headers: { "User-Agent": "Pulse26-data-refresh/1.0 (+https://github.com/taofeng-sketch/taofeng_vibe_coding)" },
      signal: AbortSignal.timeout(20_000)
    }).then((response) => {
      if (!response.ok) throw new Error(`Scoreboard request failed: HTTP ${response.status}`);
      return response.json();
    });

  const snapshot = buildSnapshot(payload, now);
  const output = join(dirname(fileURLToPath(import.meta.url)), "..", "live-snapshot.js");
  const temporaryOutput = `${output}.tmp`;
  await writeFile(temporaryOutput, serializeSnapshot(snapshot), "utf8");
  await rename(temporaryOutput, output);
  console.log(`Updated ${output}: ${snapshot.counts.finished} finished, ${snapshot.counts.live} live, ${snapshot.counts.upcoming} upcoming.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
