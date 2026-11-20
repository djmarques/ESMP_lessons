// tools/build_map.js · Builds europa-mapa.js: country outlines of Europe, projected and simplified, for europa3d.js.
// Source: Natural Earth 1:50m (public domain), via the world-atlas package (ISC licence).
// Projection: Lambert azimuthal equal-area centred on 52° N, 10° E (as in the European Union's
// own maps, EPSG:3035), so areas compare honestly. 1 board unit = SCALE km.
const topo = require("world-atlas/countries-50m.json");
const { feature } = require("topojson-client");
const fs = require("fs");

const R = 6371, LAT0 = 52 * Math.PI / 180, LON0 = 10 * Math.PI / 180, SCALE = 190;
function project(lon, lat) {
  const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l - LON0)));
  const x = R * k * Math.cos(p) * Math.sin(l - LON0);
  const y = R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l - LON0));
  return [x / SCALE, y / SCALE];            // board units; y = north
}
// The window of the board, in board units (x east, y north).
const BOX = { x0: -15.2, x1: 16.6, y0: -10.6, y1: 11.6 };

// Codes used by europa3d.js, by Natural Earth name.
const CODES = {
  Portugal: "PT", Spain: "ES", France: "FR", Belgium: "BE", Netherlands: "NL", Luxembourg: "LU", Germany: "DE", Italy: "IT",
  Denmark: "DK", Ireland: "IE", "United Kingdom": "UK", Greece: "GR", Austria: "AT", Finland: "FI", Sweden: "SE", Cyprus: "CY",
  "N. Cyprus": "CY", Czechia: "CZ", Estonia: "EE", Hungary: "HU", Latvia: "LV", Lithuania: "LT", Malta: "MT", Poland: "PL",
  Slovakia: "SK", Slovenia: "SI", Bulgaria: "BG", Romania: "RO", Croatia: "HR", Norway: "NO", Switzerland: "CH", Albania: "AL",
  "Bosnia and Herz.": "BA", Georgia: "GE", Moldova: "MD", Montenegro: "ME", Macedonia: "MK", Serbia: "RS", Turkey: "TR",
  Ukraine: "UA", Kosovo: "XK", Iceland: "IS",
};

// Sutherland–Hodgman clipping of one ring against the board window.
function clip(ring) {
  const edges = [
    (p) => p[0] >= BOX.x0, (p) => p[0] <= BOX.x1, (p) => p[1] >= BOX.y0, (p) => p[1] <= BOX.y1,
  ];
  const cut = [
    (a, b) => { const t = (BOX.x0 - a[0]) / (b[0] - a[0]); return [BOX.x0, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (BOX.x1 - a[0]) / (b[0] - a[0]); return [BOX.x1, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (BOX.y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), BOX.y0]; },
    (a, b) => { const t = (BOX.y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), BOX.y1]; },
  ];
  let out = ring;
  for (let e = 0; e < 4; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
      const ina = edges[e](a), inb = edges[e](b);
      if (inb) { if (!ina) out.push(cut[e](a, b)); out.push(b); } else if (ina) out.push(cut[e](a, b));
    }
    if (!out.length) break;
  }
  return out;
}
// Douglas–Peucker simplification (closed ring).
function simplify(ring, tol) {
  if (ring.length < 8) return ring;
  // a closed ring starts and ends on the same point: simplify its two halves, split at the point farthest from the start
  let far = 0, fd = -1;
  ring.forEach((p, i) => { const d = Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]); if (d > fd) { fd = d; far = i; } });
  if (fd > 0 && far > 0 && far < ring.length - 1 && Math.hypot(ring[0][0] - ring[ring.length - 1][0], ring[0][1] - ring[ring.length - 1][1]) < 1e-6) {
    const a = simplifyOpen(ring.slice(0, far + 1), tol), b = simplifyOpen(ring.slice(far), tol);
    return a.concat(b.slice(1, -1));
  }
  return simplifyOpen(ring, tol);
}
function simplifyOpen(ring, tol) {
  if (ring.length < 3) return ring;
  const keep = new Uint8Array(ring.length); keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = -1, idx = -1;
    const [ax, ay] = ring[a], [bx, by] = ring[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((ring[i][0] - ax) * dy - (ring[i][1] - ay) * dx) / L; if (d > best) { best = d; idx = i; } }
    if (best > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return ring.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

const countries = {}, context = [];
for (const f of feature(topo, topo.objects.countries).features) {
  const name = f.properties.name, code = CODES[name];
  const polys = f.geometry ? (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : []) : [];
  const out = [];
  for (const poly of polys) {
    const rings = [];
    for (const [k, ring] of poly.entries()) {
      // skip rings entirely far away (avoids projecting the far side of the globe)
      if (!ring.some(([lon, lat]) => lon > -45 && lon < 70 && lat > 20)) continue;
      let r = clip(ring.map(([lon, lat]) => project(lon, lat)));
      if (r.length < 3) continue;
      r = simplify(r, 0.025);
      if (r.length < 3) continue;
      rings.push({ r, hole: k > 0 });
    }
    if (!rings.length || rings[0].hole) continue;
    out.push(rings.map((x) => x.r));
  }
  if (!out.length) continue;
  // drop very small islands, but always keep a country's largest piece
  out.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])));
  const kept = out.filter((p, i) => i === 0 || Math.abs(area(p[0])) > 0.012);
  const round = (polys) => polys.map((p) => p.map((r) => r.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])));
  if (code) countries[code] = (countries[code] || []).concat(round(kept));
  else context.push(...round(kept));
}
const js = `/* Generated by tools/build_map.js: country outlines for europa3d.js. Do not edit by hand.
   Natural Earth 1:50m (public domain), via world-atlas (ISC). Lambert azimuthal equal-area, centred on 52° N 10° E;
   1 unit = ${SCALE} km; x to the east, y to the north. Each country: a list of polygons, each [outline, holes...]. */
window.EUROPA_MAPA = ${JSON.stringify({ scale: SCALE, box: BOX, countries, context })};
`;
fs.writeFileSync(process.argv[2] || "europa-mapa.js", js);
console.log("countries", Object.keys(countries).length, Object.keys(countries).sort().join(" "), "context polys", context.length, "bytes", js.length);
for (const [n, p] of [["Lisboa", [-9.14, 38.72]], ["Reykjavik", [-21.9, 64.1]], ["Nordkapp", [25.8, 71.1]], ["Tbilisi", [44.8, 41.7]], ["Nicosia", [33.4, 35.2]], ["Kharkiv", [36.2, 50]], ["Valletta", [14.5, 35.9]]]) console.log(n, project(...p).map((v) => v.toFixed(2)).join(","));
