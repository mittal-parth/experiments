import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/results") {
      const body = await readFile(join(root, "data", "results.json"));
      response.writeHead(200, {
        "Content-Type": types[".json"],
        "Cache-Control": "no-store",
      });
      response.end(body);
      return;
    }
    const rel = decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, ""));
    const file = join(publicDir, rel);
    if (file !== publicDir && !file.startsWith(publicDir + sep)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch (error) {
    const missing = error.code === "ENOENT";
    response.writeHead(missing ? 404 : 500);
    response.end(missing ? "not found" : "error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}`);
});
