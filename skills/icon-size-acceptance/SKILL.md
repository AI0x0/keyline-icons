---
name: icon-size-acceptance
description: 验收接了 keyline 的 app（do-tv）里图标大小是否一致 —— 扫语义层、量每枚字形实际画出来的盒子、按 lint 的五类判偏小 / 偏大、按每个组件自己一排标矮 / 轻 / 重、出两张对照表。换图标、加图标、升级 @ai0x0/keyline-icons 之后跑。Acceptance scan for icon sizes in a consumer app; run after swapping, adding or upgrading icons.
---

# 图标大小验收（icon-size-acceptance）

用户说「这些图标看着大小不一致」「新图标接进来了帮我验一下」「升级了 keyline 看看有没有问题」，跑这个。
它回答的是一个具体问题：do-tv 每个组件同一排里的图标，画出来的盒子和墨量齐不齐。

## 命令

```bash
node skills/icon-size-acceptance/scan-sizes.mjs ../do-tv/packages/web /tmp/dotv-sizes.html
```

- 第一个参数是 app 的 web 包目录（默认是本仓库旁边的 `../do-tv/packages/web`），脚本读它的 `app/(frontend)/shared/ui/icons.ts` 和 `icons-editing.ts`，从 `export const IconX = keyline(Glyph…)` 一行行反查到 `icons/stroke/<glyph>.svg`，再扫 `app/(frontend)` 下所有 tsx 看每个语义名用在哪些组件里。别的语义层文件用 `--semantics a.ts,b.ts`。
- 第二个参数给了就写两张深色表：`<out>.html`（按标记分组的总表）和 `<out>-menus.html`（每个组件自己的一排，20px，出格的框红）。验收记录附这两张。
- 退出码 0 = 通过，1 = 有字形画不满自己那一类的盒子，2 = 目录不对。

## 验收标准

必须满足：

1. **盒子**：每枚用到的字形，painted 盒子达到 lint 给它那一类的尺寸 —— 横件 22 宽、竖件 22 高、方形 20、圆形 22、其余（bare）长边在 20 到 22.5 之间。`small` / `big` 必须为零；lint 的 SIZE_KNOWN 名单和 chevron 家族按规矩就小（叉 16、勾、加减、尖角、省略号、终端提示符），脚本标成 `known`，不算。
2. **同排不新增出格**：`-menus.html` 里每个组件一排，按该排的中位高、中位墨量标「矮」（低 3 以上）、「高」（超出自己那类的盒子）、「轻」（墨量不到中位 65%）、「重」（超 160%）。新接的字形不能带来新的红框；已有的红框只能是下面结构性名单里的。

参考项（打印出来看，不作为通过条件）：

- 扁 / 窄 / 矮 / 小一号 / 墨少 / 墨重 / 占地稀 七个光学标记，说明「盒子达标但眼睛不认」的原因。
- 「components whose icons span the widest range」那一节列出同一组件里盒子跨度最大的几个，跨度大于 4 的排要看一眼。

## 结构性名单（允许留着的红框）

这些不是没改，是按规矩就长这样，改了反而错：

| 标记 | 字形 | 为什么 |
|---|---|---|
| known / 小一号 / 墨少 | x、check、chevron-*、more-horizontal、minus、terminal、grip-vertical、x-logo | lint 的 SIZE_KNOWN：关闭叉、勾、尖角、省略号故意比别人小 |
| 窄 | bell、lock、mic、smartphone、file-*、pin、bold、italic、play、mouse* 等 18×22 | 天然竖长件，竖件类的目标就是 22 高 |
| 矮 | eraser、video、camera、mail、keyboard、list、rewind、panorama 等 22×18 | 横件类的目标就是 18 高 22 宽 |
| 墨少 | square-dashed、circle-dashed、slash、pinch | 虚线段已经顶到 2 单位间距的上限；斜线、手势本来就轻 |
| 墨重 | film、globe、gift | 结构密度：胶片的齿孔、地球的经赤线、礼盒的盖和蝴蝶结 |
| 占地稀 | rotate-corner-*、pen、slash、check、pinch | 斜向、单笔或角上的字形，凸包占盒子少是形状决定的 |

一排里只有 chevron / check / x 时中位数本身就低，别的正常字形会被标「重」，看一眼即可。

## 判定逻辑（和 pipeline/lint.mjs 一致）

- 量的是 painted 盒子：描边路径两侧各 1，实心 mark 不加。
- 分类：宽 / 高 > 1.12 横件；< 1/1.12 竖件；四角到最近墨的距离都 ≤ 2.2 方形；都在 3.8–5.4 且极差 ≤ 1.5 圆形；其余 bare。名字带 circle- / square- 前缀且去掉前缀后仍是一枚字形的算容器，不判。
- 墨量 = 描边长度 × 2 + 实心面积；占地 = 带笔宽的凸包面积 / 盒子面积。

## 不过怎么办

改库，不改 app：字形偏小就在 keyline-icons 里放大或重画（`raw/` 是唯一的源），跑 `pnpm icons:ci` 过了再发版；app 这边只换语义指向，不要用 CSS 缩放某一枚。哪些字形在 do-tv 的哪些组件里，脚本第一节已经列出，改完再跑一遍对照。
