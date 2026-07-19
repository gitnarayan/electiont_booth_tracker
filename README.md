# Election Booth Tracker

A small full-stack project providing an internal analytics dashboard and a field lookup mobile app for constituency and booth-level election data. The backend exposes a simple REST API (with an OpenAPI spec) and a seeding script that generates sample constituencies, booths and votes for local development.

**This README documents the actual code in the repository — it does not describe features that are not implemented.**

---

**Quick links**
- Backend entry: [backend/server.js](backend/server.js)
- OpenAPI spec: [backend/openapi.json](backend/openapi.json)
- Backend env example: [backend/.env.example](backend/.env.example)
- Database seeding: [backend/seed.js](backend/seed.js)
- Frontend (web): [web/src/App.jsx](web/src/App.jsx)
- Mobile (Expo): [mobile/App.js](mobile/App.js)

---

## Repository structure

- `backend/` — Express + Mongoose API server, data models and seeding utilities.
  - `server.js` — main server and API route handlers.
  - `openapi.json` — OpenAPI 3.0 spec for the implemented endpoints.
  - `seed.js` — deterministic seeder that populates constituencies, candidates, booths and votes.
  - `models/` — Mongoose models: `Booth`, `Candidate`, `Constituency`, `Vote`.
  - `config/db.js` — MongoDB connection helper (reads `MONGODB_URI`).

- `web/` — React + Vite single-page dashboard used by the analytics UI.
  - `src/components` — `Login.jsx`, `Dashboard.jsx` implement the UI and call backend APIs.
  - `package.json` — dev/build scripts for the web UI.

- `mobile/` — React Native (Expo) field lookup app.
  - `App.js` — single-file mobile UI used to search booths and view cached details.
  - `package.json` — Expo scripts and dependencies.

---

## Backend

The backend is a lightweight Express app using Mongoose. It expects a running MongoDB instance and an environment variable `MONGODB_URI`.

Prerequisites
- Node.js (18+ recommended)
- MongoDB (local or remote)

Environment
Create a `.env` file in `backend/` based on `backend/.env.example` and set at least:

```bash
MONGODB_URI=mongodb://username:password@host:port/database
PORT=5000 # optional; defaults to 5000
```

Install & run (development)

```bash
cd backend
npm install
npm run dev    # runs node --watch server.js
```

Production / start

```bash
cd backend
npm install --production
npm start      # runs node server.js
```

Seeding the database

The repository includes `backend/seed.js` which generates sample constituencies, candidates, booths and vote documents suitable for local testing.

```bash
cd backend
npm install
npm run seed
```

If you have existing data, the seeder will delete `Vote`, `Booth`, `Candidate`, and `Constituency` collections before inserting fresh data.

API endpoints (implemented)

- `GET /api/health` — service & DB health; returns a simple JSON status and booth count.
- `GET /api/constituencies` — return a list of constituencies with aggregate stats:
  - `id`, `name`, `state`, `total_booths`, `total_voters`, `turnout_votes`, `turnout_percentage`, `leading_candidate`.
- `GET /api/constituencies/{id}/booths` — booths & votes for a constituency (path param `id` is a MongoDB ObjectId string). Returns `{ constituency_name, booths: [Booth] }`.
- `GET /api/booths/search?q=...` — search booths by name or booth number; returns an array of Booth objects (with `votes` and `leading_candidate`).
- `POST /api/auth/login` — mock analytics login endpoint. Accepts `{ username, password }`:
  - For local development the hard-coded credential is `admin` / `password123`. Successful response returns `{ success, token, user }` with a mock token.

Notes:
- The API serves the OpenAPI spec at `/openapi.json` and a minimal Swagger UI at `/api/docs`.
- See `backend/openapi.json` for full response schemas and example shapes.

Data model summary
- `Constituency` — { name, district, state }
- `Booth` — { constituency (ObjectId), boothNumber, name, location, totalVoters, turnoutVotes }
- `Candidate` — { constituency (ObjectId), name, party, partyCode, partyColor }
- `Vote` — { booth (ObjectId), candidate (ObjectId), votesReceived }

---

## Web (React + Vite)

The web UI is a minimal analytics dashboard that consumes the backend API.

Install & run (development)

```bash
cd web
npm install
npm run dev
```

Build for production

```bash
cd web
npm run build
# preview a production build
npm run preview
```

Behavior & integration notes
- The web app automatically chooses `VITE_API_URL` or falls back to `http://<host>:5000`.
- `web/src/components/Login.jsx` posts to `/api/auth/login` and stores a mock token in localStorage.
- `web/src/components/Dashboard.jsx` calls `/api/constituencies` and `/api/constituencies/{id}/booths` to display metrics, booth tables and charts.
- Theme toggle is persisted to `localStorage` via the `data-theme` attribute on the document root.

---

## Mobile (Expo)

The mobile app is an Expo-based field lookup UI. It performs booth searches against the backend and caches recently viewed booth details in `AsyncStorage` for offline lookup.

