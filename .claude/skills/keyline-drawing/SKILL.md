---
name: keyline-drawing
description: 在 keyline-icons 里手绘新图标、放大 / 重画旧图标、注册进四个 lib 表、跑 pipeline 过 lint、出对照表、交付到 do-tv（file: 链接）的完整做法。画图标、改尺寸、给 do-tv 换图标、查 lint 为什么不过时用。
---

# Keyline 手绘工作流

`raw/` 是唯一的源；`icons/`、`components/icons/`、`packages/*/src`、`packages/*/icons.json`、`previews/`、README / LISTING 全是生成物，别手改。
提交、发版、接 do-tv 都只在用户明确要求时做。发版流程：`packages/react/package.json` 升版本（新字形 minor，纯重画 patch）→ `lib/icon-release-notes.json` 写一条 → `git add` 这两个 → `pnpm ship -m "Release x.y.z"`（regenerate → verify → 提交 OWNED + 已暂存 → 重建 icon-history / paper 并 amend）→ `git checkout main && git merge --ff-only <branch>` → `git tag vx.y.z`（轻量 tag）→ `git push origin main vx.y.z`，release.yml 在 tag 上校验版本、`npm publish`、建 GitHub Release。本机没有 npm 登录，发布只走 CI。
验收扫描的公开版在 `skills/icon-size-acceptance/`（仓库里）。
新画的字形都记进 `lib/icon-private.json`（这是 AI0x0 的 fork，私有 = fork 自己的画）。品牌 logo 是商标，只能私有。

## 1. 语法与 lint 的数字（pipeline/lint.mjs）

- 24 网格，2 单位笔。regular = round caps + round joins；sharp = butt caps + round joins。
- 半径梯子 0.5 / 1 / 1.5 / 2 / 3 / 4 / 5（容差 0.05）。plate 是描边往外偏 1，所以描边 r5 的 plate 是 r6（梯外，会警告）；要干净就用 r ≤ 4 或 r0.5。RADIUS 只检查「两条**垂直直线**夹着的一个圆角」——圆角接圆角、斜边夹角都不查。
- SPACING：不同 subpath 之间 painted 间距 ≥ 2（GAP_TOL 0.02）；相交 / 端点落在对方中心线上（COINCIDENT 0.1）的一对免检；fill 里落在实心 plate 上的元素免检（layered）。sharp 的自由端会被 lint 往回削 1，所以 sharp 里伸进别的元素 1 才算「接上」。
- PADDING：painted 离画布边 ≥ 1（sharp ≥ 0.586）。比较是严格 `<`：偏移正好压在 1.0 线上的圆角，flatten 后是 0.9999 → 报 "1.00 < 1.00"。要么让直线端点（cap 是精确的）落边，要么留 0.02。
- OPTICAL：容器名前缀 circle-/square- 之外一律 bare。先看盒子比例：宽/高 > 1.12 → horizontal（宽必须 22）；< 1/1.12 → vertical（高必须 22）；四角 reach 全 ≤ 2.2 → square（20 × 20）；reach 都在 3.8–5.4 且极差 ≤ 1.5 → circle（22 × 22）；其余 → bare，对角 spread ≥ 15.5、最长边 ≤ 22.5。经验：22 × 20（1.10）会被当圆判失败，22 × 19（1.158）是 horizontal，18 × 22 是 vertical，20 × 20 的箭头对会被当成圆。SIZE_KNOWN 名单和 CHEVRON 免检。
- CENTERING：对边 padding 相等，容差 0.05（sharp 多 0.414）。CONSISTENCY：fill / duotone 的 bounds 与 stroke 的 painted bounds 差 ≤ 0.05。COVERAGE：闭合区域必须有 fill + duotone（太小的点不算「可填」，pinch / fingers-move 那种只出 stroke + duotone）。DOT：正方 bbox < 4 的 subpath 只能是 2 / 2.67 / 3。
- 用法句子 ≤ 96 字符，搜索 snippet ≤ 160（icons:ci 会红）。build-paper 要求每个名字落到 taxonomy 的某个 shelf，没有 Other。

