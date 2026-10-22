import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const facts = {
  emisor: "Organismo ficticio", tipoActo: "Prueba de integración", categoria: "HACER",
  queDice: "Este documento comprueba la integración de Claridad.",
  queHacer: [{ texto: "Comprueba los pasos de la notificación." }],
  plazo: { fraseOriginal: "VEINTE DÍAS naturales", regla: "20 días naturales", cantidad: 20,
    unidad: "DIAS_NATURALES", fechaNotificacion: "2026-10-08", fechaLiteral: null, electoral: false },
  siNoHacesNada: "Consulta las consecuencias en la notificación.", siYaVencio: null,
  sede: null, fuentes: [{ nombre: "BOE", url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565" }],
  idioma: "es", confianza: "MEDIA",
};
let calls = 0;
let fail = false;
let slow = false;
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(req.url, "/v1/chat/completions");
  assert.equal(body.model, "mcp-test-model");
  calls++;
  if (slow) await pause(700);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ choices: [{ message: { content: fail ? "invalid model output" : JSON.stringify(facts) } }] }));
});
provider.listen(0, "127.0.0.1");
await once(provider, "listening");
const portProbe = createServer();
portProbe.listen(0, "127.0.0.1");
await once(portProbe, "listening");
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const root = `http://127.0.0.1:${port}/claridad-a`;
const endpoint = `${root}/mcp`;
const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, MCP_ALLOWED_ORIGINS: "https://build.barraca.house", HELMCODE_API_KEY: "test-only", HELMCODE_MODEL: "mcp-test-model", HELMCODE_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`, HELMCODE_OCR_MODEL: "" },
  stdio: "ignore",
});
const client = new Client({ name: "claridad-integration-test", version: "1" }, {
  versionNegotiation: { mode: { pin: "2026-07-28" } },
});
const pdf = await readFile(new URL("../datos/documentos/03-dgt-denuncia-velocidad.pdf", import.meta.url));
const image = await readFile(new URL("../datos/documentos/03b-dgt-denuncia-foto-movil.jpg", import.meta.url));
const input = { documentoBase64: pdf.toString("base64"), mimeType: "application/pdf" };
const call = args => client.callTool({ name: "analizar_documento", arguments: args });
const post = (body, extra = {}) => fetch(endpoint, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
function checkResult(result) {
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  assert.equal(result.structuredContent.queDice, facts.queDice);
  assert.deepEqual(result.structuredContent.queHacer, facts.queHacer);
  assert.equal(result.structuredContent.plazo.fechaLimite, "2026-10-28");
  assert.equal(result.structuredContent.plazo.estado, "CALCULADA");
  assert.deepEqual(result.structuredContent.fuentes, facts.fuentes);
  assert.match(result.structuredContent.aviso, /No es un servicio oficial/);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await fetch(endpoint); ready = true; break; } catch { await pause(100); }
  }
  assert.ok(ready, "Production server did not start. Run bun run build first.");
  assert.equal((await fetch(endpoint)).status, 405);
  const publicRequest = await fetch(endpoint, { method: "POST", headers, body: "{}" });
  assert.equal(publicRequest.status, 400);
  assert.equal(publicRequest.headers.get("cache-control"), "no-store");
  assert.equal((await post({}, { Origin: "https://untrusted.example" })).status, 403);
  const preflight = await fetch(endpoint, { method: "OPTIONS", headers: { Origin: "https://build.barraca.house" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://build.barraca.house");

  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers } }));
  const catalog = await client.listTools();
  assert.deepEqual(catalog.tools.map(t => t.name), ["analizar_documento"]);
  assert.ok(catalog.tools[0].outputSchema.properties.plazo);
  assert.equal((await call({ ...input, documentoBase64: "%%%%" })).isError, true);
  assert.equal((await call({ ...input, documentoBase64: Buffer.from("not a document").toString("base64") })).isError, true);
  assert.equal(calls, 0, "Invalid files must not reach the AI provider.");
  checkResult(await call(input), "TEXTO_PDF");
  checkResult(await call({ documentoBase64: image.toString("base64"), mimeType: "image/jpeg" }), "TRANSCRIPCION_IA");
  fail = true;
  assert.equal((await call(input)).isError, true);
  fail = false;

  const form = new FormData();
  form.set("documento", new Blob([pdf], { type: "application/pdf" }), "fictional.pdf");
  const web = await fetch(`${root}/api/documento`, { method: "POST", body: form });
  assert.equal(web.status, 200);
  assert.equal((await web.json()).queDice, facts.queDice);

  const cli = spawn(process.execPath, ["scripts/mcp-document.mjs", "datos/documentos/03-dgt-denuncia-velocidad.pdf"], {
    env: { ...process.env, MCP_URL: endpoint }, stdio: ["ignore", "pipe", "ignore"],
  });
  let output = "";
  cli.stdout.on("data", chunk => { output += chunk; });
  const [exit] = await once(cli, "exit");
  assert.equal(exit, 0);
  assert.equal(JSON.parse(output).queDice, facts.queDice);

  // 2025 clients still initialize, but receive no transport session.
  const legacy = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "legacy-test", version: "1" } } });
  assert.equal(legacy.status, 200);
  assert.equal(legacy.headers.get("mcp-session-id"), null);
  assert.match(await legacy.text(), /2025-11-25/);
  assert.equal((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
  const oldTools = await post({ jsonrpc: "2.0", id: 2, method: "tools/list" }, { "MCP-Protocol-Version": "2025-11-25" });
  assert.match(await oldTools.text(), /analizar_documento/);
  assert.equal(oldTools.headers.get("cache-control"), "no-store");
  assert.equal((await fetch(endpoint, { method: "POST", headers, body: "{" })).status, 400);
  assert.equal((await post({}, { "Content-Type": "text/plain" })).status, 415);
  const tooLarge = "x".repeat(4 * 1024 * 1024 + 16 * 1024 + 1);
  assert.equal((await fetch(endpoint, { method: "POST", headers, body: tooLarge })).status, 413);
  // A streaming request has no Content-Length; the SDK must still enforce the bound.
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(tooLarge)); controller.close(); } });
  assert.equal((await fetch(endpoint, { method: "POST", headers, body: stream, duplex: "half" })).status, 413);

  slow = true;
  const before = calls;
  const running = [call(input), call(input)];
  for (let attempt = 0; calls < before + 2 && attempt < 100; attempt++) await pause(10);
  assert.equal(calls, before + 2);
  assert.equal((await post({})).status, 429);
  for (const result of await Promise.all(running)) checkResult(result, "TEXTO_PDF");
  slow = false;
  let limited = false;
  for (let attempt = 0; attempt < 21; attempt++) {
    const response = await post({});
    if (response.status === 429) {
      assert.equal(response.headers.get("retry-after"), "60");
      limited = true;
      break;
    }
  }
  assert.ok(limited, "Request rate limit was not enforced.");
  console.log("MCP integration passed: modern and legacy protocols, PDF/image, file client, web route, public access, CORS, errors, body bounds, concurrency and rate limit. AI provider simulated.");
} finally {
  await client.close();
  const stopped = once(app, "exit");
  app.kill("SIGTERM");
  await stopped;
  await new Promise(resolve => provider.close(resolve));
}
