# Bundled map library provenance

The bundled runtime in `leaflet-runtime.ts` contains the distribution JavaScript and CSS from Leaflet 1.9.4, embedded as strings so the WebView loads no remote executable code. The JS and CSS were fetched from Leaflet's official CDN package URL on 2026-10-11:

- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` — SHA-256 `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a`
- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` — SHA-256 `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6`

The same values can be reproduced by extracting the JSON string literals from `leaflet-runtime.ts` and hashing their decoded UTF-8 contents. Leaflet's BSD 2-Clause license is included in `LEAFLET-LICENSE.txt`.

Leaflet's official download page identifies 1.9.4 as its stable version and documents the distribution files and CDN sources: https://leafletjs.com/download.html
