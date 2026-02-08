# Copilot Instructions — MyanJobs (TRM)

Short, actionable guidance for AI coding assistants working in this repository.

1. Big picture
- Backend: Express API in `server/server.js` serving `/api/v1/*`, MongoDB via `server/config/database.js`, Redis used for caching. Background jobs (cron) live under `server/cron/` and start automatically when the server runs.
- Frontend: React + TypeScript app in `src/` built with Vite. Dev server: `npm run dev`. Build output goes to `dist` (server expects `dist/index.html`).
- Deployment targets: Docker (`docker/`), Kubernetes manifests (`k8s/`), and multiple cloud-friendly paths (Render, Railway). The server tries several `dist` paths—ensure built assets are placed where `server/server.js` can find them.

2. Important files & entry points
- Server entry: `server/server.js` — primary place to observe middleware, route registration, CORS policy, health checks and optional route loading.
- Frontend entry: `src/main.tsx` and `src/App.tsx` — routing, major sections and example page components live under `src/sections` and `src/components`.
- Build config: `vite.config.js` — alias `@` → `src`, dev proxy to `http://localhost:3000`, manual chunking rules (see `manualChunks`).
- Scripts & workflows: `package.json` contains canonical commands used by developers and CI (tests, seeders, migrations, cache tools).

3. Developer workflows (concrete commands)
- Run frontend dev server: `npm run dev` (Vite on port 5173).
- Run backend in dev: `npm run server:dev` (nodemon). To run both locally use two terminals or use the Docker compose under `docker/docker-compose.yml`.
- Build frontend: `npm run build`. After build, start server to serve static assets: `npm run start` (node server/server.js) or `npm run preview` for a Vite preview.
- Database migrations: `npm run migrate:up|down|status|create` (uses `migrate-mongo` with config in `server/migrations`).
- Seed test data: `npm run seed` (or granular `seed:users`, `seed:jobs`, etc.).
- Tests: unit & integration (Jest) — `npm run test`, frontend unit tests via Vitest: `npm run test:unit:frontend`, e2e via Playwright: `npm run test:e2e`.

4. Patterns & conventions specific to this repo
- API prefix: almost all API routes mount under `/api/v1`. When adding routes, follow the existing pattern in `server/routes/*` and register in `server/server.js`.
- Optional modules: many route modules are loaded via `optionalRequire()` in `server/server.js` — treat some integrations (messaging, certain payment routes) as optional: add guards when importing or require defensive error handling.
- Structured logging: the server sets `X-Request-Id` and prints JSON logs when `LOG_FORMAT=json`. Keep logs structured for aggregators (ELK/Loki).
- Cursor pagination: server services use cursor pagination utilities (`server/services/paginationService.js`, `queryOptimizer.js`); prefer cursor-based pagination for large collections.
- Frontend alias: import with `@/` to reference `src/` (configured in `vite.config.js`).

5. Integration & external dependencies to be aware of
- Datastore: MongoDB (migrations + seeders present). Look at `server/config/database.js` and `server/migrations`.
- Cache: Redis used via `server/services/*` (see cache warming and enhanced cache service scripts in `package.json`).
- Messaging & Payments: integrations for Viber/Telegram and KBZPay/WavePay exist; some routes or modules may be optional or behind feature flags—check `server/routes` and `docs/technical` before modifying.
- AI features: resume optimizer and analytics routes are under `server/routes/ai.js` and `src/sections/ResumeOptimizer` — changes here often require API and frontend coordination.

6. Code/formats & style
- Mixed JS/TS: backend is mostly JavaScript; frontend is TypeScript React. Keep changes in the same language unless migrating deliberately.
- Linting/format: `npm run lint`, `npm run lint:fix`, `npm run format`. Follow existing Prettier/ESLint configs.
- Node engine: `engines.node` requires Node 22.x in `package.json`; use the same major Node version in CI/dev containers.

7. When you edit or add routes
- Add route file under `server/routes/` and export an Express router. Register the route in `server/server.js` using the `API_PREFIX` pattern.
- Add unit/integration tests under `tests/unit` or `tests/integration` and update CI test commands if necessary.

8. Useful examples (copyable)
- Start backend dev: `npm run server:dev`
- Start frontend dev: `npm run dev`
- Build and run locally: `npm run build && npm run start`
- Run migration up: `npm run migrate:up`
- Seed jobs only: `npm run seed:jobs`

9. Quick notes for maintainers
- The server performs defensive checks for a `dist` folder—ensure your `build` outputs to a location the server checks, or set `DIST_PATH` env to point to the built assets.
- When changing heavy frontend dependencies, consult `vite.config.js` manualChunks to avoid large un-cached bundles.

If any of these sections are unclear or you'd like the instructions to emphasize other areas (CI, Docker/K8s deployment, mobile app), tell me which and I'll iterate.
