import fs from "node:fs";
import { keyline } from "./refsvg.mjs";
const S = new URL(".", import.meta.url).pathname;
const REPO = "/Users/mushan/Documents/project/keyline-icons";
const g = (root) => (n, st = "stroke", c = "regular") => keyline(n, st, c, root) || keyline(n, st, c) || `<span style="color:#f55">${n}?</span>`;
const now = g(REPO);
const item = (svg, label) => `<div class="it"><i>${svg}</i><span>${label}</span></div>`;
const menu = (rows, w = 150) => `<div class="menu" style="min-width:${w}px">${rows.map(([svg, label]) => item(svg, label)).join("")}</div>`;
const col = (cap, body) => `<div><div class="cap">${cap}</div>${body}</div>`;
const sz = (svg, s) => svg.replace("<svg", `<svg width="${s}" height="${s}"`);
const tbar = (...svgs) => `<div class="tbar">${svgs.map((svg) => `<span>${svg}</span>`).join("")}</div>`;
const accent = (svg) => svg.replace("<svg", `<svg class="accent"`);
let html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:18px 24px;background:#111;color:#ddd;font:13px -apple-system,"PingFang SC",sans-serif;width:1200px}
h2{font-size:13px;color:#8a8a8a;margin:16px 0 8px;font-weight:600}
.row{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}.cap{font-size:10px;color:#666;margin-bottom:4px}.note{font-size:11px;color:#8a8a8a;margin-top:6px;max-width:640px}
.menu{background:#262626;border:1px solid #3a3a3a;border-radius:10px;padding:6px;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.it{display:flex;align-items:center;gap:12px;padding:7px 10px;color:#eee;font-size:14px;font-weight:600;white-space:nowrap}.it i{display:inline-flex}.it svg{width:18px;height:18px;color:#f2f2f2}
.tbar{display:inline-flex;gap:2px;background:#1e1e1e;border:1px solid #333;border-radius:8px;padding:4px}.tbar span{display:inline-flex;padding:6px 8px}.tbar svg{width:20px;height:20px}
.panel{background:#f6f6f7;color:#222;border-radius:12px;padding:14px 18px;display:inline-flex;gap:36px}
.panel h4{margin:0 0 10px;color:#1ab3e6;font-size:14px;font-weight:600}.kr{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:6px 0;font-size:14px}.kr .keys{display:inline-flex;gap:6px}
.kr .k{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 8px;background:#fff;border:1px solid #e2e2e2;border-radius:8px;font-size:13px;color:#333}.kr .k svg{width:22px;height:22px;color:#222}
svg.accent path[stroke-opacity]{stroke:#1ab3e6;stroke-opacity:1} svg.accent path[fill-opacity]{fill:#1ab3e6;fill-opacity:1}
.cards{display:flex;flex-wrap:wrap;gap:18px 26px}.card{display:flex;flex-direction:column;gap:6px}
.szs{display:flex;align-items:flex-end;gap:10px}.szs div{display:flex;flex-direction:column;align-items:center;gap:2px;color:#777;font-size:9px}
.styles{display:flex;gap:6px}.styles svg{width:24px;height:24px}.lab{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8a8a8a}
svg{display:block;color:#eee}
</style><body>`;
html += `<h2>预演台（18px）</h2><div class="row">${col("现在", menu([[now("perspective"), "预演台"]]))}${col("这一版", menu([[now("perspective-video"), "预演台"]]))}</div><div class="note">原透视面撑满，中间那条线换成摄影机</div>`;
html += `<h2>缩放（20px）</h2><div class="row">${col("现在", tbar(now("expand-dashed-up-right-box")))}${col("这一版 scale-frame", tbar(now("scale-frame")))}</div><div class="note">scaling 去掉箭头、上下翻转：外框 + 右下角的抓手</div>`;
const k = (svg) => `<span class="k">${svg}</span>`, key = (t) => `<span class="k">${t}</span>`;
const kr = (label, ...ks) => `<div class="kr"><span>${label}</span><span class="keys">${ks.join("")}</span></div>`;
const duo = (n) => accent(keyline(n, "duotone") || "");
html += `<h2>彩色图标：手势部分是 duotone 里带 opacity 的那一层，宿主用 CSS 上色（这里 #1ab3e6）</h2>`;
html += `<div class="panel"><div><h4>缩放</h4>${kr("放大", key("⌘"), key("+"))}${kr("缩小", key("⌘"), key("−"))}${kr("触控板", k(duo("pinch")))}${kr("鼠标", key("⌘"), k(duo("mouse")))}</div><div><h4>移动画布</h4>${kr("键盘", key("Space"), k(duo("mouse-left")))}${kr("触控板", k(duo("fingers-move")))}${kr("鼠标", k(duo("mouse-move")))}</div><div><h4>单色（stroke）</h4>${kr("鼠标滚轮", k(now("mouse")))}${kr("鼠标左键", k(now("mouse-left")))}${kr("鼠标移动", k(now("mouse-move")), k(now("mouse-drag")))}${kr("触控板缩放 / 移动", k(now("pinch")), k(now("fingers-move")))}</div></div>`;
html += `<div class="note">缩放-鼠标 = 滚轮高亮；键盘 Space + 鼠标 = 左键高亮（按住左键拖）；鼠标移动 = 小鼠标 + 四边箭头（mouse-move），备选 = 左键高亮 + 两道拖动线（mouse-drag）。CSS：<code>svg path[stroke-opacity]{stroke:#1ab3e6;stroke-opacity:1} svg path[fill-opacity]{fill:#1ab3e6;fill-opacity:1}</code></div>`;
html += `<h2>旋转与镜像（20px）：工具按钮 rotate-mirror · 角度 angle · 逆时针 rotate-ccw-square · 顺时针 rotate-cw-square · 水平翻转 flip-horizontal · 垂直翻转 flip-vertical</h2><div class="row">${tbar(now("rotate-mirror"))}${tbar(now("angle"))}${tbar(now("rotate-ccw-square"), now("rotate-cw-square"))}${tbar(now("flip-horizontal"), now("flip-vertical"))}</div><div class="note">旋转按参考图：方框的角变成弧形箭头，拖角旋转；镜像竖线拉长到 9..17</div>`;
html += `<h2>四角旋转光标（20px）：rotate-corner-top-left · top-right · bottom-left · bottom-right</h2><div class="row">${tbar(now("rotate-corner-top-left"), now("rotate-corner-top-right"))}${tbar(now("rotate-corner-bottom-left"), now("rotate-corner-bottom-right"))}</div><div class="note">弧绕着图片的角，两头带箭头；名字按光标所在的图片角</div>`;
html += `<h2>字形：24 · 48，fill / duotone / sharp</h2><div class="cards">`;
for (const n of ["perspective-video", "scale-frame", "mouse", "mouse-left", "mouse-move", "mouse-drag", "pinch", "fingers-move", "rotate-mirror", "angle", "rotate-ccw-square", "rotate-cw-square", "rotate-corner-top-left", "rotate-corner-top-right", "rotate-corner-bottom-left", "rotate-corner-bottom-right"]) {
  const fill = keyline(n, "fill"), duoR = keyline(n, "duotone"), sh = keyline(n, "stroke", "sharp"), fs2 = keyline(n, "fill", "sharp");
  html += `<div class="card"><div class="szs"><div>${sz(now(n), 24)}<span>24</span></div><div>${sz(now(n), 48)}<span>48</span></div></div><div class="styles">${fill || ""}${duoR || ""}${sh || ""}${fs2 || ""}</div><div class="lab">${n}</div></div>`;
}
html += `</div></body>`;
fs.writeFileSync(S + "compare33.html", html); console.log("wrote compare33.html");
