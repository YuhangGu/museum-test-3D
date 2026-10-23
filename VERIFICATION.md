# Verification — 23 October 2026

## Passed in this environment

- TypeScript checks for API and Vue frontend.
- ESLint with no errors or warnings after formatting fixes.
- Five automated test groups covering API metadata and shared model references, annotations, structured errors, actual binary GLB delivery, HEAD, ETag, single/suffix ranges, invalid ranges, path traversal, forbidden extensions, symlink escapes, and generated GLB containers/geometry.
- Production compilation of both workspaces; MapLibre worker is bundled locally and Three.js viewer code is split from the landing screen.
- Dependency audit: no known vulnerabilities reported at the time of verification.
- No .glb or .gltf files in frontend production output.
- Compiled API started successfully with explicit in-memory preview fixtures; frontend production files served successfully, with /api proxied to that compiled API.
- Browser inspection at effective 390 × 844 CSS pixels (the browser's existing zoom required a correspondingly larger viewport override), plus desktop rendering.
- All three building markers visible within the mobile map area; selection opens the corresponding detail sheet.
- All three buildings open their viewer using the same backend model asset.
- Actual rendered GLB, orbit drag, camera reset, architectural hotspot sheet, and return to map.
- Historical toggle loads the second server asset; comparison slider changes from 50 to 65 and displays visibly different roof geometry through the shared camera.
- Locally stored map and model assets load without external model or tile services.

## Not verified here

Docker and PostgreSQL binaries were absent. The Compose image build, PostGIS migration execution, SQL repository against a live database, and persistence across database/container restarts have **not** been run. API tests use an injected in-memory repository; this is not a claim that database integration was tested.

Physical iPhone Safari and Android Chrome were unavailable. Mouse orbit and a native slider were exercised in the desktop browser at mobile dimensions; real two-finger pinch/pan gestures, safe-area behavior on physical devices, and large photogrammetry memory pressure still need device testing.

The map is explicitly schematic, not an accurate Salzburg street map. Buildings and historical reconstruction are invented demonstrations.

## Reproduce

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. For the full persistence check, follow README.md to start Docker, insert a building, restart the database service, and confirm that building remains visible. For UI-only inspection, use `npm run dev:demo`; it intentionally does not persist records.
