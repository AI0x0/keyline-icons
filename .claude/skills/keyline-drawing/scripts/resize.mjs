// Scale existing raw glyphs about (12,12): node resize.mjs <root> name:sx:sy …
// Strokes scale (dots only move), perpendicular fillets re-snap to the radius ladder, plates are re-fitted to the
// stroke's painted box so CONSISTENCY holds, small filled dots/holes only move.
import fs from "node:fs";
import path from "node:path";
import { f } from "./poly.mjs";
import { subpaths, trimFreeEnds } from "../../../../pipeline/lib/geom.mjs";
const [root, ...specs] = process.argv.slice(2);
const LADDER = [0.5, 1, 1.5, 2, 3, 4, 5];
const snap = (r) => LADDER.reduce((b, v) => (Math.abs(v - r) < Math.abs(b - r) ? v : b), LADDER[0]);
// ---- path parsing (absolute M L H V C Z) into subpaths of segments ----
function parse(d) {
  const toks = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || []; const subs = []; let cur = null, x = 0, y = 0, i = 0;
  const num = () => +toks[i++];
  while (i < toks.length) { const c = toks[i++];
    if (c === "M") { x = num(); y = num(); cur = { start: [x, y], segs: [], closed: false }; subs.push(cur); }
    else if (c === "L") { const nx = num(), ny = num(); cur.segs.push({ t: "L", p: [[nx, ny]] }); x = nx; y = ny; }
    else if (c === "H") { const nx = num(); cur.segs.push({ t: "L", p: [[nx, y]] }); x = nx; }
    else if (c === "V") { const ny = num(); cur.segs.push({ t: "L", p: [[x, ny]] }); y = ny; }
    else if (c === "C") { const a = [num(), num()], b = [num(), num()], e = [num(), num()]; cur.segs.push({ t: "C", p: [a, b, e] }); x = e[0]; y = e[1]; }
    else if (c === "Z" || c === "z") { // make the closing edge explicit so a fillet at the seam sees a line on both sides
      if (Math.hypot(x - cur.start[0], y - cur.start[1]) > 1e-6) cur.segs.push({ t: "L", p: [[cur.start[0], cur.start[1]]] });
      cur.closed = true; x = cur.start[0]; y = cur.start[1]; }
    else throw new Error("unsupported command " + c + " in " + d.slice(0, 40)); }
  return subs;
}
const ser = (subs) => subs.map((s) => `M${f(s.start[0])} ${f(s.start[1])}` + s.segs.map((g) => g.t + g.p.map(([px, py]) => `${f(px)} ${f(py)}`).join(" ")).join("") + (s.closed ? "Z" : "")).join("");
const pts = (s) => [s.start, ...s.segs.flatMap((g) => g.p)];
const bbox = (ps) => ({ x0: Math.min(...ps.map((p) => p[0])), x1: Math.max(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[1])) });
const isDot = (s) => { const b = bbox(pts(s)); const w = b.x1 - b.x0, h = b.y1 - b.y0; return s.closed && w < 4.2 && h < 4.2 && Math.abs(w - h) < 0.1; };
const apply = (s, fn) => { s.start = fn(s.start); for (const g of s.segs) g.p = g.p.map(fn); };
const scaleAbout = (cx, cy, sx, sy) => ([px, py]) => [cx + (px - cx) * sx, cy + (py - cy) * sy];
// ---- re-snap fillets: a cubic between two lines meeting at a right angle ----
function resnap(s) {
  const n = s.segs.length; if (!s.closed || n < 3) return;
  const startOf = (i) => (i === 0 ? s.start : s.segs[i - 1].p[s.segs[i - 1].p.length - 1]);
  for (let i = 0; i < n; i++) {
    const g = s.segs[i]; if (g.t !== "C") continue;
    const prev = s.segs[(i - 1 + n) % n], next = s.segs[(i + 1) % n]; if (prev.t !== "L" || next.t !== "L") continue;
    const p0 = startOf(i), p3 = g.p[2];
    const a0 = startOf((i - 1 + n) % n); // start of the incoming line
    const u1 = [p0[0] - a0[0], p0[1] - a0[1]], l1 = Math.hypot(...u1); if (l1 < 1e-6) continue; u1[0] /= l1; u1[1] /= l1;
    const b1 = next.p[0], u2 = [b1[0] - p3[0], b1[1] - p3[1]], l2 = Math.hypot(...u2); if (l2 < 1e-6) continue; u2[0] /= l2; u2[1] /= l2;
    if (Math.abs(u1[0] * u2[0] + u1[1] * u2[1]) > 1e-3) continue; // not perpendicular
    // vertex = intersection of the two lines; radius = distance from p0 to the vertex
    const den = u1[0] * u2[1] - u1[1] * u2[0]; if (Math.abs(den) < 1e-9) continue;
    const t = ((p3[0] - p0[0]) * u2[1] - (p3[1] - p0[1]) * u2[0]) / den; const V = [p0[0] + u1[0] * t, p0[1] + u1[1] * t];
    const r = Math.hypot(V[0] - p0[0], V[1] - p0[1]); const r2 = snap(r);
    const k = (4 / 3) * Math.tan(Math.PI / 8) * r2;
    const np0 = [V[0] - u1[0] * r2, V[1] - u1[1] * r2], np3 = [V[0] + u2[0] * r2, V[1] + u2[1] * r2];
    g.p = [[np0[0] + u1[0] * k, np0[1] + u1[1] * k], [np3[0] - u2[0] * k, np3[1] - u2[1] * k], np3];
    if (i === 0) s.start = np0; else prev.p[prev.p.length - 1] = np0;
  }
}
// ---- painted box the lint would measure for a stroke path ----
const paintedBox = (d, cap) => { const subs = subpaths(d, 48).subs; const polys = cap === "butt" ? trimFreeEnds(subs, 1) : subs.map((x) => x.pts); const ps = polys.flat(); const b = bbox(ps); return { x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 }; };
const filledBox = (d) => bbox(subpaths(d, 48).subs.flatMap((x) => x.pts));

