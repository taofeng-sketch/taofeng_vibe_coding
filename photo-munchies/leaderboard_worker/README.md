# Munch Monster Leaderboard Worker

This is an optional Cloudflare Worker backend for a global Munch Monster leaderboard.

The web game works without it by using `localStorage`. Connect this worker only when you want cross-device ranking and play-count tracking.

## Privacy Shape

Store only:

- `name`: short nickname, not a real name requirement
- `score`
- `playedAt`: server timestamp
- `mode`: `solo` or `two-player`
- `duration`
- `gameOver`

Do not upload camera frames, replay videos, face landmarks, photos, device IDs, or contact details.

## Deploy Sketch

1. Create a Cloudflare Worker.
2. Create a KV namespace named `MUNCH_LEADERBOARD`.
3. Bind the namespace to the Worker as `MUNCH_LEADERBOARD`.
4. Deploy `worker.js`.
5. Set the frontend endpoint before `live.js` loads:

```html
<script>
  window.MUNCH_MONSTER_LEADERBOARD_ENDPOINT = "https://your-worker.example.workers.dev";
</script>
```

For local testing, you can set it in the browser console:

```js
localStorage.setItem("munchMonsterLeaderboardEndpoint", "https://your-worker.example.workers.dev");
```

Then reload `live.html`.

## API

- `POST /`: submit one score.
- `GET /?limit=20`: return top scores and total play count.

