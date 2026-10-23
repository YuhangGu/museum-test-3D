# Layers — mobile architectural heritage museum

A standalone Vue 3 / TypeScript / Three.js / MapLibre prototype, with Fastify, PostgreSQL/PostGIS, and server-owned GLB storage. Designed first for a 390 × 844 portrait screen. No React, external model downloads, account system, or runtime asset CDN.

The three Salzburg-area buildings are **fictional**. All reuse the same current GLB and the same illustrative historical GLB. The 1800 version is **not a historically accurate reconstruction**. The locally stored map is deliberately schematic; it is not for navigation and does not claim street-level accuracy.

## Start the complete stack

Install Docker with Compose v2. From this directory:

```sh
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD to a long unique value.
docker compose up --build -d
```

Open http://localhost:8080. The database starts first, a one-shot migration/seed service completes, then the API and web start. Initial seed assets are already included under storage/models; no model download is required. Use a URL-safe database password or percent-encode special characters in the DATABASE_URL configuration.

```sh
docker compose logs -f api migrate
docker compose ps
docker compose down
```

`down` preserves the named `museum-db` volume. `down -v` intentionally deletes the database. Back up that volume and storage/models together. Migrations are transactional and serialized with an advisory lock. Seed data is applied once, not reapplied over later edits. The API is available through the web service at `/api`; the database and API ports are not published.

For production, use an HTTPS reverse proxy, your domain, firewall rules, a secret manager, and database/model backups. This prototype does not include an upload/admin UI. The public model endpoint is intended to be publicly readable.

## Access from your phone

Connect your phone and server to the same Wi-Fi. Find the server LAN IP (macOS: `ipconfig getifaddr en0`; Linux: `hostname -I`). Open `http://YOUR-LAN-IP:8080` on the phone. Allow inbound TCP 8080 in the host firewall and disable Wi-Fi client isolation if necessary. Do not use `localhost` on the phone. API and model URLs are same-origin, so no frontend URL changes are needed. Development HTTP is adequate for this viewer; use HTTPS for an internet deployment.

## Local development

Node 22.13+ (Node 22 LTS recommended), npm, and a PostgreSQL 16/PostGIS 3.4 instance are required for full-stack development.

```sh
npm ci
npm run models          # optional: regenerate the included original GLB files
cp .env.example .env    # set a database password
# Start just the persistent database and publish its port via the dev override:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
export DATABASE_URL='postgresql://museum:YOUR-PASSWORD@127.0.0.1:5432/museum'
npm run db:migrate
npm run dev
```

Open http://localhost:5173 (or `http://YOUR-LAN-IP:5173` on your phone). Vite proxies `/api` to port 3001. Shell environment variables are inherited by npm workspaces. If you prefer dotenv files, put local API settings in apps/api/.env, since that is the API workspace working directory. `MODEL_STORAGE_PATH` defaults to the repository storage/models directory during workspace development; use an absolute path when overriding it.

To inspect the UI without PostgreSQL:

```sh
npm ci
npm run dev:demo
```

**This explicit preview mode uses in-memory fixture data and does not provide persistence.** It still retrieves real server-hosted GLBs through the API. `/api/health` reports `demo-memory`; normal deployments report `postgres`. Docker never enables demo mode.

## Configuration

- `DATABASE_URL`: API database connection string; mandatory outside explicit demo mode.
- `MODEL_STORAGE_PATH`: absolute model directory, `/app/storage/models` in Docker.
- `PORT` / `HOST`: API listener (3001 / 0.0.0.0 by default).
- `FRONTEND_ORIGIN`: optional comma-separated CORS allowlist for separately hosted frontends. Same-origin deployment needs no CORS.
- `VITE_API_BASE_URL`: optional absolute public API origin at frontend build time; API-provided relative asset URLs resolve against it.
- `API_PROXY_TARGET`: Vite's development API target.
- `WEB_PORT`: published Docker web port, default 8080.

## Replace the sample with photogrammetry

1. Copy an optimized, self-contained GLB into `storage/models` on the server. Models are never copied into apps/web/public or bundled into the frontend.
2. Insert a new `models` record with a fresh UUID, a storage key relative to the storage directory (such as `rivergate-v2.glb`), original filename, model type `current`, actual file size in bytes, and MIME type `model/gltf-binary`.
3. Update only the relevant building's `current_model_id`. Do not overwrite the shared sample record unless you intend to change all buildings referencing it. Use new model IDs and filenames for revisions to avoid stale browser caches.
4. Set `historical_model_id` and `historical_year` if a historical model exists, or leave them NULL. Align both models in the same coordinates, scale, and orientation **before** upload. The viewer does not independently center or rescale each model, so comparisons do not drift.
5. Adjust annotation X/Y/Z values to that model's local coordinates. The supplied convention is +Y up, +Z toward the entrance, origin at ground center, meters. Geometry is preserved; camera position is computed from the model bounds.

