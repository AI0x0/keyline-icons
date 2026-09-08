// Filled four-point sparkle marks. Painted tips land at distance E from the centre in both corner styles.
import { f, P } from "./poly.mjs";
const s = Math.SQRT1_2;
const rotp = (x, y, k) => { // rotate a point given in "tip up" frame by k quarter turns, clockwise on screen
  for (let i = 0; i < k; i++) [x, y] = [-y, x]; return [x, y];
};
// alpha: half-angle of the tip; w: waist distance (mid-side) — straight sides ignore w and use alpha only
export function star({ cx, cy, E, alpha, w = null, r = 0.5, sharp = false }) {
  const a = alpha * Math.PI / 180;
  const inset = r / Math.sin(a) - r;          // fillet arc / chamfer flat sits this far inside the vertex
  const Rv = E + inset;                        // vertex radius
  const t = r / Math.tan(a);                   // tangent distance from the vertex along each side
  // in the tip-up frame: vertex (0,-Rv); side tangent points at distance t along directions (±sin a, cos a)
  const A1 = [-t * Math.sin(a), -Rv + t * Math.cos(a)], A2 = [t * Math.sin(a), -Rv + t * Math.cos(a)];
  // fillet cubic across the tip (regular) or flat chamfer (sharp)
  const k = (4 / 3) * Math.tan((Math.PI - 2 * a) / 4) * r; // turning angle at the tip = pi - 2a
  const tipReg = (q) => {
    const [x1, y1] = rotp(...A1, q), [x2, y2] = rotp(...A2, q);
    const d1 = rotp(Math.sin(a), -Math.cos(a), q), d2 = rotp(Math.sin(a), Math.cos(a), q); // outward along side 1, inward along side 2
    return { from: [x1, y1], to: [x2, y2], seg: `C${f(cx + x1 + d1[0] * k)} ${f(cy + y1 + d1[1] * k)} ${f(cx + x2 - d2[0] * k)} ${f(cy + y2 - d2[1] * k)} ${f(cx + x2)} ${f(cy + y2)}` };
  };
  const tipSharp = (q) => { // flat at radius E, width 2*inset*tan(a)
    const hw = inset * Math.tan(a);
    const [x1, y1] = rotp(-hw, -E, q), [x2, y2] = rotp(hw, -E, q);
    return { from: [x1, y1], to: [x2, y2], seg: `L${f(cx + x2)} ${f(cy + y2)}` };
  };
  const tip = sharp ? tipSharp : tipReg;
  // side from tip q's second point to tip q+1's first point
  const side = (q) => {
    const a2 = tip(q).to, b1 = tip((q + 1) % 4).from;
    if (w === null) return `L${f(cx + b1[0])} ${f(cy + b1[1])}`;
    // concave cubic: handles along the sides' tangent directions, length h solved so the midpoint sits at distance w
    const d2 = rotp(Math.sin(a), Math.cos(a), q);                 // inward along side 2 of tip q
    const d1 = rotp(-Math.sin(a), Math.cos(a), (q + 1) % 4);      // inward along side 1 of tip q+1 (toward its vertex is outward; we need pointing away from vertex)
    let lo = 0, hi = 6, h = 3;
    for (let i = 0; i < 40; i++) {
      h = (lo + hi) / 2;
      const c1 = [a2[0] + d2[0] * h, a2[1] + d2[1] * h], c2 = [b1[0] + d1[0] * h, b1[1] + d1[1] * h];
      const mx = (a2[0] + 3 * c1[0] + 3 * c2[0] + b1[0]) / 8, my = (a2[1] + 3 * c1[1] + 3 * c2[1] + b1[1]) / 8;
      if (Math.hypot(mx, my) > w) lo = h; else hi = h;
    }
    const c1 = [a2[0] + d2[0] * h, a2[1] + d2[1] * h], c2 = [b1[0] + d1[0] * h, b1[1] + d1[1] * h];
    return `C${f(cx + c1[0])} ${f(cy + c1[1])} ${f(cx + c2[0])} ${f(cy + c2[1])} ${f(cx + b1[0])} ${f(cy + b1[1])}`;
  };
  let d = `M${f(cx + tip(0).from[0])} ${f(cy + tip(0).from[1])}`;
  for (let q = 0; q < 4; q++) d += tip(q).seg + side(q);
  return d + "Z";
}
