import { defineConfig } from 'vite'

// Assets stay on sweet-tape.com; the dev server forwards same-path requests so
// GLB fetches avoid CORS. ponytail: dev-only, a static build would need its own copies.
const upstream = { target: 'https://sweet-tape.com', changeOrigin: true }

export default defineConfig({
  server: { proxy: { '/assets': upstream, '/api/media': upstream } },
})
