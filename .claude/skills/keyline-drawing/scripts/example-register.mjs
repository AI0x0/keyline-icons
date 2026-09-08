// Register circle-question-mark, eraser-sparkle, scan-text in the lib lists. node register4.mjs <root>
import fs from "node:fs";
const R = process.argv[2];
const rd = (p) => fs.readFileSync(`${R}/${p}`, "utf8");
const wj = (p, obj, src) => fs.writeFileSync(`${R}/${p}`, JSON.stringify(obj, null, 2) + (src.endsWith("\n") ? "\n" : ""));
const GONE = ["hand-pinch", "hand-move"];
const NEW = ["camera-end", "camera-start", "circle-question-mark", "clip-continue", "clip-refresh", "clip-split", "clip-trim-left", "clip-trim-right", "copy-check", "diamond-plus", "eraser-sparkle", "angle", "face", "fingers-move", "rotate-mirror", "rotate-cw-square", "rotate-ccw-square", "rotate-corner-top-left", "rotate-corner-top-right", "rotate-corner-bottom-left", "rotate-corner-bottom-right", "image-pen", "keyframes", "mouse", "mouse-drag", "mouse-left", "mouse-move", "paintbrush-sparkle", "pinch",, "perspective-video", "rectangle-horizontal", "scale-frame", "scan-text", "scribble", "slash", "transition", "user-pen", "user-switch", "video-audio-lines"];
// private
{ const src = rd("lib/icon-private.json"), j = JSON.parse(src); j.names = j.names.filter((n) => typeof n === "string" && !GONE.includes(n)); for (const n of NEW) if (typeof n === "string" && !j.names.includes(n)) j.names.push(n); j.names = j.names.filter((n) => typeof n === "string"); j.names.sort(); wj("lib/icon-private.json", j, src); }
// usage
{ const src = rd("lib/icon-usage.json"), j = JSON.parse(src); for (const n of GONE) delete j.usage[n];
  Object.assign(j.usage, {
    "circle-question-mark": "A question mark in a ring, for help buttons, support entry points and FAQ links.",
    "eraser-sparkle": "An eraser with a sparkle, for AI object removal and cleaning a subject out of every frame.",
    "face": "A face outline with ears and two eyes, for portrait adjustment and reshaping a face.",
    "scan-text": "Text lines inside scan marks, for detecting captions and reading text out of a picture.",
    "camera-start": "A camera against a start bar, for capturing the first frame of a clip.",
    "camera-end": "A camera against an end bar, for capturing the last frame of a clip.",
    "clip-continue": "A play thumbnail with an arrow leaving it, for continuing a video into its next segment.",
    "clip-refresh": "A play thumbnail with a circular arrow, for reshooting a clip and regenerating a segment.",
    "copy-check": "Two sheets with a check on the front one, for a copy that succeeded and text on the clipboard.",
    "clip-split": "Two clip halves either side of a playhead, for splitting a clip where the playhead stands.",
    "clip-trim-left": "A cross left of the playhead and a clip to its right, for trimming away everything before it.",
    "clip-trim-right": "A clip left of the playhead and a cross to its right, for trimming away everything after it.",
    "transition": "Two clips overlapping in the middle, for a transition between shots.",
    "slash": "One straight stroke corner to corner, for a straight line and a linear path.",
    "rectangle-horizontal": "A landscape rounded rectangle, for a rectangle shape and a rectangular path.",
    "scribble": "One free wavy stroke, for freehand drawing and a hand-drawn path.",
    "diamond-plus": "A keyframe diamond with a plus inside, for adding a keyframe where the playhead stands.",
    "image-pen": "A picture with a pen over its corner, for editing a frame and retouching an image.",
    "keyframes": "Two keyframe diamonds on a track with a playhead, for animation timelines and keyframe editing.",
    "paintbrush-sparkle": "A paintbrush with a sparkle, for generative repainting and filling a region with AI.",
    "perspective-video": "A camcorder shooting a plane in perspective, for the director's desk and previewing a 3D set.",
    "scale-frame": "A frame with a smaller corner nested inside it, for scaling and resizing in proportion.",
    "mouse": "A mouse with its wheel, for scrolling gestures and pointer shortcuts.",
    "mouse-move": "A mouse with its left button held and four-way arrows, for dragging the canvas with the mouse.",
    "mouse-left": "A mouse with its left button marked, for click-and-drag shortcuts.",
    "mouse-drag": "A mouse with its left button held and two motion lines, for dragging with the mouse.",
    "rotate-cw-square": "A frame whose corner turns into a clockwise arrow, for rotating a picture by its corner.",
    "rotate-ccw-square": "A frame whose corner turns into a counter-clockwise arrow, for rotating a picture the other way.",
    "rotate-corner-top-right": "A curved two-headed arrow around a top-right corner, for the rotate cursor at that corner.",
    "rotate-corner-top-left": "A curved two-headed arrow around a top-left corner, for the rotate cursor at that corner.",
    "rotate-corner-bottom-right": "A curved two-headed arrow around a bottom-right corner, for the rotate cursor at that corner.",
    "rotate-corner-bottom-left": "A curved two-headed arrow around a bottom-left corner, for the rotate cursor at that corner.",
    "pinch": "Two finger dots with arrows moving them apart, for zooming with a trackpad gesture.",
    "fingers-move": "Two finger dots with four arrows around them, for panning with a trackpad gesture.",
    "angle": "Two rays from a vertex with an arc between them, for an angle value and rotation degrees.",
    "rotate-mirror": "A circular arrow around a broken mirror axis, for the rotate and flip tools together.",
    "user-pen": "A person with a pen badge, for modifying a subject and editing a character.",
    "user-switch": "A person flanked by outward arrows, for replacing a subject or switching who is in a shot.",
    "video-audio-lines": "A camcorder above audio bars, for separating a soundtrack from its video.",
  });
  j.usage = Object.fromEntries(Object.entries(j.usage).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))); wj("lib/icon-usage.json", j, src); }
