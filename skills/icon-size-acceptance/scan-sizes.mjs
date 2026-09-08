// Acceptance scan for a consumer of this set: how big does every glyph it uses actually paint, and does any
// sit in a menu row a size off its neighbours. Judged the way pipeline/lint.mjs judges the set itself.
//
//   node skills/icon-size-acceptance/scan-sizes.mjs [consumer-web-dir] [out.html] [--semantics a.ts,b.ts]
//
// consumer-web-dir  the app whose `app/(frontend)` tree is scanned (default ../do-tv/packages/web next to this repo)
// out.html          write two sheets: the flag groups, and out-menus.html with every component as one row of its icons
// --semantics       the semantic layer files under app/(frontend)/shared/ui that map IconX = keyline(Glyph) to glyphs
//                   (default icons.ts,icons-editing.ts)
//
// Reads the semantic layer, measures icons/stroke/<name>.svg (stroke paths reach 1, filled marks reach 0), classifies
// each glyph the way lint does (horizontal / vertical / square / circle / bare) and reports the ones that paint smaller
// than their class asks: horizontal → 22 wide, vertical → 22 tall, square → 20, circle → 22, bare → max side 20…22.5.
// Then the optical flags the box rule cannot see (扁 / 窄 / 矮 / 小一号 / 墨少 / 墨重 / 占地稀), and every component's
// own row judged against its own median height and ink.
//
// Exit code: 0 when no used glyph is `small` or `big`, 1 otherwise. The row flags are advisory — see SKILL.md for
// which of them are structural and accepted.
import fs from "node:fs";
import path from "node:path";
import { flatten } from "./svgflat.mjs";
const here = path.dirname(new URL(import.meta.url).pathname);
const R = path.resolve(here, "../..");
const args = process.argv.slice(2);
const semIdx = args.indexOf("--semantics");
const SEMANTICS = semIdx >= 0 ? args.splice(semIdx, 2)[1].split(",") : ["icons.ts", "icons-editing.ts"];
const DOTV = args[0] || path.resolve(R, "../do-tv/packages/web");
const OUT = args[1];
if (!fs.existsSync(path.join(DOTV, "app/(frontend)"))) { console.error(`no app/(frontend) under ${DOTV}`); process.exit(2); }
const ICONS = path.join(R, "icons/stroke");
const pascal = (k) => k.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
const byPascal = new Map(fs.readdirSync(ICONS).filter((f) => f.endsWith(".svg")).map((f) => [pascal(f.slice(0, -4)), f.slice(0, -4)]));
const lintSrc = fs.readFileSync(path.join(R, "pipeline/lint.mjs"), "utf8");
const SIZE_KNOWN = new Set([...(/const SIZE_KNOWN = new Set\(\[([\s\S]*?)\]\)/.exec(lintSrc)?.[1] || "").matchAll(/'([^']+)'/g)].map((m) => m[1]));
const CHEVRON = /^chevrons?-(?:up|down|left|right)(?:-(?:down|right))?$/;
const used = new Map(); // glyph -> semantics
for (const file of SEMANTICS) {
  const p = path.join(DOTV, "app/(frontend)/shared/ui", file); if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, "utf8");
  for (const m of src.matchAll(/export const (Icon\w+) = keyline\(([^)]*)\)/g)) {
    const first = m[2].split(",")[0].trim().replace(/(Duotone|Fill)$/, "");
    const name = byPascal.get(first); if (!name) { console.warn("no glyph for", first); continue; }
    if (!used.has(name)) used.set(name, []); used.get(name).push(m[1]);
  }
}
const measure = (name) => {
  const svg = fs.readFileSync(path.join(ICONS, name + ".svg"), "utf8");
  const els = [];
  const rootStroke = /<svg[^>]*\sstroke="(?!none)/.test(svg);
  for (const m of svg.matchAll(/<path ([^>]*?)\/>/g)) { const d = /d="([^"]+)"/.exec(m[1])?.[1]; if (!d) continue;
    const own = m[1]; const stroked = /stroke="(?!none)/.test(own) || (rootStroke && !/fill="(?!none)/.test(own) && !/stroke="none"/.test(own));
    const reach = stroked ? 1 : 0; for (const poly of flatten(d, 0.05)) els.push({ pts: poly, reach }); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const e of els) for (const [x, y] of e.pts) { x0 = Math.min(x0, x - e.reach); x1 = Math.max(x1, x + e.reach); y0 = Math.min(y0, y - e.reach); y1 = Math.max(y1, y + e.reach); }
  const w = x1 - x0, h = y1 - y0;
  let ink = 0; for (const e of els) { let len = 0, area = 0; for (let i = 0; i < e.pts.length; i++) { const a = e.pts[i], b = e.pts[(i + 1) % e.pts.length]; if (i < e.pts.length - 1) len += Math.hypot(b[0] - a[0], b[1] - a[1]); area += a[0] * b[1] - b[0] * a[1]; } ink += e.reach ? len * 2 : Math.abs(area) / 2; }
  const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  const reach = corners.map(([cx, cy]) => { let best = Infinity; for (const e of els) for (const [px, py] of e.pts) best = Math.min(best, Math.max(0, Math.hypot(px - cx, py - cy) - e.reach)); return best; });
  const hi = Math.max(...reach), lo = Math.min(...reach), ratio = w / h;
  let cls = "bare";
  if (/^(circle|square)-/.test(name) && byPascal.has(pascal(name.replace(/^(circle|square)-/, "")))) cls = "container";
  else if (ratio > 1.12) cls = "horizontal"; else if (ratio < 1 / 1.12) cls = "vertical"; else if (hi <= 2.2) cls = "square"; else if (hi >= 3.8 && hi <= 5.4 && hi - lo <= 1.5) cls = "circle";
  const want = { horizontal: [22, null], vertical: [null, 22], square: [20, 20], circle: [22, 22], bare: [null, null], container: [null, null] }[cls];
  let verdict = "ok", gap = 0;
  if (SIZE_KNOWN.has(name) || CHEVRON.test(name)) verdict = "known";
  else if (cls === "bare") { const m = Math.max(w, h); if (m < 19.5) { verdict = "small"; gap = 20 - m; } else if (m > 22.6) { verdict = "big"; gap = m - 22.5; } }
  else if (cls !== "container") { const dw = want[0] ? want[0] - w : 0, dh = want[1] ? want[1] - h : 0; const d = Math.max(dw, dh); if (d > 0.6) { verdict = "small"; gap = d; } else if (Math.min(dw, dh) < -0.6) { verdict = "big"; gap = -Math.min(dw, dh); } }
  const pts = els.flatMap((e) => e.pts).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = []; for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let ha = 0, hp = 0; for (let i = 0; i < hull.length; i++) { const a = hull[i], b = hull[(i + 1) % hull.length]; ha += a[0] * b[1] - b[0] * a[1]; hp += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const hullArea = Math.abs(ha) / 2 + hp * 1 + Math.PI; // Minkowski sum with the r=1 pen
  const footprint = hullArea / (w * h);
  // the optical flags: box passes lint but the eye still reads it as a different size
  const optical = [];
  if (h <= 16.5 && w >= 19.5) optical.push("扁");
  if (w <= 18.5 && h >= 20.5) optical.push("窄");
  if (h <= 18.5 && w >= 19.5 && !(h <= 16.5)) optical.push("矮");
  if (Math.max(w, h) <= 18.5) optical.push("小一号");
  if (ink < 70) optical.push("墨少");
  if (ink > 230) optical.push("墨重");
  if (footprint < 0.48) optical.push("占地稀");
  return { w, h, cls, verdict, gap, x0, y0, ink, footprint, optical };
};
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : []);
const FRONT = path.join(DOTV, "app/(frontend)"); const files = walk(FRONT).filter((p) => !/shared\/ui\/icons(-editing)?\.ts$/.test(p) && !/\/(docs|specs)\//.test(p));
const where = new Map(); // semantic -> files
for (const p of files) { const src = fs.readFileSync(p, "utf8"); for (const m of src.matchAll(/\b(Icon[A-Z]\w*)\b/g)) { if (!where.has(m[1])) where.set(m[1], new Set()); where.get(m[1]).add(path.relative(FRONT, p)); } }
const rows = [...used].map(([name, sems]) => ({ name, sems, files: [...new Set(sems.flatMap((s) => [...(where.get(s) || [])]))], ...measure(name) })).sort((a, b) => Math.max(a.w, a.h) - Math.max(b.w, b.h));
const fmt = (n) => (Math.round(n * 10) / 10).toString();
const counts = {}; for (const r of rows) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
console.log(`do-tv uses ${rows.length} glyphs · ${JSON.stringify(counts)}`);
for (const v of ["small", "big", "known"]) { const list = rows.filter((r) => r.verdict === v); if (!list.length) continue; console.log(`\n== ${v} (${list.length})`); for (const r of list) console.log(`${r.name.padEnd(26)} ${`${fmt(r.w)}×${fmt(r.h)}`.padEnd(10)} ${r.cls.padEnd(10)} -${fmt(r.gap).padEnd(4)} ${r.sems.join(", ")}`); }
// per component: the spread of box sizes it puts side by side
const byFile = new Map(); for (const r of rows) for (const fl of r.files) { if (!byFile.has(fl)) byFile.set(fl, []); byFile.get(fl).push(r); }
const spreads = [...byFile].map(([fl, list]) => { const sides = list.map((r) => Math.max(r.w, r.h)); return { fl, list, min: Math.min(...sides), max: Math.max(...sides), spread: Math.max(...sides) - Math.min(...sides) }; }).filter((x) => x.list.length >= 3).sort((a, b) => b.spread - a.spread);
console.log("\n== components whose icons span the widest range of box sizes (max side)");
for (const x of spreads.slice(0, 14)) console.log(`${x.fl.padEnd(52)} ${x.list.length} icons  ${fmt(x.min)} … ${fmt(x.max)}   ${x.list.sort((a, b) => Math.max(a.w, a.h) - Math.max(b.w, b.h)).slice(0, 4).map((r) => `${r.name} ${fmt(Math.max(r.w, r.h))}`).join(", ")}`);
const FLAGS = ["扁", "窄", "矮", "小一号", "墨少", "墨重", "占地稀"];
console.log("\n== optical flags (box passes, eye disagrees)");
for (const fl of FLAGS) { const list = rows.filter((r) => r.optical.includes(fl)); if (!list.length) continue; console.log(`-- ${fl} (${list.length}): ` + list.map((r) => `${r.name} ${fmt(r.w)}×${fmt(r.h)}${fl === "墨少" || fl === "墨重" ? ` ink${fmt(r.ink)}` : fl === "占地稀" ? ` ${Math.round(r.footprint * 100)}%` : ""}`).join(", ")); }
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const menus = [...byFile].filter(([, list]) => list.length >= 3).map(([fl, list]) => {
  const mh = median(list.map((r) => r.h)), mi = median(list.map((r) => r.ink));
  const items = list.map((r) => { const tags = []; const dh = r.h - mh, di = r.ink / mi; if (dh <= -3) tags.push("矮"); if (r.verdict === "big" || r.h > 22.6) tags.push("高"); if (di <= 0.65) tags.push("轻"); if (di >= 1.6) tags.push("重"); return { ...r, dh, di, tags }; }).sort((a, b) => a.h - b.h);
  return { fl, mh, mi, items, flagged: items.filter((i) => i.tags.length).length };
}).filter((m) => m.flagged).sort((a, b) => b.flagged - a.flagged || b.items.length - a.items.length);
console.log("\n== per component: icons that stand out from their own row (median height / median ink of that file)");
for (const m of menus.slice(0, 30)) console.log(`${m.fl.padEnd(52)} ${m.items.length} icons, median 高 ${fmt(m.mh)} 墨 ${fmt(m.mi)}: ` + m.items.filter((i) => i.tags.length).map((i) => `${i.name} ${fmt(i.w)}×${fmt(i.h)} 墨${fmt(i.ink)} [${i.tags.join("")}]`).join(", "));
console.log("\n== ink (stroke length×2 + mark area), lightest 12 · heaviest 6");
const byInk = [...rows].sort((a, b) => a.ink - b.ink); for (const r of [...byInk.slice(0, 12), ...byInk.slice(-6)]) console.log(`${r.name.padEnd(26)} ink ${fmt(r.ink).padEnd(6)} box ${fmt(r.w)}×${fmt(r.h)}  ${r.sems.slice(0, 2).join(", ")}`);
if (OUT) {
  const svgOf = (n) => fs.readFileSync(path.join(ICONS, n + ".svg"), "utf8").replace(/width="24" height="24"/, "").replace(/currentColor/g, "currentColor");
  const cell = (r) => `<div class="c ${r.verdict}"><i>${svgOf(r.name)}</i><b>${fmt(r.w)}×${fmt(r.h)}</b><em>墨 ${fmt(r.ink)} · 占 ${Math.round(r.footprint * 100)}%${r.optical.length ? " · " + r.optical.join(" ") : ""}</em><span>${r.name}</span><small>${r.sems.slice(0, 3).join(" ")}${r.sems.length > 3 ? " …" : ""}</small></div>`;
  const group = (title, list) => list.length ? `<h2>${title}（${list.length}）</h2><div class="grid">${list.map(cell).join("")}</div>` : "";
  const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:18px 24px;background:#111;color:#ddd;font:12px -apple-system,"PingFang SC",sans-serif;width:1500px}
  h2{font-size:13px;color:#8a8a8a;margin:14px 0 8px;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px}
  .c{background:#1e1e1e;border:1px solid #2c2c2c;border-radius:8px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:96px}
  .c i{display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;background:#262626;border-radius:8px}.c svg{width:24px;height:24px;color:#f2f2f2;display:block}
  .c b{font-weight:600;color:#ddd}.c span{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#8a8a8a;text-align:center;word-break:break-all}.c small{font-size:9px;color:#666;text-align:center;line-height:1.3}
  .c em{font-style:normal;font-size:9px;color:#9a8}
  .c.small{border-color:#a33}.c.small b{color:#f66}.c.big{border-color:#a80}.c.big b{color:#fb4}
  </style><body><h1 style="font-size:14px;color:#ccc;margin:0 0 4px">do-tv 用到的 ${rows.length} 枚字形 · 盒子之外的「看着不齐」：扁 / 窄 / 矮 / 小一号 / 墨少 / 墨重 / 占地稀（凸包占盒子的比例）</h1>${FLAGS.map((fl) => group(fl + " —— " + { "扁": "高 ≤ 15.5 而宽 ≥ 19.5", "窄": "宽 ≤ 18.5 而高 ≥ 20.5", "矮": "高 ≤ 18.5 而宽 ≥ 19.5", "小一号": "长边 ≤ 18.5", "墨少": "笔长×2 + 实心面积 < 70", "墨重": "> 230", "占地稀": "凸包（带笔宽）占盒子 < 48%，斜线、三角、稀疏点这类" }[fl], rows.filter((r) => r.optical.includes(fl)).sort((a, b) => a.ink - b.ink))).join("")}<h1 style="font-size:14px;color:#ccc;margin:24px 0 4px">盒子本身的结论</h1>${group("偏小 —— 比自己那一类该有的盒子小", rows.filter((r) => r.verdict === "small"))}${group("偏大", rows.filter((r) => r.verdict === "big"))}${group("按规矩就这么小（lint 的 SIZE_KNOWN / chevron 名单：叉、勾、加减、尖角这类）", rows.filter((r) => r.verdict === "known"))}${group("正常", rows.filter((r) => r.verdict === "ok"))}</body>`;
  fs.writeFileSync(OUT, html); console.log("\nwrote", OUT);
  // second sheet: each component as a row of its icons at 20px, the odd ones framed
  const rowHtml = (m) => `<div class="menu"><div class="mt">${m.fl}<small>${m.items.length} 枚 · 中位高 ${fmt(m.mh)} · 中位墨 ${fmt(m.mi)}</small></div><div class="row">${m.items.map((i) => `<div class="k ${i.tags.length ? "odd" : ""}"><i>${svgOf(i.name)}</i><b>${fmt(i.h)}<u>高</u> ${fmt(i.ink)}<u>墨</u></b><span>${i.name}</span>${i.tags.length ? `<em>${i.tags.join(" ")}</em>` : ""}</div>`).join("")}</div></div>`;
  const html2 = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:18px 24px;background:#111;color:#ddd;font:12px -apple-system,"PingFang SC",sans-serif;width:1500px}
  h1{font-size:14px;color:#ccc;margin:0 0 10px}
  .menu{margin:0 0 14px}.mt{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#9a9a9a;margin-bottom:5px}.mt small{color:#666;margin-left:10px}
  .row{display:flex;flex-wrap:wrap;gap:6px}
  .k{width:118px;background:#1e1e1e;border:1px solid #2c2c2c;border-radius:8px;padding:8px 4px 6px;display:flex;flex-direction:column;align-items:center;gap:3px}
  .k i{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;background:#262626;border-radius:8px}.k svg{width:20px;height:20px;color:#f2f2f2;display:block}
  .k b{font-weight:500;color:#ccc;font-size:11px}.k u{text-decoration:none;color:#666;font-size:9px;margin-right:4px}.k span{font-family:ui-monospace,Menlo,monospace;font-size:9px;color:#8a8a8a;text-align:center;word-break:break-all}.k em{font-style:normal;color:#f66;font-size:10px}
  .k.odd{border-color:#a33}
  </style><body><h1>每个组件里自己的一排：矮 = 比该排中位高低 3 以上；高 = 超出自己那一类的盒子（22 高的圆和竖长件不算）；轻 / 重 = 墨量不到中位的 65% / 超 160%</h1>${menus.slice(0, 40).map(rowHtml).join("")}</body>`;
  const OUT2 = OUT.replace(/\.html$/, "-menus.html"); fs.writeFileSync(OUT2, html2); console.log("wrote", OUT2);
}
const failed = rows.filter((r) => r.verdict === "small" || r.verdict === "big");
console.log(failed.length ? `\nFAIL: ${failed.length} glyph${failed.length === 1 ? "" : "s"} paint off their class box — ${failed.map((r) => r.name).join(", ")}` : "\nPASS: every used glyph paints its class box (known-size names excepted)");
process.exit(failed.length ? 1 : 0);
