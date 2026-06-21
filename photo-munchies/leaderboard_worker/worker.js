const SCORES_KEY = "scores";
const TOTAL_PLAYS_KEY = "totalPlays";
const MAX_STORED_SCORES = 500;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
    if (!env.MUNCH_LEADERBOARD) {
      return withCors(json({ error: "Missing MUNCH_LEADERBOARD KV binding" }, 500));
    }

    if (request.method === "GET") return handleGet(request, env);
    if (request.method === "POST") return handlePost(request, env);
    return withCors(json({ error: "Method not allowed" }, 405));
  },
};

async function handleGet(request, env) {
  const url = new URL(request.url);
  const limit = clampNumber(Number(url.searchParams.get("limit") || 20), 1, 50);
  const scores = await readScores(env);
  const totalPlays = Number(await env.MUNCH_LEADERBOARD.get(TOTAL_PLAYS_KEY)) || scores.length;
  return withCors(json({
    scores: scores.slice(0, limit),
    totalPlays,
    lastUpdated: new Date().toISOString(),
  }));
}

async function handlePost(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    return withCors(json({ error: "Invalid JSON" }, 400));
  }

  const record = normalizeRecord(body);
  if (!record) return withCors(json({ error: "Invalid score payload" }, 400));

  const scores = await readScores(env);
  scores.push(record);
  scores.sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt));
  const trimmed = scores.slice(0, MAX_STORED_SCORES);
  const totalPlays = (Number(await env.MUNCH_LEADERBOARD.get(TOTAL_PLAYS_KEY)) || 0) + 1;

  await Promise.all([
    env.MUNCH_LEADERBOARD.put(SCORES_KEY, JSON.stringify(trimmed)),
    env.MUNCH_LEADERBOARD.put(TOTAL_PLAYS_KEY, String(totalPlays)),
  ]);

  const rank = trimmed.findIndex((item) => item.id === record.id) + 1;
  return withCors(json({ ok: true, rank, totalPlays }));
}

async function readScores(env) {
  try {
    const parsed = JSON.parse(await env.MUNCH_LEADERBOARD.get(SCORES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeRecord(body) {
  const score = clampNumber(Math.round(Number(body.score)), 0, 999999);
  const name = cleanName(body.name);
  if (!name || !Number.isFinite(score)) return null;
  return {
    id: crypto.randomUUID(),
    name,
    score,
    playedAt: new Date().toISOString(),
    mode: body.mode === "two-player" ? "two-player" : "solo",
    duration: clampNumber(Number(body.duration || 32), 4, 60),
    gameOver: Boolean(body.gameOver),
    game: "munch-monster",
  };
}

function cleanName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
