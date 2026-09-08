// Flatten SVG path data (M L H V C S Q T A Z, absolute and relative) into polylines.
export function flatten(d, tol = 0.25) {
  const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  const subs = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0, cmd = null, i = 0;
  const num = () => parseFloat(toks[i++]);
  const push = (nx, ny) => { cur.push([nx, ny]); x = nx; y = ny; };
  const cubic = (x1, y1, x2, y2, x3, y3) => { const x0 = x, y0 = y; const n = 16; for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3); } px = x2; py = y2; };
  const quad = (x1, y1, x2, y2) => { const x0 = x, y0 = y; const n = 12; for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u*u*x0 + 2*u*t*x1 + t*t*x2, u*u*y0 + 2*u*t*y1 + t*t*y2); } px = x1; py = y1; };
  const arc = (rx, ry, phi, fa, fs, x2, y2) => {
    const x1 = x, y1 = y; if (rx === 0 || ry === 0) { push(x2, y2); return; }
    const rad = phi * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2; const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
    let l = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry); if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
    const sign = fa === fs ? -1 : 1; const sq = Math.max(0, (rx*rx*ry*ry - rx*rx*y1p*y1p - ry*ry*x1p*x1p) / (rx*rx*y1p*y1p + ry*ry*x1p*x1p));
    const coef = sign * Math.sqrt(sq); const cxp = coef * (rx * y1p / ry), cyp = coef * (-ry * x1p / rx);
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dth > 0) dth -= 2 * Math.PI; else if (fs && dth < 0) dth += 2 * Math.PI;
    const n = Math.max(4, Math.ceil(Math.abs(dth) / (Math.PI / 12)));
    for (let k = 1; k <= n; k++) { const th = th1 + dth * k / n; const ex = rx * Math.cos(th), ey = ry * Math.sin(th); push(cos * ex - sin * ey + cx, sin * ex + cos * ey + cy); }
  };
  while (i < toks.length) {
    const t = toks[i]; if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === "Z" || cmd === "z") { if (cur) { cur.closed = true; } x = sx; y = sy; cur = null; continue; } }
    const rel = cmd === cmd.toLowerCase(); const C = cmd.toUpperCase();
    switch (C) {
      case "M": { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } cur = []; subs.push(cur); push(nx, ny); sx = nx; sy = ny; cmd = rel ? "l" : "L"; break; }
      case "L": { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } push(nx, ny); break; }
      case "H": { let nx = num(); if (rel) nx += x; push(nx, y); break; }
      case "V": { let ny = num(); if (rel) ny += y; push(x, ny); break; }
      case "C": { let a = [num(), num(), num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); cubic(...a); break; }
      case "S": { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); const rx1 = 2 * x - px, ry1 = 2 * y - py; cubic(rx1, ry1, ...a); break; }
      case "Q": { let a = [num(), num(), num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); quad(...a); break; }
      case "T": { let a = [num(), num()]; if (rel) a = a.map((v, k) => v + (k % 2 ? y : x)); quad(2 * x - px, 2 * y - py, ...a); break; }
      case "A": { const rx = num(), ry = num(), phi = num(), fa = num(), fs = num(); let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } arc(rx, ry, phi, fa, fs, nx, ny); break; }
    }
    if (!"CSQT".includes(C)) { px = x; py = y; }
  }
  return subs;
}
export const bboxOf = (pts) => ({ minx: Math.min(...pts.map(p => p[0])), maxx: Math.max(...pts.map(p => p[0])), miny: Math.min(...pts.map(p => p[1])), maxy: Math.max(...pts.map(p => p[1])) });
export const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; } return s / 2; };