## 2. sharp 的规矩

- 轴向自由端 +1；斜向自由端 +0.293（√2−1 是正好落回 round cap 的盒子，0.293 留 0.086 余量）。
- 闭合轮廓 r0，顶点要在 painted 目标上：斜边多边形用 `sharpen()`（沿角平分线内收 r(1/cos(θ/2)−1)），轴对齐矩形顶点不动。
- 锐角用 `chamfer()`（只认顺时针多边形，先 `clockwise()`）。
- 箭头尖是 round join，不延长；只延 barb 末端。圆弧起点别延长（会撞自己的头）。
- sharp 的 plate 外角 r1。
- 斜杆伸到角上、圆头版已经压在 padding 线的自由端（fullscreen-exit 的杆、search 的柄）只能 +0.293：+1 会把 butt 的角顶到 23.41，盒子 22.83 > 22.5 天花板（OPTICAL 报 bare 超标）。search 的柄 +1 后盒子 22.41 刚好没超，是运气不是规矩。

## 3. 工具包（scripts/）

- `poly.mjs`：`P` 点、`f` 格式化、`filletPath(pts, radii)` 闭合圆角多边形、`offsetPoly(cwPts, radii, d)`（凸角 +d）、`clockwise()`、`chamfer()`、`circle(cx,cy,r)`（4 段三次）、`line(a,b)`、`emit(root, name, {regular, sharp})`。
  spec 字段：`strokes`（描边）、`plates`（fill/duotone 的实心）、`knockouts`（evenodd 抠掉）、`fillStrokes`（fill 里仍作描边画的）、`marks`（实心小件：点、星、播放三角）、`muted`（duotone 里 0.4 的描边，虚线框套路）、`marksInFill:false`（fill 里不再叠 marks，让 knockout 当洞）。写出 `Container=regular, Style=…, Corners=….svg`。
- `star.mjs`：四角星 `star({cx,cy,E,alpha,w,r,sharp})`，E 是 painted 尖端半径。
- `svgflat.mjs`：`flatten(d, tol)`、`bboxOf`。`measure.mjs name…`：已构建 stroke 的中心线 bbox（painted = ±1）。
- `resize.mjs`：整字形等比放大到目标盒子并重建 plate（上一轮 12 枚菜单图标放大用的）。
- `refsvg.mjs`：`keyline(name, style, corners, root)` 读 raw；Lucide / Phosphor 参考从 cdn：`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/<n>.svg`、`https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets/regular/<n>.svg`。Phosphor 的 regular 轮廓是 1.5 笔展开的：中心线 = 内孔多边形外扩 0.75。
- `example-round.mjs` 里有 `arcPath(cx,cy,r,a0,a1)`（按 90° 拆段，轴向极值精确；只能递增角度）、`offsetCubic`（Tiller–Hanson）、`sharpen`、`xf`（路径仿射，只吃绝对 M/L/C，H/V 先改成 L）。
- `example-register.mjs`：private / usage / aliases(match+terms, names) / taxonomy 四张表的写法；每个名字单独 guard，别用别人的 includes 判断。
- `finish.sh names…`：build → lint（只放过点名字形零告警）→ react/data/readmes/paper/cover → `pnpm icons:ci`。
- `scan-dotv-sizes.mjs [do-tv/packages/web] [out.html]`：扫 do-tv 用到的全部字形（icons.ts + icons-editing.ts → raw 名），量 painted 盒子、按 lint 的五类判断偏小 / 偏大、列出 SIZE_KNOWN 名单、按组件看同一排里盒子跨度、算墨量（笔长×2 + 实心面积）；给 out.html 就出两张深色表：总表（按结论分组）和 out-menus.html（每个组件自己的一排，按该排中位高 / 中位墨标出矮、轻、重、超标）。用户说「大小不一致」先跑它。
- `example-sheet.mjs`：对照表模板（深色 do-tv 菜单 18/20px 现在→提议 + 24·48 卡片 + fill/duotone/sharp），用无头 Chrome 截图：
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=W,H --screenshot=out.png file://…html`

