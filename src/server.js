import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "./data.js";
import { createAnalyzer } from "./analyzer.js";
import { validateResumePayload } from "./validation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT) || 3000;
const dataset = loadDataset();
const analyzer = createAnalyzer(dataset);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error("Request exceeds the 2 MB limit.");
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function serveStatic(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(publicDir, requested);
  if (!filePath.startsWith(publicDir + path.sep)) {
    json(response, 403, { error: "Forbidden" });
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      json(response, error.code === "ENOENT" ? 404 : 500, { error: "Not found" });
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  try {
    if (request.method === "GET" && pathname === "/api/health") {
      json(response, 200, { status: "ok", model: analyzer.meta });
      return;
    }
    if (request.method === "GET" && pathname === "/api/meta") {
      json(response, 200, analyzer.meta);
      return;
    }
    if (request.method === "POST" && pathname === "/api/analyze") {
      const body = await readJson(request);
      json(response, 200, analyzer.analyze(
        String(body.resumeText ?? ""),
        String(body.jobDescription ?? ""),
        String(body.targetRole ?? ""),
      ));
      return;
    }
    if (request.method === "POST" && pathname === "/api/resume") {
      const body = await readJson(request);
      const validation = validateResumePayload(body);
      if (!validation.valid) {
        json(response, 422, {
          error: "Resume contains invalid or incomplete details.",
          fields: validation.errors,
        });
        return;
      }
      const schema = {
        basics: body.basics ?? {},
        summary: String(body.summary ?? "").trim(),
        experience: Array.isArray(body.experience) ? body.experience : [],
        education: Array.isArray(body.education) ? body.education : [],
        skills: Array.isArray(body.skills) ? body.skills : [],
        projects: Array.isArray(body.projects) ? body.projects : [],
        certifications: Array.isArray(body.certifications) ? body.certifications : [],
        meta: {
          schemaVersion: "1.0",
          generatedAt: new Date().toISOString(),
          atsCompliant: true,
        },
      };
      json(response, 200, schema);
      return;
    }
    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }
    json(response, 404, { error: "Route not found" });
  } catch (error) {
    json(response, 400, { error: error.message || "Unable to process request." });
  }
});

server.listen(port, () => {
  console.log(`Career Architect AI running at http://localhost:${port}`);
  console.log(`Model ready: ${analyzer.meta.trainingRecords} resumes, ${analyzer.meta.roles} roles`);
});

export { analyzer, server };
