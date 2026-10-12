# Optional map location picker

`LocationMap` is an explicit, optional alternative location input. It does not request permission or read GPS. The caller should show it only after the city search fallback; manual coordinate entry remains another offline option. Choosing a point on the map previews its latitude and longitude, and only the explicit **Use selected point** action calls `onSelect`.

The map is made from a locally bundled Leaflet 1.9.4 runtime. It loads raster map tiles from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` as the user views the map. The visible bottom-right attribution links to OpenStreetMap's copyright page. Network requests to that service expose the device IP address and the viewed tile area to the tile provider. Selecting a point does not submit exact coordinates to OpenStreetMap; the displayed map area may still reveal an approximate area. City search and manual coordinates do not use this map tile service.

The picker uses one interactive map, modest viewport look-ahead, WebView's HTTP cache, and an app-identifying User-Agent. It requests no tiles before the map is opened, does not prefetch, and offers no offline tile download. OSM's community-funded tile service is best-effort and has no availability guarantee. If tiles are unavailable, the picker shows a retry action and the caller can keep the city and manual coordinate inputs available.

## Focused verification

Run `npm run typecheck` and `node --experimental-strip-types --test src/components/map-assets/map-message.test.ts`. The focused tests cover malformed messages and latitude/longitude bounds. Native WebView behavior, tile-service availability, and external-link handling still need device validation.

OpenStreetMap requires the exact HTTPS tile endpoint, visible attribution, identifiable app traffic, and honoring HTTP cache headers; bulk downloads and offline prefetch are prohibited. See the [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) and [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright). Leaflet 1.9.4 is bundled locally under BSD 2-Clause; its source, checksums, and license are documented in [`src/components/map-assets/PROVENANCE.md`](../src/components/map-assets/PROVENANCE.md).
