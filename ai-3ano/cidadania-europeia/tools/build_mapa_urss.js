// tools/build_mapa_urss.js · Builds chernobyl-mapa.js: country outlines from the Atlantic to the Pacific,
// for the maps of the extra lesson on Chernobyl and the end of the Soviet Union (drawn by chernobyl.js).
//
// Source: Natural Earth 1:50m (public domain), via the world-atlas package (ISC licence).
// Unlike tools/build_map.js, the outlines are kept in longitude and latitude: chernobyl.js projects them
// while it draws, so the "camera" can turn from the whole Soviet Union to Europe.
//
// Two changes to the source, both deliberate:
//   1. Crimea. Natural Earth draws it with Russia (who controls it); here it is drawn with Ukraine, as in the
//      borders of 1991, which are the ones the United Nations and the European Union recognise.
//   2. Simplification is done on the shared borders (topojson-simplify), so neighbours still fit without gaps.
//
// Use:  npm i world-atlas@2 topojson-client@3 topojson-simplify@3
//       node tools/build_mapa_urss.js chernobyl-mapa.js
const topo = require("world-atlas/countries-50m.json");
const { feature } = require("topojson-client");
const { presimplify, simplify, sphericalTriangleArea } = require("topojson-simplify");
const fs = require("fs");

// Smallest triangle kept when simplifying, in steradians (5e-7 sr is about 20 km² on the ground).
const MIN_WEIGHT = 5e-7;
// Islands smaller than this are dropped (a country's largest piece is always kept).
const MIN_AREA_KM2 = 900;

// Countries that get their own entry (code → Natural Earth name). Everything in FUNDO is plain background land.
const CODES = {
  // the fifteen republics of the Soviet Union
  Russia: "RU", Ukraine: "UA", Belarus: "BY", Moldova: "MD", Estonia: "EE", Latvia: "LV", Lithuania: "LT",
  Georgia: "GE", Armenia: "AM", Azerbaijan: "AZ", Kazakhstan: "KZ", Uzbekistan: "UZ", Turkmenistan: "TM",
  Kyrgyzstan: "KG", Tajikistan: "TJ",
  // the rest of Europe
  Portugal: "PT", Spain: "ES", France: "FR", Belgium: "BE", Netherlands: "NL", Luxembourg: "LU", Germany: "DE",
  Italy: "IT", Denmark: "DK", Ireland: "IE", "United Kingdom": "UK", Greece: "GR", Austria: "AT", Finland: "FI",
  "Åland": "FI", Sweden: "SE", Cyprus: "CY", "N. Cyprus": "CY", Czechia: "CZ", Hungary: "HU", Malta: "MT",
  Poland: "PL", Slovakia: "SK", Slovenia: "SI", Bulgaria: "BG", Romania: "RO", Croatia: "HR", Norway: "NO",
  Switzerland: "CH", Albania: "AL", "Bosnia and Herz.": "BA", Montenegro: "ME", Macedonia: "MK", Serbia: "RS",
  Kosovo: "XK", Turkey: "TR", Iceland: "IS",
};
const FUNDO = new Set(["Andorra", "Liechtenstein", "Monaco", "San Marino", "Vatican", "Morocco", "Algeria", "Tunisia",
  "Libya", "Egypt", "Syria", "Lebanon", "Israel", "Palestine", "Jordan", "Iraq", "Iran", "Saudi Arabia", "Kuwait",
  "Afghanistan", "Pakistan", "India", "Nepal", "Bhutan", "China", "Mongolia", "North Korea", "South Korea", "Japan",
  "Siachen Glacier"]);

// Area of a ring in km² (spherical excess, good enough to rank islands).
function areaKm2(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    s += (x2 - x1) * Math.PI / 180 * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
  }
  return Math.abs(s * 6371 * 6371 / 2);
}

const simple = simplify(presimplify(topo, sphericalTriangleArea), MIN_WEIGHT);
const features = feature(simple, simple.objects.countries).features;
const polygonsOf = (f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);

// 1. Crimea: the piece of Russia whose middle lies on the peninsula goes to Ukraine.
const russia = features.find((f) => f.properties.name === "Russia");
const ukraine = features.find((f) => f.properties.name === "Ukraine");
const isCrimea = (poly) => {
  const r = poly[0], cx = r.reduce((s, p) => s + p[0], 0) / r.length, cy = r.reduce((s, p) => s + p[1], 0) / r.length;
  return cx > 32 && cx < 37 && cy > 44 && cy < 46.5;
};
const crimea = polygonsOf(russia).filter(isCrimea);
if (crimea.length !== 1) throw new Error("expected exactly one Crimea polygon, found " + crimea.length);
russia.geometry = { type: "MultiPolygon", coordinates: polygonsOf(russia).filter((p) => !isCrimea(p)) };
ukraine.geometry = { type: "MultiPolygon", coordinates: polygonsOf(ukraine).concat(crimea) };

const paises = {}, fundo = [];
let points = 0;
for (const f of features) {
  const name = f.properties.name, code = CODES[name];
  if (!code && !FUNDO.has(name)) continue;
  let polys = polygonsOf(f).map((poly) => poly.map((ring) => ring.map(([lon, lat]) =>
    // Russia crosses the 180° meridian: its far-eastern tip is moved to longitudes above 180 so the country stays in one piece.
    [code === "RU" && lon < -100 ? lon + 360 : lon, lat])));
  polys.sort((a, b) => areaKm2(b[0]) - areaKm2(a[0]));
  polys = polys.filter((p, i) => i === 0 || areaKm2(p[0]) > MIN_AREA_KM2);
  // Flat lists of whole numbers (hundredths of a degree) keep the file small: [lon, lat, lon, lat, …].
  const packed = polys.map((poly) => poly.filter((ring) => ring.length > 3).map((ring) => {
    points += ring.length;
    return ring.flatMap(([lon, lat]) => [Math.round(lon * 100), Math.round(lat * 100)]);
  })).filter((poly) => poly.length);
  if (code) paises[code] = (paises[code] || []).concat(packed);
  else fundo.push(...packed);
}

const js = `/* Generated by tools/build_mapa_urss.js: country outlines for the maps drawn by chernobyl.js. Do not edit by hand.
   Natural Earth 1:50m (public domain), via world-atlas (ISC). Longitude and latitude in hundredths of a degree:
   each country is a list of polygons, each polygon a list of rings (outline first, then holes), each ring a flat list
   [lon, lat, lon, lat, …]. Crimea is drawn with Ukraine (borders of 1991). "fundo" is unnamed neighbouring land. */
window.URSS_MAPA = ${JSON.stringify({ paises, fundo })};
`;
fs.writeFileSync(process.argv[2] || "chernobyl-mapa.js", js);
console.log("countries", Object.keys(paises).length, "background polygons", fundo.length, "points", points, "bytes", js.length);
