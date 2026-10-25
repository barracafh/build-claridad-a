import { readFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Call from the agent runtime. File bytes never need to enter the model context.
const path = process.argv[2];
if (!path) {
  console.error("Usage: bun scripts/mcp-document.mjs <fictional.pdf|jpg|png>");
  process.exit(1);
}
const endpoint = new URL(process.env.MCP_URL ?? "https://build.barraca.house/punto-atencion-ciudadana/claridad-a/mcp");
if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))) {
  throw new Error("Use HTTPS for remote MCP endpoints.");
}
const client = new Client({ name: "claridad-file-client", version: "1.0.0" }, {
  versionNegotiation: { mode: { pin: "2026-07-28" } },
});
try {
  const bytes = await readFile(path);
  if (bytes.length > 3 * 1024 * 1024) throw new Error("File too large.");
  const mimeType = bytes.subarray(0, 5).toString() === "%PDF-" ? "application/pdf"
    : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg"
    : bytes[0] === 0x89 && bytes.subarray(1, 4).toString() === "PNG" ? "image/png" : null;
  if (!mimeType) throw new Error("Unsupported file.");
  await client.connect(new StreamableHTTPClientTransport(endpoint, {
    requestInit: { redirect: "error" },
  }));
  const result = await client.callTool({ name: "analizar_documento", arguments: {
    documentoBase64: bytes.toString("base64"), mimeType,
  } }, { timeout: 120_000 });
  if (result.isError) {
    console.error("Claridad could not process the document.");
    process.exitCode = 1;
  } else {
    process.stdout.write(`${JSON.stringify(result.structuredContent)}\n`);
  }
} catch {
  console.error("MCP request failed. Check the file, endpoint and server availability.");
  process.exitCode = 1;
} finally {
  await client.close();
}