## 4. 步骤

1. 先量：`node scripts/measure.mjs a b c`，看邻居的盒子；抓 Lucide / Phosphor 参考。
2. 写 `roundN.mjs`：参数化几何（顶点、半径、位置），先 `emit` 到 cand 目录看 `d`，再 emit 到仓库。改前把旧 raw 拷到 before 目录留给对照表。
3. `register.mjs`：private、usage（一句话，≤ 96）、aliases 的 `{match:"^name$", terms}` 与 `names`（别家叫法）、taxonomy 正则（`face$` 这种用 `$` 防前缀误匹配 facebook）。
4. `finish.sh names…`，看 lint，改到零；家族继承的老债（user-x 家族 sharp 的 r6/r7、overlap 0.07）可以点名放过并写进报告。
5. do-tv 走 `file:` 链接：`packages/react` 里 `rm -rf dist && pnpm run build`，do-tv 里 `pnpm install`（file: 是拷贝安装），dev server 要重启。
6. 出对照表、发图、把新经验写进 memory。

## 5. 组合套路

- 右上徽记：主体缩到左下（eraser 0.85、camcorder 7/12、播放缩略图 10×10 都试过），sparkle `star({cx:18.7, cy:6.3, E:4.25, alpha:26, w:1.6})`；↻ 徽记 r3.5、¾ 圆、尖端朝下、barb 1.5。
- 开角框（image-arrow-right 式）：框 2..20 × 4.5..20.5 r3，顶边停在 x 9、右边停在 y 15.5，徽记放缺角；plate = 描边外扩 1 再把缺角挖掉，壁在开口 cap 内侧 1（x 10 / y 14.5），角 r3；徽记在 fill 里作 fillStrokes。clip-refresh / clip-continue 就是这个。
- 人形家族：复用 user-x 的头 `M9 4…` 与身体 `M8 14L10 14C…Z`（14 宽 r6 穹顶），徽记区 16..22 × 4..10；替换类用居中人形 + 两侧向外箭头（user-switch）。新 `user` 单体是 20 × 20（头 r3.5、身 3..21）。
- 竖线 + 物件（camera-start/end）：物件压成 16 宽，竖线 x 2 或 22，间距 2。上下分（video-audio-lines）：上摄像机 7/12，下五根声波，18 × 22 走 vertical。
- 点：贴着轮廓 1 单位的点必须是实心 mark（reach 0），描边小圆会撞 SPACING；fill 里用 knockout 当洞 + `marksInFill:false`。
- 45° 链环（link）：r5 的 C 形，远心 (17,7)/(7,17)、近心 (14,10)/(10,14)，近弧 45°→141°，短边停在 u 4.8 留 2.12；sharp 不延长端点。
- 双箭头（arrow-right-left）：行 7/17、臂 3.5、杆 2..22 → 22 × 19。
- arrow-u-turn 两枚跟四枚 arrow 一起 22 宽：头尖到 2、弯钩到 22，形不变，22×18 横件。
- 光秃符号的盒子：plus / minus 22（2..22）、四枚 arrow 杆 2..22 + 头 3..21（22 × 20）、search 镜 r8 心 (10,10) 柄到 (22,22)、fullscreen 对 8 单位腿在 22 盒、杆仍停 (14,10)/(10,14)（再往里两根杆撞 SPACING）。x 16、check、chevron 按 SIZE_KNOWN 不动。
- 虚线节奏：r3 圆角的 18 框，直段最长 10..14（painted 6，两头缝正好 2）；圆虚线 r10 八段各 21.8°（缝 23.2° = 弦 4.02 → painted 2.02）。

