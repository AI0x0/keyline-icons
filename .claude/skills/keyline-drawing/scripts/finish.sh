#!/usr/bin/env bash
# Run the whole pipeline after editing raw/, and stop if lint has anything to say about the glyphs you name.
#   .claude/skills/keyline-drawing/scripts/finish.sh eraser-sparkle scan-text …
# Then, if do-tv is linked through file:, rebuild packages/react and `pnpm install` there yourself (see SKILL.md).
set -u
R="$(cd "$(dirname "$0")/../../../.." && pwd)"; cd "$R" || exit 1
names="$(printf '%s|' "$@" | sed 's/|$//')"
node pipeline/build.mjs > /tmp/keyline-build.log 2>&1 || { echo "FAILED build"; tail -5 /tmp/keyline-build.log; exit 1; }
node pipeline/lint.mjs --json > /tmp/keyline-lint.json 2> /tmp/keyline-lint.err
node -e '
const j=JSON.parse(require("fs").readFileSync("/tmp/keyline-lint.json","utf8")); const re=new RegExp("(^|/)(" + process.argv[1] + ")$");
const f=process.argv[1]?j.findings.filter(x=>re.test(x.icon)):[]; const errs=j.findings.filter(x=>x.sev==="error");
console.log("LINT total", j.findings.length, "errors", errs.length, "| named glyphs:", f.length);
for (const m of f) console.log("  ", m.sev, m.rule, m.icon, "—", m.msg);
for (const m of errs) if(!f.includes(m)) console.log("  OTHER", m.sev, m.rule, m.icon, "—", m.msg);
if (errs.length || f.length) process.exit(2);' "$names" || { echo "STOP: lint findings"; exit 1; }
for step in "build-react.mjs" "build-data.mjs" "check-readmes.mjs --fix" "build-paper.mjs" "build-cover.mjs"; do eval "node pipeline/$step" > /dev/null 2>&1 || { echo "FAILED: $step"; exit 1; }; done
pnpm icons:ci > /tmp/keyline-ci.log 2>&1; echo "icons:ci exit $?"; grep -n "TOO LONG\|SNIPPET\|no category\|error TS" /tmp/keyline-ci.log | head -5; tail -1 /tmp/keyline-ci.log
echo "DONE"
