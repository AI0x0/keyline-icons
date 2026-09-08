// Painted bounding box of built stroke glyphs: node measure.mjs name…
import fs from "node:fs";
import { flatten } from "./svgflat.mjs";
const R = "./icons/stroke/";
for (const n of process.argv.slice(2)) {
  const f = R + n + ".svg"; if (!fs.existsSync(f)) { console.log(n.padEnd(18), "missing"); continue; }
  const src = fs.readFileSync(f, "utf8");
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const m of src.matchAll(/<(path|circle|rect|line)([^>]*)>/g)) {
    const attrs = m[2]; const stroked = /stroke=/.test(attrs) && !/stroke="none"/.test(attrs);
    const pad = stroked ? 1 : 0;
    let pts = [];
    if (m[1] === "path") { const d = /d="([^"]+)"/.exec(attrs)?.[1]; if (!d) continue; for (const poly of flatten(d)) pts.push(...poly); }
    else if (m[1] === "circle") { const g = (k) => +(/\b(?:cx|cy|r)="([^"]+)"/.exec(attrs) ? new RegExp(`\\b${k}="([^"]+)"`).exec(attrs)?.[1] : 0); const cx = g("cx"), cy = g("cy"), r = g("r"); pts.push([cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]); }
    else if (m[1] === "line") { const g = (k) => +new RegExp(`\\b${k}="([^"]+)"`).exec(attrs)?.[1]; pts.push([g("x1"), g("y1")], [g("x2"), g("y2")]); }
    else if (m[1] === "rect") { const g = (k) => +(new RegExp(`\\b${k}="([^"]+)"`).exec(attrs)?.[1] ?? 0); pts.push([g("x"), g("y")], [g("x") + g("width"), g("y") + g("height")]); }
    for (const [x, y] of pts) { minx = Math.min(minx, x - pad); maxx = Math.max(maxx, x + pad); miny = Math.min(miny, y - pad); maxy = Math.max(maxy, y + pad); }
  }
  const w = maxx - minx, h = maxy - miny;
  console.log(n.padEnd(18), `${w.toFixed(1)} x ${h.toFixed(1)}`.padEnd(13), `box ${minx.toFixed(1)}..${maxx.toFixed(1)} / ${miny.toFixed(1)}..${maxy.toFixed(1)}`, ` area≈${(w*h).toFixed(0)}`);
}
