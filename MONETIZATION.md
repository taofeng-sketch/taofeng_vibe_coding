# Monetization Notes

This repo can eventually support ads, but the right product depends on the goal:

- **Google AdSense**: earn money by showing ads on the web games.
- **Google Ads**: pay Google to promote the games. This is the product formerly called AdWords.

For this repo, the relevant path is **AdSense**, not Google Ads.

## Recommended Approach

Do not add ads while the games are still changing every day. First get one game to a small but real usage loop, then add monetization in a restrained way.

For a kid-friendly camera game such as Photo Munchies:

1. Add a custom domain instead of relying only on the GitHub Pages subpath.
2. Add a clear privacy page explaining that camera frames stay in the browser and replay downloads are local.
3. Apply for AdSense with the domain.
4. Add the AdSense site script to the `<head>` only after approval.
5. Use conservative placements: outside the active game area, never next to the mouth button / Start / Save replay controls.
6. Do not ask users to click ads or reward game score for viewing/clicking ads.

## Official Integration Shape

Google's AdSense help says Auto ads require the AdSense code, while ad units require both the AdSense code and ad unit code. The Auto ads snippet should be pasted between the page's `<head>` and `</head>` tags.

Example placeholder only:

```html
<!-- Replace ca-pub-XXXXXXXXXXXXXXXX with Tao's real AdSense publisher id after approval. -->
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossorigin="anonymous"></script>
```

Do not commit a fake publisher id as if it is real.

## Policy Notes For Games

AdSense policy is strict about implementation:

- Do not click your own ads.
- Do not artificially inflate impressions or clicks.
- Do not encourage players to click or view ads.
- Do not put ads in a floating box or disguise ads as game controls.
- Do not place ads where they interfere with navigation or gameplay.
- Avoid ad placements on dead-end screens where a user cannot exit without interacting with an ad.

For Photo Munchies specifically, safe first placements would be:

- A small ad slot below the start panel.
- A small ad slot below the result screen after the replay/save controls.
- No ads on top of the camera canvas.
- No ads next to the mouth/fallback button.

## GitHub Pages Fit

GitHub Pages can host static websites from the repository and publish changes after a push. It is fine for early demos, but it is not ideal as the long-term monetization surface:

- A custom domain is better for AdSense approval, branding, and privacy-policy clarity.
- GitHub Pages has practical storage/bandwidth constraints and should not store user-generated videos.
- Replays should remain local browser downloads only.

## Current Decision

Do not add AdSense code yet.

Next monetization step: buy/connect a custom domain, add `privacy.html`, add an `ads.txt` file after AdSense provides the exact publisher line, then add the AdSense script only after approval.

## Sources

- [Google AdSense: Get and copy the AdSense code](https://support.google.com/adsense/answer/9274019)
- [Google AdSense Program policies](https://support.google.com/adsense/answer/48182)
- [Google Publisher Policies](https://support.google.com/adsense/answer/10502938)
- [GitHub Pages](https://pages.github.com/)
