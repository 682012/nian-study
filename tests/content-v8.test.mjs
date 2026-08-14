import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("public/assets/nian-content-v8.js", "utf8");
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const content = context.globalThis.NIAN_V8_CONTENT;

assert.ok(content, "v8 content bundle should expose NIAN_V8_CONTENT");
assert.equal(content.sentences.length, 36, "expected 36 additional sentence-order exercises");
assert.equal(content.listening.length, 24, "expected 24 sentence and dialogue listening exercises");
assert.equal(content.readings.length, 16, "expected 16 original short-reading exercises");

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
for (const feature of ["念安私塾", "听句寻意", "短章取证", "math:二次方程", "math:方程组"]) {
  const needle = feature.startsWith("math:") ? feature.slice(5) : feature;
  assert.ok(arcade.includes(needle), `arcade is missing ${feature}`);
}
assert.ok(arcade.includes("arcade.recent = arcade.recent.slice(-80)"), "recent adaptive history must be bounded");
assert.ok(arcade.includes(".slice(0, 120)"), "arcade mistake storage must be bounded");

console.log("v8 内容检查通过：36 句阵、24 听力、16 短章、自适应与存档上限均有效。");