for (const spec of specs) {
  const [name, sxs, sys] = spec.split(":"); const sx = +sxs, sy = +(sys ?? sxs);
  const dir = path.join(root, "raw", name); const files = fs.readdirSync(dir).filter((x) => x.startsWith("Container=regular"));
  const S = scaleAbout(12, 12, sx, sy);
  const transformStroke = (d) => { const subs = parse(d); for (const s of subs) { if (isDot(s)) { const b = bbox(pts(s)); const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], c2 = S(c); apply(s, ([px, py]) => [px + c2[0] - c[0], py + c2[1] - c[1]]); } else { apply(s, S); resnap(s); } } return ser(subs); };
  const boxes = {};
  for (const corners of ["regular", "sharp"]) {
    const fs1 = path.join(dir, `Container=regular, Style=stroke, Corners=${corners}.svg`); if (!fs.existsSync(fs1)) continue;
    let src = fs.readFileSync(fs1, "utf8"); const cap = corners === "sharp" ? "butt" : "round";
    let box = null;
    src = src.replace(/<path([^>]*?)\sd="([^"]+)"/g, (m, attrs, d) => { const isStroke = /stroke="black"/.test(attrs) || /stroke="black"/.test(m); const nd = transformStroke(d); if (isStroke || !/fill="black"/.test(attrs)) { const b = paintedBox(nd, cap); box = box ? { x0: Math.min(box.x0, b.x0), x1: Math.max(box.x1, b.x1), y0: Math.min(box.y0, b.y0), y1: Math.max(box.y1, b.y1) } : b; } return `<path${attrs} d="${nd}"`; });
    fs.writeFileSync(fs1, src); boxes[corners] = box;
  }
  for (const style of ["fill", "duotone"]) for (const corners of ["regular", "sharp"]) {
    const fp = path.join(dir, `Container=regular, Style=${style}, Corners=${corners}.svg`); if (!fs.existsSync(fp)) continue;
    let src = fs.readFileSync(fp, "utf8"); const target = boxes[corners];
    src = src.replace(/<path([^>]*?)\sd="([^"]+)"([^>]*)>/g, (m, a1, d, a2) => {
      const attrs = a1 + a2; const stroked = /stroke="black"/.test(attrs);
      if (stroked) return `<path${a1} d="${transformStroke(d)}"${a2}>`;
      // filled plate: scale, resnap, then fit the big subpaths' box to the stroke's painted box; dots/holes only move
      const subs = parse(d); const big = subs.filter((s) => !isDot(s)); for (const s of big) { apply(s, S); resnap(s); }
      const fb = bbox(big.flatMap(pts)); const isPlate = target && (fb.x1 - fb.x0 > 10 || fb.y1 - fb.y0 > 10);
      let fit = (p) => p;
      if (isPlate) { const cur = filledBox(ser(big)); const ax = (target.x1 - target.x0) / (cur.x1 - cur.x0), ay = (target.y1 - target.y0) / (cur.y1 - cur.y0); fit = ([px, py]) => [target.x0 + (px - cur.x0) * ax, target.y0 + (py - cur.y0) * ay]; for (const s of big) { apply(s, fit); resnap(s); } }
      for (const s of subs) if (isDot(s)) { const b = bbox(pts(s)); const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], c2 = fit(S(c)); apply(s, ([px, py]) => [px + c2[0] - c[0], py + c2[1] - c[1]]); }
      return `<path${a1} d="${ser(subs)}"${a2}>`;
    });
    fs.writeFileSync(fp, src);
  }
  console.log(`${name}: ×${sx}/${sy} → painted regular ${boxes.regular ? `${f(boxes.regular.x0)}..${f(boxes.regular.x1)} × ${f(boxes.regular.y0)}..${f(boxes.regular.y1)}` : "?"}`);
}