// aliases
{ const src = rd("lib/icon-aliases.json"), j = JSON.parse(src); j.aliases = j.aliases.filter((e) => !GONE.some((n) => e.match === "^" + n + "$")); for (const n of GONE) delete j.names[n];
  const add = [
    { match: "^circle-question-mark$", terms: ["help", "faq", "support", "circled question", "帮助", "问号"] },
    { match: "^eraser-sparkle$", terms: ["magic eraser", "ai erase", "remove object", "object removal", "subject removal", "inpaint", "主体消除", "智能擦除"] },
    { match: "^face$", terms: ["portrait", "face shape", "head outline", "facial", "人像", "人脸", "人像调节", "脸型"] },
    { match: "^scan-text$", terms: ["ocr", "detect text", "text recognition", "read text", "subtitle detection", "识别文字"] },
    { match: "^camera-start$", terms: ["first frame", "capture first frame", "frame at start", "截取首帧", "首帧"] },
    { match: "^camera-end$", terms: ["last frame", "capture last frame", "frame at end", "截取尾帧", "尾帧"] },
    { match: "^clip-continue$", terms: ["continue video", "extend clip", "next segment", "continuation", "智能续写", "续写", "视频延长"] },
    { match: "^clip-refresh$", terms: ["reshoot", "retake", "regenerate clip", "redo segment", "片段重拍", "重拍"] },
    { match: "^copy-check$", terms: ["copied", "copy success", "copied to clipboard", "已复制", "复制成功"] },
    { match: "^clip-split$", terms: ["split clip", "split at playhead", "cut clip", "在播放头处分割", "分割"] },
    { match: "^clip-trim-left$", terms: ["trim start", "trim left", "delete before playhead", "裁掉左侧", "裁剪左边"] },
    { match: "^clip-trim-right$", terms: ["trim end", "trim right", "delete after playhead", "裁掉右侧", "裁剪右边"] },
    { match: "^transition$", terms: ["transition", "cross dissolve", "overlap clips", "转场"] },
    { match: "^slash$", terms: ["line", "straight line", "diagonal", "直线"] },
    { match: "^rectangle-horizontal$", terms: ["rectangle", "rect", "矩形"] },
    { match: "^scribble$", terms: ["freehand", "free draw", "doodle", "squiggle", "自由绘制", "涂鸦"] },
    { match: "^diamond-plus$", terms: ["add keyframe", "keyframe", "insert frame", "在播放头处加一帧", "加关键帧"] },
    { match: "^image-pen$", terms: ["edit image", "edit frame", "retouch", "picture edit", "画面编辑"] },
    { match: "^keyframes$", terms: ["animation timeline", "timeline", "keyframe", "playhead", "motion", "动画时间轴", "时间轴", "关键帧"] },
    { match: "^paintbrush-sparkle$", terms: ["generative fill", "inpaint", "magic brush", "repaint", "局部重绘"] },
    { match: "^perspective-video$", terms: ["director desk", "rehearsal stage", "3d stage", "previz", "stage camera", "预演台", "导演台", "摄影机"] },
    { match: "^scale-frame$", terms: ["scale", "resize", "proportional scale", "缩放"] },
    { match: "^mouse$", terms: ["scroll wheel", "pointer device", "鼠标", "滚轮"] },
    { match: "^mouse-move$", terms: ["drag with mouse", "pan with mouse", "鼠标移动", "鼠标拖动"] },
    { match: "^mouse-left$", terms: ["left button", "left click", "click and drag", "鼠标左键"] },
    { match: "^mouse-drag$", terms: ["drag with mouse", "mouse drag", "鼠标拖动"] },
    { match: "^rotate-cw-square$", terms: ["rotate right", "rotate clockwise", "turn right 90", "向右转", "顺时针旋转"] },
    { match: "^rotate-ccw-square$", terms: ["rotate left", "rotate counter-clockwise", "turn left 90", "向左转", "逆时针旋转"] },
    { match: "^rotate-corner-", terms: ["rotate cursor", "corner rotate", "rotate handle", "角旋转", "旋转光标"] },
    { match: "^pinch$", terms: ["trackpad zoom", "pinch zoom", "two finger zoom", "触控板缩放"] },
    { match: "^fingers-move$", terms: ["trackpad pan", "two finger drag", "触控板移动"] },
    { match: "^angle$", terms: ["angle", "degrees", "rotation angle", "角度", "旋转角度"] },
    { match: "^rotate-mirror$", terms: ["rotate and mirror", "rotate and flip", "transform", "旋转与镜像", "旋转镜像"] },
    { match: "^user-pen$", terms: ["edit user", "modify subject", "edit character", "主体修改"] },
    { match: "^user-switch$", terms: ["switch user", "replace subject", "swap person", "change character", "主体替换"] },
    { match: "^video-audio-lines$", terms: ["extract audio", "separate audio", "audio from video", "soundtrack", "音视频分离"] },
  ];
  for (const a of add) if (!j.aliases.some((e) => e.match === a.match)) j.aliases.push(a);
  j.aliases.sort((a, b) => (a.match < b.match ? -1 : a.match > b.match ? 1 : 0));
  Object.assign(j.names, { "circle-question-mark": ["circle-help", "help-circle", "question-circle", "circle-question", "question"], "eraser-sparkle": ["magic-eraser", "eraser-magic"], "face": ["face-outline", "head", "portrait"], "scan-text": ["text-scan", "ocr"], "camera-start": ["camera-first", "camera-first-frame"], "camera-end": ["camera-last", "camera-last-frame"], "image-pen": ["image-edit", "photo-edit"], "keyframes": ["timeline-keyframes", "animation-timeline", "keyframe"], "paintbrush-sparkle": ["paintbrush-magic", "magic-brush"], "perspective-video": ["stage-camera", "director-desk"], "scale-frame": ["scale", "resize-corner"], "mouse": ["mouse-scroll", "mouse-wheel"], "mouse-move": ["mouse-drag"], "mouse-left": ["mouse-left-click"], "mouse-drag": ["mouse-pan"], "rotate-cw-square": ["rotate-square-right"], "rotate-ccw-square": ["rotate-square-left"], "rotate-corner-top-right": ["rotate-cursor-top-right"], "rotate-corner-top-left": ["rotate-cursor-top-left"], "rotate-corner-bottom-right": ["rotate-cursor-bottom-right"], "rotate-corner-bottom-left": ["rotate-cursor-bottom-left"], "pinch": ["trackpad-zoom", "pinch-zoom"], "fingers-move": ["trackpad-pan", "two-finger-move"], "angle": ["angle-degrees"], "rotate-mirror": ["rotate-flip", "transform"], "user-pen": ["user-edit", "user-round-pen"], "user-switch": ["user-swap", "user-arrow-right-left"], "video-audio-lines": ["video-audio", "film-audio-lines"], "clip-continue": ["video-extend", "clip-extend"], "clip-refresh": ["clip-regenerate", "video-refresh", "retake"], "copy-check": ["copy-success", "copy-done"], "transition": ["clips-overlap", "cross-dissolve"], "diamond-plus": ["keyframe-plus"], "scribble": ["squiggle", "pencil-line"] });
  j.names = Object.fromEntries(Object.entries(j.names).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  wj("lib/icon-aliases.json", j, src); }
// taxonomy
{ let t = rd("lib/icon-taxonomy.ts"); const rep = (from, to) => { const n = t.split(from).length - 1; if (n !== 1) throw new Error(`taxonomy: expected one '${from}', found ${n}`); t = t.replace(from, to); };
  if (!t.includes("|scan-text|")) rep("|type|bold|", "|type|scan-text|bold|");
  if (!t.includes("circle-question-mark")) rep("|info|question|", "|info|question|circle-question-mark|");
  if (!t.includes("clip-continue")) rep("/^(storyboard|", "/^(storyboard|clip-continue|");
  if (!t.includes("clip-refresh")) rep("|clip-continue|", "|clip-continue|clip-refresh|");
  if (!t.includes("|face$|")) rep("/^(user|scan-face|", "/^(user|face$|scan-face|");
  if (!t.includes("scale-frame")) rep("|scaling|", "|scaling|scale-frame|");
  if (t.includes("hand-(pinch|move)|mouse)")) t = t.replace("hand-(pinch|move)|mouse)", "mouse|pinch|fingers-move)");
  if (!t.includes("|mouse|")) rep("/^(cursor|hand$)/", "/^(cursor|hand$|mouse|pinch|fingers-move)/");
  if (!t.includes("|angle|")) rep("|scaling|scale-frame|", "|scaling|scale-frame|angle|");
  if (!t.includes("|keyframes|")) rep("|clip-refresh|", "|clip-refresh|keyframes|");
  if (!t.includes("clip-split")) rep("|keyframes|", "|keyframes|clip-split|clip-trim|transition|");
  if (!t.includes("|rectangle|")) rep("/^(circle|square|triangle|", "/^(circle|square|rectangle|slash$|scribble|diamond|triangle|");
  fs.writeFileSync(`${R}/lib/icon-taxonomy.ts`, t); }
console.log("registered", NEW.join(", "));
