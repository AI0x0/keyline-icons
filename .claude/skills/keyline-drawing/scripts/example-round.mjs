// Round 4n: perspective-video v3 (camera inside the plane), scale-frame v2 (frame + corner handle), mouse-left, mouse-move v2,
// rotate-mirror v2, rotate-cw-square / rotate-ccw-square. node round4n.mjs <root>
import fs from "node:fs";
import { emit, f, P, filletPath, offsetPoly, clockwise, line, circle } from "./poly.mjs";
const root = process.argv[2], s = Math.SQRT1_2;
const R = "/Users/mushan/Documents/project/keyline-icons/raw";
const plateOf = (pts, rr) => { const [cp, cr] = clockwise(pts, rr); const [op, orr] = offsetPoly(cp, cr, 1); return filletPath(op, orr); };
const arcPath = (cx, cy, r, a0, a1, first = false) => {
  const rad = (a) => a * Math.PI / 180, pt = (a) => P(cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a)));
  const st = pt(a0); let d = (first ? "M" : "L") + `${f(st.x)} ${f(st.y)}`; let a = a0;
  while (a < a1 - 1e-9) { const next = Math.min(a1, Math.floor(a / 90 + 1e-9) * 90 + 90), da = rad(next - a), k = (4 / 3) * Math.tan(da / 4) * r;
    const p0 = pt(a), p3 = pt(next), t0 = P(-Math.sin(rad(a)), Math.cos(rad(a))), t3 = P(-Math.sin(rad(next)), Math.cos(rad(next)));
    d += `C${f(p0.x + k * t0.x)} ${f(p0.y + k * t0.y)} ${f(p3.x - k * t3.x)} ${f(p3.y - k * t3.y)} ${f(p3.x)} ${f(p3.y)}`; a = next; }
  return d;
};
// ---------- perspective-video v3: the plane at full width, a camcorder where the horizon was ----------
{
  const plane = [P(2, 6), P(22, 3), P(22, 21), P(2, 18)], rr = [1, 1, 1, 1];
  const k = 0.45, X = (x) => k * (x - 2) + 7.5, Y = (y) => k * (y - 6) + 12 - 2.7; // camera 7.5..16.5 wide, centred on y 12
  const body = [P(X(2), Y(6)), P(X(16), Y(6)), P(X(16), Y(18)), P(X(2), Y(18))];
  const lens = [P(X(16), Y(9.4)), P(X(22), Y(6.4)), P(X(22), Y(17.6)), P(X(16), Y(14.6))];
  emit(root, "perspective-video", {
    regular: { strokes: [filletPath(plane, rr), filletPath(body, [1, 1, 1, 1]), filletPath(lens, [0.5, 0.5, 0.5, 0.5])], plates: [plateOf(plane, rr)], knockouts: [plateOf(body, [1, 1, 1, 1]), plateOf(lens, [0.5, 0.5, 0.5, 0.5])] },
    sharp: { strokes: [filletPath(plane, [0, 0, 0, 0]), filletPath(body, [0, 0, 0, 0]), filletPath(lens, [0, 0, 0, 0])], plates: [plateOf(plane, [0, 0, 0, 0])], knockouts: [plateOf(body, [0, 0, 0, 0]), plateOf(lens, [0, 0, 0, 0])] },
  });
  console.log("perspective-video v3 camera y", f(body[0].y), "..", f(body[2].y));
}
// ---------- scale-frame v2: the set's scaling flipped vertically, without the diagonal and the inner L ----------
emit(root, "scale-frame", {
  regular: { strokes: ["M11 21L6 21C4.3431 21 3 19.6569 3 18L3 6C3 4.3431 4.3431 3 6 3L18 3C19.6569 3 21 4.3431 21 6L21 11", "M16 21L20.5 21C20.7761 21 21 20.7761 21 20.5L21 16"] },
  sharp: { strokes: ["M12 21L3 21L3 3L21 3L21 12", "M15 21L21 21L21 15"] },
});
// ---------- mice: capsule 6..18 x 2..22 r6; the accent is the left button (plate, fill-opacity) or the wheel (muted stroke) ----------
const capsule = (x0, y0, x1, y1, r) => filletPath([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], [r, r, r, r]);
// left button: quarter of the dome plus the strip down to the divider
const leftButton = (cx, top, r, div, x0) => `M${f(x0)} ${f(div)}` + arcPath(cx, top + r, r, 180, 270, false) + `L${f(cx)} ${f(div)}Z`;
{
  // mouse-left: buttons divided at y 9, the left one is the accent
  const div = [line(P(4, 10), P(20, 10)), line(P(12, 2), P(12, 10))];
  const btn = leftButton(12, 2, 8, 10, 4);
  emit(root, "mouse-left", {
    regular: { strokes: [capsule(4, 2, 20, 22, 8), ...div], plates: [btn], fillStrokes: [capsule(4, 2, 20, 22, 8), ...div] },
    sharp: { strokes: [capsule(4, 2, 20, 22, 8), ...div], plates: [btn], fillStrokes: [capsule(4, 2, 20, 22, 8), ...div] },
  });
  // mouse-drag: the mouse with its left button held and two motion lines trailing on the left (button and lines are the accent)
  { const cap = capsule(8, 2, 22, 22, 7), mdiv = [line(P(8, 9), P(22, 9)), line(P(15, 2), P(15, 9))], mbtn = leftButton(15, 2, 7, 9, 8);
    const trail = (ext) => [line(P(2 - ext, 9), P(4, 9)), line(P(2 - ext, 15), P(4, 15))];
    emit(root, "mouse-drag", {
      regular: { strokes: [cap, ...mdiv], muted: trail(0), plates: [mbtn], fillStrokes: [cap, ...mdiv, ...trail(0)] },
      sharp: { strokes: [cap, ...mdiv], muted: trail(1), plates: [mbtn], fillStrokes: [cap, ...mdiv, ...trail(1)] },
    }); }
  // mouse-move: an 8 x 10 mouse-left in the centre with four short arrows at the edges (arrows and button are the accent)
  { const cap = capsule(8, 7.5, 16, 16.5, 4), mdiv = [line(P(8, 11.5), P(16, 11.5)), line(P(12, 7.5), P(12, 11.5))], mbtn = leftButton(12, 7.5, 4, 11.5, 8);
    const head = (ex, ey, ux, uy, aa, bext) => { const px = -uy, py = ux, ke = aa * s + bext * s; return `M${f(ex - ux * ke + px * ke)} ${f(ey - uy * ke + py * ke)}L${f(ex)} ${f(ey)}L${f(ex - ux * ke - px * ke)} ${f(ey - uy * ke - py * ke)}`; };
    // heads only: a shaft would come within a unit of the mouse
    const around = (sharp) => { const be = sharp ? Math.SQRT2 - 1 : 0; return [head(12, 2, 0, -1, 2, be), head(12, 22, 0, 1, 2, be), head(2, 12, -1, 0, 2, be), head(22, 12, 1, 0, 2, be)]; };
    emit(root, "mouse-move", {
      regular: { strokes: [cap, ...mdiv], muted: around(false), plates: [mbtn], fillStrokes: [cap, ...mdiv, ...around(false)] },
      sharp: { strokes: [cap, ...mdiv], muted: around(true), plates: [mbtn], fillStrokes: [cap, ...mdiv, ...around(true)] },
    }); }
}
// ---------- rotate-mirror v2: rotate-cw with a longer mirror axis ----------
{
  const rot = (corners) => [...fs.readFileSync(`${R}/rotate-cw/Container=regular, Style=stroke, Corners=${corners}.svg`, "utf8").matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  emit(root, "rotate-mirror", { regular: { strokes: [...rot("regular"), line(P(12, 9), P(12, 17))] }, sharp: { strokes: [...rot("sharp"), line(P(12, 9), P(12, 17))] } });
}
// ---------- rotate-cw-square / rotate-ccw-square: a frame whose top corner is a curved arrow (drag the corner to rotate) ----------
{
  // frame 3..21 x 5..22 open at the top left (from (17,5) round to (3,15)); the corner piece (13,5)→(6,5)→corner→(3,11) ends in a head pointing right
  const frameR = "M17 5L18 5C19.6569 5 21 6.3431 21 8L21 19C21 20.6569 19.6569 22 18 22L6 22C4.3431 22 3 20.6569 3 19L3 15";
  const frameS = "M18 5L21 5L21 22L3 22L3 14";
  const pieceR = "M13 5L6 5C4.3431 5 3 6.3431 3 8L3 11";
  const pieceS = "M13 5L3 5L3 12";
  const headR = (ex, y, sx, a) => { const r = 0.5, d = r * (Math.SQRT2 - 1), t = r, kk = (4 / 3) * Math.tan(Math.PI / 8) * r, c = s, vx = ex + sx * d;
    const e1 = [vx - sx * a, y - a], e2 = [vx - sx * a, y + a], t1 = [vx - sx * t * c, y - t * c], t2 = [vx - sx * t * c, y + t * c], c1 = [t1[0] + sx * kk * c, t1[1] + kk * c], c2 = [t2[0] + sx * kk * c, t2[1] - kk * c];
    return `M${f(e1[0])} ${f(e1[1])}L${f(t1[0])} ${f(t1[1])}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(t2[0])} ${f(t2[1])}L${f(e2[0])} ${f(e2[1])}`; };
  const headS = (ex, y, sx, a) => { const e = a + (Math.SQRT2 - 1) * s; return `M${f(ex - sx * e)} ${f(y - e)}L${f(ex)} ${f(y)}L${f(ex - sx * e)} ${f(y + e)}`; };
  const hide = 0.9413, hideS = 0.2698;
  const cw = { regular: { strokes: [frameR, pieceR.replace("M13 5", `M${f(13 - hide)} 5`), headR(13, 5, 1, 3)] }, sharp: { strokes: [frameS, pieceS.replace("M13 5", `M${f(13 - hideS)} 5`), headS(13, 5, 1, 3)] } };
  emit(root, "rotate-cw-square", cw);
  const mirror = (d) => d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (m, x, y) => `${f(24 - +x)} ${f(+y)}`);
  emit(root, "rotate-ccw-square", { regular: { strokes: cw.regular.strokes.map(mirror) }, sharp: { strokes: cw.sharp.strokes.map(mirror) } });
}
console.log("emitted round 4n");
