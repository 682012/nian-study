import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("public/assets/nian-content-v8.js", "utf8");
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const content = context.globalThis.NIAN_V8_CONTENT;

assert.ok(content, "v8 content bundle should expose NIAN_V8_CONTENT");
assert.ok(content.sentences.length >= 36, "expected at least 36 sentence-order exercises");
assert.ok(content.listening.length >= 24, "expected at least 24 listening exercises");
assert.ok(content.readings.length >= 16, "expected at least 16 reading exercises");

for (const [bankName, bank] of Object.entries({ listening: content.listening, readings: content.readings })) {
  const ids = new Set();
  for (const item of bank) {
    assert.ok(!ids.has(item.id), `${bankName} contains duplicate id ${item.id}`);
    ids.add(item.id);
    assert.equal(item.choices.length, 4, `${item.id} must have four choices`);
    assert.equal(new Set(item.choices).size, 4, `${item.id} choices must be unique`);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4, `${item.id} answer index is invalid`);
    assert.ok(item.explanation.length >= 8, `${item.id} explanation is too short`);
  }
}

const arcade = fs.readFileSync("public/assets/nian-arcade-v3.js", "utf8");
for (const feature of ["念安私塾", "听句寻意", "短章取证", "math:二次方程", "math:方程组", "mathSvg", "nian-math-figure", "nian-rubric-box"]) {
  const needle = feature.startsWith("math:") ? feature.slice(5) : feature;
  assert.ok(arcade.includes(needle), `arcade is missing ${feature}`);
}
assert.ok(arcade.includes("arcade.recent = arcade.recent.slice(-80)"), "recent adaptive history must be bounded");
assert.ok(arcade.includes(".slice(0, 120)"), "arcade mistake storage must be bounded");

// Exercise generated probability variants: duplicate or equivalent options must never be marked wrong.
const probabilitySource = arcade.slice(arcade.indexOf('const red = 2 + Math.floor'), arcade.indexOf('    },', arcade.indexOf('const red = 2 + Math.floor')));
const probability = new Function('rng', 'shuffle', probabilitySource);
for (let red = 2; red <= 8; red++) for (let blue = 2; blue <= 8; blue++) {
  const random = [(red - 2) / 7, (blue - 2) / 7];
  const question = probability(() => random.shift(), items => items);
  const values = question.choices.map(fraction => { const [a,b] = fraction.split('/').map(Number); return a/b; });
  assert.equal(new Set(values).size, 4, `${red} red/${blue} blue has duplicate answers`);
  assert.equal(values[question.answer], red / (red + blue));
}
const generated = { window: {}, document: { readyState: 'loading', addEventListener() {} } };
vm.runInNewContext(arcade.replace(/\}\)\(\);\s*$/, 'window.builders = MATH_BUILDERS; window.seeded = seeded; })();'), generated);
for (const [index, build] of generated.window.builders.entries()) {
  for (let seed = 0; seed < 200; seed++) {
    const q = build(generated.window.seeded(`regression-${index}-${seed}`));
    const canonical = q.choices.map(value => Number.isFinite(Number(value)) ? Number(value) : value);
    assert.equal(canonical.length, 4, `${q.topic} must have four options`);
    assert.equal(new Set(canonical).size, 4, `${q.topic} has duplicate options: ${q.choices}`);
    assert.ok(q.answer >= 0 && q.answer < 4, `${q.topic} has invalid answer index`);
  }
}
console.log("内容与动态图像检查通过：听读题库、数学图像、49 种概率题与全部数学生成器各 200 组唯一选项均有效。");
