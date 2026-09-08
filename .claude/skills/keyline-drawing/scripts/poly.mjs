// Minimal keyline drawing kit: filleted polygons, offsets, rotation, and the
// six-file raw emitter (Figma export format). Screen coords, y down.
import fs from "node:fs";
import path from "node:path";

export const f = (n) => { const s = (Math.round(n * 10000) / 10000).toFixed(4).replace(/\.?0+$/, ""); return s === "-0" ? "0" : s; };
export const P = (x, y) => ({ x, y });
const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
const len = (a) => Math.hypot(a.x, a.y), norm = (a) => mul(a, 1 / len(a));
const cross = (a, b) => a.x * b.y - a.y * b.x, dot = (a, b) => a.x * b.x + a.y * b.y;

export function signedArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return s / 2; }
// Screen coords (y down): positive signed area = clockwise on screen.
export function clockwise(pts, radii) { if (signedArea(pts) < 0) { pts = [...pts].reverse(); radii = radii ? [...radii].reverse() : radii; } return radii ? [pts, radii] : pts; }

// Closed polygon with a fillet radius per vertex → path data (M … Z).
export function filletPath(pts, radii) {
  const n = pts.length; const segs = [];
  // for each vertex compute tangent points
  const corner = pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const u1 = norm(sub(p, prev)), u2 = norm(sub(next, p));
    const r = radii[i] || 0;
    const cosT = Math.max(-1, Math.min(1, dot(u1, u2)));
    const theta = Math.acos(cosT); // turning angle
    if (r === 0 || theta < 1e-6) return { p, a: p, b: p, r: 0, u1, u2, theta };
    const t = r * Math.tan(theta / 2); // distance from vertex to tangent points
    const a = sub(p, mul(u1, t)), b = add(p, mul(u2, t));
    return { p, a, b, r, u1, u2, theta, t };
  });
  let d = `M${f(corner[0].b.x)} ${f(corner[0].b.y)}`;
  for (let i = 1; i <= n; i++) {
    const c = corner[i % n];
    d += `L${f(c.a.x)} ${f(c.a.y)}`;
    if (c.r > 0) {
      const k = (4 / 3) * Math.tan(c.theta / 4) * c.r;
      const c1 = add(c.a, mul(c.u1, k)), c2 = sub(c.b, mul(c.u2, k));
      d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(c.b.x)} ${f(c.b.y)}`;
    }
  }
  return d.replace(/L([^LCZ]+)$/, "") + "Z";
}
// Outward offset of a clockwise polygon by d (screen coords): convex radii +d, concave −d (min 0).
export function offsetPoly(pts, radii, d) {
  const n = pts.length; const out = [], rr = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], p = pts[i], next = pts[(i + 1) % n];
    const u1 = norm(sub(p, prev)), u2 = norm(sub(next, p));
    // outward normal for clockwise-on-screen polygon: rotate direction by -90° → (uy, -ux)
    const n1 = P(u1.y, -u1.x), n2 = P(u2.y, -u2.x);
    const p1 = add(p, mul(n1, d)), p2 = add(p, mul(n2, d));
    // intersect line p1+u1*s with p2+u2*t
    const den = cross(u1, u2);
    let q;
    if (Math.abs(den) < 1e-9) q = p1; else { const s = cross(sub(p2, p1), u2) / den; q = add(p1, mul(u1, s)); }
    out.push(q);
    const convex = cross(u1, u2) > 0; // clockwise on screen: right turn = convex
    rr.push(convex ? (radii[i] || 0) + d : Math.max(0, (radii[i] || 0) - d));
  }
  return [out, rr];
}
export const rot = (p, deg, c = P(0, 0)) => { const a = deg * Math.PI / 180, dx = p.x - c.x, dy = p.y - c.y; return P(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a)); };
export const tr = (p, dx, dy) => P(p.x + dx, p.y + dy);
export const line = (a, b) => `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
export const circle = (cx, cy, r) => `M${f(cx + r)} ${f(cy)}C${f(cx + r)} ${f(cy + r * 0.5523)} ${f(cx + r * 0.5523)} ${f(cy + r)} ${f(cx)} ${f(cy + r)}C${f(cx - r * 0.5523)} ${f(cy + r)} ${f(cx - r)} ${f(cy + r * 0.5523)} ${f(cx - r)} ${f(cy)}C${f(cx - r)} ${f(cy - r * 0.5523)} ${f(cx - r * 0.5523)} ${f(cy - r)} ${f(cx)} ${f(cy - r)}C${f(cx + r * 0.5523)} ${f(cy - r)} ${f(cx + r)} ${f(cy - r * 0.5523)} ${f(cx + r)} ${f(cy)}Z`;
// Extend a free end of segment a→b by e (sharp treatment).
export const extend = (a, b, e) => { const u = norm(sub(b, a)); return add(b, mul(u, e)); };

const HEAD = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n`;
const strokeEl = (d, cap, opacity) => `<path d="${d}" stroke="black"${opacity ? ` stroke-opacity="${opacity}"` : ""} stroke-width="2" stroke-linecap="${cap}" stroke-linejoin="round"/>\n`;
const fillEl = (d, opacity, evenodd) => `<path${evenodd ? ' fill-rule="evenodd" clip-rule="evenodd"' : ""} d="${d}" fill="black"${opacity ? ` fill-opacity="${opacity}"` : ""}/>\n`;

// spec per corner style: { strokes: [d…], muted: [d…] (duotone-muted strokes), plates: [d…] (filled bodies, joined into one evenodd path with knockouts), knockouts: [d…], marks: [d…] (filled dots drawn in every style), fillStrokes: [d…] (strokes kept in fill on top of nothing), fillOnly: bool }
export function emit(root, name, specs) {
  const dir = path.join(root, "raw", name); fs.mkdirSync(dir, { recursive: true });
  for (const corners of ["regular", "sharp"]) {
    const s = specs[corners]; if (!s) continue;
    const cap = corners === "regular" ? "round" : "butt";
    const strokeAll = [...(s.strokes || []), ...(s.muted || [])].join("");
    const marks = (s.marks || []).join("");
    // stroke
    let svg = HEAD + (strokeAll ? strokeEl(strokeAll, cap) : "") + (marks ? fillEl(marks) : "") + "</svg>\n"; // marks-only glyphs (tiles, grips) get no empty stroke element
    fs.writeFileSync(path.join(dir, `Container=regular, Style=stroke, Corners=${corners}.svg`), svg);
    if (s.plates && s.plates.length) {
      const body = s.plates.join("") + (s.knockouts || []).join("");
      const evenodd = !!(s.knockouts && s.knockouts.length);
      // fill: plate (with knockouts) + the strokes that are not the plate outline + marks
      const keep = (s.fillStrokes || []).join("");
      svg = HEAD + fillEl(body, null, evenodd) + (keep ? strokeEl(keep, cap) : "") + (marks && s.marksInFill !== false ? fillEl(marks) : "") + "</svg>\n";
      fs.writeFileSync(path.join(dir, `Container=regular, Style=fill, Corners=${corners}.svg`), svg);
      // duotone: plate at 0.4 + all strokes + marks
      // plateInDuotone: false keeps the plate for the fill only, so the duotone's 0.4 layer is just the muted strokes (an accent a host can recolour)
      svg = HEAD + (s.plateInDuotone === false ? "" : fillEl(s.plates.join(""), "0.4")) + strokeEl((s.strokes || []).join(""), cap) + (s.muted && s.muted.length ? strokeEl(s.muted.join(""), cap, "0.4") : "") + (marks ? fillEl(marks) : "") + "</svg>\n";
      fs.writeFileSync(path.join(dir, `Container=regular, Style=duotone, Corners=${corners}.svg`), svg);
    } else if (s.muted && s.muted.length) {
      // dashed-frame style duotone: muted strokes at 0.4, the rest solid (square-dashed-plus convention)
      svg = HEAD + strokeEl(s.muted.join(""), cap, "0.4") + strokeEl((s.strokes || []).join(""), cap) + (marks ? fillEl(marks) : "") + "</svg>\n";
      fs.writeFileSync(path.join(dir, `Container=regular, Style=duotone, Corners=${corners}.svg`), svg);
    }
  }
}

// Sharp treatment for acute corners: replace the vertex by a flat cut perpendicular to the
// bisector at the depth the r=1 fillet's arc used to reach (r/sin(half) - r), so the sharp
// outline lands in the same box. Only when the depth is >= 0.6 (right/obtuse mitres already fit).
export function chamfer(pts, radii, r = 1) {
  // r: the radius the regular variant used at each corner (number or per-vertex array)
  const n = pts.length; const out = [], rr = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], p = pts[i], next = pts[(i + 1) % n];
    const u1 = norm(sub(p, prev)), u2 = norm(sub(next, p));
    const theta = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))); // turning angle
    const half = (Math.PI - theta) / 2; // half interior angle
    const ri = Array.isArray(r) ? (r[i] || 1) : r;
    const depth = ri / Math.sin(half) - ri;
    if ((radii[i] || 0) === 0 && depth >= 0.6 && cross(u1, u2) > 0) {
      const along = depth / Math.cos(half);
      out.push(sub(p, mul(u1, along)), add(p, mul(u2, along))); rr.push(0, 0);
    } else { out.push(p); rr.push(radii[i] || 0); }
  }
  return [out, rr];
}