A `.gltf` endpoint is supported for self-contained JSON glTF files using data URIs. Multi-file glTF dependencies are not served by this prototype; package assets as GLB. DRACO/KTX2 decoders are not installed; export standard glTF geometry/textures or add local decoder assets before using compressed formats. Large scans should be decimated and textures resized for mobile devices.

## Add a building

Open a SQL session with `docker compose exec db psql -U museum -d museum` (adjust credentials as configured):

```sql
INSERT INTO buildings
  (id,name,description,location,current_model_id,historical_model_id,historical_year)
VALUES
  ('20000000-0000-4000-8000-000000000004',
   'New demonstration building', 'A fictional example.',
   ST_SetSRID(ST_MakePoint(13.046,47.800),4326),
   '10000000-0000-4000-8000-000000000001', NULL, NULL);

INSERT INTO annotations
  (id,building_id,title,description,position_x,position_y,position_z,historical_period,source_reference)
VALUES
  ('30000000-0000-4000-8000-000000000040',
   '20000000-0000-4000-8000-000000000004',
   'Entrance','An example architectural note.',0,0.9,1.62,
   'Demonstration','Original demonstration geometry');
```

PostGIS coordinates use **longitude, latitude**, SRID 4326. Reload the map to fetch new metadata. The map marker and collection list are data-driven. The collection count is computed from API data. Optional `thumbnail_url`, annotation `image_url`, and `source_reference` may be set when verified supporting material is available.

## API and integration

- GET `/api/health`: database readiness and mode.
- GET `/api/buildings`: `{ data: Building[] }` with coordinates and model identifiers/URLs.
- GET `/api/buildings/:id`: `{ data: Building }`.
- GET `/api/buildings/:id/annotations`: `{ data: Annotation[] }`.
- GET `/api/models/:modelId/file`: model bytes, MIME type, ETag, caching, and single byte ranges.

Invalid IDs return 400; unknown records or missing assets return 404; unsatisfiable/multiple ranges return 416; internal errors use a structured, sanitized JSON error. Storage uses database keys, extension checks, canonical realpaths, and confinement checks including symlink escapes. No absolute server paths are returned to clients. Keep model storage writable only by trusted administrators.

Frontend code uses model URLs from metadata. The repository serializes these centrally. An object-storage implementation can replace the file endpoint with an authorized stream or redirect to a signed S3-compatible URL without changing the viewer. Authentication/upload management can be added at the API boundary later.

Hash URLs such as `/#building=UUID` support reloads and browser navigation without a routing dependency. Viewer components dispose GPU resources, controls, animation loops, and resize observers on navigation. Both comparison scenes render through **one camera** using a full-size viewport and a scissor region. A touch-friendly native range input controls the divider and is also keyboard accessible. Architectural hotspots project model-space coordinates each frame and hide behind occluding geometry; comparison mode hides hotspots to avoid implying that current annotations belong to the earlier geometry. The information sheet also provides an accessible feature list.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests exercise API metadata reuse, annotation retrieval, invalid IDs, missing records, binary GLB delivery, byte ranges, ETags, storage traversal and symlink protection, plus local model geometry/coordinate compatibility. Docker/PostGIS persistence should also be checked on a Docker host: start the stack, add a record, run `docker compose restart db`, and confirm the record remains. See VERIFICATION.md for checks actually performed in the implementation environment.

Manual acceptance flow: use a 390 × 844 viewport, select each of the three markers, open 3D, drag/pinch/pan, reset, tap a hotspot, open the information sheet, enable comparison, move the slider, rotate with comparison enabled, resize, then return to the map. Repeat on physical iOS Safari and Android Chrome. Network/WebGL failures display retry guidance. The building list remains a fallback when map rendering fails.

## Layout

`apps/web` holds views, shared/map/viewer components and the API client. `apps/api` holds routes, the repository, migrations, and a confined file storage adapter. `packages/shared` defines frontend/API contracts. `storage/models` is mounted read-only into API containers. `scripts/generate-models.mjs` reproducibly creates both original sample assets.

## Limits

The offline map is schematic, the historical architecture is invented, and all three buildings intentionally share geometry. Real geographic base mapping can be configured in BuildingMap.vue using a licensed MapLibre style/tile provider or a self-hosted tile server. No live geolocation or directions are included. Large photogrammetry models require optimization and real-device memory testing. A generic ground disk assumes the sample model's ground plane; customize/remove it for differently aligned scans. Automated checks cannot substitute for actual phone gesture and Docker persistence testing.
