// Copies the speech runtime (ONNX Runtime's WebAssembly build, shipped inside
// @huggingface/transformers) into public/voice so the site serves it itself
// instead of loading code from a third-party CDN. Runs before dev and build.
import fs from "node:fs";

const from = "node_modules/@huggingface/transformers/dist";
const to = "public/voice";
const files = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"];

fs.mkdirSync(to, { recursive: true });
for (const f of files) {
  if (!fs.existsSync(`${from}/${f}`)) throw new Error(`[voice] missing ${from}/${f}. Run npm install.`);
  fs.copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
console.log("[voice] runtime copied to", to);