## 6. 常见坑

- 迭代拟合里的居中：把位移**加到**当前中心，别当绝对值赋（highlighter 收敛到 0.85..22.85）。
- 旋转过的半圆要按 90° 拆成三次段，否则轴向极值鼓出 0.0016 → PADDING 1.00 < 1.00。
- 等比缩放描边几何时笔宽不变：plate 不能跟着缩，要按缩后的中心线重新外扩 1（或 resize.mjs）。
- `arcPath` 只能角度递增；反着给会什么都不画（左键 plate 变三角）。
- 斜边多边形在 sharp 里 r0 时 round join 会把角顶出 1：用 sharpen()，或者接受盒子被撑。
- 注册数组里多一个逗号 → `undefined` → JSON null → icons:ci 的 `new Set<string>` 类型错。
- 缩过的 hand 指缝正好 2，缩了就撞；四向箭头半径 < 6 会糊成团。
- 手柄 / 光标类的字形以所在角命名（rotate-corner-top-left 等）。
- 单轴缩放描边去凑 18 高时，plate 不能套同一个系数：外扩量会变成 1.03，CONSISTENCY 差 0.06 报错。plate 单独算系数，让它的极值正好落在描边 painted 极值上（panorama：描边 k 1.0283，plate k 1.0251）。
- 空心手柄 + 从手柄两条边出发的两根框线：两线端点相距 h/√2，要 ≥ 4 才不撞 SPACING，所以空心手柄最小 6。想要小手柄只能改实心 mark（4×4 r1，bbox 4 不受 DOT 阶梯管）让一条闭合框线穿过去（bounding-box 第六轮，墨量 226 → 185）。
- 3×3 网格减不了线（减一条就不是 3×3），去框会和 grid-2x2 配不上（去框的 2x2 是个加号）；库里已有无框的 `hash`（22 盒、160 墨）。第七轮最终给 do-tv 画了实心方块对 tiles-2x2 / tiles-3x3（Material apps / grid_view 那种），墨量 192 / 144。
- SOLID 规则：stroke 版里必须有描边，只有实心 mark 的字形报 error（唯一例外是「全是 ≤ 4 的圆点」，more-horizontal 那种）。所以「实心小方块」要用描边画：2×2 中心线的描边小方 = painted 4×4、角 r1（round join 给的）；7×7 实心块 = 5×5 描边方（r1 → painted r2）+ 里面一个 2×2 描边小方填掉 3×3 的孔（同一个 path 里的子路径重叠不算 SPACING）。grip 家的点就是描边 r1 小圆。DOT 阶梯只查 fill 的圆形 mark，描边小方不查。5×5 描边方算可填（要出 fill / duotone，plate 7×7 r2；sharp r1），2×2 的不算。
- emit 已改成 strokes 为空时不写空的 `<path d="">`。
- 家族共享的段（square-dashed 家族的 10.5..13.5 虚线、circle-dashed / circle-progress 的 8 段弧）要一起改：按「子路径数字全在白名单里且含要换的数字」做替换扫全库，或用旧弧字符串精确替换，再让闸门点名全家。这轮 22 + 10 个字形一次跟上，零告警。
- 闸门点名的字形若有 HEAD 上就有的老告警（square-dashed-pen sharp/duotone 重叠 0.07），用 `git stash; node pipeline/lint.mjs --json; git stash pop` 确认后从点名里去掉并写进报告。
- build-history 的守卫「已发布条目不能变少」：每枚字形原先只记最近一次改动日期，重画一枚老字形会让它从旧版本的 redraw 名单里掉出来。已改成记全部 touch 日期按窗口提名（0.7.0 那次），再遇到先看是不是这一类。
- zsh 里 `echo ====` 会按 `=cmd` 展开报错，并截断同一行后面所有命令——第六轮的原版快照因此没存上。原版一律 `git show HEAD:path`（或 `git ls-tree` 循环），别靠工作目录拷贝。
