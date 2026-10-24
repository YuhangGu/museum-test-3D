# Layers: User Guide

**Open the collection:** [yuhanggu.github.io/museum-test-3D](https://yuhanggu.github.io/museum-test-3D/)

Layers is a mobile-first architectural model viewer. It presents three models on a schematic map around Salzburg. The map is for exploring the collection, not for navigation. OpenStreetMap supplies geographic context.

## Explore the map

- Tap a numbered building marker to open its model.
- Tap the **BUILDINGS** tab on the left edge to open the building list. Choose an entry to move the map to that marker; tap the marker to open it.
- Use the map’s reset control to return to the initial map view.
- Tap **i** to read about the collection and its locations.

The collection includes an interpretive Salzburg farmhouse, an unfurnished house with interior partitions, and a model of Devonaboy Jome Masjidi in Andijan, Uzbekistan. The house and mosque markers remain in Salzburg for this demonstration.

## Explore a 3D building

- Drag with one finger to rotate the model. Pinch to zoom; drag with two fingers to pan. On a computer, use left-click and drag to rotate, the scroll wheel to zoom, and right-click and drag to pan.
- Tap the reset icon above the viewer to restore the camera.
- Tap **i** in the header for building details and available architectural notes.

### Inspect the interior

Turn on **INSIDE THE BUILDING**. A section slider appears over the viewer and cuts into the model from the front. Use the **TOP** control beside the slider to switch to a roof-down cut; the slider then reveals the building toward the ground floor. Turn this mode off to restore the full model.

When the interior mode is on, tap the **ROOMS** tab at the left edge to open the room list. Choose a room to move the section to its position and highlight it. The **CURRENT ROOM** card remains visible; tap it to open the room description and function. Some supplied models have no room labels, so their spaces are listed as “Room 01,” “Room 02,” and so on.

### Compare another chapter

Turn on **SEE ANOTHER CHAPTER** to compare the current model with the illustrative 1800 farmhouse model. Drag the divider to reveal more of either view. The two modes are exclusive: enabling the comparison turns off the interior section, and enabling the interior section turns off the comparison.

The same farmhouse model is used as a visual stand-in for all three buildings. For the house and mosque, it is **not** a historical reconstruction or evidence of how those buildings looked in 1800.

## Run a local preview

Requirements: Node.js 22.13 or later and npm.

```sh
npm ci
npm run dev:demo
```

Open [http://localhost:5173](http://localhost:5173). Demo mode uses in-memory building data and does not require PostgreSQL or save changes between sessions. To use the full persistent stack instead, follow the Docker Compose instructions in [README.md](README.md).

## Troubleshooting

- **A model does not load:** refresh the page and reopen the building. A stable internet connection is needed for the online map; local demo models are served by the app.
- **The map is blank or unavailable:** use the **BUILDINGS** tab to choose a model directly.
- **Controls feel different on a phone:** rotate with one finger, pan with two fingers, and zoom with a pinch gesture.
