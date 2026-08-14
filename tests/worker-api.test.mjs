import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = { ASSETS: { fetch: () => new Response("asset fallback", { status: 200 }) } };

const health = await worker.fetch(new Request("https://nian.test/api/health"), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

const response = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST",
  headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
  body: JSON.stringify({ message: "我想练英语听力", snapshot: { dueWords: 3, weakestSubject: "english" } }),
}), env);
assert.equal(response.status, 200);
const answer = await response.json();
assert.match(answer.reply, /词|听力|英语/);
assert.ok(["wrongbook", "listening", "adaptive"].includes(answer.suggestedAction));

const rejected = await worker.fetch(new Request("https://nian.test/api/nian/respond", {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: "hello",
}), env);
assert.equal(rejected.status, 415);

const asset = await worker.fetch(new Request("https://nian.test/favicon.svg"), env);
assert.equal(await asset.text(), "asset fallback");

console.log("Worker API 检查通过：健康检查、念安回复、输入校验与静态资源回落均有效。");
