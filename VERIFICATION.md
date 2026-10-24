# Verification — 24 October 2026

## Passed

- `npm run typecheck`
- `npm run lint`
- `npm test` (five test groups): distinct per-building models, mosque metadata and Salzburg demo coordinates, annotation availability, API model delivery, byte ranges, storage-path safety, and generated farmhouse GLB structure.
- `npm run build -w @museum/web`; the static build includes the 02 and 03 GLBs and the local Draco decoder files.

The active collection metadata identifies the Salzburg Alpine farmhouse, the location-unspecified realistic house model, and Devonaboy Jome Masjidi in Andijan. Only the farmhouse has an illustrative 1800 comparison. The database migration for these records is included but has not been run against a live PostgreSQL/PostGIS instance in this verification.

## Not verified

- The 004 metadata and 005 Salzburg demo-coordinate migrations against a live database.
- Browser rendering and touch gestures for the newly assigned house and mosque GLBs, including physical iPhone Safari and Android Chrome.
- Large-model memory use on physical mobile devices.

The web app uses OpenStreetMap tiles and needs an internet connection. All three markers are displayed around Salzburg, including the mosque model's retained Salzburg demonstration coordinate. The collapsible BUILDINGS drawer selects a model and pans the map to its marker.

## Reproduce

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Start `npm run dev:demo` for a non-persistent local preview. Run the full stack with Docker Compose to apply the database migration and exercise persistent model associations.