Install & run

```bash
cd mobile
npm install
npm start       # Opens Expo devtools; use the QR code or device/emulator commands
```

Notes
- Default backend URL in `mobile/App.js` is set to `http://192.168.1.8:5000`. Edit the `Backend Server URL` in the app settings modal or update the `backendUrl` state before running on a real device.
- The mobile app uses `GET /api/booths/search?q=...` and expects an array response.

---

## Development workflow

- Seed the database: `cd backend && npm run seed` (ensure `MONGODB_URI` is set).
- Start backend: `cd backend && npm run dev`.
- Start web UI: `cd web && npm run dev` and open the browser.
- Start mobile app: `cd mobile && npm start` (Expo).

If your mobile device is on the same network as your development machine, set the backend URL in the mobile app to `http://<your-machine-ip>:5000`.

---

## Deployment notes

- The backend is a plain Node/Express app. Deploy behind a process manager (PM2) or containerize it with Docker. Ensure `MONGODB_URI` points to your production MongoDB and open the `PORT` used by the process or your reverse proxy.
- The web app can be built with `npm run build` and served by any static hosting (Netlify, Vercel, S3 + CloudFront, etc.). During build, ensure the runtime API URL is provided either via `VITE_API_URL` build-time env or configured on the host to point to the backend.
- Mobile app is an Expo project — build through Expo's build services or eject to a native project for direct App Store / Play Store submission.

---

## Testing & debugging tips

- API docs are available at `http://<backend-host>:<port>/api/docs` (Swagger UI) and `/openapi.json`.
- If you see `MONGODB_URI must be set` errors, set your `.env` correctly and restart the backend.
- Use the provided mock credential (`admin` / `password123`) for the web login during development.

---

## License

See `mobile/LICENSE` for the mobile portion license file. The rest of the repository does not include an explicit license file.

---

If you'd like, I can also:
- Add example `docker-compose.yml` to run MongoDB + backend + web for local development.
- Add CI scripts to run a lint/build pipeline for the `web` and `backend` packages.

## Local development with Docker Compose

A convenience `docker-compose.yml` is included to run MongoDB, the backend and the web frontend together for local development. It mounts the source folders into Node containers so edits are reflected immediately (development mode).

From the repository root run:

```bash
docker compose up --build
```

This will expose the services:
- Backend: http://localhost:5000
- Web (Vite dev server): http://localhost:5173
- MongoDB: 27017 (mapped to the host)

Run the seeder after the stack is up (either while the `backend` container is running or using `run`):

```bash
# with the backend container running
docker compose exec backend npm run seed

# or run a one-off container to seed
docker compose run --rm backend npm run seed
```

Notes:
- The compose file runs `npm install` inside the containers on startup. The first run may take a little longer while dependencies install.
- If you need the web dev server to be accessible on other devices, ensure your machine's firewall allows incoming connections to the exposed ports.

## Production multi-stage Dockerfiles

This repository includes production-optimized multi-stage Dockerfiles:

- `backend/Dockerfile.prod` — builds a minimal Node.js production image for the backend.
- `web/Dockerfile.prod` — builds the web app with Vite and serves the output via Nginx.

Build the images locally:

```bash
docker build -f backend/Dockerfile.prod -t election-backend:prod ./backend
docker build -f web/Dockerfile.prod -t election-web:prod ./web
```

Run examples:

```bash
# Backend (ensure MONGODB_URI points to your MongoDB)
docker run --rm -e MONGODB_URI="mongodb://<mongo-host>:27017/election" -p 5000:5000 election-backend:prod

# Web (serves static files on port 80)
docker run --rm -p 8080:80 election-web:prod
```

If you'd like, I can add a `docker-compose.prod.yml` to wire these images together (no source mounts, production configuration). 

I have added a production compose file at `docker-compose.prod.yml` which uses the production images `election-backend:prod` and `election-web:prod`.

To use it:

1. Build the production images (see the `Dockerfile.prod` files):

```bash
docker build -f backend/Dockerfile.prod -t election-backend:prod ./backend
docker build -f web/Dockerfile.prod -t election-web:prod ./web
```

2. Start the production stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

3. Tear down when finished:

```bash
docker compose -f docker-compose.prod.yml down
```

Override environment values
---------------------------

You can provide environment-specific overrides using `docker-compose.prod.override.yml` which is included in the repo. It sets `MONGODB_URI`, `VITE_API_URL`, and related values from the shell environment (or an env file).

Run the production compose with the override file like so:

```bash
# using inline env vars
MONGODB_URI="mongodb://user:pass@mongo:27017/election" VITE_API_URL="https://api.example.com" \
  docker compose -f docker-compose.prod.yml -f docker-compose.prod.override.yml up -d

# or with an env file (exported by your shell)
docker compose -f docker-compose.prod.yml -f docker-compose.prod.override.yml up -d
```

The override file is useful for secret-free configuration or when deploying to environments where you inject env vars separately.

