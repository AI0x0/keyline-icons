// Build SVG markup for references. Usage from other scripts.
import fs from "node:fs";
import { createRequire } from "node:module";
const S = new URL(".", import.meta.url).pathname;
// Reference dumps are optional: drop ref/phosphor.json ({name: [d…]}) and ref/lucide.json ({name: [[tag, attrs]…]}) next to
// this file to use phosphor() / lucide(); keyline() and shot() work without them.
const optional = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {});
export const ph = optional(S + "ref/phosphor.json");
export const lu = optional(S + "ref/lucide.json");
export function phosphor(name) {
  const ds = ph[name]; if (!ds) return null;
  return `<svg viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${ds.map(d => `<path d="${d}"/>`).join("")}</svg>`;
}
export function lucide(name) {
  const nodes = lu[name]; if (!nodes) return null;
  const inner = nodes.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
export function keyline(name, style = "stroke", corners = "regular", root = ".") {
  const f = `${root}/raw/${name}/Container=regular, Style=${style}, Corners=${corners}.svg`;
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, "utf8").replace(/stroke="black"/g, 'stroke="currentColor"').replace(/fill="black"/g, 'fill="currentColor"').replace(/width="24" height="24"/, "");
}
export function shot(html, png, w = 1500, h = 1200) {
  const { execSync } = createRequire(import.meta.url)("node:child_process");
  execSync(`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=${w},${h} --screenshot="${png}" "file://${html}" 2>/dev/null`);
}
