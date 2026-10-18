# SweetTape homepage — study recreation

A from-scratch recreation of the [sweet-tape.com](https://sweet-tape.com/) homepage animations, reverse engineered with REA (runtime capture, bundle analysis, screenshot diffing). Built with Vite, GSAP + ScrollTrigger, Lenis, three.js and Matter.js.

```sh
npm install
npm run dev   # http://localhost:5173
```

Images, 3D models and sounds are **not** in this repo: the Vite dev server proxies `/assets` and `/api/media` to sweet-tape.com at runtime, so it only works under `npm run dev`.

Unofficial and for learning only. The SweetTape brand, artwork, models and sounds belong to SB Tape Group Sdn Bhd — don't deploy this publicly.
